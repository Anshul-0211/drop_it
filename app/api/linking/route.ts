import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Validate and redeem a linking token
 * Associates a Telegram user ID with the authenticated user's account
 */
export async function POST(request: NextRequest) {
  try {
    const { token, telegramUserId } = await request.json();

    if (!token || !telegramUserId) {
      return NextResponse.json(
        { error: 'Missing token or telegramUserId' },
        { status: 400 }
      );
    }

    if (!/^\d{5,15}$/.test(String(telegramUserId))) {
      return NextResponse.json(
        { error: 'Invalid Telegram user ID' },
        { status: 400 }
      );
    }

    // Get the user associated with this token
    const { data: linkToken, error: tokenError } = await supabaseAdmin
      .from('link_tokens')
      .select('user_id, expires_at')
      .eq('token', token)
      .single();

    if (tokenError || !linkToken) {
      return NextResponse.json(
        { error: 'Invalid or expired linking token' },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date(linkToken.expires_at) < new Date()) {
      await supabaseAdmin.from('link_tokens').delete().eq('token', token);
      return NextResponse.json(
        { error: 'Linking token has expired' },
        { status: 400 }
      );
    }

    // Link the Telegram user to the dashboard user
    const { error: linkError } = await supabaseAdmin
      .from('users')
      .update({
        telegram_user_id: telegramUserId,
        telegram_link_code: null, // Clear old code if any
        telegram_link_code_expires_at: null,
      })
      .eq('id', linkToken.user_id);

    if (linkError) {
      console.error('Failed to link Telegram user:', linkError);
      return NextResponse.json(
        { error: 'Failed to link Telegram account' },
        { status: 500 }
      );
    }

    // Delete token after use
    await supabaseAdmin.from('link_tokens').delete().eq('token', token);

    return NextResponse.json({
      ok: true,
      message: 'Telegram account linked successfully',
    });
  } catch (error) {
    console.error('POST /api/linking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Generate a new linking token for the authenticated user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve user ID from session
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate a random token (24 characters)
    const token = Array.from(crypto.getRandomValues(new Uint8Array(18)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Store token
    const { error } = await supabaseAdmin.from('link_tokens').insert({
      user_id: user.id,
      token,
      expires_at: expiresAt,
    });

    if (error) {
      console.error('Failed to create linking token:', error);
      return NextResponse.json(
        { error: 'Failed to generate linking token' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      token,
      expiresAt,
      linkUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/link/${token}`,
    });
  } catch (error) {
    console.error('GET /api/linking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
