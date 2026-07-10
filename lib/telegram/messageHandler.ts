import { supabaseAdmin } from '@/lib/supabase';
import { fetchLinkPreview, generateUrlHash } from '@/lib/handlers/linkHandler';
import { sendTelegramMessage, getTelegramFile, downloadTelegramFileWithRetry } from './telegramApi';
import {
  getFileExtension,
  resolveMimeType,
  sanitizeStorageFileName,
  validateDocumentFile,
  validateImageFile,
} from '@/lib/storage/fileValidation';
import { uploadBufferToCloudinary } from '@/lib/storage/cloudinary';
import { uploadBufferToSupabaseStorage } from '@/lib/storage/supabaseStorage';

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface TelegramMessage {
  message_id: number;
  date: number;
  chat: { id: number };
  from: { id: number; first_name: string; username?: string };
  text?: string;
  photo?: Array<{ file_id: string; width: number; height: number }>;
  document?: {
    file_id: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  };
  entities?: Array<{ type: string; offset: number; length: number }>;
  caption?: string;
}

/**
 * Main handler for incoming Telegram messages
 */
export async function handleTelegramMessage(update: TelegramUpdate) {
  const message = update.message;
  if (!message) return;

  const telegramUserId = message.from.id;
  const chatId = message.chat.id;

  try {
    // Find or create user with telegram_user_id
    let { data: user } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('telegram_user_id', telegramUserId)
      .single();

    // Check if this is a deep link start command (e.g. /start <token>)
    if (message.text && message.text.startsWith('/start ') && message.text.length > 7) {
      const token = message.text.substring(7).trim();
      const linked = await handleDeepLinkToken(chatId, token, telegramUserId);
      if (linked) {
        return; // Successfully linked, exit early
      }
    }

    if (!user) {
      // User is not linked yet
      const appUrl = process.env.NEXTAUTH_URL || 'https://drop-it.vercel.app';
      await sendTelegramMessage(
        chatId,
        `👋 Hello! I'm drop_it - your personal link saver.\n\nTo start using me:\n\n1️⃣ Sign in: ${appUrl}/auth/signin\n2️⃣ Go to Settings (top right menu)\n3️⃣ Click "Generate Link"\n4️⃣ Click "Open & Link Now" and enter your Telegram ID\n\nYour Telegram ID: <code>${telegramUserId}</code>\n\nAfter linking, just send me links, notes, images, or PDFs!`,
        { parseMode: 'HTML' }
      );
      return;
    }

    if (message.text) {
      await handleTextMessage(chatId, message.text, user.id, telegramUserId);
    } else if (message.photo) {
      await handlePhotoMessage(chatId, message, user.id, message.caption);
    } else if (message.document) {
      await handleDocumentMessage(chatId, message.document, user.id, message.caption);
    } else {
      await sendTelegramMessage(
        chatId,
        "I can save links, text, images, and PDFs. Just send me one! 📸"
      );
    }
  } catch (error) {
    console.error('Message handler error:', error);
    await sendTelegramMessage(
      chatId,
      '❌ Something went wrong. Please try again later.'
    );
  }
}


async function handleTextMessage(chatId: number, text: string, userId: string, telegramUserId?: number) {
  // Check if it's a URL
  const urlRegex = /^https?:\/\//i;
  
  if (text.startsWith('/')) {
    await handleCommand(chatId, text, userId, telegramUserId);
    return;
  }

  if (urlRegex.test(text)) {
    await handleLink(chatId, text, userId);
  } else {
    // Plain text - save as note
    await handleNote(chatId, text, userId);
  }
}

async function handleLink(chatId: number, url: string, userId: string) {
  try {
    // Validate URL
    new URL(url);

    // Generate hash for duplicate detection
    const urlHash = generateUrlHash(url);

    // Check if already saved
    const { data: existing } = await supabaseAdmin
      .from('items')
      .select('id')
      .eq('user_id', userId)
      .eq('url_hash', urlHash)
      .single();

    if (existing) {
      await sendTelegramMessage(chatId, '✅ Already saved!' );
      return;
    }

    // Fetch preview
    await sendTelegramMessage(chatId, '⏳ Saving your link...');
    
    const preview = await fetchLinkPreview(url);

    // Save to database
    const { error } = await supabaseAdmin.from('items').insert({
      user_id: userId,
      type: 'link',
      title: preview.title || url,
      description: preview.description,
      url,
      preview_image: preview.image,
      tags: [],
      status: 'unread',
      source: 'telegram',
      url_hash: urlHash,
      metadata: preview,
    });

    if (error) {
      console.error('DB insert error:', error);
      await sendTelegramMessage(chatId, '❌ Failed to save link.');
      return;
    }

    const titlePreview = (preview.title || url).substring(0, 40);
    await sendTelegramMessage(chatId, `✅ Saved: "${titlePreview}"`);
  } catch (error) {
    console.error('Link handler error:', error);
    await sendTelegramMessage(chatId, '❌ Invalid URL or failed to fetch preview.');
  }
}

