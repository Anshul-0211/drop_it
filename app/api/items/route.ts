import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ItemsResponse, ItemSection, ItemStateFilter } from '@/lib/types';
import { resolveRequestDbUser } from '@/lib/auth/resolveRequestDbUser';

type TimeFilter = 'all' | 'today' | 'yesterday' | '7d' | '30d';

function getDateThreshold(timeFilter: TimeFilter): string | null {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  if (timeFilter === 'today') {
    return startOfToday.toISOString();
  }

  if (timeFilter === 'yesterday') {
    const yesterday = new Date(startOfToday);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString();
  }

  if (timeFilter === '7d' || timeFilter === '30d') {
    const days = timeFilter === '7d' ? 7 : 30;
    const threshold = new Date(startOfToday);
    threshold.setDate(threshold.getDate() - days);
    return threshold.toISOString();
  }

  return null;
}

function getYesterdayEndIso(): string {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  return end.toISOString();
}

function isMissingLifecycleSchema(error: any): boolean {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return (
    code === '42P01' ||
    code === '42703' ||
    code === '42883' ||
    code === 'PGRST204' ||
    message.includes('deleted_at') ||
    message.includes('is_saved') ||
    message.includes('purge_expired_trashed_items') ||
    message.includes('folder_id') ||
    message.includes('folders')
  );
}

