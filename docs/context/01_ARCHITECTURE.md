# Architectural Guide: drop_it

This document provides a detailed layout of the architecture, communication layers, execution flows, request lifecycles, and dependency graphs that govern the `drop_it` system.

---

## 1. Architectural Layers & Responsibilities

The application is structured into four distinct layers to separate UI logic, routing, service integrations, and the data schema.

```
┌──────────────────────────────────────────────────────────┐
│                    1. FRONTEND CLIENT                    │
│   (Dashboard, Navbar, ItemGrid, ItemCard, Providers)     │
└────────────────────────────┬─────────────────────────────┘
                             │ (HTTPS / JSON API)
┌────────────────────────────▼─────────────────────────────┐
│                    2. NEXT.JS API ROUTES                 │
│      (auth, items, folders, linking, user/telegram)      │
└────────────────────────────┬─────────────────────────────┘
                             │ (Service Methods / Calls)
┌────────────────────────────▼─────────────────────────────┐
│                    3. SERVICE UTILITIES                  │
│   (auth, storage wrappers, telegram api, link parsing)   │
└────────────────────────────┬─────────────────────────────┘
                             │ (SQL / RPC / Storage API)
┌────────────────────────────▼─────────────────────────────┐
│                    4. DATABASE & STORAGE                 │
│      (Supabase tables, Storage buckets, Cloudinary)      │
└──────────────────────────────────────────────────────────┘
```

### 1.1. Frontend Client (Client-Side React)
*   **Location**: `app/dashboard/`, `app/components/`, `app/link/`, `app/auth/`
*   **Responsibility**: Renders the responsive user interface, manages client-side filters (view mode, sections, tags, folders, times), handles OAuth redirects, opens files securely via popup tabs, and triggers modal overlays.
*   **State Management**: Purely local React state hooks (`useState`, `useCallback`, `useEffect`) combined with server session states provided by NextAuth's client provider (`SessionProvider`).

### 1.2. Server Router & Controllers (Next.js API Routes)
*   **Location**: `app/api/`
*   **Responsibility**: Validates request sessions and JWT credentials, processes incoming HTTP requests (GET, POST, PATCH, DELETE), extracts parameters, interfaces with service handlers, and maps query responses back to the client.

### 1.3. Integration Services (Server-Side JS/TS Utilities)
*   **Location**: `lib/`
*   **Responsibility**: Contains logic to interact with external providers:
    *   `lib/telegram/`: Wraps the Telegram Bot API client, handles message parsing logic, and runs the dev update loop.
    *   `lib/storage/`: Manages Cloudinary image upload signatures and Supabase Storage uploads/signed-url generations.
    *   `lib/handlers/`: Scrapes content metadata using Microlink or fallback custom HTML matches.
    *   `lib/auth/`: Decodes request headers/cookies to resolve active NextAuth users in the Supabase database.

### 1.4. Database & Storage Layer (Supabase & Cloudinary)
*   **Location**: `supabase/migrations/`
*   **Responsibility**: Holds data records, enforces foreign key relationships, triggers auto-timestamps, handles soft-delete purges via Postgres RPCs, and serves CDN images and document assets.

---

## 2. Ingestion & Capture Flow (Telegram to Database)

When a message is sent to the Telegram bot, it triggers the capture pipeline. Below is the sequence:

```mermaid
sequenceDiagram
    autonumber
    actor User as Telegram User
    participant Telegram as Telegram Servers
    participant App as Next.js API / Polling
    participant Storage as Cloudinary / Supabase Storage
    participant DB as Supabase DB

    User->>Telegram: Sends Message (Text, Link, or Media)
    Telegram->>App: Deliver Update (Webhook POST / Polling updates)
    Note over App: Message Handler parses incoming update

    App->>DB: Query User matching sender's telegram_user_id
    alt User Not Found
        DB-->>App: Return empty
        App->>Telegram: Send welcome message & linking instructions
    else User Found
        DB-->>App: Return User UUID

        alt Content is Link
            App->>App: fetchLinkPreview(url) via Microlink / fallbacks
            App->>DB: Insert item (type: 'link', url_hash)
            App->>Telegram: Send "✅ Saved: [Title]"
        else Content is Plain Note
            App->>DB: Insert item (type: 'text', content)
            App->>Telegram: Send "✅ Note saved!"
        else Content is Image / Document
            App->>Telegram: Send "⏳ Saving image/document..."
            App->>Telegram: Fetch file info via getFile(file_id)
            App->>Telegram: Download binary buffer
            App->>Storage: Upload buffer (Cloudinary or Supabase Storage)
            Storage-->>App: Return secure URL & public ID
            App->>DB: Insert item (type: 'image'/'pdf', file_url, storage metadata)
            App->>Telegram: Send "✅ Saved!"
        end
    end
```

