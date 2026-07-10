# API Reference Manual: drop_it

This file documents all backend API endpoints, detailing their paths, methods, authentication requirements, and payloads.

---

## 1. Authentication Endpoints

### 1.1. `GET /api/auth/[...nextauth]`
*   **Purpose**: Handles user authentication, session state, and sign-out actions.
*   **Method**: `GET` / `POST`
*   **Authentication**: None (handles authentication lifecycle).
*   **Input**: OAuth parameters (configured for GitHub).
*   **Output**: Session state token.
*   **Main Logic**: Authenticates users with GitHub, maps their profile email, and saves user details to the database.
*   **Files Involved**: [app/api/auth/[...nextauth]/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/auth/%5B...nextauth%5D/route.ts)

---

## 2. Item Endpoints

### 2.1. `GET /api/items`
*   **Purpose**: Retrieves captured items for the authenticated user's dashboard.
*   **Method**: `GET`
*   **Authentication**: Required (NextAuth session).
*   **Query Parameters**:
    *   `section`: `inbox` (default), `saved`, or `trash`.
    *   `state` / `status`: `all` (default), `unread`, or `read`.
    *   `time`: `all` (default), `today`, `yesterday`, `7d`, or `30d`.
    *   `folder_id`: Optional UUID of a folder.
    *   `q`: Optional search query string.
    *   `page`: Pagination page number (defaults to `1`, items per page = `20`).
*   **Output**:
    ```json
    {
      "data": [
        { "id": "uuid", "type": "link", "title": "Example Link", "status": "unread" }
      ],
      "total": 1,
      "page": 1,
      "perPage": 20,
      "counts": { "inbox": 1, "saved": 0, "trash": 0, "unread": 1, "read": 0 }
    }
    ```
*   **Files Involved**: [app/api/items/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/items/route.ts)

### 2.2. `POST /api/items`
*   **Purpose**: Creates a new item manually from the web dashboard.
*   **Method**: `POST`
*   **Authentication**: Required (NextAuth session).
*   **Request Body**:
    ```json
    {
      "type": "text",
      "title": "My Note Title",
      "description": "Optional body text details...",
      "url": "https://example.com",
      "file_url": null,
      "folder_id": null,
      "tags": ["tag1", "tag2"]
    }
    ```
*   **Output**: Created item object inside `{ data: item }` (HTTP status `201 Created`).
*   **Files Involved**: [app/api/items/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/items/route.ts)

### 2.3. `GET /api/items/[id]`
*   **Purpose**: Resolves an item's access URL. Generates a temporary signed URL if the item points to a private document in Supabase Storage.
*   **Method**: `GET`
*   **Authentication**: Required (NextAuth session).
*   **Output**:
    ```json
    {
      "data": {
        "url": "https://supabase-project.storage.signed-url-address...",
        "source": "signed_file_url"
      }
    }
    ```
*   **Files Involved**: [app/api/items/[id]/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/items/%5Bid%5D/route.ts)

### 2.4. `PATCH /api/items/[id]`
*   **Purpose**: Modifies item states (status, folder assignments, title renames).
*   **Method**: `PATCH`
*   **Authentication**: Required (NextAuth session).
*   **Request Body**: Contains an `action` property:
    *   `action: "toggle-read"`: Toggles status between `read` and `unread`.
    *   `action: "save"` / `"unsave"`: Star or un-star items.
    *   `action: "trash"` / `"restore"`: Move item to or from the trash.
    *   `action: "delete-forever"`: Permanently deletes the item.
    *   `action: "move-folder"`: Moves the item to a folder (requires `folder_id`).
    *   `action: "rename-title"`: Renames the item (requires `title`).
*   **Output**: Updated item record inside `{ data: updatedItem }`.
*   **Files Involved**: [app/api/items/[id]/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/items/%5Bid%5D/route.ts)

### 2.5. `DELETE /api/items/[id]`
*   **Purpose**: Soft-deletes an item by moving it to the trash.
*   **Method**: `DELETE`
*   **Authentication**: Required (NextAuth session).
*   **Output**: `{ "message": "Item moved to trash" }`.
*   **Files Involved**: [app/api/items/[id]/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/items/%5Bid%5D/route.ts)

---

## 3. Folder Endpoints

### 3.1. `GET /api/folders`
*   **Purpose**: Lists active folders and their item counts.
*   **Method**: `GET`
*   **Authentication**: Required (NextAuth session).
*   **Output**: `{ "data": [ { "id": "uuid", "name": "Work", "item_count": 5 } ] }`.
*   **Files Involved**: [app/api/folders/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/folders/route.ts)

