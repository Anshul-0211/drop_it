'use client';

import { useState } from 'react';
import { FileText, Download, Trash2, File, FileImage, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { Item } from '@/lib/types';
import { ItemAction } from '@/app/components/ItemCard';

interface FileCardProps {
  item: Item;
  onAction: (item: Item, action: ItemAction, payload?: Record<string, unknown>) => Promise<void>;
  onOpen: (item: Item) => void;
  onRename?: (item: Item) => void;
}

function getFileExtension(url?: string | null, title?: string | null): string {
  const source = url ?? title ?? '';
  const match = source.match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  return match?.[1]?.toLowerCase() ?? 'file';
}

function FileIcon({ ext }: { ext: string }) {
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <FileImage size={28} />;
  if (['pdf'].includes(ext)) return <FileText size={28} />;
  return <File size={28} />;
}

const EXT_COLORS: Record<string, string> = {
  pdf: '#EF4444',
  doc: '#2563EB', docx: '#2563EB',
  xls: '#16A34A', xlsx: '#16A34A',
  jpg: '#F59E0B', jpeg: '#F59E0B', png: '#F59E0B', gif: '#F59E0B',
};

export default function FileCard({ item, onAction, onOpen, onRename }: FileCardProps) {
  const [isActing, setIsActing] = useState(false);
  const ext = getFileExtension(item.file_url, item.title);
  const iconColor = EXT_COLORS[ext] ?? 'var(--accent-primary)';

  const act = async (action: ItemAction, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActing) return;
    setIsActing(true);
    try { await onAction(item, action); } finally { setIsActing(false); }
  };

  const timeAgo = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="dt-card group flex items-start gap-4 p-4 cursor-pointer"
      onClick={() => onOpen(item)}
    >
      {/* File type icon */}
      <div
        className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${iconColor}18`, color: iconColor }}
      >
        <FileIcon ext={ext} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3
          className="text-sm font-semibold line-clamp-1"
          style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          {item.title}
        </h3>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-xs font-bold uppercase px-1.5 py-0.5 rounded"
            style={{ background: `${iconColor}18`, color: iconColor }}
          >
            {ext}
          </span>
          {item.created_at && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {timeAgo(item.created_at)}
            </span>
          )}
        </div>

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <div className="flex gap-1 mt-2">
            {item.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="dt-badge text-[10px]">{tag}</span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="p-2 rounded-lg transition-all"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent-primary)' }}
          onClick={() => onOpen(item)}
          title="Download"
        >
          <Download size={14} />
        </button>
        <button
          className="p-2 rounded-lg transition-all"
          style={{ color: 'var(--text-muted)' }}
          onClick={(e) => { e.stopPropagation(); onRename?.(item); }}
          title="Rename title"
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--accent-soft)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <Pencil size={14} />
        </button>
        <button
          className="p-2 rounded-lg transition-all"
          style={{ color: 'var(--text-muted)' }}
          onClick={(e) => act('trash', e)}
          disabled={isActing}
          title="Move to trash"
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--destructive)'; e.currentTarget.style.background = 'var(--destructive-soft)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
}
