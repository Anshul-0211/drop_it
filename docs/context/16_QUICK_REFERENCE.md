# Quick Reference Cheat Sheet: drop_it

A one-page cheat sheet for the `drop_it` codebase.

---

## 1. Directory Map

| Path | Purpose |
| :--- | :--- |
| `app/api/telegram/webhook/` | Entry point for production webhooks from Telegram. |
| `app/api/items/` | Backend API for fetching and creating dashboard items. |
| `app/api/folders/` | Backend API for folder CRUD operations. |
| `app/api/linking/` | Handles generating and redeeming auto-link tokens. |
| `app/dashboard/` | Core dashboard user interface page. |
| `app/link/[token]/` | Client-side landing page for auto-linking accounts. |
| `lib/telegram/` | Telegram message parsing and bot API integration. |
| `lib/storage/` | File validations and Cloudinary/Supabase upload adapters. |
| `lib/handlers/` | Link metadata scraper fallback chain. |

---

## 2. Common Code Modification Locations

### Adding a Bot Command
*   **File**: [lib/telegram/messageHandler.ts:L372](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/telegram/messageHandler.ts#L372)
*   **Action**: Expand the switch-case in the `handleCommand` helper.

### Modifying Link Previews
*   **File**: [lib/handlers/linkHandler.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/handlers/linkHandler.ts)
*   **Action**: Update the fallback scraping chain inside `fetchLinkPreview`.

### Changing File Storage Strategy
*   **File**: [lib/telegram/messageHandler.ts:L291](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/telegram/messageHandler.ts#L291)
*   **Action**: Modify the parsing rules for the `FILE_STORAGE_STRATEGY` env variable.

### Adding Dashboard Filter Categories
*   **File**: [app/dashboard/page.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/dashboard/page.tsx)
*   **Action**: Update the state structures and API query parameters inside `fetchItems`.

---

## 3. Important Development Commands

```bash
# Run local dev server with polling enabled
npm run dev

# Run ESLint validation checks
npm run lint

# Build production distribution bundle
npm run build
```

---

## 4. Key Configurations

```dotenv
# .env.local values
TELEGRAM_MODE=polling # polling in dev, webhook in prod
FILE_STORAGE_STRATEGY=image:cloudinary,doc:supabase
```
*   **Signed URL Lifespan**: 3600 seconds (1 hour). Configured in `app/api/items/[id]/route.ts`.
*   **Max Media Upload Size**: 20MB. Enforced in `lib/storage/fileValidation.ts`.
*   **Soft Delete Expire Threshold**: 7 days. Configured in `supabase/migrations/005_saved_and_trash_lifecycle.sql`.
