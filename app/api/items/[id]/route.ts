import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestDbUser } from '@/lib/auth/resolveRequestDbUser';
import { createSupabaseSignedUrl, parseSupabaseStorageUri } from '@/lib/storage/supabaseStorage';

type ItemAction =
  | 'toggle-read'
  | 'mark-read'
  | 'mark-unread'
  | 'save'
  | 'unsave'
  | 'trash'
  | 'restore'
  | 'delete-forever'
  | 'move-folder'
  | 'clear-folder'
  | 'rename-title';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await resolveRequestDbUser(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: item, error } = await supabaseAdmin
      .from('items')
      .select('id, user_id, url, file_url')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (item.url) {
      return NextResponse.json({ data: { url: item.url, source: 'url' } });
    }

    if (!item.file_url) {
      return NextResponse.json({ error: 'No openable URL available for this item' }, { status: 400 });
    }

    const parsed = parseSupabaseStorageUri(item.file_url);

    if (!parsed) {
      return NextResponse.json({ data: { url: item.file_url, source: 'file_url' } });
    }

    const signedUrl = await createSupabaseSignedUrl({
      bucket: parsed.bucket,
      path: parsed.path,
      expiresInSeconds: 3600,
    });

    return NextResponse.json({
      data: {
        url: signedUrl,
        source: 'signed_file_url',
      },
    });
  } catch (error) {
    console.error('GET /api/items/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await resolveRequestDbUser(req);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const action = body?.action as ItemAction | undefined;

    const { data: item, error: checkError } = await supabaseAdmin
      .from('items')
      .select('id, status, is_saved, deleted_at, folder_id, title')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (checkError || !item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    if (action === 'delete-forever') {
      if (!item.deleted_at) {
        return NextResponse.json(
          { error: 'Item must be in trash before permanent delete' },
          { status: 400 }
        );
      }

      const { error: deleteError } = await supabaseAdmin
        .from('items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Supabase permanent delete error:', deleteError);
        return NextResponse.json(
          { error: 'Failed to permanently delete item' },
          { status: 500 }
        );
      }

      return NextResponse.json({ message: 'Item permanently deleted' });
    }

    const updates: Record<string, unknown> = {};

    if (action === 'toggle-read') {
      updates.status = item.status === 'read' ? 'unread' : 'read';
    }
    if (action === 'mark-read') {
      updates.status = 'read';
    }
    if (action === 'mark-unread') {
      updates.status = 'unread';
    }
    if (action === 'save') {
      updates.is_saved = true;
    }
    if (action === 'unsave') {
      updates.is_saved = false;
    }
    if (action === 'trash') {
      updates.deleted_at = new Date().toISOString();
    }
    if (action === 'restore') {
      updates.deleted_at = null;
    }
    if (action === 'clear-folder') {
      updates.folder_id = null;
    }
    if (action === 'move-folder') {
      const nextFolderId = typeof body?.folder_id === 'string' ? body.folder_id : null;

      if (!nextFolderId) {
        return NextResponse.json(
          { error: 'folder_id is required for move-folder action' },
          { status: 400 }
        );
      }

      const { data: folder } = await supabaseAdmin
        .from('folders')
        .select('id')
        .eq('id', nextFolderId)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single();

      if (!folder) {
        return NextResponse.json(
          { error: 'Folder not found' },
          { status: 404 }
        );
      }

      updates.folder_id = nextFolderId;
    }
    if (action === 'rename-title') {
      const nextTitle = typeof body?.title === 'string' ? body.title.trim() : '';
      if (nextTitle.length < 2) {
        return NextResponse.json(
          { error: 'Title must be at least 2 characters' },
          { status: 400 }
        );
      }
      updates.title = nextTitle;
    }

    if (typeof body?.status === 'string' && ['unread', 'read'].includes(body.status)) {
      updates.status = body.status;
    }
    if (typeof body?.is_saved === 'boolean') {
      updates.is_saved = body.is_saved;
    }
    if (typeof body?.folder_id === 'string') {
      const { data: folder } = await supabaseAdmin
        .from('folders')
        .select('id')
        .eq('id', body.folder_id)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single();

      if (!folder) {
        return NextResponse.json(
          { error: 'Folder not found' },
          { status: 404 }
        );
      }
      updates.folder_id = body.folder_id;
    }
    if (body?.folder_id === null) {
      updates.folder_id = null;
    }
    if (typeof body?.title === 'string' && !action) {
      const nextTitle = body.title.trim();
      if (nextTitle.length < 2) {
        return NextResponse.json(
          { error: 'Title must be at least 2 characters' },
          { status: 400 }
        );
      }
      updates.title = nextTitle;
    }
    if (body?.restore === true) {
      updates.deleted_at = null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid update action provided' },
        { status: 400 }
      );
    }

    const { data: updatedItem, error } = await supabaseAdmin
      .from('items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return NextResponse.json(
        { error: 'Failed to update item' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: updatedItem });
  } catch (error) {
    console.error('PATCH /api/items/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: item } = await supabaseAdmin
      .from('items')
      .select('id, deleted_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }

    const { error } = await supabaseAdmin
      .from('items')
      .update({ deleted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Supabase soft delete error:', error);
      return NextResponse.json(
        { error: 'Failed to move item to trash' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: item?.deleted_at ? 'Item already in trash' : 'Item moved to trash' });
  } catch (error) {
    console.error('DELETE /api/items/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
