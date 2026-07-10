# Dependency Map: drop_it

This document reviews the primary packages used in the project, explaining their purpose, usage, and possible alternatives.

---

## 1. Production Dependencies

### 1.1. Core Application Framework

#### `next` (v16.2.4)
*   **Purpose**: Full-stack framework providing client-side rendering (CSR), server-side rendering (SSR), filesystem-based App Router, and API routes.
*   **Usage**: Controls client routing, server API endpoints, layout definitions, and asset optimization.
*   **Alternatives**: Remix, Vite with custom Express backends, Astro.

#### `react` & `react-dom` (v19.2.4)
*   **Purpose**: Rendering library for building client user interfaces.
*   **Usage**: Underlies components, state hooks, and client views.
*   **Alternatives**: Vue, Svelte, SolidJS.

---

### 1.2. Database & Integration SDKs

#### `@supabase/supabase-js` (v2.103.3)
*   **Purpose**: Client library for interacting with Supabase services (database, storage, auth).
*   **Usage**: Initializes database connections and handles document uploads and signed URL generation.
*   **Alternatives**: Direct `pg` client calls, Prisma, Drizzle ORM.

#### `next-auth` (v4.24.14)
*   **Purpose**: Authentication library for Next.js applications.
*   **Usage**: Configures GitHub OAuth login and manages user sessions and JWT tokens.
*   **Alternatives**: Supabase Auth, Auth0, Clerk, Lucia Auth.

---

### 1.3. Styling & Animations

#### `tailwindcss` (v4)
*   **Purpose**: Utility-first CSS framework.
*   **Usage**: Styling components and layouts across the application.
*   **Alternatives**: CSS Modules, Vanilla CSS, Styled Components.

#### `framer-motion` (v12.38.0)
*   **Purpose**: Animation library for React.
*   **Usage**: Handles page transitions, card entry/exit animations, and modal overlays.
*   **Alternatives**: GSAP, React Spring, Vanilla CSS Keyframes.

#### `lucide-react` (v1.8.0) & `@phosphor-icons/react` (v2.1.10)
*   **Purpose**: Icon libraries.
*   **Usage**: Standardizes icons used in navigation and action buttons.
*   **Alternatives**: Heroicons, FontAwesome.

---

### 1.4. Utility Libraries

#### `clsx` & `tailwind-merge`
*   **Purpose**: Simplifies conditional class combining and merges overlapping Tailwind utility classes.
*   **Usage**: Power the custom `cn(...)` utility helper.
*   **Alternatives**: Custom template string interpolation.

#### `class-variance-authority` (CVA)
*   **Purpose**: Creates matching styling variations for reusable components.
*   **Usage**: Manages style variants for shared UI components (e.g. Button sizes and colors).
*   **Alternatives**: Handcrafted conditional state mappings.
