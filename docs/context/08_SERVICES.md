# Services Index: drop_it

This file documents the application's backend services and integration modules.

---

## 1. Telegram Polling Loop

### `pollingService.ts`
*   **Path**: [lib/telegram/pollingService.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/telegram/pollingService.ts)
*   **Responsibility**: Polls for Telegram Bot updates in local development, removing the need for public webhooks or tunneling (e.g. ngrok).
*   **Public Methods**:
    *   `startTelegramPolling()`: Removes existing webhooks and starts the polling loop.
    *   `stopTelegramPolling()`: Stops the polling loop.
*   **Dependencies**: `lib/telegram/telegramApi.ts` (`deleteWebhook`, `getUpdates`), `lib/telegram/messageHandler.ts` (`handleTelegramMessage`)
*   **Used By**: [instrumentation.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/instrumentation.ts)

---

## 2. Telegram Bot API Integration

### `telegramApi.ts`
*   **Path**: [lib/telegram/telegramApi.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/telegram/telegramApi.ts)
*   **Responsibility**: HTTP client wrapper for the Telegram Bot API.
*   **Public Methods**:
    *   `sendTelegramMessage(chatId, text, options)`: Sends text messages (supports HTML formatting).
    *   `setWebhook(webhookUrl)`: Registers a webhook URL with Telegram.
    *   `deleteWebhook(dropPendingUpdates)`: Unregisters the webhook URL.
    *   `getUpdates(options)`: Fetches recent updates from Telegram.
    *   `getTelegramFile(fileId)`: Resolves a Telegram file ID to get its size and file path.
    *   `downloadTelegramFileWithRetry(filePath, maxAttempts)`: Downloads files from Telegram with retries.
*   **Dependencies**: Standard `fetch` API.
*   **Used By**: `pollingService.ts`, `messageHandler.ts`

---

## 3. Telegram Message Parser

### `messageHandler.ts`
*   **Path**: [lib/telegram/messageHandler.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/telegram/messageHandler.ts)
*   **Responsibility**: Parses incoming Telegram updates and routes them to the database or storage.
*   **Public Methods**:
    *   `handleTelegramMessage(update)`: Core entry point. Validates user registrations, parses content types, and saves items.
*   **Dependencies**: `lib/supabase.ts`, `lib/handlers/linkHandler.ts`, `lib/storage/*`
*   **Used By**: `pollingService.ts` and the webhook endpoint [app/api/telegram/webhook/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/telegram/webhook/route.ts)

---

## 4. Link Metadata Scraper

### `linkHandler.ts`
*   **Path**: [lib/handlers/linkHandler.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/handlers/linkHandler.ts)
*   **Responsibility**: Scrapes titles, descriptions, and preview images from web links.
*   **Public Methods**:
    *   `fetchLinkPreview(url)`: Fetches previews using Microlink or fallback tag parsing.
    *   `generateUrlHash(url)`: Generates SHA-256 hashes of URLs to prevent duplicate links.
*   **Dependencies**: Standard `fetch` API.
*   **Used By**: `messageHandler.ts`

---

## 5. Cloudinary Storage Service

### `cloudinary.ts`
*   **Path**: [lib/storage/cloudinary.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/storage/cloudinary.ts)
*   **Responsibility**: Manages image uploads to Cloudinary.
*   **Public Methods**:
    *   `uploadBufferToCloudinary(buffer, options)`: Signs and uploads image buffers.
*   **Dependencies**: `crypto`, `FormData`, and `Blob` APIs.
*   **Used By**: `messageHandler.ts`

---

## 6. Supabase Storage Service

### `supabaseStorage.ts`
*   **Path**: [lib/storage/supabaseStorage.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/storage/supabaseStorage.ts)
*   **Responsibility**: Manages file uploads and signed URLs in Supabase Storage.
*   **Public Methods**:
    *   `uploadBufferToSupabaseStorage(options)`: Uploads file buffers to a Supabase bucket.
    *   `createSupabaseSignedUrl(options)`: Generates signed access URLs for private files.
    *   `parseSupabaseStorageUri(uri)`: Parses `supabase://` URIs to extract bucket and path names.
*   **Dependencies**: `lib/supabase.ts`
*   **Used By**: `messageHandler.ts` and the items API endpoint `/api/items/[id]`.

---

## 7. Authentication Request Resolver

### `resolveRequestDbUser.ts`
*   **Path**: [lib/auth/resolveRequestDbUser.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/auth/resolveRequestDbUser.ts)
*   **Responsibility**: Authenticates API requests by resolving the session or JWT token to a user in the database.
*   **Public Methods**:
    *   `resolveRequestDbUser(req)`: Returns the authenticated user's database object.
*   **Dependencies**: `next-auth`, `lib/auth/resolveDbUser.ts`
*   **Used By**: Database CRUD endpoints (`/api/items`, `/api/folders`, `/api/user/telegram`).