async function handleNote(chatId: number, text: string, userId: string) {
  try {
    const title = text.substring(0, 60);

    const { error } = await supabaseAdmin.from('items').insert({
      user_id: userId,
      type: 'text',
      title,
      description: text,
      tags: [],
      status: 'unread',
      source: 'telegram',
    });

    if (error) {
      console.error('DB insert error:', error);
      await sendTelegramMessage(chatId, '❌ Failed to save note.');
      return;
    }

    await sendTelegramMessage(chatId, '✅ Note saved!');
  } catch (error) {
    console.error('Note handler error:', error);
    await sendTelegramMessage(chatId, '❌ Failed to save note.');
  }
}

async function handlePhotoMessage(
  chatId: number,
  message: TelegramMessage,
  userId: string,
  caption?: string
) {
  try {
    await sendTelegramMessage(chatId, '⏳ Saving image...');

    // Get largest photo
    const photo = message.photo?.[message.photo.length - 1];
    if (!photo) {
      await sendTelegramMessage(chatId, '❌ Failed to save image.');
      return;
    }

    const title = caption || 'Image from Telegram';
    const fileInfo = await getTelegramFile(photo.file_id);
    const filePath = fileInfo.file_path;
    const imageMimeType = resolveMimeType(undefined, filePath || '') || 'image/jpeg';
    const validation = validateImageFile(imageMimeType, fileInfo.file_size);

    if (!validation.valid || !filePath) {
      await sendTelegramMessage(chatId, '❌ Unsupported image file.');
      return;
    }

    const fileBuffer = await downloadTelegramFileWithRetry(filePath);
    const extension = getFileExtension(filePath) || 'jpg';
    const fileName = sanitizeStorageFileName(`${photo.file_id}.${extension}`);

    const cloudinaryUpload = await uploadBufferToCloudinary(fileBuffer, {
      folder: 'drop_it/images',
      fileName,
      mimeType: imageMimeType,
    });

    const { error } = await supabaseAdmin.from('items').insert({
      user_id: userId,
      type: 'image',
      title,
      file_url: cloudinaryUpload.secureUrl,
      file_mime_type: imageMimeType,
      file_size: fileInfo.file_size,
      cloudinary_public_id: cloudinaryUpload.publicId,
      storage_provider: 'cloudinary',
      preview_image: cloudinaryUpload.secureUrl,
      tags: [],
      status: 'unread',
      source: 'telegram',
      metadata: {
        telegram_file_id: photo.file_id,
        telegram_file_path: filePath,
        mime_type: imageMimeType,
        file_size: fileInfo.file_size,
        storage_provider: 'cloudinary',
        cloudinary_public_id: cloudinaryUpload.publicId,
      },
    });

    if (error) {
      console.error('DB insert error:', error);
      await sendTelegramMessage(chatId, '❌ Failed to save image.');
      return;
    }

    await sendTelegramMessage(chatId, '✅ Image saved!');
  } catch (error) {
    console.error('Photo handler error:', error);
    await sendTelegramMessage(chatId, '❌ Failed to save image.');
  }
}

async function handleDocumentMessage(
  chatId: number,
  document: TelegramMessage['document'],
  userId: string,
  caption?: string
) {
  try {
    if (!document) {
      await sendTelegramMessage(chatId, '❌ Failed to save document.');
      return;
    }

    await sendTelegramMessage(chatId, '⏳ Saving document...');

    const title = caption || document.file_name || 'Document';
    const fileInfo = await getTelegramFile(document.file_id);
    const filePath = fileInfo.file_path;
    const mimeType = resolveMimeType(document.mime_type, document.file_name || filePath || '');
    const validation = validateDocumentFile(mimeType, document.file_size || fileInfo.file_size);

    if (!validation.valid || !mimeType || !filePath) {
      await sendTelegramMessage(chatId, `❌ ${validation.reason || 'Unsupported document'}.`);
      return;
    }

    const fileBuffer = await downloadTelegramFileWithRetry(filePath);
    const extension = getFileExtension(document.file_name || filePath) || 'bin';
    const fileName = sanitizeStorageFileName(`${document.file_id}.${extension}`);

    let fileUrl: string | null = null;
    let storageProvider: 'cloudinary' | 'supabase-storage' = 'supabase-storage';
    let storageMetadata: Record<string, unknown> = {};
    const strategy = (process.env.FILE_STORAGE_STRATEGY || '').toLowerCase();
    const rules = strategy
      .split(',')
      .map((rule) => rule.trim())
      .filter(Boolean);
    const imageStorageRule =
      rules.find((rule) => rule.startsWith('image:'))?.split(':')[1] || 'cloudinary';
    const docStorageRule =
      rules.find((rule) => rule.startsWith('doc:'))?.split(':')[1] || 'supabase';
    const isImageDocument = mimeType.startsWith('image/');
    const sendToCloudinary = isImageDocument
      ? imageStorageRule === 'cloudinary'
      : docStorageRule === 'cloudinary';

    if (sendToCloudinary) {
      const cloudinaryUpload = await uploadBufferToCloudinary(fileBuffer, {
        folder: 'drop_it/documents',
        fileName,
        mimeType,
      });
      fileUrl = cloudinaryUpload.secureUrl;
      storageProvider = 'cloudinary';
      storageMetadata = {
        cloudinary_public_id: cloudinaryUpload.publicId,
      };
    } else {
      const upload = await uploadBufferToSupabaseStorage({
        userId,
        fileName,
        fileBuffer,
        mimeType,
      });

      fileUrl = upload.publicUrl || `supabase://${upload.bucket}/${upload.path}`;
      storageMetadata = {
        bucket: upload.bucket,
        path: upload.path,
      };
    }

    const itemType = mimeType.startsWith('image/') ? 'image' : 'pdf';
    const { error } = await supabaseAdmin.from('items').insert({
      user_id: userId,
      type: itemType,
      title,
      file_url: fileUrl,
      file_mime_type: mimeType,
      file_size: document.file_size || fileInfo.file_size,
      cloudinary_public_id:
        storageProvider === 'cloudinary' && typeof storageMetadata.cloudinary_public_id === 'string'
          ? storageMetadata.cloudinary_public_id
          : undefined,
      storage_provider: storageProvider,
      preview_image: mimeType.startsWith('image/') ? fileUrl || undefined : undefined,
      tags: [],
      status: 'unread',
      source: 'telegram',
      metadata: {
        telegram_file_id: document.file_id,
        telegram_file_path: filePath,
        original_file_name: document.file_name,
        mime_type: mimeType,
        file_size: document.file_size || fileInfo.file_size,
        storage_provider: storageProvider,
        ...storageMetadata,
      },
    });

    if (error) {
      console.error('DB insert error:', error);
      await sendTelegramMessage(chatId, '❌ Failed to save document.');
      return;
    }

    await sendTelegramMessage(chatId, '✅ Document saved!');
  } catch (error) {
    console.error('Document handler error:', error);
    await sendTelegramMessage(chatId, '❌ Failed to save document.');
  }
}

