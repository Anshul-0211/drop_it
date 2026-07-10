# Onboarding Guide: drop_it

Welcome to the `drop_it` project! This guide will help you set up your development environment and understand the codebase.

---

## 1. Quick Start Guide

### Step 1: Clone & Install Dependencies
```bash
git clone <repository-url>
cd drop_it
npm install
```

### Step 2: Configure Environment Variables
Copy the env template file:
```bash
cp .env.example .env.local
```
Fill in the values in `.env.local` (refer to the [Configuration Guide](09_CONFIGURATION.md) for details):
*   Create a **Supabase** project and copy the URL and API keys.
*   Create a **GitHub OAuth Application** in developer settings and copy the Client ID and Secret.
*   Create a **Telegram Bot** using BotFather and copy the Bot Token.

### Step 3: Run Database Migrations
Copy the SQL commands from the migrations files in `supabase/migrations/` and run them in the Supabase SQL Editor in the following order:
1.  `001_initial.sql` (base schema)
2.  `002_telegram_link_code.sql` (manual pairing tables)
3.  `003_create_link_tokens_table.sql` (auto-linking tokens)
4.  `005_saved_and_trash_lifecycle.sql` (item lifecycle support)
5.  `006_folders_and_item_assignment.sql` (item organization folders)
6.  `007_media_storage_support.sql` (file storage buckets)

### Step 4: Start the Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3000`.

---

## 2. Local Development Workflow (Telegram Polling)

You don't need a public tunnel (like ngrok) to test the Telegram bot locally. The application includes a polling mode for local development:

1.  Set `TELEGRAM_MODE=polling` in your `.env.local` file.
2.  When the dev server starts, Next.js executes `instrumentation.ts`, which starts the background polling loop.
3.  The polling loop fetches updates from the Telegram Bot API and processes them using `messageHandler.ts`.
4.  Send a message to your bot on Telegram. It should respond with instructions to link your account.

---

## 3. Recommended Code Reading Order

We recommend reading the codebase in the following order:

1.  **Shared Types** ([lib/types.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/types.ts)): Understand the core models (Users, Items, Folders).
2.  **Database Migrations** (`supabase/migrations/`): Review the table schemas and triggers.
3.  **Bot Ingestion** ([lib/telegram/messageHandler.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/lib/telegram/messageHandler.ts)): See how incoming messages are parsed and saved.
4.  **Backend Controllers** (`app/api/items/route.ts` and `app/api/items/[id]/route.ts`): See how items are queried and updated.
5.  **Dashboard UI** ([app/dashboard/page.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/dashboard/page.tsx)): Review state management and component rendering.

---

## 4. Useful Development Commands

*   `npm run dev`: Starts the Next.js development server (runs the Telegram polling loop).
*   `npm run build`: Builds the application for production.
*   `npm run start`: Starts the production server.
*   `npm run lint`: Runs ESLint checks.
