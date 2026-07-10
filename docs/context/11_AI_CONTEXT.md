# AI Context & Coding Guidelines: drop_it

This document is written for future AI agents and developers to help them understand the codebase, coding style, business rules, patterns, and architectural conventions.

---

## 1. Project Vocabulary
*   **Item**: A captured entity, such as a note, web link, image, or document.
*   **Inbox**: The default folder where newly captured items appear.
*   **Saved**: Bookmarked or starred items (where `is_saved` is `true`).
*   **Trash**: Soft-deleted items (where `deleted_at` is set). These are deleted permanently after 7 days.
*   **Auto-Linking**: Linking a Telegram ID to a user account using a temporary token URL (`/link/[token]`).
*   **Manual-Linking**: Manually inputting a Telegram ID in settings.
*   **Link Code**: A 6-character, 10-minute code used for manual account linking (not fully implemented).

---

## 2. Coding & Architectural Conventions

### 2.1. Server-Side Execution with Bypass
All API routes bypass public RLS policies and run operations server-side using the Supabase `service_role` key (`supabaseAdmin`). The anonymous client `supabase` is reserved for client-side operations (though the current dashboard performs fetches via API routes instead of direct client queries).

### 2.2. Backward Compatibility
Always maintain fallback logic when introducing database changes. The dashboard and items API routes catch database exceptions (e.g. missing columns like `deleted_at` or `folder_id`) and fall back to legacy query strategies so the application continues to run even if migrations have not been applied.

```typescript
// Example pattern from items route:
if (error && isMissingLifecycleSchema(error)) {
    // Legacy fallback query logic...
}
```

### 2.3. Asynchronous Webhook Acknowledgement
When handling webhooks from Telegram, always return a `200 OK` response immediately, processing the message payload asynchronously (e.g. using `.catch` without `await`). This prevents Telegram from retrying the request if processing takes longer than expected.

---

## 3. Recommended Coding Patterns vs. Anti-Patterns

### Recommended Patterns
*   **Timing-Safe Webhook Checks**: Use timing-safe comparisons (`crypto.timingSafeEqual`) to verify Telegram webhook tokens.
*   **Unique URL Hashing**: Generate SHA-256 hashes of URLs for duplicate detection to prevent saving the same link multiple times.
*   **Double-Tab Security**: Open links in new tabs using `popup.opener = null` to prevent reverse-tabnabbing security issues.

### Anti-Patterns
*   **Awaiting Webhooks**: Do not await the message parser inside webhook endpoints. Awaiting will cause timeouts and retries from Telegram.
*   **Exposing Service Keys**: Never use the `SUPABASE_SERVICE_ROLE_KEY` in client-side code (`'use client'`).
*   **Blocking Auth on Sync Issues**: Do not block user sign-ins if database sync operations fail during OAuth callback loops. Treat these errors as non-blocking.

---

## 4. Key Files & Extension Points

### Frequently Modified Files
*   [app/dashboard/page.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/dashboard/page.tsx): Main dashboard layout and state.
*   [lib/telegram/messageHandler.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/telegram/messageHandler.ts): Message parsing and bot commands.
*   [app/components/Navbar.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/components/Navbar.tsx): Settings panel and dashboard header.

### Files That Should Rarely Be Edited
*   [instrumentation.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/instrumentation.ts): Next.js lifecycle hooks.
*   [lib/supabase.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/supabase.ts): Client configuration settings.

---

## 5. Safe Extension Points

1.  **Adding Telegram Commands**: You can add new commands to the bot by expanding the switch-case in `handleCommand` inside [messageHandler.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/telegram/messageHandler.ts).
2.  **Adding Metadata Scrapers**: You can add support for new metadata formats (like custom video hosts or document preview APIs) by updating `fetchLinkPreview` inside [linkHandler.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/handlers/linkHandler.ts).
3.  **Extending Auth Providers**: You can add support for more login methods (e.g. Google, Discord) by expanding the `providers` list in `authOptions` inside [app/api/auth/[...nextauth]/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/auth/%5B...nextauth%5D/route.ts).

---

## 6. Dangerous Areas to Avoid
*   **Database Migrations without Fallbacks**: Do not remove legacy query fallbacks when modifying tables or schemas. Doing so will break environments that have not applied the latest migrations.
*   **Modifying Webhook Response Time**: Do not add long-running, blocking operations to the `/api/telegram/webhook` response flow. If Telegram doesn't receive a response within 10 seconds, it will flag it as a timeout and retry the request, leading to duplicate items.
