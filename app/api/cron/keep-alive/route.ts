import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Enforce security in production or if CRON_SECRET is configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('cron: keep-alive request rejected (unauthorized)');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('cron: starting keep-alive ping for Supabase...');

    // 1. Database Ping: select count of users
    const { count, error: dbError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (dbError) {
      console.error('cron: keep-alive database ping failed', dbError);
      return NextResponse.json(
        { error: 'Database keep-alive failed', details: dbError.message },
        { status: 500 }
      );
    }

    console.log(`cron: database ping successful (user count: ${count ?? 0})`);

    // 2. Storage Ping: write and delete a small text file
    const bucket = process.env.SUPABASE_DOCUMENTS_BUCKET || 'documents';
    const filePath = 'system/keep-alive.txt';
    const fileContent = Buffer.from('keep-alive-' + new Date().toISOString());

    // Upload the keep-alive file
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, fileContent, {
        contentType: 'text/plain',
        upsert: true,
      });

    if (uploadError) {
      console.error('cron: keep-alive storage upload failed', uploadError);
      return NextResponse.json(
        { error: 'Storage keep-alive upload failed', details: uploadError.message },
        { status: 500 }
      );
    }

    // Immediately remove the keep-alive file to prevent clutter
    const { error: deleteError } = await supabaseAdmin.storage
      .from(bucket)
      .remove([filePath]);

    if (deleteError) {
      console.warn('cron: keep-alive storage cleanup failed', deleteError);
      // We don't return 500 here since the write was successful and that is enough to prevent pause
    }

    console.log('cron: keep-alive storage ping successful');

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      database: 'active',
      storage: 'active',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('cron: keep-alive error:', message);
    return NextResponse.json(
      { error: 'Internal server error', details: message },
      { status: 500 }
    );
  }
}
