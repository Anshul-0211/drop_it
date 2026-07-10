'use client';

import { useState } from 'react';
import { Copy, Check, Trash2, Pencil } from 'lucide-react';
import { motion } from 'framer-motion';
import { Item } from '@/lib/types';
import { ItemAction } from '@/app/components/ItemCard';

interface NoteCardProps {
  item: Item;
  onAction: (item: Item, action: ItemAction, payload?: Record<string, unknown>) => Promise<void>;
  onRename?: (item: Item) => void;
}

export default function NoteCard({ item, onAction, onRename }: NoteCardProps) {
  const [copied, setCopied] = useState(false);
  const [isActing, setIsActing] = useState(false);

  const content = item.description ?? item.title ?? '';

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const act = async (action: ItemAction) => {
    if (isActing) return;
    setIsActing(true);
    try { await onAction(item, action); } finally { setIsActing(false); }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="dt-card group flex flex-col"
      style={{ background: 'var(--accent-soft)' }}
    >
      {/* Top accent line */}
      <div className="h-1 w-full rounded-t-[14px]" style={{ background: 'var(--accent-primary)' }} />

      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Label */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--accent-text)' }}>
            Note
          </span>
          {item.created_at && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {timeAgo(item.created_at)}
            </span>
          )}
        </div>

        {/* Note content */}
        <p
          className="text-sm leading-relaxed flex-1 line-clamp-6"
          style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
          }}
        >
          {content}
        </p>

        {/* Actions */}
        <div
          className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <button
            className="dt-btn-ghost text-xs py-1 px-2"
            onClick={handleCopy}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            className="ml-auto p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-muted)' }}
            onClick={(e) => { e.stopPropagation(); onRename?.(item); }}
            title="Rename title"
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-primary)'; e.currentTarget.style.background = 'var(--accent-soft)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <Pencil size={13} />
          </button>
          <button
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-muted)' }}
            onClick={(e) => { e.stopPropagation(); void act('trash'); }}
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
