'use client';

import { useState } from 'react';
import { ZoomIn, Trash2, X, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Item } from '@/lib/types';
import { ItemAction } from '@/app/components/ItemCard';

interface ImageCardProps {
  item: Item;
  onAction: (item: Item, action: ItemAction, payload?: Record<string, unknown>) => Promise<void>;
  onOpen: (item: Item) => void;
  onRename?: (item: Item) => void;
}

export default function ImageCard({ item, onAction, onOpen, onRename }: ImageCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isActing, setIsActing] = useState(false);

  const imageUrl = item.preview_image ?? item.file_url;

  const act = async (action: ItemAction, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isActing) return;
    setIsActing(true);
    try { await onAction(item, action); } finally { setIsActing(false); }
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="dt-card group cursor-pointer overflow-hidden relative"
        style={{ aspectRatio: '4/3' }}
        onClick={() => setLightboxOpen(true)}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }}
        />

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          <p className="text-sm font-medium text-white line-clamp-1">{item.title}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <button
              className="flex items-center gap-1 text-xs text-white/80 px-2 py-1 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)' }}
              onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
            >
              <ZoomIn size={12} /> View
            </button>
            <button
              className="ml-auto p-1.5 rounded-lg text-white/70 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.15)' }}
              onClick={(e) => { e.stopPropagation(); onRename?.(item); }}
              title="Rename title"
            >
              <Pencil size={13} />
            </button>
            <button
              className="p-1.5 rounded-lg text-white/70 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.15)' }}
              onClick={(e) => act('trash', e)}
              disabled={isActing}
              title="Move to trash"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Zoom icon */}
        <div
          className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(0,0,0,0.4)', color: 'white' }}
        >
          <ZoomIn size={14} />
        </div>
      </motion.div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.92)' }}
            onClick={() => setLightboxOpen(false)}
          >
            <button
              className="absolute top-4 right-4 p-2 rounded-full text-white"
              style={{ background: 'rgba(255,255,255,0.1)' }}
              onClick={() => setLightboxOpen(false)}
            >
              <X size={20} />
            </button>
            {imageUrl && (
              <motion.img
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                src={imageUrl}
                alt={item.title}
                className="max-w-full max-h-full rounded-xl object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
