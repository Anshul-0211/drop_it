# Component Map: drop_it

This document maps out the frontend client architecture, pages, custom layout structures, component scopes, and rendering strategies.

---

## 1. Visual Component Hierarchies

### 1.1. Dashboard View Structure
```
[ RootLayout ]
      │
      └──► [ Dashboard Page ]
                │
                ├──► [ Navbar ]
                │         │
                │         ├──► [ Search Input ]
                │         └──► [ Settings Dialog ] ──► [ Generate Link Token ]
                │
                ├──► [ Sidebar Aside ] (Desktop only)
                │         │
                │         ├──► [ Navigation Buttons ] (Inbox, Saved, Trash)
                │         └──► [ Folders list ] ──► [ Create Folder Modal ]
                │
                └──► [ ItemGrid ]
                          │
                          ├──► [ Grid Layout ] ──► [ ItemCard ] ──► [ Folder Options ]
                          │                                     └───► [ Rename Modal ]
                          │
                          └──► [ List Layout ] ──► [ ListRow ] ──► [ Option Dropdown ]
```

### 1.2. Account Auto-Linking View Structure
```
[ RootLayout ]
      │
      └──► [ LinkingPage ] (Client-side URL token validation)
                │
                ├──► [ Navbar ] (Simple header representation)
                │
                └──► [ Token Redemption Box ]
                          ├──► Enter Telegram ID input field
                          └──► Redeem token submit handler
```

---

## 2. Layouts, Pages, & Routes

### 2.1. Layouts
*   **Root Layout** ([app/layout.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/layout.tsx)): Sets the default HTML structure, loads Geist and Geist Mono fonts, sets the dark theme background colors (`bg-[#0B0F1A]`), and wraps the application in the providers component.

### 2.2. Pages
*   **Redirect Home Page** ([app/page.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/page.tsx)): Client-side page that checks the session status. It redirects authenticated users to `/dashboard` and unauthenticated users to `/auth/signin`.
*   **Sign-In Page** ([app/auth/signin/page.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/auth/signin/page.tsx)): Displays features and provides a button to authenticate with GitHub using NextAuth.
*   **Dashboard Page** ([app/dashboard/page.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/dashboard/page.tsx)): The main page of the application. It manages filters (state, folders, search query, time periods) and displays captured items.
*   **Linking Page** ([app/link/[token]/page.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/link/%5Btoken%5D/page.tsx)): Displays instructions and form fields for redeeming link tokens.

---

## 3. UI Component Specifications

### 3.1. Navbar
*   **Path**: [app/components/Navbar.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/components/Navbar.tsx)
*   **Responsibilities**:
    *   Hosts the main text search input field.
    *   Renders a mobile navigation menu on smaller screens.
    *   Provides links to user settings and sign-out controls.
    *   Provides a settings dialog for generating auto-link URLs and saving Telegram user IDs.

### 3.2. ItemGrid
*   **Path**: [app/components/ItemGrid.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/components/ItemGrid.tsx)
*   **Responsibilities**:
    *   Toggles between grid and list layouts.
    *   Renders loading skeletons while fetching data.
    *   Renders empty state illustrations if the current filter returns no items.
    *   Loops over collections to render `ItemCard` (grid mode) or `ListRow` (list mode).

### 3.3. ItemCard
*   **Path**: [app/components/ItemCard.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/components/ItemCard.tsx)
*   **Responsibilities**:
    *   Displays link metadata (image, title, description, and source tags).
    *   Provides buttons to open links, mark items as read/unread, save/unsave, and delete.
    *   Includes dropdowns for folder assignments.

---

## 4. Providers & Application State

### 4.1. Context Providers
*   **Path**: [app/providers.tsx](file:///C:/Users/anshu/OneDrive/Desktop/Projects/drop_it/app/providers.tsx)
*   **Wrappers**:
    *   `SessionProvider` (`next-auth/react`): Manages authentication sessions across the application.
    *   `ThemeProvider` (`next-themes`): Manages theme switching (dark/light modes).

### 4.2. Application State Management
All state is managed locally on the dashboard page and passed to components as props:

*   **Filter States**:
    *   `activeSection` (`'inbox' | 'saved' | 'trash'`): Sets the active view.
    *   `stateFilter` (`'all' | 'unread' | 'read'`): Filters items by read state.
    *   `dateFilter` (`'all' | 'today' | 'yesterday' | '7d' | '30d'`): Filters items by creation time.
    *   `activeFolderId` (`string | null`): Filters items by folder.
*   **Search State**:
    *   `searchText` (`string`): Binds to the search input.
    *   `debouncedSearch` (`string`): Debounced search query used to trigger API requests.
*   **Item & Folder Data**:
    *   `items` (`Item[]`): List of items fetched from the API.
    *   `folders` (`Folder[]`): List of folders fetched from the API.
    *   `counts` (`SectionCounts`): Badge counts for the inbox, saved, and trash sections.

---

## 5. UI Layout Modes

### 5.1. List Mode (`ListRow`)
*   Rendered as a single-row flex container.
*   Shows indicators for read/unread state (e.g. green border for read, orange border for unread, red border for trash).
*   Optimized for dense data display, prioritizing titles and descriptions.

### 5.2. Grid Mode (`ItemCard`)
*   Rendered as a multi-column card grid.
*   Displays preview images (retrieved from link metadata or Cloudinary) and source tags.
*   Provides action buttons at the bottom of each card.

---

## 6. Rendering Strategy
All page entries use the `'use client'` directive, meaning they are **Client-Side Rendered (CSR)**. Next.js serves a minimal shell, and React hydration handles session checks, fetches item data, and manages UI interactions.
