import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';
import { randomBytes } from 'crypto';

async function getUsersTableTelegramColumns(): Promise<string[] | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'users')
      .in('column_name', ['telegram_link_code', 'telegram_link_code_expires_at']);

    if (error) {
      return null;
    }

    return (data || []).map((row: any) => row.column_name as string);
  } catch {
    return null;
  }
}

function isValidTelegramId(value: string): boolean {
  return /^\d{5,15}$/.test(value);
}

function generateLinkCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

async function resolveCurrentUserId(session: any): Promise<string | null> {
  const sessionUserId = session?.user?.id;
  if (sessionUserId) return sessionUserId;

  const email = session?.user?.email;
  if (!email) return null;

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  return user?.id || null;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveCurrentUserId(session);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let data: any = null;
    const baseQuery = await supabaseAdmin
      .from('users')
      .select('telegram_user_id, telegram_link_code_expires_at')
      .eq('id', userId)
      .single();

    if (baseQuery.error?.code === '42703') {
      // Fallback for environments where link-code migration isn't visible yet.
      const fallbackQuery = await supabaseAdmin
        .from('users')
        .select('telegram_user_id')
        .eq('id', userId)
        .single();

      if (fallbackQuery.error) {
        return NextResponse.json({ error: 'Failed to load telegram id' }, { status: 500 });
      }

      data = fallbackQuery.data;
    } else if (baseQuery.error) {
      return NextResponse.json({ error: 'Failed to load telegram id' }, { status: 500 });
    } else {
      data = baseQuery.data;
    }

    const expiresAt = data?.telegram_link_code_expires_at || null;
    const hasActiveLinkCode = !!(expiresAt && new Date(expiresAt).getTime() > Date.now());

    return NextResponse.json({
      telegramUserId: data?.telegram_user_id || null,
      hasActiveLinkCode,
      linkCodeExpiresAt: expiresAt,
    });
  } catch (error) {
    console.error('GET /api/user/telegram error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveCurrentUserId(session);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let generatedCode: string | null = null;
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    let lastError: { code?: string } | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateLinkCode();
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          telegram_link_code: code,
          telegram_link_code_expires_at: expiresAt,
        })
        .eq('id', userId);

      if (!error) {
        generatedCode = code;
        break;
      }

      lastError = error;
      // Column-missing means migration not applied yet.
      if (error.code === '42703') {
        const existingColumns = await getUsersTableTelegramColumns();
        const projectHost = process.env.NEXT_PUBLIC_SUPABASE_URL || 'unknown';
        return NextResponse.json(
          {
            error:
              'Auto-link is not ready yet for the currently connected Supabase project. Verify migration 002_telegram_link_code.sql was applied to this exact project URL.',
            details: error.code,
            dbMessage: (error as any).message,
            dbHint: (error as any).hint,
            connectedProject: projectHost,
            detectedColumns: existingColumns,
          },
          { status: 400 }
        );
      }

      if (error.code !== '23505') {
        break;
      }
    }

    if (!generatedCode) {
      return NextResponse.json(
        { error: 'Failed to generate a link code.', details: lastError?.code },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      linkCode: generatedCode,
      linkCodeExpiresAt: expiresAt,
    });
  } catch (error) {
    console.error('POST /api/user/telegram error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const telegramUserIdRaw = String(body?.telegramUserId || '').trim();

    if (!isValidTelegramId(telegramUserIdRaw)) {
      return NextResponse.json(
        { error: 'Invalid Telegram user ID. Use digits only (5-15).' },
        { status: 400 }
      );
    }

    const userId = await resolveCurrentUserId(session);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({
        telegram_user_id: Number(telegramUserIdRaw),
        telegram_link_code: null,
        telegram_link_code_expires_at: null,
      })
      .eq('id', userId);

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This Telegram user ID is already linked to another account.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to save Telegram user ID.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, telegramUserId: Number(telegramUserIdRaw) });
  } catch (error) {
    console.error('PATCH /api/user/telegram error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