### 3.2. `POST /api/folders`
*   **Purpose**: Creates a new folder.
*   **Method**: `POST`
*   **Authentication**: Required (NextAuth session).
*   **Request Body**: `{ "name": "Folder Name" }`.
*   **Output**: Created folder object inside `{ data: folder }`.
*   **Files Involved**: [app/api/folders/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/folders/route.ts)

### 3.3. `PATCH /api/folders/[id]`
*   **Purpose**: Renames a folder or changes its sorting position.
*   **Method**: `PATCH`
*   **Authentication**: Required (NextAuth session).
*   **Request Body**: `{ "name": "New Name", "position": 1 }`.
*   **Output**: Updated folder object inside `{ data: folder }`.
*   **Files Involved**: [app/api/folders/[id]/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/folders/%5Bid%5D/route.ts)

### 3.4. `DELETE /api/folders/[id]`
*   **Purpose**: Soft-deletes a folder and detaches all items inside it (by setting their `folder_id` to `null`).
*   **Method**: `DELETE`
*   **Authentication**: Required (NextAuth session).
*   **Output**: `{ "message": "Folder deleted" }`.
*   **Files Involved**: [app/api/folders/[id]/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/folders/%5Bid%5D/route.ts)

---

## 4. Account Linking Endpoints

### 4.1. `GET /api/linking`
*   **Purpose**: Generates a temporary link token for auto-linking a Telegram account.
*   **Method**: `GET`
*   **Authentication**: Required (NextAuth session).
*   **Output**:
    ```json
    {
      "ok": true,
      "token": "48_char_random_hex",
      "expiresAt": "ISO_timestamp",
      "linkUrl": "http://localhost:3000/link/48_char_random_hex"
    }
    ```
*   **Files Involved**: [app/api/linking/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/linking/route.ts)

### 4.2. `POST /api/linking`
*   **Purpose**: Redeems a linking token to associate a Telegram User ID with a dashboard user.
*   **Method**: `POST`
*   **Authentication**: None required (uses the token for authorization).
*   **Request Body**: `{ "token": "4char_token", "telegramUserId": 1387616783 }`.
*   **Output**: `{ "ok": true, "message": "Telegram account linked successfully" }`.
*   **Files Involved**: [app/api/linking/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/linking/route.ts)

---

## 5. Settings Panel Endpoints

### 5.1. `GET /api/user/telegram`
*   **Purpose**: Returns the user's linked Telegram ID and link code status.
*   **Method**: `GET`
*   **Authentication**: Required (NextAuth session).
*   **Output**:
    ```json
    {
      "telegramUserId": 1387616783,
      "hasActiveLinkCode": false,
      "linkCodeExpiresAt": null
    }
    ```
*   **Files Involved**: [app/api/user/telegram/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/user/telegram/route.ts)

### 5.2. `POST /api/user/telegram`
*   **Purpose**: Generates a 6-character link code for manual pairing (valid for 10 minutes).
*   **Method**: `POST`
*   **Authentication**: Required (NextAuth session).
*   **Output**: `{ "ok": true, "linkCode": "ABCDEF", "linkCodeExpiresAt": "ISO_timestamp" }`.
*   **Files Involved**: [app/api/user/telegram/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/user/telegram/route.ts)

### 5.3. `PATCH /api/user/telegram`
*   **Purpose**: Directly saves a user's Telegram ID from the settings panel.
*   **Method**: `PATCH`
*   **Authentication**: Required (NextAuth session).
*   **Request Body**: `{ "telegramUserId": "123456789" }`.
*   **Output**: `{ "ok": true, "telegramUserId": 123456789 }`.
*   **Files Involved**: [app/api/user/telegram/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/user/telegram/route.ts)

---

## 6. Telegram Bot Endpoints

### 6.1. `POST /api/telegram/webhook`
*   **Purpose**: Ingestion endpoint for Telegram updates.
*   **Method**: `POST`
*   **Authentication**: Custom webhook secret token verification.
*   **Request Header**: `x-telegram-bot-api-secret-token` must match `process.env.TELEGRAM_WEBHOOK_SECRET`.
*   **Request Body**: Telegram Update object.
*   **Output**: `{ "ok": true }` (immediately returned, processing runs asynchronously).
*   **Files Involved**: [app/api/telegram/webhook/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/telegram/webhook/route.ts)

---

## 7. Search Endpoint

### 7.1. `GET /api/search`
*   **Purpose**: Fallback search endpoint (filters items by text queries).
*   **Method**: `GET`
*   **Authentication**: Required (NextAuth session).
*   **Query Parameters**:
    *   `q`: Search query string (minimum 2 characters).
    *   `section`: Section filter (`inbox`, `saved`, or `trash`).
    *   `state`: State filter (`all`, `unread`, or `read`).
    *   `folder_id`: Optional folder filter.
*   **Output**: `{ "data": [ ...matching items ] }`.
*   **Files Involved**: [app/api/search/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/search/route.ts)