export async function GET(req: NextRequest) {
  try {
    const user = await resolveRequestDbUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const section = (searchParams.get('section') || 'inbox') as ItemSection;
    const state = (searchParams.get('state') || searchParams.get('status') || 'all') as ItemStateFilter;
    const time = (searchParams.get('time') || 'all') as TimeFilter;
    const folderId = searchParams.get('folder_id');
    const q = searchParams.get('q') || '';
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;

    // Non-blocking purge hook; older DBs may not have this function yet.
    const purgeRes = await supabaseAdmin.rpc('purge_expired_trashed_items', { target_user_id: user.id });
    if (purgeRes.error && !isMissingLifecycleSchema(purgeRes.error)) {
      console.warn('purge_expired_trashed_items warning:', purgeRes.error);
    }

    let query = supabaseAdmin
      .from('items')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order(section === 'trash' ? 'deleted_at' : 'created_at', { ascending: false });

    if (section === 'trash') {
      query = query.not('deleted_at', 'is', null);
    } else {
      query = query.is('deleted_at', null);
    }

    if (section === 'saved') {
      query = query.eq('is_saved', true);
    }

    if (section !== 'trash' && state !== 'all') {
      query = query.eq('status', state);
    }

    if (folderId) {
      query = query.eq('folder_id', folderId);
    }

    if (q) {
      query = query.or(
        `title.ilike.%${q}%,description.ilike.%${q}%,url.ilike.%${q}%`
      );
    }

    if (tags.length > 0) {
      query = query.contains('tags', tags);
    }

    const timeThreshold = getDateThreshold(time);
    if (time === 'yesterday' && timeThreshold) {
      query = query.gte('created_at', timeThreshold).lt('created_at', getYesterdayEndIso());
    } else if (timeThreshold) {
      query = query.gte('created_at', timeThreshold);
    }

    query = query.range(offset, offset + limit - 1);

    let { data: items, count, error } = await query;

    if (error && isMissingLifecycleSchema(error)) {
      // Backward-compatible fallback when migration 005 is not applied yet.
      let legacyQuery = supabaseAdmin
        .from('items')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (section === 'trash') {
        // Legacy schema has no trash, return empty result for this section.
        legacyQuery = legacyQuery.eq('id', '__no_match__');
      } else if (section === 'saved') {
        // Best-effort approximation in legacy schema.
        legacyQuery = legacyQuery.eq('status', 'read');
      }

      if (section !== 'trash' && state !== 'all') {
        legacyQuery = legacyQuery.eq('status', state);
      }

      if (folderId) {
        // Legacy schema has no folders support yet.
        legacyQuery = legacyQuery.eq('id', '__no_match__');
      }

      if (q) {
        legacyQuery = legacyQuery.or(
          `title.ilike.%${q}%,description.ilike.%${q}%,url.ilike.%${q}%`
        );
      }

      if (tags.length > 0) {
        legacyQuery = legacyQuery.contains('tags', tags);
      }

      const timeThreshold = getDateThreshold(time);
      if (time === 'yesterday' && timeThreshold) {
        legacyQuery = legacyQuery.gte('created_at', timeThreshold).lt('created_at', getYesterdayEndIso());
      } else if (timeThreshold) {
        legacyQuery = legacyQuery.gte('created_at', timeThreshold);
      }

      legacyQuery = legacyQuery.range(offset, offset + limit - 1);
      const legacyRes = await legacyQuery;
      items = legacyRes.data;
      count = legacyRes.count;
      error = legacyRes.error;
    }

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch items' },
        { status: 500 }
      );
    }

    let counts = {
      inbox: 0,
      saved: 0,
      trash: 0,
      unread: 0,
      read: 0,
    };

    const [inboxCountRes, savedCountRes, trashCountRes, unreadCountRes, readCountRes] = await Promise.all([
      supabaseAdmin.from('items').select('*', { count: 'exact', head: true }).eq('user_id', user.id).is('deleted_at', null),
      supabaseAdmin.from('items').select('*', { count: 'exact', head: true }).eq('user_id', user.id).is('deleted_at', null).eq('is_saved', true),
      supabaseAdmin.from('items').select('*', { count: 'exact', head: true }).eq('user_id', user.id).not('deleted_at', 'is', null),
      supabaseAdmin.from('items').select('*', { count: 'exact', head: true }).eq('user_id', user.id).is('deleted_at', null).eq('status', 'unread'),
      supabaseAdmin.from('items').select('*', { count: 'exact', head: true }).eq('user_id', user.id).is('deleted_at', null).eq('status', 'read'),
    ]);

    const countErrors = [inboxCountRes.error, savedCountRes.error, trashCountRes.error, unreadCountRes.error, readCountRes.error].filter(Boolean);
    if (countErrors.length > 0 && countErrors.every((countError) => isMissingLifecycleSchema(countError))) {
      const [legacyUnreadRes, legacyReadRes] = await Promise.all([
        supabaseAdmin.from('items').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'unread'),
        supabaseAdmin.from('items').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'read'),
      ]);

      counts = {
        inbox: (legacyUnreadRes.count || 0) + (legacyReadRes.count || 0),
        saved: legacyReadRes.count || 0,
        trash: 0,
        unread: legacyUnreadRes.count || 0,
        read: legacyReadRes.count || 0,
      };
    } else {
      counts = {
        inbox: inboxCountRes.count || 0,
        saved: savedCountRes.count || 0,
        trash: trashCountRes.count || 0,
        unread: unreadCountRes.count || 0,
        read: readCountRes.count || 0,
      };
    }

    const response: ItemsResponse = {
      data: items || [],
      total: count || 0,
      page,
      perPage: limit,
      counts,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/items error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await resolveRequestDbUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { type, title, description, url, file_url, tags = [], metadata, folder_id = null } = body;

    if (!type || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: type and title' },
        { status: 400 }
      );
    }

    if (folder_id) {
      const { data: folder } = await supabaseAdmin
        .from('folders')
        .select('id')
        .eq('id', folder_id)
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .single();

      if (!folder) {
        return NextResponse.json(
          { error: 'Folder not found' },
          { status: 404 }
        );
      }
    }

    // Create item
    const { data: item, error } = await supabaseAdmin
      .from('items')
      .insert({
        user_id: user.id,
        type,
        title,
        description,
        url,
        file_url,
        tags,
        metadata,
        status: 'unread',
        is_saved: false,
        deleted_at: null,
        folder_id,
        source: 'web',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create item' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    console.error('POST /api/items error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