---

## 3. Web Request Lifecycle (Dashboard Actions)

How requests from the client move through the API route structure:

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant API as Next.js API Route (/api/items/[id])
    participant Auth as resolveRequestDbUser
    participant DB as Supabase DB
    participant SupabaseStorage as Supabase Storage

    User->>API: PATCH /api/items/123-abc { action: "save" }
    API->>Auth: Resolve request user session / JWT
    alt No valid token/session
        Auth-->>API: Return null
        API-->>User: 401 Unauthorized
    else User ID Resolved
        Auth-->>API: Return { id: "user-uuid" }
        API->>DB: Update items table (is_saved = true, updated_at = now)
        alt Database Success
            DB-->>API: Return updated item
            API-->>User: 200 OK { data: updatedItem }
        else Database Error
            DB-->>API: Return error
            API-->>User: 500 Internal Server Error
        end
    end

    Note over User, API: Requesting private file signed URL
    User->>API: GET /api/items/123-abc (Open item request)
    API->>Auth: Resolve request user
    API->>DB: Fetch file_url for item 123-abc
    DB-->>API: Return "supabase://documents/user-uuid/filename.pdf"
    API->>API: Parse bucket ("documents") and path
    API->>SupabaseStorage: Request Signed URL (expiresIn = 3600s)
    SupabaseStorage-->>API: Return temporary HTTPS signed URL
    API-->>User: 200 OK { data: { url: signedUrl, source: "signed_file_url" } }
    User->>User: Open URL in secure new tab
```

---

## 4. Control Flow: Polling vs. Webhook Mode

The bot ingestion operates in two mutually exclusive modes determined by `TELEGRAM_MODE`:

### 4.1. Local Development (Polling Mode)
1.  On Next.js development server boot, `instrumentation.ts` triggers `startTelegramPolling()`.
2.  `pollingService.ts` checks global variables to prevent duplicate loops, makes an HTTP call to delete existing webhook URLs, and starts an asynchronous loop (`runPollingLoop`).
3.  The loop sends a periodic POST to `api.telegram.org/bot<token>/getUpdates` with a timeout of 25 seconds.
4.  Updates are processed sequentially, updating the offset pointer (`update_id + 1`) to mark messages as acknowledged.
5.  If a network error occurs, the process waits for `TELEGRAM_POLLING_INTERVAL_MS` before retrying.

### 4.2. Production (Webhook Mode)
1.  The developer registers the webhook URL `/api/telegram/webhook` with Telegram.
2.  For every incoming message, Telegram sends a POST request containing the payload and a secret header `x-telegram-bot-api-secret-token`.
3.  The API route checks the secret using timing-safe comparisons to prevent timing attacks.
4.  Once validated, the route fires `handleTelegramMessage(update)` asynchronously (without waiting for resolution) and immediately sends back a `200 OK` response to Telegram. This prevents Telegram from retrying the request due to processing delays.

---

## 5. Media Routing Strategy
The strategy used to write capturing files is determined by `FILE_STORAGE_STRATEGY` in the format `image:cloudinary,doc:supabase`:

```
Incoming Media File
         │
         ├──► Is MIME Type image/* ?
         │          │
         │          ├──► Yes ──► Send to Cloudinary CDN ──► Stored as HTTPS URL
         │          │
         │          └──► No ───► Send to Supabase Storage ──► Stored as private URI (supabase://...)
         │
         └──► Fallback/Configuration Override (env file_storage_strategy)
```
This partition leverages Cloudinary for fast browser image loading and resizing while securing sensitive files and documents inside Supabase Private Storage buckets.
