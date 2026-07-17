'use client';

import { useState } from 'react';
import { Inbox, Bookmark, Trash2, Folder as FolderIcon, Plus, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { Folder, Item, ItemSection } from '@/lib/types';

interface SidebarProps {
  activeSection: ItemSection;
  onSectionChange: (s: ItemSection) => void;
  activeFolderId: string | null;
  onFolderSelect: (id: string | null) => void;
  folders: Folder[];
  counts: { inbox: number; saved: number; trash: number };
  onCreateFolder: () => void;
  onRenameFolder: (folder: Folder) => void;
  draggedItem?: Item | null;
  onDropToFolder?: (folderId: string | null) => Promise<void>;
}

const navItems = [
  { key: 'inbox' as ItemSection, label: 'Inbox', icon: Inbox, countKey: 'inbox' },
  { key: 'saved' as ItemSection, label: 'Saved', icon: Bookmark, countKey: 'saved' },
  { key: 'trash' as ItemSection, label: 'Trash', icon: Trash2, countKey: 'trash' },
];

export default function Sidebar({
  activeSection,
  onSectionChange,
  activeFolderId,
  onFolderSelect,
  folders,
  counts,
  onCreateFolder,
  onRenameFolder,
  draggedItem,
  onDropToFolder,
}: SidebarProps) {
  const [dropTargetId, setDropTargetId] = useState<string | 'inbox' | null>(null);
  const isDragging = !!draggedItem;

  const handleDragOver = (e: React.DragEvent, id: string | 'inbox') => {
    if (!isDragging) return;
    e.preventDefault();
    setDropTargetId(id);
  };

  const handleDragLeave = () => setDropTargetId(null);

  const handleDrop = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDropTargetId(null);
    if (onDropToFolder) await onDropToFolder(folderId);
  };

  return (
    <aside
      className="hidden lg:flex flex-col w-56 shrink-0 rounded-xl p-2 dt-scroll overflow-y-auto"
      style={{
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border)',
        maxHeight: 'calc(100vh - 5rem)',
        position: 'sticky',
        top: '5.5rem',
      }}
    >
      {/* Navigation */}
      <p className="px-2 pb-1.5 text-xs uppercase tracking-[0.18em] font-semibold" style={{ color: 'var(--text-muted)' }}>
        Navigation
      </p>

      <nav className="space-y-0.5">
        {navItems.map(({ key, label, icon: Icon, countKey }) => {
          const isActive = activeSection === key && activeFolderId === null;
          return (
            <button
              key={key}
              onClick={() => { onSectionChange(key); onFolderSelect(null); }}
              className="dt-nav-btn"
              style={isActive ? {
                background: 'var(--accent-soft)',
                color: 'var(--accent-text)',
                borderLeft: '3px solid var(--accent-primary)',
                paddingLeft: '9px',
              } : {}}
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: isActive ? 'var(--accent-primary)' : 'var(--bg-hover)', color: isActive ? 'var(--text-inverse)' : 'var(--text-muted)' }}
              >
                {counts[countKey as keyof typeof counts]}
              </span>
            </button>
          );
        })}
      </nav>

      <p className="px-3 py-1.5 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
        Trash auto-deletes after 7 days.
      </p>

      {/* Folders */}
      <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-3 mb-2">
          <p className="text-xs uppercase tracking-[0.18em] font-semibold" style={{ color: 'var(--text-muted)' }}>
            Folders
          </p>
          <button
            onClick={onCreateFolder}
            className="p-1 rounded-lg transition-all"
            style={{ color: 'var(--text-muted)' }}
            title="New folder"
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <Plus size={15} />
          </button>
        </div>

        {/* All folders — also a drop target (removes from folder → inbox) */}
        <div
          onDragOver={(e) => handleDragOver(e, 'inbox')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => void handleDrop(e, null)}
          style={{
            borderRadius: '10px',
            transition: 'all 0.15s ease',
            ...(dropTargetId === 'inbox' && isDragging ? {
              background: 'var(--accent-soft)',
              outline: '2px dashed var(--accent-primary)',
            } : {}),
          }}
        >
          <button
            onClick={() => onFolderSelect(null)}
            className="dt-nav-btn w-full"
            style={activeFolderId === null ? { background: 'var(--bg-hover)', color: 'var(--text-primary)' } : {}}
          >
            <FolderIcon size={15} />
            <span className="flex-1">All folders</span>
            {dropTargetId === 'inbox' && isDragging && (
              <span className="text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>Drop</span>
            )}
          </button>
        </div>

        {/* User folders — each is a drop target */}
        {folders.map((folder) => {
          const isActive = activeFolderId === folder.id;
          const isOver = dropTargetId === folder.id && isDragging;
          return (
            <motion.div
              key={folder.id}
              layout
              className="flex items-center gap-1 rounded-xl pr-1"
              style={{
                ...(isActive ? { background: 'var(--accent-soft)' } : {}),
                ...(isOver ? {
                  background: 'var(--accent-soft)',
                  outline: '2px dashed var(--accent-primary)',
                  borderRadius: '10px',
                } : {}),
                transition: 'all 0.15s ease',
              }}
              onDragOver={(e) => handleDragOver(e, folder.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => void handleDrop(e, folder.id)}
            >
              <button
                onClick={() => onFolderSelect(folder.id)}
                className="flex flex-1 min-w-0 items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={isActive || isOver ? { color: 'var(--accent-text)' } : { color: 'var(--text-secondary)' }}
              >
                <FolderIcon size={15} className="shrink-0" />
                <span className="truncate">{folder.name}</span>
                <span
                  className="ml-auto text-xs px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
                >
                  {folder.item_count ?? 0}
                </span>
              </button>
              {!isDragging && (
                <button
                  onClick={() => onRenameFolder(folder)}
                  className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                  title="Rename folder"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Pencil size={13} />
                </button>
              )}
              {isOver && (
                <span className="text-xs font-semibold pr-1 shrink-0" style={{ color: 'var(--accent-primary)' }}>
                  Drop ↓
                </span>
              )}
            </motion.div>
          );
        })}

        {folders.length === 0 && (
          <p className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            No folders yet. Create one to organize your items.
          </p>
        )}

        {/* Drag hint */}
        {isDragging && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-3 pt-3 text-xs text-center"
            style={{ color: 'var(--accent-primary)' }}
          >
            Drop onto a folder above
          </motion.p>
        )}
      </div>
    </aside>
  );
}
