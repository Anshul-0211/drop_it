import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { resolveRequestDbUser } from '@/lib/auth/resolveRequestDbUser';
import { ItemSection, ItemStateFilter } from '@/lib/types';

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
    const state = (searchParams.get('state') || 'all') as ItemStateFilter;
    const folderId = searchParams.get('folder_id');
    const q = searchParams.get('q') || '';
    const limit = 50;

    if (!q || q.length < 2) {
      return NextResponse.json({ data: [] });
    }

    // Search items
    let query = supabaseAdmin
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .or(
        `title.ilike.%${q}%,description.ilike.%${q}%,url.ilike.%${q}%`
      )
      .order('created_at', { ascending: false })
      .limit(limit);

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

    const { data: items, error } = await query;

    if (error) {
      console.error('Search error:', error);
      return NextResponse.json(
        { error: 'Search failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: items || [] });
  } catch (error) {
    console.error('GET /api/search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
