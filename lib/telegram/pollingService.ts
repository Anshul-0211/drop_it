import { handleTelegramMessage, type TelegramUpdate } from '@/lib/telegram/messageHandler';
import { deleteWebhook, getUpdates } from '@/lib/telegram/telegramApi';

const DEFAULT_POLLING_TIMEOUT_SECONDS = 25;
const DEFAULT_POLLING_LIMIT = 25;
const DEFAULT_RETRY_DELAY_MS = 1500;

declare global {
  // eslint-disable-next-line no-var
  var __dropItTelegramPollingStarted: boolean | undefined;
  // eslint-disable-next-line no-var
  var __dropItTelegramUpdateOffset: number | undefined;
}

function getTelegramMode(): 'polling' | 'webhook' {
  const configured = process.env.TELEGRAM_MODE?.toLowerCase();
  if (configured === 'polling' || configured === 'webhook') {
    return configured;
  }

  return process.env.NODE_ENV === 'production' ? 'webhook' : 'polling';
}

function getRetryDelayMs(): number {
  const configured = Number(process.env.TELEGRAM_POLLING_INTERVAL_MS);
  if (!Number.isFinite(configured) || configured < 200) {
    return DEFAULT_RETRY_DELAY_MS;
  }

  return configured;
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runPollingLoop() {
  const retryDelayMs = getRetryDelayMs();

  while (globalThis.__dropItTelegramPollingStarted) {
    try {
      const updates = (await getUpdates({
        offset: globalThis.__dropItTelegramUpdateOffset,
        timeout: DEFAULT_POLLING_TIMEOUT_SECONDS,
        limit: DEFAULT_POLLING_LIMIT,
        allowedUpdates: ['message'],
      })) as TelegramUpdate[];

      for (const update of updates) {
        await handleTelegramMessage(update);
        globalThis.__dropItTelegramUpdateOffset = update.update_id + 1;
      }
    } catch (error) {
      console.error('telegram: polling loop error', error);
      await wait(retryDelayMs);
    }
  }
}

export async function startTelegramPolling() {
  if (process.env.NEXT_RUNTIME === 'edge') {
    return;
  }

  if (getTelegramMode() !== 'polling') {
    return;
  }

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('telegram: polling mode enabled but TELEGRAM_BOT_TOKEN is missing');
    return;
  }

  if (globalThis.__dropItTelegramPollingStarted) {
    return;
  }

  globalThis.__dropItTelegramPollingStarted = true;

  try {
    // getUpdates and webhook cannot be active together.
    await deleteWebhook(true);
  } catch (error) {
    console.warn('telegram: failed to remove webhook before polling startup', error);
  }

  console.log('telegram: polling started');
  void runPollingLoop();
}

export function stopTelegramPolling() {
  globalThis.__dropItTelegramPollingStarted = false;
}
