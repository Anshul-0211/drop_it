'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, List, CalendarDays, ChevronDown, X, RotateCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

import './styles.css';
import DashboardNavbar from './components/DashboardNavbar';
import Sidebar from './components/Sidebar';
import QuickCapture from './components/QuickCapture';
import CommandPalette from './components/CommandPalette';
import MobileBottomNav from './components/MobileBottomNav';
import LinkCard from './components/cards/LinkCard';
import NoteCard from './components/cards/NoteCard';
import ImageCard from './components/cards/ImageCard';
import FileCard from './components/cards/FileCard';

import { Input } from '@/components/ui/input';
import { Folder, Item, ItemsResponse, ItemSection, ItemStateFilter } from '@/lib/types';
import { useDebounce } from '@/lib/utils/debounce';
import { ItemAction } from '@/app/components/ItemCard';

type DateFilter = 'all' | 'today' | 'yesterday' | '7d' | '30d';

const DATE_LABELS: Record<DateFilter, string> = {
  all: 'All time', today: 'Today', yesterday: 'Yesterday', '7d': 'Last 7 days', '30d': 'Last 30 days',
};

const SECTION_LABELS: Record<ItemSection, string> = {
  inbox: 'Inbox', saved: 'Saved', trash: 'Trash',
};

const STATE_LABELS: Record<ItemStateFilter, string> = {
  all: 'All', unread: 'Unread', read: 'Read',
};

