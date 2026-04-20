import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestDbUser } from '@/lib/auth/resolveRequestDbUser';
import { Folder, FoldersResponse } from '@/lib/types';

function isMissingFolderSchema(error: any): boolean {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === '42703' ||
    code === 'PGRST204' ||
    message.includes('folders') ||
    message.includes('folder_id')
  );
}

export async function GET(req: NextRequest) {
  try {
    const user = await resolveRequestDbUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: folders, error } = await supabaseAdmin
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      if (isMissingFolderSchema(error)) {
        const response: FoldersResponse = { data: [] };
        return NextResponse.json(response);
      }
      console.error('GET /api/folders query error:', error);
      return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
    }

    const foldersWithCounts = await Promise.all(
      ((folders || []) as Folder[]).map(async (folder) => {
        const { count } = await supabaseAdmin
          .from('items')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('folder_id', folder.id)
          .is('deleted_at', null);

        return {
          ...folder,
          item_count: count || 0,
        };
      })
    );

    const response: FoldersResponse = { data: foldersWithCounts };
    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/folders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestDbUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const name = String(body?.name || '').trim();

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Folder name must be at least 2 characters' }, { status: 400 });
    }

    const { count: folderCount } = await supabaseAdmin
      .from('folders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('deleted_at', null);

    const { data: folder, error } = await supabaseAdmin
      .from('folders')
      .insert({
        user_id: user.id,
        name,
        position: folderCount || 0,
      })
      .select('*')
      .single();

    if (error) {
      if (isMissingFolderSchema(error)) {
        return NextResponse.json({ error: 'Folders are not available yet. Apply migration 006 first.' }, { status: 400 });
      }
      if (String(error?.code || '') === '23505') {
        return NextResponse.json({ error: 'A folder with this name already exists' }, { status: 400 });
      }
      console.error('POST /api/folders insert error:', error);
      return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
    }

    return NextResponse.json({ data: folder }, { status: 201 });
  } catch (error) {
    console.error('POST /api/folders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
