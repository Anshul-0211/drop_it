import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestDbUser } from '@/lib/auth/resolveRequestDbUser';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await resolveRequestDbUser(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (typeof body?.name === 'string') {
      const nextName = body.name.trim();
      if (nextName.length < 2) {
        return NextResponse.json({ error: 'Folder name must be at least 2 characters' }, { status: 400 });
      }
      updates.name = nextName;
    }

    if (typeof body?.position === 'number') {
      updates.position = body.position;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    const { data: folder, error } = await supabaseAdmin
      .from('folders')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error || !folder) {
      if (String(error?.code || '') === '23505') {
        return NextResponse.json({ error: 'A folder with this name already exists' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Folder not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({ data: folder });
  } catch (error) {
    console.error('PATCH /api/folders/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await resolveRequestDbUser(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: folder } = await supabaseAdmin
      .from('folders')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    const [clearItemsRes, deleteFolderRes] = await Promise.all([
      supabaseAdmin
        .from('items')
        .update({ folder_id: null, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('folder_id', id),
      supabaseAdmin
        .from('folders')
        .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id),
    ]);

    if (clearItemsRes.error || deleteFolderRes.error) {
      console.error('DELETE /api/folders/[id] error:', {
        clearItemsError: clearItemsRes.error,
        deleteFolderError: deleteFolderRes.error,
      });
      return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Folder deleted' });
  } catch (error) {
    console.error('DELETE /api/folders/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