async function handleCommand(chatId: number, command: string, userId: string, telegramUserId?: number) {
  const cmd = command.split(' ')[0].toLowerCase();

  switch (cmd) {
    case '/start':
    case '/help':
      await sendTelegramMessage(
        chatId,
        `📱 drop_it Bot Commands:\n\n` +
        `/help - Show this message\n` +
        `/link <code> - Link this Telegram account\n` +
        `/recent - Show recent 5 unread items\n` +
        `${telegramUserId ? `\nYour Telegram User ID: ${telegramUserId}\n` : ''}` +
        `\nOr just send me:\n` +
        `🔗 Links\n` +
        `📝 Text notes\n` +
        `🖼️ Images\n` +
        `📄 Documents`
      );
      break;

    case '/recent':
      const { data: items } = await supabaseAdmin
        .from('items')
        .select('id, title, created_at')
        .eq('user_id', userId)
        .eq('status', 'unread')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!items || items.length === 0) {
        await sendTelegramMessage(chatId, '📭 No unread items yet!');
      } else {
        let message = '📋 Recent unread items:\n\n';
        items?.forEach((item: any, i: number) => {
          message += `${i + 1}. ${item.title?.substring(0, 40)}\n`;
        });
        await sendTelegramMessage(chatId, message);
      }
      break;

    default:
      await sendTelegramMessage(chatId, 'Unknown command. Type /help for available commands.');
  }
}

/**
 * Handle Telegram Bot deep linking token (/start <token>)
 */
async function handleDeepLinkToken(chatId: number, token: string, telegramUserId: number): Promise<boolean> {
  try {
    // 1. Look up the token in link_tokens
    const { data: linkToken, error: tokenError } = await supabaseAdmin
      .from('link_tokens')
      .select('user_id, expires_at')
      .eq('token', token)
      .single();

    if (tokenError || !linkToken) {
      await sendTelegramMessage(
        chatId,
        '❌ <b>Invalid or expired linking link.</b>\n\nPlease go to settings on your drop_it dashboard, generate a new link, and try again.',
        { parseMode: 'HTML' }
      );
      return false;
    }

    // 2. Check if the token has expired
    if (new Date(linkToken.expires_at) < new Date()) {
      await supabaseAdmin.from('link_tokens').delete().eq('token', token);
      await sendTelegramMessage(
        chatId,
        '❌ <b>The linking token has expired.</b>\n\nPlease generate a new link in your dashboard settings.',
        { parseMode: 'HTML' }
      );
      return false;
    }

    // 3. Associate the Telegram User ID with this user
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
      await sendTelegramMessage(chatId, '❌ Failed to link your account. Please try again later.');
      return false;
    }

    // 4. Clean up the token
    await supabaseAdmin.from('link_tokens').delete().eq('token', token);

    // 5. Send confirmation message
    await sendTelegramMessage(
      chatId,
      '🎉 <b>Account successfully linked!</b>\n\nYou can now forward or send me links, notes, images, or documents, and they will appear on your dashboard instantly.',
      { parseMode: 'HTML' }
    );

    return true;
  } catch (error) {
    console.error('handleDeepLinkToken error:', error);
    return false;
  }
}
