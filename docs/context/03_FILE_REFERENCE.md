# File Reference: drop_it

This file documents the key source files in the `drop_it` project, detailing their purpose, exports, dependencies, and implementation notes.

---

## 1. Startup & Global Config Files

### `instrumentation.ts`
*   **Path**: [instrumentation.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/instrumentation.ts)
*   **Purpose**: Startup bootstrapper executed by Next.js when the dev server initializes.
*   **Exports**: `register()` (async function)
*   **Key Functions**:
    *   `register()`: Starts the background Telegram polling service if running locally in development mode.
*   **Dependencies**: `lib/telegram/pollingService.ts`
*   **Imports**: Dev runtime checks.
*   **Implementation Notes**: It ensures that background services are registered only in non-production environments and skips runtime checks on Edge routes.

---

## 2. API Endpoints (app/api/)

### `app/api/auth/[...nextauth]/route.ts`
*   **Path**: [app/api/auth/[...nextauth]/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/auth/%5B...nextauth%5D/route.ts)
*   **Purpose**: Main endpoint and option configuration file for NextAuth OAuth authentication.
*   **Exports**: `authOptions` (AuthOptions object), `GET`, `POST` (Route handlers)
*   **Key Callbacks**:
    *   `signIn`: Triggered on GitHub OAuth login. Upserts user data (email and GitHub ID) in the database.
    *   `session`: Maps the database user UUID to the web session object.
    *   `jwt`: Populates token properties with the user's provider account ID.
*   **Dependencies**: `next-auth`, `lib/supabase.ts`
*   **Who Imports It**: `lib/auth/resolveRequestDbUser.ts` (imports `authOptions`)
*   **Implementation Notes**: DB-level sync operations inside the `signIn` callback are wrapped in try-catch statements. If the database update fails, it does not block the user's session from completing.

### `app/api/telegram/webhook/route.ts`
*   **Path**: [app/api/telegram/webhook/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/telegram/webhook/route.ts)
*   **Purpose**: Webhook listener for incoming Telegram updates in production.
*   **Exports**: `POST`, `GET` (Route handlers)
*   **Key Functions**:
    *   `verifyTelegramWebhook(secretToken)`: Performs a timing-safe evaluation of the bot secret token.
    *   `POST(req)`: Validates headers, parses update details, starts message processing asynchronously, and returns a `200 OK` response to Telegram.
*   **Dependencies**: `crypto`, `lib/telegram/messageHandler.ts`
*   **Implementation Notes**: Processing is asynchronous (using a `.catch(...)` callback instead of `await`). This ensures the endpoint responds immediately, preventing Telegram from marking it as timed out and retrying.

### `app/api/items/route.ts`
*   **Path**: [app/api/items/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/items/route.ts)
*   **Purpose**: Handles listing dashboard items (GET) and web-dashboard creation (POST).
*   **Exports**: `GET`, `POST` (Route handlers)
*   **Key Functions**:
    *   `GET(req)`: Fetches items with support for search, tag filtering, folders, time ranges, and pagination.
    *   `POST(req)`: Creates a new capture item directly from the web dashboard.
*   **Dependencies**: `lib/supabase.ts`, `lib/auth/resolveRequestDbUser.ts`
*   **Implementation Notes**: Includes robust error handling (`isMissingLifecycleSchema`) to fall back gracefully if migrations 005 or 006 have not yet been applied to the database.

### `app/api/items/[id]/route.ts`
*   **Path**: [app/api/items/[id]/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/items/%5Bid%5D/route.ts)
*   **Purpose**: Coordinates detail lookups, state updates, soft-deletes, and signed URL generation for items.
*   **Exports**: `GET`, `PATCH`, `DELETE` (Route handlers)
*   **Key Functions**:
    *   `GET(req, { params })`: Generates a temporary signed URL if opening a private Supabase Storage item.
    *   `PATCH(req, { params })`: Handles actions like `toggle-read`, `save`, `trash`, `restore`, and folder assignments.
    *   `DELETE(req, { params })`: Moves an item to the trash (soft-delete).
*   **Dependencies**: `lib/supabase.ts`, `lib/storage/supabaseStorage.ts`
*   **Implementation Notes**: A `delete-forever` PATCH action is used to permanently remove items. This action requires the item's `deleted_at` field to be set first (i.e. it must already be in the trash).

### `app/api/linking/route.ts`
*   **Path**: [app/api/linking/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/linking/route.ts)
*   **Purpose**: Generates and redeems temporary tokens for account auto-linking.
*   **Exports**: `GET`, `POST` (Route handlers)
*   **Key Functions**:
    *   `GET()`: Generates a 24-character linking token with a 24-hour expiration.
    *   `POST(req)`: Validates the token and updates the user's record with their Telegram ID.
*   **Dependencies**: `lib/supabase.ts`, `next-auth`
*   **Implementation Notes**: Deletes the linking token from the database immediately after a successful link.

