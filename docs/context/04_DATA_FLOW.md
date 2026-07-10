# Data Flow Directory: drop_it

This document maps out the system's key data flows, tracking how data is ingested, authenticated, saved, and modified across different services.

---

## 1. Telegram Message Capture Ingestion Flow
This flow tracks how messages sent to the Telegram bot are saved to the user's dashboard database.

```
[ Telegram Chat Client ]
         │ (User sends link/text/media)
         ▼
[ Telegram Server API ]
         │ (Webhook POST / Polling updates)
         ▼
[ Next.js Ingestion Listener ] ──► (Verify webhook secret header)
         │
         ▼
[ messageHandler.ts ]
         │
         ├──► 1. Query DB for User by sender's telegram_user_id
         │      │
         │      └──► [Not Found] ──► Send instructions with Telegram ID ──► EXIT
         │
         ├──► 2. Resolve content type:
         │      │
         │      ├──► Text (Link)  ──► fetchLinkPreview() ──► Insert link item
         │      ├──► Text (Plain) ──► Insert note text item
         │      └──► Image / Doc  ──► getTelegramFile() ──► downloadFile()
         │                               │
         │                               ▼
         │                        [ File Validation ]
         │                               │
         │                               ▼
         │                        [ Storage Router ]
         │                               │
         │             ┌─────────────────┴─────────────────┐
         │             │ (MIME = image/*)                  │ (MIME = document/*)
         │             ▼                                   ▼
         │       [ Cloudinary ]                   [ Supabase Storage ]
         │             │                                   │
         │             └─────────────────┬─────────────────┘
         │                               ▼
         │                        Insert media item
         │
         ▼
[ Send Telegram Confirmation ]
```

---

## 2. Web UI Request Flow
This flow tracks how user actions on the dashboard are resolved and saved to the database.

```
[ Dashboard UI Interaction ] (e.g. click "Mark Read")
         │
         ▼
[ Client fetch() Call ] ──► PATCH /api/items/[id] { action: "mark-read" }
         │
         ▼
[ API Controller Resolver ]
         │
         ├──► 1. Resolve Session User (resolveRequestDbUser)
         │      │
         │      └──► [Session Invalid] ──► Return 401 Unauthorized
         │
         ├──► 2. Validate Item Ownership (user_id == active_user_id)
         │      │
         │      └──► [Not Owner] ──► Return 404 Not Found
         │
         └──► 3. Apply DB Update (status = 'read', updated_at = now)
                  │
                  ▼
[ Return Updated Item JSON ] ──► (Client UI updates status badges)
```

---

## 3. Account Auto-Linking Flow
This flow tracks how a Telegram ID is securely paired with a dashboard account.

```
[ Dashboard settings ] ──► Click "Generate Link"
         │
         ▼
[ GET /api/linking ]
         │
         ├──► 1. Generate 24-character random token hex
         ├──► 2. Insert into link_tokens table (expires in 24 hours)
         └──► 3. Return URL: /link/[token]
                  │
                  ▼
[ Client copies link & visits page ] ──► (Required to sign in first)
         │
         ▼
[ /link/[token]/page.tsx ]
         │ (User enters Telegram ID provided by bot)
         ▼
[ POST /api/linking ] { token, telegramUserId }
         │
         ├──► 1. Lookup link_tokens table
         │      ├──► Token not found/expired ──► Return Error
         │      └──► Token valid ──► Get user_id
         │
         ├──► 2. Update users table (set telegram_user_id = input_id)
         ├──► 3. Delete redeemed link token
         │
         ▼
[ Success Message ] ──► Redirect user to /dashboard
```

---

## 4. Authentication & DB User Resolution Flow
This flow tracks how user identities are synced and verified across requests.

```
[ OAuth GitHub Sign In ]
         │
         ▼
[ NextAuth SignIn Callback ]
         │
         ├──► 1. Parse GitHub ID and email (with fallback logic)
         └──► 2. Upsert into users table (onConflict: email)
                  │
                  ▼
[ JWT Callback ] ──► Encode githubId and session payload
         │
         ▼
[ API Request Auth Check ] (resolveRequestDbUser)
         │
         ├──► 1. Fetch server session (getServerSession)
         │      ├──► Session exists ──► Query user UUID in DB
         │      └──► No session ──► Decode JWT cookie
         │                             │
         │                             ▼
         │                        Query user UUID in DB
         │
         ▼
[ Return User DB Object ] ──► (Authorized scope for SQL operations)
```

---

## 5. Storage Routing Strategy
How incoming files are routed to different storage providers:

| Input File Type | File Validation Check | Target Storage Provider | Database Reference | Access Policy |
| :--- | :--- | :--- | :--- | :--- |
| **Image** (`.jpg`, `.png`, `.webp`, `.gif`) | Size < 20MB, Valid image MIME | **Cloudinary** | Saved as public HTTPS URL | Publicly accessible URL |
| **Document** (`.pdf`, `.doc`, `.docx`, `.txt`) | Size < 20MB, Valid document MIME | **Supabase Storage** | Saved as private URI (`supabase://documents/...`) | Accessible only via short-lived Signed URLs (1 hour expiry) |

---

## 6. Trashed Item Lifecycle & Auto-Purge Flow
This flow tracks how items are soft-deleted, restored, or permanently deleted.

```
   Active Item (deleted_at IS NULL)
        │
        ├──► User clicks "Delete" (DELETE API)
        │         ▼
        │    Soft Deleted (deleted_at = now)
        │         │
        │         ├──► User clicks "Restore" (PATCH action: 'restore')
        │         │         ▼
        │         │    Active Item (deleted_at = NULL)
        │         │
        │         ├──► User clicks "Delete Forever" (PATCH action: 'delete-forever')
        │         │         ▼
        │         │    Wiped from Database (hard delete)
        │         │
        │         └──► Automatic Purge (cron / GET requests)
        │                   ▼
        │              If deleted_at is older than 7 days, delete permanently
```
> [!NOTE]
> Database-level purges are triggered as a non-blocking hook (`purge_expired_trashed_items`) whenever a user loads their items list via `GET /api/items`.