// ─── Demo Cards (shown when inbox is empty for design preview) ────────────
function DemoCards({ viewMode }: { viewMode: 'grid' | 'list' }) {
  const gridClass = viewMode === 'grid'
    ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
    : 'grid grid-cols-1 gap-3';

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
        ✦ Design Preview — sample cards
      </p>
      <div className={gridClass}>

        {/* Link card demo */}
        <div className="dt-card group flex flex-col cursor-pointer">
          {viewMode === 'grid' && (
            <div className="h-40 overflow-hidden" style={{ borderBottom: '1px solid var(--border)' }}>
              <img src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600" alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex flex-col flex-1 p-4 gap-2">
            <div className="flex items-center gap-1.5">
              <img src="https://www.google.com/s2/favicons?domain=github.com&sz=16" alt="" className="h-4 w-4 rounded-sm" />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>github.com</span>
            </div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Build a full-stack app with Next.js and Supabase</h3>
            <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>A step-by-step guide to building a production-ready application using Next.js App Router and Supabase.</p>
            <div className="flex gap-1">
              <span className="dt-badge">#dev</span>
              <span className="dt-badge">#nextjs</span>
            </div>
          </div>
        </div>

        {/* Note card demo */}
        <div className="dt-card group flex flex-col" style={{ background: 'var(--accent-soft)' }}>
          <div className="h-1 w-full rounded-t-[14px]" style={{ background: 'var(--accent-primary)' }} />
          <div className="flex flex-col flex-1 p-4 gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent-text)' }}>Note</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>2h ago</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
              "Redesign the dashboard with a warmer palette — think editorial, Notion-meets-Substack vibes. Amber accent, ivory background."
            </p>
          </div>
        </div>

        {/* File / PDF card demo */}
        <div className="dt-card group flex items-start gap-4 p-4 cursor-pointer">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#EF444418', color: '#EF4444' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Q2_Design_Report.pdf</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: '#EF444418', color: '#EF4444' }}>PDF</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Yesterday · 3.2 MB</span>
            </div>
            <div className="flex gap-1 mt-2"><span className="dt-badge">#reports</span></div>
          </div>
        </div>

        {/* Second link card demo */}
        <div className="dt-card group flex flex-col cursor-pointer">
          {viewMode === 'grid' && (
            <div className="h-40 overflow-hidden" style={{ borderBottom: '1px solid var(--border)' }}>
              <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600" alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex flex-col flex-1 p-4 gap-2">
            <div className="flex items-center gap-1.5">
              <img src="https://www.google.com/s2/favicons?domain=medium.com&sz=16" alt="" className="h-4 w-4 rounded-sm" />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>medium.com</span>
            </div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>The Art of Minimal UI Design in 2025</h3>
            <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>How to craft interfaces that feel effortless without sacrificing depth or personality.</p>
            <div className="flex gap-1">
              <span className="dt-badge">#design</span>
              <span className="dt-badge">#ui</span>
            </div>
          </div>
        </div>

        {/* Second note demo */}
        <div className="dt-card group flex flex-col" style={{ background: 'var(--accent-soft)' }}>
          <div className="h-1 w-full rounded-t-[14px]" style={{ background: 'var(--accent-primary)' }} />
          <div className="flex flex-col flex-1 p-4 gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent-text)' }}>Note</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>5d ago</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
              "Check out Framer Motion's layout animations — can use this for the card reorder when user drags items between folders."
            </p>
          </div>
        </div>

        {/* Doc card demo */}
        <div className="dt-card group flex items-start gap-4 p-4 cursor-pointer">
          <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#2563EB18', color: '#2563EB' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>Product_Brief_v3.docx</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: '#2563EB18', color: '#2563EB' }}>DOCX</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Today · 820 KB</span>
            </div>
            <div className="flex gap-1 mt-2"><span className="dt-badge">#product</span></div>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type FolderModalMode = 'create' | 'rename' | null;

function getItemType(item: Item): 'link' | 'note' | 'image' | 'file' {
  if (item.type === 'text') return 'note';
  if (item.type === 'image' || (item.preview_image && !item.url)) return 'image';
  if ((item.type === 'pdf' || item.type === 'document') && item.file_url && !item.url) return 'file';
  return 'link';
}

export default function DashboardTest() {
  const { data: session, status } = useSession();

  const [items, setItems] = useState<Item[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeSection, setActiveSection] = useState<ItemSection>('inbox');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<ItemStateFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchText, setSearchText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileFoldersOpen, setMobileFoldersOpen] = useState(false);
  const [counts, setCounts] = useState({ inbox: 0, saved: 0, trash: 0, unread: 0, read: 0 });
  // Manual refresh counter — incremented when user adds/deletes an item
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = useCallback(() => setRefreshTrigger((n) => n + 1), []);

  // Folder modal
  const [folderModal, setFolderModal] = useState<{
    mode: FolderModalMode; name: string; target: Folder | null; error: string | null; saving: boolean;
  }>({ mode: null, name: '', target: null, error: null, saving: false });

  // Item rename modal
  const [itemRenameModal, setItemRenameModal] = useState<{
    open: boolean;
    item: Item | null;
    draftTitle: string;
    error: string | null;
    isSaving: boolean;
  }>({
    open: false,
    item: null,
    draftTitle: '',
    error: null,
    isSaving: false,
  });

  const debouncedSearch = useDebounce(searchText, 300);

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') signIn();
  }, [status]);

  // Use primitive string dep instead of whole session object to prevent
  // re-fetching on every tab-switch (NextAuth recreates session reference).
  const sessionEmail = session?.user?.email ?? null;

  const fetchFolders = useCallback(async () => {
    if (!sessionEmail) return;
    try {
      const res = await fetch('/api/folders');
      const payload = await res.json();
      if (res.ok) setFolders(payload.data ?? []);
    } catch { /* silent */ }
  }, [sessionEmail]);

  const fetchItems = useCallback(async () => {
    if (!sessionEmail) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ section: activeSection, q: debouncedSearch, time: dateFilter });
      if (activeFolderId) params.set('folder_id', activeFolderId);
      if (activeSection !== 'trash') params.set('state', stateFilter);
      const res = await fetch(`/api/items?${params}`);
      const data: ItemsResponse = await res.json();
      if (res.ok) {
        setItems(data.data ?? []);
        if (data.counts) setCounts(data.counts);
      }
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  // refreshTrigger is intentionally included: manual refresh only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionEmail, activeSection, debouncedSearch, dateFilter, stateFilter, activeFolderId, refreshTrigger]);

  // Only auto-fetch on first load and intentional filter changes.
  // Tab visibility changes do NOT cause a refetch.
  useEffect(() => { void fetchFolders(); }, [fetchFolders]);
  useEffect(() => { void fetchItems(); }, [fetchItems]);

  // Realtime subscription — automatically reloads the items when a changes occur in Supabase database
  useEffect(() => {
    const userId = (session?.user as any)?.id;
    if (!userId || !supabase) return;

    const channel = supabase
      .channel('realtime_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
        },
        (payload: any) => {
          const newItem = payload.new as any;
          const oldItem = payload.old as any;
          if (
            (newItem && newItem.user_id === userId) ||
            (oldItem && oldItem.user_id === userId)
          ) {
            triggerRefresh();
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session, triggerRefresh]);

  const handleItemAction = async (item: Item, action: ItemAction, payload?: Record<string, unknown>) => {
    const res = await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    if (!res.ok) {
      const p = await res.json().catch(() => ({}));
      throw new Error(p.error ?? 'Failed to update item');
    }
    await Promise.all([fetchItems(), fetchFolders()]);
  };

  const handleOpenItem = async (item: Item) => {
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;
    const go = (url: string) => popup ? (popup.location.href = url) : window.open(url, '_blank');
    const close = () => { if (popup && !popup.closed) popup.close(); };
    try {
      if (item.url) { go(item.url); return; }
      if (!item.file_url) { close(); return; }
      if (!item.file_url.startsWith('supabase://')) { go(item.file_url); return; }
      const res = await fetch(`/api/items/${item.id}`);
      const p = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(p.error ?? 'Failed to resolve URL');
      if (p?.data?.url) go(p.data.url); else close();
    } catch { close(); }
  };

  // Folder modal helpers
  const openCreate = () => setFolderModal({ mode: 'create', name: '', target: null, error: null, saving: false });
  const openRename = (f: Folder) => setFolderModal({ mode: 'rename', name: f.name, target: f, error: null, saving: false });
  const closeModal = () => setFolderModal({ mode: null, name: '', target: null, error: null, saving: false });

  const submitFolder = async () => {
    const name = folderModal.name.trim();
    if (name.length < 2) { setFolderModal((p) => ({ ...p, error: 'At least 2 characters required.' })); return; }
    setFolderModal((p) => ({ ...p, saving: true, error: null }));
    try {
      const res = folderModal.mode === 'create'
        ? await fetch('/api/folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
        : await fetch(`/api/folders/${folderModal.target?.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const p = await res.json().catch(() => ({}));
      if (!res.ok) { setFolderModal((prev) => ({ ...prev, saving: false, error: p.error ?? 'Failed to save.' })); return; }
      await fetchFolders();
      closeModal();
    } catch { setFolderModal((prev) => ({ ...prev, saving: false, error: 'Failed to save.' })); }
  };

  // Item rename modal helpers
  const openItemRename = (item: Item) => {
    setItemRenameModal({
      open: true,
      item,
      draftTitle: item.title,
      error: null,
      isSaving: false,
    });
  };

  const closeItemRename = () => {
    setItemRenameModal((prev) => ({
      ...prev,
      open: false,
      item: null,
      draftTitle: '',
      error: null,
      isSaving: false,
    }));
  };

  const submitItemRename = async () => {
    const targetItem = itemRenameModal.item;
    const title = itemRenameModal.draftTitle.trim();

    if (!targetItem) {
      closeItemRename();
      return;
    }

    if (title.length < 2) {
      setItemRenameModal((prev) => ({ ...prev, error: 'Title must be at least 2 characters.' }));
      return;
    }

    if (title === targetItem.title) {
      closeItemRename();
      return;
    }

    setItemRenameModal((prev) => ({ ...prev, isSaving: true, error: null }));

    try {
      await handleItemAction(targetItem, 'rename-title', { title });
      closeItemRename();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to rename item title.';
      setItemRenameModal((prev) => ({ ...prev, isSaving: false, error: message }));
    }
  };

  // Loading screen
  if (status === 'loading') {
    return (
      <div className="dt-root flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 rounded-full border-2 border-t-transparent animate-spin mx-auto" style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const sectionTitle = activeFolderId
    ? (folders.find((f) => f.id === activeFolderId)?.name ?? 'Folder')
    : SECTION_LABELS[activeSection];

  return (
    <div className="dt-root">
      <DashboardNavbar onOpenPalette={() => setPaletteOpen(true)} />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        folders={folders}
        activeSection={activeSection}
        onSectionChange={(s) => { setActiveSection(s); setActiveFolderId(null); }}
        onFolderSelect={setActiveFolderId}
        onCreateFolder={openCreate}
        onOpenItem={handleOpenItem}
      />

      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-6 lg:px-6 lg:py-8 pb-24 lg:pb-8">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={(s) => { setActiveSection(s); setActiveFolderId(null); }}
          activeFolderId={activeFolderId}
          onFolderSelect={setActiveFolderId}
          folders={folders}
          counts={counts}
          onCreateFolder={openCreate}
          onRenameFolder={openRename}
        />

        <main className="flex-1 min-w-0">
          {/* Quick Capture */}
          <QuickCapture
            onItemCreated={triggerRefresh}
          />

          {/* Section header */}
          <motion.div
            key={sectionTitle}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-4"
          >
            <h1 className="dt-heading text-2xl md:text-3xl">{sectionTitle}</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              {activeSection === 'trash'
                ? 'Items here are auto-deleted after 7 days.'
                : 'Your captured content, organized and ready to explore.'}
            </p>
          </motion.div>

          {/* Filter bar */}
          <div
            className="flex flex-wrap items-center gap-2 mb-5 p-2 rounded-xl"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
          >
            {/* State filters */}
            {activeSection !== 'trash' && (
              <div className="flex gap-1">
                {(['all', 'unread', 'read'] as ItemStateFilter[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStateFilter(s)}
                    className="dt-filter-pill"
                    style={stateFilter === s ? { background: 'var(--accent-primary)', color: 'var(--text-inverse)', borderColor: 'var(--accent-primary)' } : {}}
                  >
                    {STATE_LABELS[s]}
                    {s === 'unread' && counts.unread > 0 && ` (${counts.unread})`}
                  </button>
                ))}
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Date filter dropdown */}
            <div className="relative group">
              <button
                className="dt-btn-ghost text-xs"
              >
                <CalendarDays size={13} />
                {DATE_LABELS[dateFilter]}
                <ChevronDown size={13} />
              </button>
              <div
                className="absolute right-0 top-full mt-1.5 rounded-xl overflow-hidden z-20 min-w-[140px] hidden group-focus-within:block"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
              >
                {(Object.entries(DATE_LABELS) as [DateFilter, string][]).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setDateFilter(val)}
                    className="w-full text-left px-3 py-2 text-sm transition-all"
                    style={dateFilter === val ? { background: 'var(--accent-soft)', color: 'var(--accent-text)' } : { color: 'var(--text-primary)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = dateFilter === val ? 'var(--accent-soft)' : 'transparent'; }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Refresh button */}
            <button
              onClick={triggerRefresh}
              className="p-2 rounded-lg transition-all shrink-0"
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              title="Refresh items"
              disabled={isLoading}
            >
              <RotateCw size={14} className={isLoading ? 'animate-spin' : ''} />
            </button>

            {/* View mode toggle */}
            <div className="flex rounded-lg overflow-hidden shrink-0" style={{ border: '1px solid var(--border)' }}>
              <button
                onClick={() => setViewMode('grid')}
                className="p-2 transition-all"
                style={viewMode === 'grid' ? { background: 'var(--accent-primary)', color: 'var(--text-inverse)' } : { background: 'transparent', color: 'var(--text-muted)' }}
                title="Grid view"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="p-2 transition-all"
                style={viewMode === 'list' ? { background: 'var(--accent-primary)', color: 'var(--text-inverse)' } : { background: 'transparent', color: 'var(--text-muted)' }}
                title="List view"
              >
                <List size={15} />
              </button>
            </div>
          </div>

          {/* Item grid */}
          {isLoading ? (
            <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="dt-skeleton rounded-2xl" style={{ height: viewMode === 'grid' ? '240px' : '80px' }} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <DemoCards viewMode={viewMode} />
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div
                className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}
              >
                {items.map((item, i) => {
                  const type = getItemType(item);
                  const sharedProps = { item, folders, onAction: handleItemAction, onOpen: handleOpenItem, onRename: openItemRename };
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ delay: i * 0.04, duration: 0.2 }}
                    >
                      {type === 'note' ? (
                        <NoteCard item={item} onAction={handleItemAction} onRename={openItemRename} />
                      ) : type === 'image' ? (
                        <ImageCard {...sharedProps} />
                      ) : type === 'file' ? (
                        <FileCard {...sharedProps} />
                      ) : (
                        <LinkCard {...sharedProps} viewMode={viewMode} />
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav
        activeSection={activeSection}
        onSectionChange={(s) => { setActiveSection(s); setActiveFolderId(null); }}
        onFoldersOpen={() => setMobileFoldersOpen(true)}
        counts={counts}
      />

      {/* Folder Modal */}
      <AnimatePresence>
        {folderModal.mode && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={closeModal}>
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className="w-full max-w-md rounded-2xl p-5"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="dt-heading text-lg">
                  {folderModal.mode === 'create' ? 'New Folder' : 'Rename Folder'}
                </h2>
                <button onClick={closeModal} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              </div>

              <Input
                autoFocus
                value={folderModal.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFolderModal((p) => ({ ...p, name: e.target.value, error: null }))}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') void submitFolder(); if (e.key === 'Escape') closeModal(); }}
                placeholder="e.g. Work, Research, Personal"
                disabled={folderModal.saving}
                className="mb-3"
              />

              {folderModal.error && (
                <p className="mb-3 text-xs" style={{ color: 'var(--destructive)' }}>{folderModal.error}</p>
              )}

              <div className="flex justify-end gap-2">
                <button className="dt-btn-ghost" onClick={closeModal} disabled={folderModal.saving}>
                  Cancel
                </button>
                <button
                  className="dt-btn-primary"
                  onClick={() => void submitFolder()}
                  disabled={folderModal.saving}
                >
                  {folderModal.saving ? 'Saving...' : folderModal.mode === 'create' ? 'Create' : 'Save'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Item Rename Modal */}
      <AnimatePresence>
        {itemRenameModal.open && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={closeItemRename}>
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className="w-full max-w-md rounded-2xl p-5"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-lg)',
                color: 'var(--text-primary)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="dt-heading text-lg">Rename Item</h2>
                <button onClick={closeItemRename} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              </div>

              <Input
                autoFocus
                value={itemRenameModal.draftTitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setItemRenameModal((prev) => ({ ...prev, draftTitle: e.target.value, error: null }))}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') void submitItemRename(); if (e.key === 'Escape') closeItemRename(); }}
                placeholder="Enter title"
                disabled={itemRenameModal.isSaving}
                className="mb-3"
              />

              {itemRenameModal.error && (
                <p className="mb-3 text-xs" style={{ color: 'var(--destructive)' }}>{itemRenameModal.error}</p>
              )}

              <div className="flex justify-end gap-2">
                <button className="dt-btn-ghost" onClick={closeItemRename} disabled={itemRenameModal.isSaving}>
                  Cancel
                </button>
                <button
                  className="dt-btn-primary"
                  onClick={() => void submitItemRename()}
                  disabled={itemRenameModal.isSaving}
                >
                  {itemRenameModal.isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
