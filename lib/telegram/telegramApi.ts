const API_BASE = 'https://api.telegram.org/bot';

export interface TelegramFileInfo {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

export interface GetUpdatesOptions {
  offset?: number;
  limit?: number;
  timeout?: number;
  allowedUpdates?: string[];
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  options?: {
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    replyMarkup?: any;
  }
) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not set');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode || 'HTML',
        reply_markup: options?.replyMarkup,
      }),
    });

    if (!response.ok) {
      console.error('Failed to send telegram message:', await response.text());
    }
  } catch (error) {
    console.error('Error sending telegram message:', error);
  }
}

export async function setWebhook(webhookUrl: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not set');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
      }),
    });

    const result = await response.json();
    if (!result.ok) {
      console.error('Failed to set telegram webhook:', result);
    } else {
      console.log('Webhook set successfully');
    }
  } catch (error) {
    console.error('Error setting telegram webhook:', error);
  }
}

export async function deleteWebhook(dropPendingUpdates = false) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not set');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}${token}/deleteWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        drop_pending_updates: dropPendingUpdates,
      }),
    });

    const result = await response.json();
    if (!result.ok) {
      console.error('Failed to delete telegram webhook:', result);
    }
  } catch (error) {
    console.error('Error deleting telegram webhook:', error);
  }
}

export async function getUpdates(options: GetUpdatesOptions = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN not set');
  }

  const response = await fetch(`${API_BASE}${token}/getUpdates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      offset: options.offset,
      limit: options.limit ?? 25,
      timeout: options.timeout ?? 25,
      allowed_updates: options.allowedUpdates ?? ['message'],
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram getUpdates failed: ${response.status} ${body}`);
  }

  const result = await response.json();
  if (!result.ok || !Array.isArray(result.result)) {
    throw new Error(`Telegram getUpdates error: ${result.description || 'Unknown error'}`);
  }

  return result.result;
}

export async function getWebhookInfo() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not set');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}${token}/getWebhookInfo`, {
      method: 'GET',
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error getting telegram webhook info:', error);
  }
}

export async function getTelegramFile(fileId: string): Promise<TelegramFileInfo> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN not set');
  }

  const response = await fetch(`${API_BASE}${token}/getFile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: fileId }),
  });

  const result = (await response.json()) as {
    ok?: boolean;
    description?: string;
    result?: TelegramFileInfo;
  };

  if (!response.ok || !result.ok || !result.result?.file_path) {
    throw new Error(result.description || 'Failed to resolve Telegram file');
  }

  return result.result;
}

async function downloadTelegramFile(filePath: string): Promise<Buffer> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN not set');
  }

  const fileResponse = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`, {
    method: 'GET',
    cache: 'no-store',
  });

  if (!fileResponse.ok) {
    throw new Error(`Failed to download Telegram file: ${fileResponse.status}`);
  }

  const arrayBuffer = await fileResponse.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function downloadTelegramFileWithRetry(filePath: string, maxAttempts = 3): Promise<Buffer> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await downloadTelegramFile(filePath);
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to download Telegram file');
}
