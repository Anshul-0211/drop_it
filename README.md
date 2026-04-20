# drop_it

drop_it captures links, notes, and media from Telegram into a searchable dashboard.

## Account Linking: Automatic Flow

When a Telegram user first messages your bot, they will see instructions to link their account:

1. **Sign In** — User opens the app and signs in with GitHub: `https://drop_it.vercel.app/auth/signin`

2. **Generate Link** — In dashboard Settings (top-right menu), user clicks **"Generate Link"**

3. **Auto-Link** — User clicks **"Open & Link Now"** button or visits the generated URL and enters their **Telegram ID** (provided in the bot's welcome message as `<code>123456789</code>`)

4. **Done** — Account is now linked. Subsequent messages from that Telegram ID are automatically saved to the dashboard.

## Local Development (Polling Mode)

The app supports Telegram polling mode for local development—no ngrok needed.

1. Update `.env.local`:

```dotenv
TELEGRAM_BOT_TOKEN=your_full_bot_token
TELEGRAM_MODE=polling
TELEGRAM_POLLING_INTERVAL_MS=1500
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

2. Start the app:

```bash
npm run dev
```

Polling auto-starts via `instrumentation.ts`, and messages are processed through the same handler as webhook mode.

3. Send a test message to your bot—it will respond with linking instructions.

## Production (Webhook Mode)

Use webhook mode in production for reliability and real-time updates.

1. Set env vars:

```dotenv
TELEGRAM_BOT_TOKEN=your_full_bot_token
TELEGRAM_MODE=webhook
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/api/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=your_random_secret
NEXTAUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

2. Register webhook with Telegram:

```bash
curl -X POST "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourdomain.com/api/telegram/webhook",
    "secret_token": "your_random_secret"
  }'
```

3. Verify webhook was registered:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

## Database Setup

1. Run migrations in Supabase:

```sql
-- 001_init.sql - Initial schema
-- 002_telegram_link_code.sql - Telegram columns (can be skipped if using new auto-linking)
-- 003_create_link_tokens_table.sql - Linking tokens for new flow
```

The `link_tokens` table stores temporary tokens used during the account linking process. Tokens expire after 24 hours.

## Media Storage Setup (Microlink + Cloudinary + Supabase Storage)

### 1) Environment Variables

Update `.env.local`:

```dotenv
# Microlink for link previews
MICROLINK_API_KEY=your_microlink_api_key

# Cloudinary for image delivery
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Supabase Storage for documents
SUPABASE_DOCUMENTS_BUCKET=documents
SUPABASE_DOCUMENTS_BUCKET_PUBLIC=false

# Routing strategy for Telegram files
FILE_STORAGE_STRATEGY=image:cloudinary,doc:supabase
```

### 2) Apply migration 007

Run `supabase/migrations/007_media_storage_support.sql` in Supabase SQL editor.

This migration:
1. Adds media metadata columns to `public.items`.
2. Creates/ensures `documents` storage bucket.
3. Adds service-role storage policies for that bucket.

### 3) Storage behavior in this implementation

1. Link previews continue using Microlink fallback chain.
2. Telegram photos are uploaded to Cloudinary and stored as `file_url` and `preview_image`.
3. Telegram documents are uploaded to Supabase Storage.
4. Private Storage documents are saved as `supabase://bucket/path` and resolved at open-time using signed URLs.

### 4) Open behavior

When opening an item from dashboard list/grid:
1. `item.url` is opened directly.
2. Public `item.file_url` is opened directly.
3. `supabase://...` URLs are resolved via `GET /api/items/[id]` to a signed URL and then opened.

## Scripts

```bash
npm run dev          # Start dev server with polling
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Lint code
```
