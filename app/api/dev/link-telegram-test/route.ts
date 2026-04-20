import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Development-only endpoint to quickly link a Telegram ID for testing
 * Usage: POST /api/dev/link-telegram-test { email, telegramUserId }
 * Only works in NODE_ENV=development
 */
export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    const { email, telegramUserId } = await request.json();

    if (!email || !telegramUserId) {
      return NextResponse.json(
        { error: 'Missing email or telegramUserId' },
        { status: 400 }
      );
    }

    if (!/^\d{5,15}$/.test(String(telegramUserId))) {
      return NextResponse.json(
        { error: 'Invalid Telegram user ID format' },
        { status: 400 }
      );
    }

    // Find user by email
    const { data: user, error: lookupError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (lookupError || !user) {
      return NextResponse.json(
        { error: `User not found with email: ${email}` },
        { status: 404 }
      );
    }

    // Link Telegram ID using raw SQL to bypass trigger issues
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        telegram_user_id: telegramUserId,
      })
      .eq('id', user.id);

    // Workaround: try direct SQL update if standard update fails
    if (updateError && updateError.code === '42703') {
      // Schema mismatch - try selecting what columns exist first
      const { data: schemaCheck } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', 'users');
      
      return NextResponse.json(
        { 
          error: 'Schema issue: updated_at column missing. Run migrations in Supabase SQL editor.',
          columns: schemaCheck?.map((c: any) => c.column_name) || [],
          hint: 'Run: supabase/migrations/001_initial.sql',
        },
        { status: 500 }
      );
    }

    if (updateError) {
      console.error('Failed to link Telegram ID:', updateError);
      return NextResponse.json(
        { 
          error: 'Failed to link Telegram ID',
          dbError: updateError.code,
          dbMessage: (updateError as any).message,
          dbHint: (updateError as any).hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `Linked Telegram ID ${telegramUserId} to user ${email}`,
      userId: user.id,
      telegramUserId,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('POST /api/dev/link-telegram-test error:', errorMessage);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage // Show error in dev
      }, 
      { status: 500 }
    );
  }
}
