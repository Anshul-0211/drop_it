# Technical Debt & Improvement Index: drop_it

This document lists the technical debt, potential bugs, unimplemented features, and refactoring opportunities in the `drop_it` codebase.

---

## 1. Dead Code & Unimplemented Features

### 1.1. Unimplemented `/link <code>` Bot Command
*   **Location**: [lib/telegram/messageHandler.ts:L382](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/telegram/messageHandler.ts#L382)
*   **Description**: The `/help` command output lists `/link <code>` as an option for manual account linking:
    ```typescript
    `/link <code> - Link this Telegram account\n`
    ```
    However, the switch-case in `handleCommand` (L375-L415) does not implement the `/link` command. If a user tries to run it, the bot returns "Unknown command. Type /help for available commands."

---

## 2. Duplicate Code

### 2.1. Duplicate User Resolution Logic
*   **Locations**:
    *   [lib/auth/resolveDbUser.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/auth/resolveDbUser.ts)
    *   [lib/auth/resolveRequestDbUser.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/auth/resolveRequestDbUser.ts)
*   **Description**: Both files contain similar logic for querying user records in Supabase. These checks should be consolidated into a single service helper.

---

## 3. Component Bloat & Mixed Concerns

### 3.1. Complex Dashboard Controller Page
*   **Location**: [app/dashboard/page.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/dashboard/page.tsx)
*   **Description**: This file is 744 lines long and mixes:
    *   State hooks for pagination, search, sections, and active folders.
    *   API request callbacks (`fetchFolders`, `fetchItems`).
    *   Action dispatchers (`handleItemAction`, `handleOpenItem`).
    *   Visual layouts (sidebar navigation lists, filtering panels, grids, lists).
    *   Modal overrides for folder configurations and item title renaming.
*   **Refactoring Recommendation**: Split the sidebar, action modals, and layout containers into dedicated client sub-components.

---

## 4. Architectural Limitations & Tight Coupling

### 4.1. Rigid Storage Strategy
*   **Location**: [lib/telegram/messageHandler.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/telegram/messageHandler.ts)
*   **Description**: The storage routing strategy is hardcoded in the Telegram message handler:
    *   Images are sent to Cloudinary.
    *   Documents are sent to Supabase Storage.
    *   Previews are scraped using Microlink.
*   **Refactoring Recommendation**: Abstract the storage operations behind a unified `StorageService` interface.

### 4.2. Inconsistent Ingestion Logic
*   **Description**: The web dashboard and Telegram bot save items using different paths:
    *   Web uploads directly insert data into the database.
    *   Telegram captures trigger the scraping and media storage pipeline.
*   **Refactoring Recommendation**: Route both ingestion channels through a shared server action or controller layer.

---

## 5. Potential Bugs

### 5.1. Synchronous Dynamic Params Access
*   **Location**: [app/link/[token]/page.tsx:L10](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/link/%5Btoken%5D/page.tsx#L10)
*   **Description**: The component accesses the dynamic routing parameter synchronously:
    ```typescript
    const token = params.token;
    ```
    In Next.js 15+, dynamic routing params are treated as promises and should be unwrapped using `React.use()` or awaited to prevent hydration warnings or compilation issues.

---

## 6. Optimization Opportunities
*   **Shared Link Cache**: Cache scraped previews in a shared table to prevent scraping the same URL multiple times.
*   **Active Webhook Status Checks**: Add webhook status monitors in the settings panel to help debug bot connection issues.
*   **Unified Tag Manager**: Add a settings view for managing tags (renaming, deleting, and merging tags).
