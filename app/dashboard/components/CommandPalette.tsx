'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, Inbox, Bookmark, Trash2, Folder as FolderIcon, Sun, Moon, Plus, ArrowRight, FileText, FileImage, Link2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, ItemSection, Item } from '@/lib/types';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  folders: Folder[];
  activeSection: ItemSection;
  onSectionChange: (s: ItemSection) => void;
  onFolderSelect: (id: string | null) => void;
  onCreateFolder: () => void;
  onOpenItem: (item: Item) => void;
}

interface Command {
  id: string;
  group: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  keywords?: string;
}

export default function CommandPalette({
  open, onClose, folders, activeSection, onSectionChange, onFolderSelect, onCreateFolder, onOpenItem,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [searchedItems, setSearchedItems] = useState<Item[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search for items matching query from database
  useEffect(() => {
    if (!query.trim()) {
      setSearchedItems([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/items?q=${encodeURIComponent(query)}`);
        const payload = await res.json();
        if (res.ok) {
          setSearchedItems(payload.data || []);
        }
      } catch (err) {
        console.error('Command palette search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const getCommands = useCallback((): Command[] => {
    const list: Command[] = [
      {
        id: 'inbox', group: 'Navigate', label: 'Go to Inbox', icon: <Inbox size={15} />,
        action: () => { onSectionChange('inbox'); onFolderSelect(null); onClose(); }, keywords: 'inbox navigate',
      },
      {
        id: 'saved', group: 'Navigate', label: 'Go to Saved', icon: <Bookmark size={15} />,
        action: () => { onSectionChange('saved'); onFolderSelect(null); onClose(); }, keywords: 'saved bookmark navigate',
      },
      {
        id: 'trash', group: 'Navigate', label: 'Go to Trash', icon: <Trash2 size={15} />,
        action: () => { onSectionChange('trash'); onFolderSelect(null); onClose(); }, keywords: 'trash delete navigate',
      },
      {
        id: 'new-folder', group: 'Create', label: 'New Folder', icon: <Plus size={15} />,
        action: () => { onCreateFolder(); onClose(); }, keywords: 'new folder create',
      },
      {
        id: 'theme-dark', group: 'Theme', label: 'Switch to Dark Mode', icon: <Moon size={15} />,
        action: () => { document.documentElement.setAttribute('data-theme', 'dark'); localStorage.setItem('dt-theme', 'dark'); onClose(); },
        keywords: 'dark theme mode',
      },
      {
        id: 'theme-light', group: 'Theme', label: 'Switch to Light Mode', icon: <Sun size={15} />,
        action: () => { document.documentElement.setAttribute('data-theme', 'light'); localStorage.setItem('dt-theme', 'light'); onClose(); },
        keywords: 'light theme mode',
      },
      ...folders.map((f) => ({
        id: `folder-${f.id}`, group: 'Folders', label: f.name, icon: <FolderIcon size={15} />,
        action: () => { onFolderSelect(f.id); onClose(); }, keywords: f.name.toLowerCase(),
      })),
    ];

    // Append database items
    searchedItems.forEach((item) => {
      let icon = <Link2 size={15} />;
      if (item.type === 'image') icon = <FileImage size={15} />;
      else if (item.type === 'pdf' || item.type === 'document') icon = <FileText size={15} />;

      list.push({
        id: `item-${item.id}`,
        group: 'Matching Items',
        label: item.title,
        icon,
        action: () => { onOpenItem(item); onClose(); },
        keywords: item.title.toLowerCase(),
      });
    });

    return list;
  }, [folders, onClose, onSectionChange, onFolderSelect, onCreateFolder, searchedItems, onOpenItem]);

  const filtered = getCommands().filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.label.toLowerCase().includes(q) || (c.keywords ?? '').includes(q);
  });

  // Group results
  const groups = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    (acc[cmd.group] ??= []).push(cmd);
    return acc;
  }, {});

  const flatFiltered = Object.values(groups).flat();

  useEffect(() => { setSelectedIdx(0); }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSearchedItems([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, flatFiltered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); flatFiltered[selectedIdx]?.action(); }
    if (e.key === 'Escape') { onClose(); }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="dt-palette-backdrop" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-xl mx-4 rounded-2xl overflow-hidden"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <Search size={17} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search navigation or type to search database items..."
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--text-primary)' }}
              />
              <kbd
                className="text-xs px-1.5 py-0.5 rounded font-mono"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
              >
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-72 overflow-y-auto dt-scroll py-1.5">
              {Object.entries(groups).map(([group, cmds]) => (
                <div key={group} className="mb-1">
                  <p className="px-4 pt-2 pb-1 text-xs uppercase tracking-widest font-semibold" style={{ color: 'var(--text-muted)' }}>
                    {group}
                  </p>
                  {cmds.map((cmd) => {
                    const globalIdx = flatFiltered.findIndex((c) => c.id === cmd.id);
                    const isSelected = globalIdx === selectedIdx;
                    return (
                      <button
                        key={cmd.id}
                        onClick={cmd.action}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-left transition-all"
                        style={{
                          background: isSelected ? 'var(--accent-soft)' : 'transparent',
                          color: isSelected ? 'var(--accent-text)' : 'var(--text-primary)',
                        }}
                        onMouseEnter={() => setSelectedIdx(globalIdx)}
                      >
                        <span style={{ color: isSelected ? 'var(--accent-primary)' : 'var(--text-muted)' }}>{cmd.icon}</span>
                        <span className="truncate flex-1">{cmd.label}</span>
                        {isSelected && <ArrowRight size={13} className="ml-auto shrink-0" style={{ color: 'var(--accent-primary)' }} />}
                      </button>
                    );
                  })}
                </div>
              ))}

              {filtered.length === 0 && !isSearching && (
                <p className="px-4 py-8 text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                  No results for "{query}"
                </p>
              )}

              {isSearching && (
                <p className="px-4 py-4 text-xs text-center animate-pulse" style={{ color: 'var(--text-muted)' }}>
                  Searching database items...
                </p>
              )}
            </div>

            {/* Footer hint */}
            <div
              className="flex items-center gap-4 px-4 py-2 text-xs"
              style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}
            >
              <span>↑↓ Navigate</span>
              <span>↵ Open</span>
              <span>ESC Close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
