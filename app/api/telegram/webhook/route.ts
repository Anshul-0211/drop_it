import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { handleTelegramMessage } from '@/lib/telegram/messageHandler';

/**
 * Verify Telegram webhook secret token.
 * Telegram forwards the same value configured in setWebhook as
 * X-Telegram-Bot-Api-Secret-Token for every webhook request.
 */
function verifyTelegramWebhook(
  secretToken: string | undefined
): boolean {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  // In local dev we allow missing secret to reduce setup friction.
  if (!expectedSecret) {
    return process.env.NODE_ENV !== 'production';
  }

  if (!secretToken) return false;

  const secretBuffer = Buffer.from(secretToken);
  const expectedBuffer = Buffer.from(expectedSecret);

  if (secretBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(secretBuffer, expectedBuffer);
}

export async function POST(req: NextRequest) {
  try {
    // Get the secret token from headers
    const secretToken = req.headers.get('x-telegram-bot-api-secret-token');

    // Get body as text for signature verification
    const bodyText = await req.text();

    // Verify signature
    if (!verifyTelegramWebhook(secretToken || undefined)) {
      console.warn('telegram: Invalid webhook secret token');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the body
    let update;
    try {
      update = JSON.parse(bodyText);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // Process the message and await completion to prevent Vercel serverless freeze
    try {
      await handleTelegramMessage(update);
    } catch (error) {
      console.error('Error processing telegram message:', error);
    }

    // Acknowledge receipt
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(req: NextRequest) {
  return NextResponse.json({ ok: true, webhook: 'telegram' });
}