### `app/api/user/telegram/route.ts`
*   **Path**: [app/api/user/telegram/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/user/telegram/route.ts)
*   **Purpose**: Handles settings panel queries, manual links, and generated link codes.
*   **Exports**: `GET`, `POST`, `PATCH` (Route handlers)
*   **Key Functions**:
    *   `POST()`: Generates a 6-character link code for manual pairing (valid for 10 minutes).
    *   `PATCH(req)`: Directly saves a user's Telegram ID from the dashboard settings.
*   **Dependencies**: `lib/supabase.ts`, `next-auth`
*   **Implementation Notes**: Handles missing database columns gracefully by falling back to standard user details if the schema migration has not been applied.

---

## 3. Core Services & Domain Logic (lib/)

### `lib/telegram/messageHandler.ts`
*   **Path**: [lib/telegram/messageHandler.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/telegram/messageHandler.ts)
*   **Purpose**: Decodes incoming Telegram bot messages and routes them to the database or storage.
*   **Exports**: `handleTelegramMessage(update)` (async function)
*   **Key Functions**:
    *   `handleTelegramMessage()`: Entry point. Sends linking instructions if the sender's Telegram ID is not found.
    *   `handleLink(chatId, url, userId)`: Scrapes link metadata and saves it to the database.
    *   `handlePhotoMessage(...)`: Processes incoming images, uploading them to Cloudinary.
    *   `handleDocumentMessage(...)`: Routes documents to Cloudinary or Supabase Storage based on the configured strategy.
*   **Dependencies**: `lib/supabase.ts`, `lib/handlers/linkHandler.ts`, `lib/storage/*`
*   **Who Imports It**: Webhook route and polling service.
*   **Implementation Notes**: This handler performs duplicate detection using a SHA-256 hash of the URL to prevent the same link from being saved multiple times.

### `lib/telegram/pollingService.ts`
*   **Path**: [lib/telegram/pollingService.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/telegram/pollingService.ts)
*   **Purpose**: Implements the development polling loop for fetching Telegram updates.
*   **Exports**: `startTelegramPolling()`, `stopTelegramPolling()`
*   **Key Functions**:
    *   `runPollingLoop()`: Sends periodic `getUpdates` requests and processes new messages.
*   **Dependencies**: `lib/telegram/telegramApi.ts`, `lib/telegram/messageHandler.ts`
*   **Who Imports It**: `instrumentation.ts`
*   **Implementation Notes**: Uses `globalThis` properties to track the update offset and prevent multiple polling loops from running concurrently.

### `lib/telegram/telegramApi.ts`
*   **Path**: [lib/telegram/telegramApi.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/telegram/telegramApi.ts)
*   **Purpose**: HTTP client wrapper for the Telegram Bot API.
*   **Exports**: `sendTelegramMessage`, `getUpdates`, `deleteWebhook`, `getTelegramFile`, `downloadTelegramFileWithRetry`
*   **Key Functions**:
    *   `downloadTelegramFileWithRetry(...)`: Downloads files with exponential backoff retries.
*   **Dependencies**: Standard `fetch` API.
*   **Who Imports It**: Polling service, message handler, and webhook setup.

### `lib/storage/supabaseStorage.ts`
*   **Path**: [lib/storage/supabaseStorage.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/storage/supabaseStorage.ts)
*   **Purpose**: Manages file uploads and signed URLs in Supabase Storage.
*   **Exports**: `uploadBufferToSupabaseStorage`, `createSupabaseSignedUrl`, `parseSupabaseStorageUri`
*   **Dependencies**: `lib/supabase.ts`
*   **Who Imports It**: Message handler and item routes.
*   **Implementation Notes**: Uploads are saved using the path structure `[user_id]/[timestamp]-[filename]`.

### `lib/storage/cloudinary.ts`
*   **Path**: [lib/storage/cloudinary.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/storage/cloudinary.ts)
*   **Purpose**: Manages image uploads to Cloudinary using secure signatures.
*   **Exports**: `uploadBufferToCloudinary`
*   **Key Functions**:
    *   `signUpload(...)`: Generates SHA-1 HMAC signatures for authenticated uploads.
*   **Dependencies**: `crypto`, `FormData` APIs.
*   **Who Imports It**: Message handler.

### `lib/handlers/linkHandler.ts`
*   **Path**: [lib/handlers/linkHandler.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/handlers/linkHandler.ts)
*   **Purpose**: Scrapes metadata (title, description, image) from web links.
*   **Exports**: `fetchLinkPreview`, `generateUrlHash`
*   **Key Functions**:
    *   `fetchLinkPreview(url)`: Scrapes metadata using a fallback chain (Microlink API -> Meta tags -> HTML title).
*   **Dependencies**: Standard `fetch` API, `crypto` hashing.
*   **Who Imports It**: Message handler.

### `lib/auth/resolveRequestDbUser.ts`
*   **Path**: [lib/auth/resolveRequestDbUser.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/auth/resolveRequestDbUser.ts)
*   **Purpose**: Authenticates API requests by resolving the session or JWT token to a user in the database.
*   **Exports**: `resolveRequestDbUser(req)`
*   **Dependencies**: `next-auth`, `lib/auth/resolveDbUser.ts`
*   **Who Imports It**: Items, folders, and settings API routes.
*   **Implementation Notes**: Decodes session cookies using the NextAuth token helper as a fallback if `getServerSession` is not available.
