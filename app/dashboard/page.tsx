'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Inbox, Bookmark, Trash2, LayoutGrid, List, CalendarDays, ChevronDown, Folder as FolderIcon, Plus, Pencil, SlidersHorizontal } from 'lucide-react';

import Navbar from '@/app/components/Navbar';
import ItemGrid from '@/app/components/ItemGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Folder, Item, ItemsResponse, ItemSection, ItemStateFilter } from '@/lib/types';
import { useDebounce } from '@/lib/utils/debounce';
import { ItemAction } from '@/app/components/ItemCard';

type DateFilter = 'all' | 'today' | 'yesterday' | '7d' | '30d';

const dateFilterLabels: Record<DateFilter, string> = {
  all: 'All time',
  today: 'Today',
  yesterday: 'Yesterday',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};

const stateFilterLabels: Record<ItemStateFilter, string> = {
  all: 'All',
  unread: 'Unread',
  read: 'Read',
};

const sectionLabels: Record<ItemSection, string> = {
  inbox: 'Inbox',
  saved: 'Saved',
  trash: 'Trash',
};

type FolderModalMode = 'create' | 'rename' | null;
type ItemRenameModalState = {
  open: boolean;
  item: Item | null;
  draftTitle: string;
  error: string | null;
  isSaving: boolean;
};

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [items, setItems] = useState<Item[]>([]);
  const [activeSection, setActiveSection] = useState<ItemSection>('inbox');
  const [stateFilter, setStateFilter] = useState<ItemStateFilter>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchText, setSearchText] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState<FolderModalMode>(null);
  const [folderDraftName, setFolderDraftName] = useState('');
  const [folderTarget, setFolderTarget] = useState<Folder | null>(null);
  const [folderModalError, setFolderModalError] = useState<string | null>(null);
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [itemRenameModal, setItemRenameModal] = useState<ItemRenameModalState>({
    open: false,
    item: null,
    draftTitle: '',
    error: null,
    isSaving: false,
  });
  const [counts, setCounts] = useState({
    inbox: 0,
    saved: 0,
    trash: 0,
    unread: 0,
    read: 0,
  });

  const debouncedSearch = useDebounce(searchText, 300);

  useEffect(() => {
    if (status === 'unauthenticated') {
      signIn();
    }
  }, [status]);

  const fetchFolders = useCallback(async () => {
    if (!session) return;

    try {
      const response = await fetch('/api/folders');
      const payload = await response.json();

      if (!response.ok) {
        console.error('Failed to fetch folders:', payload.error || response.statusText);
        return;
      }

      setFolders(payload.data || []);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  }, [session]);

  const fetchItems = useCallback(async () => {
    if (!session) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        section: activeSection,
        q: debouncedSearch,
        time: dateFilter,
      });

      if (activeFolderId) {
        params.set('folder_id', activeFolderId);
      }

      if (activeSection !== 'trash') {
        params.set('state', stateFilter);
      }

      const response = await fetch(`/api/items?${params.toString()}`);
      const data: ItemsResponse = await response.json();

      if (!response.ok) {
        console.error('Failed to fetch items:', data.error || response.statusText);
        return;
      }

      setItems(data.data || []);
      if (data.counts) {
        setCounts(data.counts);
      }
    } catch (error) {
      console.error('Failed to fetch items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session, activeSection, debouncedSearch, dateFilter, stateFilter, activeFolderId]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleItemAction = async (item: Item, action: ItemAction, payload?: Record<string, unknown>) => {
    const response = await fetch(`/api/items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || 'Failed to update item');
    }

    await Promise.all([fetchItems(), fetchFolders()]);
  };

  const handleOpenItem = async (item: Item) => {
    const popup = window.open('about:blank', '_blank');

    if (popup) {
      // Preserve control of the new tab while still preventing reverse-tabnabbing.
      popup.opener = null;
    }

    const openTarget = (url: string) => {
      if (popup) {
        popup.location.href = url;
        return;
      }

      window.open(url, '_blank');
    };

    const safeClose = () => {
      if (popup && !popup.closed) {
        popup.close();
      }
    };

    try {
      if (item.url) {
        openTarget(item.url);
        return;
      }

      if (!item.file_url) {
        safeClose();
        return;
      }

      if (!item.file_url.startsWith('supabase://')) {
        openTarget(item.file_url);
        return;
      }

      const response = await fetch(`/api/items/${item.id}`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to resolve file URL');
      }

      const resolvedUrl = payload?.data?.url as string | undefined;

      if (!resolvedUrl) {
        throw new Error('No URL returned for this file');
      }

      openTarget(resolvedUrl);
    } catch (error) {
      console.error('Open item failed:', error);
      safeClose();
    }
  };

  const closeFolderModal = () => {
    setFolderModalMode(null);
    setFolderDraftName('');
    setFolderTarget(null);
    setFolderModalError(null);
  };

  const openCreateFolderModal = () => {
    setFolderModalMode('create');
    setFolderDraftName('');
    setFolderTarget(null);
    setFolderModalError(null);
  };

  const openRenameFolderModal = (folder: Folder) => {
    setFolderModalMode('rename');
    setFolderTarget(folder);
    setFolderDraftName(folder.name);
    setFolderModalError(null);
  };

  const submitFolderModal = async () => {
    const name = folderDraftName.trim();

    if (name.length < 2) {
      setFolderModalError('Folder name must be at least 2 characters.');
      return;
    }

    if (folderModalMode === 'rename' && folderTarget && name === folderTarget.name) {
      closeFolderModal();
      return;
    }

    setIsSavingFolder(true);
    setFolderModalError(null);

    try {
      const response =
        folderModalMode === 'create'
          ? await fetch('/api/folders', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name }),
            })
          : await fetch(`/api/folders/${folderTarget?.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name }),
            });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFolderModalError(payload.error || 'Unable to save folder changes.');
        return;
      }

      await fetchFolders();
      closeFolderModal();
    } catch {
      setFolderModalError('Unable to save folder changes.');
    } finally {
      setIsSavingFolder(false);
    }
  };

  const openItemRenameModal = (item: Item) => {
    setItemRenameModal({
      open: true,
      item,
      draftTitle: item.title,
      error: null,
      isSaving: false,
    });
  };

  const closeItemRenameModal = () => {
    setItemRenameModal((prev) => ({
      ...prev,
      open: false,
      item: null,
      draftTitle: '',
      error: null,
      isSaving: false,
    }));
  };

  const submitItemRenameModal = async () => {
    const targetItem = itemRenameModal.item;
    const title = itemRenameModal.draftTitle.trim();

    if (!targetItem) {
      closeItemRenameModal();
      return;
    }

    if (title.length < 2) {
      setItemRenameModal((prev) => ({ ...prev, error: 'Title must be at least 2 characters.' }));
      return;
    }

    if (title === targetItem.title) {
      closeItemRenameModal();
      return;
    }

    setItemRenameModal((prev) => ({ ...prev, isSaving: true, error: null }));

    try {
      await handleItemAction(targetItem, 'rename-title', { title });
      closeItemRenameModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to rename item title.';
      setItemRenameModal((prev) => ({ ...prev, isSaving: false, error: message }));
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white">
      <Navbar
        searchValue={searchText}
        onSearchChange={setSearchText}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        counts={counts}
        folders={folders}
        activeFolderId={activeFolderId}
        onFolderSelect={setActiveFolderId}
        onCreateFolder={openCreateFolderModal}
      />

      <div className="mx-auto flex max-w-[1400px] gap-6 px-4 py-6 lg:px-6 lg:py-8">
        <aside className="hidden w-64 shrink-0 rounded-2xl border border-white/5 bg-[#0E1526] p-3 lg:block">
          <p className="px-3 pb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Navigation</p>

          <button
            onClick={() => setActiveSection('inbox')}
            className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
              activeSection === 'inbox' ? 'bg-[#1F2937] text-white' : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Inbox
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{counts.inbox}</span>
          </button>

          <button
            onClick={() => setActiveSection('saved')}
            className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
              activeSection === 'saved' ? 'bg-[#1F2937] text-white' : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <Bookmark className="h-4 w-4" />
              Saved
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{counts.saved}</span>
          </button>

          <button
            onClick={() => setActiveSection('trash')}
            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
              activeSection === 'trash' ? 'bg-[#1F2937] text-white' : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <span className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Trash
            </span>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{counts.trash}</span>
          </button>

          <p className="mt-6 px-3 text-xs text-slate-500">Trash auto-deletes after 7 days.</p>

          <div className="mt-6 border-t border-white/10 pt-4">
            <div className="mb-2 flex items-center justify-between px-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Folders</p>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-slate-400 hover:bg-white/5 hover:text-white"
                onClick={openCreateFolderModal}
                title="Create folder"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <button
              onClick={() => setActiveFolderId(null)}
              className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors ${
                activeFolderId === null ? 'bg-[#1F2937] text-white' : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              <span className="flex items-center gap-2">
                <FolderIcon className="h-4 w-4" />
                All folders
              </span>
            </button>

            {folders.map((folder) => (
              <div
                key={folder.id}
                className={`mb-1 flex items-center rounded-xl px-2 py-1 transition-colors ${
                  activeFolderId === folder.id ? 'bg-[#1F2937]' : 'hover:bg-white/5'
                }`}
              >
                <button
                  onClick={() => setActiveFolderId(folder.id)}
                  className="flex min-w-0 flex-1 items-center justify-between rounded-lg px-1 py-1 text-left"
                >
                  <span className="flex min-w-0 items-center gap-2 text-slate-300">
                    <FolderIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{folder.name}</span>
                  </span>
                  <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-200">{folder.item_count ?? 0}</span>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-slate-400 hover:bg-white/5 hover:text-white"
                  onClick={() => openRenameFolderModal(folder)}
                  title="Rename folder"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            {folders.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-500">No folders yet. Create one to organize items.</p>
            )}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mb-6"
          >
            <h1 className="text-3xl font-semibold tracking-tight">{sectionLabels[activeSection]}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {activeSection === 'trash'
                ? 'Items in trash can be restored or permanently removed.'
                : 'Filter by read state and time, then switch between card and list layouts.'}
            </p>
          </motion.div>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#101a2d]/55 p-3 backdrop-blur-sm">
            <div className="hidden flex-wrap items-center gap-2 md:flex">
              {activeSection !== 'trash' &&
                (['all', 'unread', 'read'] as ItemStateFilter[]).map((state) => (
                  <Button
                    key={state}
                    size="sm"
                    variant="outline"
                    className={`h-8 rounded-lg border-white/10 px-3 text-xs ${
                      stateFilter === state
                        ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                        : 'bg-white/5 text-slate-200 hover:bg-white/10'
                    }`}
                    onClick={() => setStateFilter(state)}
                  >
                    {stateFilterLabels[state]}
                    {state === 'unread' ? ` (${counts.unread})` : ''}
                    {state === 'read' ? ` (${counts.read})` : ''}
                  </Button>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeSection !== 'trash' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="h-9 rounded-lg border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 md:hidden">
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      {stateFilterLabels[stateFilter]} • {viewMode === 'list' ? 'List' : 'Grid'}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 border-white/10 bg-[#111827] text-slate-100 shadow-xl shadow-black/30">
                    <DropdownMenuItem disabled className="text-xs uppercase tracking-[0.12em] text-slate-500">State</DropdownMenuItem>
                    {(['all', 'unread', 'read'] as ItemStateFilter[]).map((state) => (
                      <DropdownMenuItem
                        key={state}
                        className="cursor-pointer focus:bg-white/5"
                        onClick={() => setStateFilter(state)}
                      >
                        {stateFilterLabels[state]}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem disabled className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">Layout</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer focus:bg-white/5" onClick={() => setViewMode('list')}>
                      <List className="mr-2 h-4 w-4" />List
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer focus:bg-white/5" onClick={() => setViewMode('grid')}>
                      <LayoutGrid className="mr-2 h-4 w-4" />Grid
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 rounded-lg border-white/10 bg-white/5 text-slate-200 hover:bg-white/10">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dateFilterLabels[dateFilter]}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="border-white/10 bg-[#111827] text-slate-100 shadow-xl shadow-black/30">
                  {Object.entries(dateFilterLabels).map(([value, label]) => (
                    <DropdownMenuItem
                      key={value}
                      className="cursor-pointer focus:bg-white/5"
                      onClick={() => setDateFilter(value as DateFilter)}
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="hidden gap-2 md:flex">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  title="Grid view"
                  className={viewMode === 'grid' ? 'h-9 w-9 bg-indigo-500 text-white hover:bg-indigo-400' : 'h-9 w-9 border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                  title="List view"
                  className={viewMode === 'list' ? 'h-9 w-9 bg-indigo-500 text-white hover:bg-indigo-400' : 'h-9 w-9 border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <ItemGrid
            items={items}
            section={activeSection}
            viewMode={viewMode}
            folders={folders}
            onAction={handleItemAction}
            onRequestRenameTitle={openItemRenameModal}
            onOpenItem={handleOpenItem}
            isLoading={isLoading}
          />
        </main>
      </div>

      {folderModalMode && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4"
          onClick={closeFolderModal}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-white">
              {folderModalMode === 'create' ? 'Create Folder' : 'Rename Folder'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {folderModalMode === 'create'
                ? 'Give your new folder a clear name.'
                : 'Choose a new name for this folder.'}
            </p>

            <div className="mt-4 space-y-2">
              <label className="text-xs uppercase tracking-[0.12em] text-slate-500" htmlFor="folder-name-input">
                Folder Name
              </label>
              <Input
                id="folder-name-input"
                value={folderDraftName}
                onChange={(event) => setFolderDraftName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void submitFolderModal();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    closeFolderModal();
                  }
                }}
                autoFocus
                placeholder="e.g. Work, Personal, Research"
                className="h-11 rounded-xl border-white/10 bg-[#0B1220] text-slate-100 placeholder:text-slate-500"
                disabled={isSavingFolder}
              />
              {folderModalError && <p className="text-sm text-red-300">{folderModalError}</p>}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                onClick={closeFolderModal}
                disabled={isSavingFolder}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-indigo-500 text-white hover:bg-indigo-400"
                onClick={() => {
                  void submitFolderModal();
                }}
                disabled={isSavingFolder}
              >
                {isSavingFolder ? 'Saving...' : folderModalMode === 'create' ? 'Create' : 'Save'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {itemRenameModal.open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4"
          onClick={closeItemRenameModal}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-white">Rename Item Title</h2>
            <p className="mt-1 text-sm text-slate-400">Choose a new title for this item.</p>

            <div className="mt-4 space-y-2">
              <label className="text-xs uppercase tracking-[0.12em] text-slate-500" htmlFor="item-title-input">
                Item Title
              </label>
              <Input
                id="item-title-input"
                value={itemRenameModal.draftTitle}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setItemRenameModal((prev) => ({ ...prev, draftTitle: nextValue, error: null }));
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void submitItemRenameModal();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    closeItemRenameModal();
                  }
                }}
                autoFocus
                placeholder="Enter title"
                className="h-11 rounded-xl border-white/10 bg-[#0B1220] text-slate-100 placeholder:text-slate-500"
                disabled={itemRenameModal.isSaving}
              />
              {itemRenameModal.error && <p className="text-sm text-red-300">{itemRenameModal.error}</p>}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                onClick={closeItemRenameModal}
                disabled={itemRenameModal.isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="rounded-xl bg-indigo-500 text-white hover:bg-indigo-400"
                onClick={() => {
                  void submitItemRenameModal();
                }}
                disabled={itemRenameModal.isSaving}
              >
                {itemRenameModal.isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
