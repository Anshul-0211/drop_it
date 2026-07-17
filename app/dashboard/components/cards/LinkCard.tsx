'use client';

import { useState } from 'react';
import { ExternalLink, Bookmark, Trash2, FolderInput, Tag, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { Item, Folder } from '@/lib/types';
import { ItemAction } from '@/app/components/ItemCard';

interface LinkCardProps {
  item: Item;
  folders: Folder[];
  viewMode?: 'grid' | 'list';
  onAction: (item: Item, action: ItemAction, payload?: Record<string, unknown>) => Promise<void>;
  onOpen: (item: Item) => void;
  onRename?: (item: Item) => void;
  onMoveToFolder?: (item: Item) => void;
}

function getDomain(url?: string | null) {
  try { return new URL(url ?? '').hostname.replace('www.', ''); } catch { return null; }
}

export default function LinkCard({ item, folders, viewMode = 'grid', onAction, onOpen, onRename, onMoveToFolder }: LinkCardProps) {
  const [isActing, setIsActing] = useState(false);
  const domain = getDomain(item.url);
  const isUnread = item.status === 'unread';

  const act = async (action: ItemAction, payload?: Record<string, unknown>) => {
    if (isActing) return;
    setIsActing(true);
    try { await onAction(item, action, payload); } finally { setIsActing(false); }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="dt-card group flex flex-col cursor-pointer"
      onClick={() => onOpen(item)}
    >
      {/* Preview image — hidden in list view */}
      {item.preview_image && viewMode === 'grid' && (
        <div className="h-40 overflow-hidden" style={{ borderBottom: '1px solid var(--border)' }}>
          <img
            src={item.preview_image}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}

      {/* Unread indicator */}
      {isUnread && (
        <div className="h-0.5 w-full" style={{ background: 'var(--accent-primary)' }} />
      )}

      <div className="flex flex-col flex-1 p-4 gap-2">
        {/* Domain */}
        {domain && (
          <div className="flex items-center gap-1.5">
            <img
              src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
              alt=""
              className="h-4 w-4 rounded-sm"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <span className="text-xs font-medium truncate" style={{ color: 'var(--text-muted)' }}>{domain}</span>
          </div>
        )}

        {/* Title */}
        <h3 className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
          {item.title}
        </h3>

        {/* Description */}
        {item.description && (
          <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
            {item.description}
          </p>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto pt-1">
            {item.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="dt-badge">
                <Tag size={9} className="mr-1" />{tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div
          className="flex items-center gap-1 pt-2 mt-auto opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ borderTop: '1px solid var(--border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="dt-btn-ghost text-xs py-1 px-2"
            onClick={() => onOpen(item)}
            title="Open link"
          >
            <ExternalLink size={12} /> Open
          </button>
          <button
            className="dt-btn-ghost text-xs py-1 px-2"
            onClick={() => act('toggle-read')}
            disabled={isActing}
            title={isUnread ? 'Mark read' : 'Mark unread'}
          >
            <Bookmark size={12} /> {isUnread ? 'Read' : 'Unread'}
          </button>
          <button
            className="ml-auto p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => onMoveToFolder?.(item)}
            title="Move to folder"
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--accent-soft)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <FolderInput size={13} />
          </button>
          <button
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => onRename?.(item)}
            title="Rename title"
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--accent-soft)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <Pencil size={13} />
          </button>
          <button
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => act('trash')}
            disabled={isActing}
            title="Move to trash"
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--destructive)'; e.currentTarget.style.background = 'var(--destructive-soft)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
