# Directory Reference: drop_it

This file documents every major folder in the repository, explaining its purpose, contents, responsibilities, dependencies, and files of interest.

---

## 1. Directory Tree Summary

Below is a schematic mapping of the critical folder boundaries:

```
drop_it/
├── app/                        # Next.js Application Root
│   ├── api/                    # Server-side API Controllers
│   ├── auth/                   # Public Authentication Views
│   ├── components/             # Core Layout Components
│   ├── dashboard/              # Protected Dashboard View
│   └── link/                   # Auto-Linking Redemption Views
├── components/                 # Shared UI Component Registry
│   └── ui/                     # Design System Atoms (Radix Wrapper)
├── lib/                        # Common Services & Domain Logic
│   ├── auth/                   # Session & Request Resolvers
│   ├── handlers/               # Link Fetching & Parsing Engines
│   ├── storage/                # Cloudinary & Supabase Storage APIs
│   ├── telegram/               # Telegram Bot API & Polling Loop
│   └── utils/                  # UI utility hooks (debounce)
└── supabase/                   # Database Configuration
    └── migrations/             # SQL Migrations Schema
```

---

## 2. Directory Details

### 2.1. `app/`
*   **Purpose**: The main Next.js App Router root.
*   **Contains**: Subdirectories matching page layouts, endpoints, client pages, style entries, and provider wrappers.
*   **Responsibilities**: Defines the frontend routing space, manages context providers, controls page headers/SEO tags, and defines the global stylesheet rules.
*   **Depends on**: `components/`, `lib/`
*   **Used by**: Next.js framework build system.
*   **Important Files**:
    *   [layout.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/layout.tsx): Root layout setting up custom variables and font families.
    *   [page.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/page.tsx): Authentication landing redirect page.
    *   [providers.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/providers.tsx): Combines next-auth session scopes and dark theme properties.

---

### 2.2. `app/api/`
*   **Purpose**: Serverless API routes acting as backend controllers.
*   **Contains**: REST endpoints mapped to folder operations, item actions, Telegram notifications, and user configurations.
*   **Responsibilities**: Processes HTTP commands, parses parameters, performs validation checks, sanitizes payload shapes, and issues query calls.
*   **Depends on**: `lib/` (specifically authentication, storage, database client, and parsing modules).
*   **Used by**: Client UI components (`Navbar`, `ItemCard`, `ItemGrid`) and external sources (Telegram Bot webhooks).
*   **Important Files**:
    *   [app/api/telegram/webhook/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/telegram/webhook/route.ts): Handles webhooks with secure signature evaluations.
    *   [app/api/items/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/items/route.ts): Manages dashboard collection filters, searches, and item inserts.
    *   [app/api/items/[id]/route.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/api/items/%5Bid%5D/route.ts): Executes update actions, soft/hard deletes, and handles signed URL operations.

---

### 2.3. `app/components/`
*   **Purpose**: App-level layout and page-specific React components.
*   **Contains**: UI molecules like navigation bars, grid wrappers, and individual item cards.
*   **Responsibilities**: Displays structured content, handles drag-and-drop or modal interactions, fires server actions, and animates entry/exit states.
*   **Depends on**: `components/ui/`, `lib/types.ts`
*   **Used by**: Dashboard client page (`app/dashboard/page.tsx`) and dynamic token verification layouts.
*   **Important Files**:
    *   [app/components/Navbar.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/components/Navbar.tsx): Dashboard header managing search parameters, links, settings dialogs, and token details.
    *   [app/components/ItemCard.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/components/ItemCard.tsx): Displays preview thumbnails, action controls, and folder designations.
    *   [app/components/ItemGrid.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/components/ItemGrid.tsx): Manages grid/list views, loading skeletons, and empty state templates.

---

### 2.4. `components/ui/`
*   **Purpose**: Design system atomic components.
*   **Contains**: Simple, generic UI elements (Buttons, Inputs, Cards, Dialogs, Dropdowns) generated via shadcn/ui.
*   **Responsibilities**: Provides unstyled visual primitives styled with Tailwind, ensuring consistent styling (colors, borders, focus states) across the app.
*   **Depends on**: Radix UI primitive packages, Tailwind utilities.
*   **Used by**: App-level layouts and pages (`app/components/*`, `app/dashboard/page.tsx`).
*   **Important Files**: Dialog, Dropdown-Menu, Button, Input wrappers.

---

### 2.5. `lib/`
*   **Purpose**: Utility services and server-side domain wrappers.
*   **Contains**: Storage adapters, custom auth modules, helper parsers, and custom React hooks.
*   **Responsibilities**: Handles core database queries, parses remote links, manages remote API requests (Telegram, Cloudinary, Supabase), and runs local dev polling loops.
*   **Depends on**: Third-party integrations (Supabase SDK, Cloudinary SDK).
*   **Used by**: Next.js API Routes and root configuration wrappers (e.g. `instrumentation.ts`).
*   **Important Files**:
    *   [lib/supabase.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/supabase.ts): Client setup using anon vs admin credentials.
    *   [lib/types.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/types.ts): Shared TypeScript declarations.

---

### 2.6. `lib/telegram/`
*   **Purpose**: Telegram bot ingestion sub-service.
*   **Contains**: Message handlers, api clients, and polling controllers.
*   **Responsibilities**: Receives Telegram message updates, validates sender registrations, extracts text/photos/documents, coordinates downloads, and runs the dev loop.
*   **Depends on**: `lib/storage/`, `lib/handlers/linkHandler.ts`, `lib/supabase.ts`
*   **Used by**: Webhook router `/api/telegram/webhook` and server hook `instrumentation.ts`.
*   **Important Files**:
    *   [lib/telegram/messageHandler.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/telegram/messageHandler.ts): Core Telegram bot processing file.
    *   [lib/telegram/pollingService.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/telegram/pollingService.ts): Runs local dev polling mechanism.
    *   [lib/telegram/telegramApi.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/telegram/telegramApi.ts): Low-level HTTP requests to `api.telegram.org`.

---

### 2.7. `lib/storage/`
*   **Purpose**: File upload adapters and validation modules.
*   **Contains**: Cloudinary wrapper, Supabase Storage helper, and file limits.
*   **Responsibilities**: Enforces maximum sizes (20MB), verifies MIME classifications, uploads buffers, parses storage URIs, and signs private URLs.
*   **Depends on**: Cloudinary and Supabase service clients.
*   **Used by**: Telegram message handler (`messageHandler.ts`) and dynamic file opening routes.
*   **Important Files**:
    *   [lib/storage/fileValidation.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/storage/fileValidation.ts): Validates file types and sizes.
    *   [lib/storage/cloudinary.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/storage/cloudinary.ts): Signs and POSTs images.
    *   [lib/storage/supabaseStorage.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/storage/supabaseStorage.ts): Standardizes document uploads and signed-url generation.

---

### 2.8. `supabase/migrations/`
*   **Purpose**: Database schema version history.
*   **Contains**: Raw SQL migration files containing table creation queries, indexes, triggers, and Row Level Security (RLS) policies.
*   **Responsibilities**: Defines the database schema, handles table updates, and configures daily trashed-item purge routines.
*   **Depends on**: Supabase Database Service.
*   **Used by**: Supabase CLI / SQL Console.
*   **Important Files**: Migrations numbered `001_initial.sql` through `007_media_storage_support.sql`.
