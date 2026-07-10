# System Knowledge Graph: drop_it

This document provides a visualization of the relationships between components, API routes, services, database tables, and external integrations in the `drop_it` system.

---

## 1. System Ingestion Graph

This graph shows how messages sent to the Telegram bot are processed and stored in the database.

```mermaid
graph TD
    %% Entry Sources
    User((Telegram User)) -->|Sends capture| BotAPI[Telegram Bot API]
    BotAPI -->|Triggers Webhook| WebhookRoute[app/api/telegram/webhook/route.ts]
    BotAPI -.->|Polled by| PollingService[lib/telegram/pollingService.ts]

    %% Code Execution
    WebhookRoute -->|POST| MsgHandler[lib/telegram/messageHandler.ts]
    PollingService -->|Fetch Loop| MsgHandler

    %% User Identification
    MsgHandler -->|Queries| DB_Users[(users table)]

    %% Media & URL Processing
    MsgHandler -->|Extracts link| LinkScraper[lib/handlers/linkHandler.ts]
    MsgHandler -->|Downloads media| FileValidator[lib/storage/fileValidation.ts]
    FileValidator -->|Uploads Image| Cloudinary[lib/storage/cloudinary.ts]
    FileValidator -->|Uploads Document| SupabaseStorage[lib/storage/supabaseStorage.ts]

    %% Database Recording
    LinkScraper -->|Inserts| DB_Items[(items table)]
    Cloudinary -->|Inserts| DB_Items
    SupabaseStorage -->|Inserts| DB_Items
```

---

## 2. Dashboard Interface Graph

This graph shows how the dashboard UI queries the API and handles updates.

```mermaid
graph TD
    %% Dashboard Component
    Dashboard[app/dashboard/page.tsx] -->|Mounts| Navbar[app/components/Navbar.tsx]
    Dashboard -->|Mounts| ItemGrid[app/components/ItemGrid.tsx]
    ItemGrid -->|Renders| ItemCard[app/components/ItemCard.tsx]
    ItemGrid -->|Renders| ListRow[app/components/ItemGrid.tsx:ListRow]

    %% API Requests
    Dashboard -->|GET /api/folders| FoldersAPI[app/api/folders/route.ts]
    Dashboard -->|GET /api/items| ItemsAPI[app/api/items/route.ts]
    Navbar -->|GET /api/user/telegram| UserTelegramAPI[app/api/user/telegram/route.ts]

    %% Action Handlers
    ItemCard -->|PATCH /api/items/id| ItemDetailsAPI[app/api/items/id/route.ts]
    ListRow -->|PATCH /api/items/id| ItemDetailsAPI
    ItemCard -->|DELETE /api/items/id| ItemDetailsAPI
    Navbar -->|POST /api/user/telegram| UserTelegramAPI
    Navbar -->|PATCH /api/user/telegram| UserTelegramAPI
    Navbar -->|GET /api/linking| LinkingAPI[app/api/linking/route.ts]

    %% DB Interactions
    FoldersAPI -->|Query| DB_Folders[(folders table)]
    ItemsAPI -->|Query| DB_Items[(items table)]
    ItemDetailsAPI -->|Update| DB_Items
    UserTelegramAPI -->|Update| DB_Users[(users table)]
    LinkingAPI -->|Insert token| DB_LinkTokens[(link_tokens table)]
```

---

## 3. Account Auto-Linking Graph

This graph shows the flow for auto-linking a Telegram account to a dashboard user account.

```mermaid
graph TD
    %% Token Creation
    DashboardSettings[Navbar Settings Panel] -->|Click Generate Link| GET_Linking[GET /api/linking]
    GET_Linking -->|Insert token| DB_LinkTokens[(link_tokens table)]
    GET_Linking -->|Returns URL| LinkPage[app/link/token/page.tsx]

    %% Token Redemption
    LinkPage -->|User enters Telegram ID| POST_Linking[POST /api/linking]
    POST_Linking -->|Verify token| DB_LinkTokens
    POST_Linking -->|Update user's telegram_user_id| DB_Users[(users table)]
    POST_Linking -->|Delete token| DB_LinkTokens
    POST_Linking -->|Redirects user| Dashboard[app/dashboard/page.tsx]
```
