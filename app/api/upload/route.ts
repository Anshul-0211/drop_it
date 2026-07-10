import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestDbUser } from '@/lib/auth/resolveRequestDbUser';
import { uploadBufferToSupabaseStorage } from '@/lib/storage/supabaseStorage';
import { ItemType } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestDbUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folderId = formData.get('folder_id') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine ItemType
    let type: ItemType = 'document';
    if (file.type.startsWith('image/')) {
      type = 'image';
    } else if (file.type === 'application/pdf') {
      type = 'pdf';
    }

    // Upload to Supabase Storage
    const uploadResult = await uploadBufferToSupabaseStorage({
      userId: user.id,
      fileName: file.name,
      fileBuffer: buffer,
      mimeType: file.type,
    });

    const fileUrl = uploadResult.publicUrl || `supabase://${uploadResult.bucket}/${uploadResult.path}`;

    // Create item record
    const { data: item, error: insertError } = await supabaseAdmin
      .from('items')
      .insert({
        user_id: user.id,
        type,
        title: file.name,
        description: `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
        file_url: fileUrl,
        file_mime_type: file.type,
        file_size: file.size,
        status: 'unread',
        is_saved: false,
        deleted_at: null,
        folder_id: folderId || null,
        source: 'web',
        tags: [],
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error after file upload:', insertError);
      return NextResponse.json(
        { error: 'Failed to save item metadata' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
