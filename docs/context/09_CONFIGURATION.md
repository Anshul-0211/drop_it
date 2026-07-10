# Configuration Manual: drop_it

This document provides a guide to the configuration files, environment variables, build properties, and development options for the `drop_it` project.

---

## 1. Environment Variables (`.env.local`)

A template file is available at [.env.example](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/.env.example). Copy this file to create your local `.env.local` configuration.

### 1.1. Supabase Connection Credentials
*   `NEXT_PUBLIC_SUPABASE_URL`: The URL of your Supabase project (e.g. `https://your-project.supabase.co`).
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anonymous client API key.
*   `SUPABASE_SERVICE_ROLE_KEY`: Server-side secret key used to bypass RLS policies.
*   `SUPABASE_DOCUMENTS_BUCKET` (Optional): The storage bucket for documents (defaults to `documents`).
*   `SUPABASE_DOCUMENTS_BUCKET_PUBLIC` (Optional): Sets if the document bucket is public (defaults to `false`).

### 1.2. NextAuth & GitHub OAuth
*   `NEXTAUTH_SECRET`: Secret key used to encrypt NextAuth JWT session cookies.
*   `NEXTAUTH_URL`: The base URL of your application (e.g. `http://localhost:3000` or `https://yourdomain.com`).
*   `NEXT_PUBLIC_APP_URL`: The client-accessible URL of the application.
*   `GITHUB_ID`: Client ID for the GitHub OAuth application.
*   `GITHUB_SECRET`: Client secret for the GitHub OAuth application.

### 1.3. Telegram Bot Integration
*   `TELEGRAM_BOT_TOKEN`: The API token for your Telegram bot.
*   `TELEGRAM_MODE`: Ingestion mode. Set to `polling` for local development or `webhook` for production.
*   `TELEGRAM_POLLING_INTERVAL_MS` (Optional): Interval between polling requests (defaults to `1500` ms).
*   `TELEGRAM_WEBHOOK_URL`: Webhook URL registered with Telegram.
*   `TELEGRAM_WEBHOOK_SECRET`: Secret token sent by Telegram to verify webhook requests.

### 1.4. Media Storage Settings
*   `MICROLINK_API_KEY`: API key for Microlink link preview scrapes.
*   `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name.
*   `CLOUDINARY_API_KEY`: Cloudinary API key.
*   `CLOUDINARY_API_SECRET`: Cloudinary API secret.
*   `FILE_STORAGE_STRATEGY`: Dictates media routing (e.g. `image:cloudinary,doc:supabase`).

---

## 2. Build Configurations

### 2.1. Next.js Config
*   **Path**: [next.config.ts](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/next.config.ts)
*   **Configuration**:
    ```typescript
    import type { NextConfig } from "next";

    const nextConfig: NextConfig = {
      images: {
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'lh7-us.googleusercontent.com',
          },
        ],
      },
    };

    export default nextConfig;
    ```
*   **Notes**: Configures Next.js to allow loading remote images from Google user content domains.

### 2.2. TypeScript Config
*   **Path**: [tsconfig.json](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/tsconfig.json)
*   **Configuration**: Uses standard Next.js App Router rules. Includes path aliases (`@/*` pointing to `./*`) to simplify file imports.

---

## 3. Code Style & Quality Tools

### 3.1. ESLint Configuration
*   **Path**: [eslint.config.mjs](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/eslint.config.mjs)
*   **Configuration**:
    ```javascript
    import { dirname } from "path";
    import { fileURLToPath } from "url";
    import { FlatCompat } from "@eslint/eslintrc";

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const compat = new FlatCompat({
      baseDirectory: __dirname,
    });

    const eslintConfig = [
      ...compat.extends("next/core-web-vitals", "next/typescript"),
    ];

    export default eslintConfig;
    ```
*   **Notes**: Extends Next.js core web vitals and TypeScript rules.

### 3.2. CSS & Tailwind
*   **Path**: [postcss.config.mjs](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/postcss.config.mjs)
*   **Configuration**: Bundles Tailwind v4 styling with `@tailwindcss/postcss`.

---

## 4. Production Deployments
*   **Hosting**: Typically deployed on **Vercel** or any node-compatible hosting provider.
*   **Prerequisites**:
    1.  Ensure all environment variables from `.env.local` are set in your hosting provider's dashboard.
    2.  Set `TELEGRAM_MODE=webhook` and register your webhook URL with Telegram.
    3.  Apply all database migrations located in `supabase/migrations/` using the Supabase SQL editor.
