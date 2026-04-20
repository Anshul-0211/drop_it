'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, BookmarkCheck, Check, RotateCcw, Trash2, Undo2, X, FolderInput, Pencil, EllipsisVertical, ExternalLink } from 'lucide-react';

import ItemCard, { ItemAction } from './ItemCard';
import { Folder, Item, ItemSection } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.08,
    },
  },
};

interface ItemGridProps {
  items: Item[];
  section: ItemSection;
  viewMode: 'grid' | 'list';
  folders?: Folder[];
  onAction: (item: Item, action: ItemAction, payload?: Record<string, unknown>) => Promise<void>;
  onRequestRenameTitle?: (item: Item) => void;
  onOpenItem?: (item: Item) => Promise<void>;
  isLoading?: boolean;
}

function EmptyState({ section }: { section: ItemSection }) {
  const copy = {
    inbox: 'Your inbox is clear. New captures will appear here.',
    saved: 'No saved items yet. Bookmark important captures to keep them handy.',
    trash: 'Trash is empty. Items moved to trash will auto-delete after 7 days.',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/5 bg-[#111827] px-6 py-16 text-center"
    >
      <p className="text-lg text-slate-100">Nothing here yet</p>
      <p className="mt-2 text-sm text-slate-400">{copy[section]}</p>
    </motion.div>
  );
}

function ListRow({
  item,
  section,
  folders,
  onAction,
  onRequestRenameTitle,
  onOpenItem,
}: {
  item: Item;
  section: ItemSection;
  folders: Folder[];
  onAction: (item: Item, action: ItemAction, payload?: Record<string, unknown>) => Promise<void>;
  onRequestRenameTitle?: (item: Item) => void;
  onOpenItem?: (item: Item) => Promise<void>;
}) {
  const run = (action: ItemAction, payload?: Record<string, unknown>) => onAction(item, action, payload);
  const statusTone =
    section === 'trash'
      ? 'border-l-rose-400/70'
      : item.status === 'unread'
        ? 'border-l-amber-400/70'
        : 'border-l-emerald-400/70';

  const openRow = () => {
    if (!onOpenItem) return;
    void onOpenItem(item);
  };

  const stopEvent = (event: React.MouseEvent | React.KeyboardEvent) => {
    event.stopPropagation();
  };

  return (
    <div
      className={`group rounded-xl border border-white/5 border-l-2 bg-[#101827] px-3 py-2.5 transition-all duration-200 hover:bg-[#172236] sm:px-4 ${statusTone} ${onOpenItem ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={openRow}
      onKeyDown={(event) => {
        if ((event.key === 'Enter' || event.key === ' ') && onOpenItem) {
          event.preventDefault();
          openRow();
        }
      }}
      role={onOpenItem ? 'button' : undefined}
      tabIndex={onOpenItem ? 0 : -1}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-white">{item.title}</p>
            {item.is_saved && section !== 'trash' && <BookmarkCheck className="h-3.5 w-3.5 text-indigo-300" />}
            {(item.url || item.file_url) && <ExternalLink className="h-3.5 w-3.5 text-slate-500 transition-colors group-hover:text-slate-300" />}
          </div>
          {item.description && <p className="mt-0.5 truncate text-xs text-slate-400">{item.description}</p>}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            <span>{item.status === 'unread' ? 'Unread' : 'Read'}</span>
            <span className="text-slate-700">•</span>
            <span>
              {new Date(item.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
            {item.folder_id && section !== 'trash' && (
              <>
                <span className="text-slate-700">•</span>
                <span className="truncate text-slate-400">
                  {folders.find((folder) => folder.id === item.folder_id)?.name || 'Folder'}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1" onClick={stopEvent} onKeyDown={stopEvent}>
          {section !== 'trash' && (item.url || item.file_url) && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-slate-300 hover:bg-white/10"
              title="Open"
              onClick={() => {
                if (!onOpenItem) return;
                void onOpenItem(item);
              }}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}

          {section !== 'trash' && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-slate-300 hover:bg-white/10"
              title={item.is_saved ? 'Unsave' : 'Save'}
              onClick={() => run(item.is_saved ? 'unsave' : 'save')}
            >
              {item.is_saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </Button>
          )}

          {section !== 'trash' && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-red-300 hover:bg-red-500/20"
              title="Move to trash"
              onClick={() => run('trash')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}

          {section !== 'trash' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300 hover:bg-white/10" title="More actions">
                  <EllipsisVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-white/10 bg-[#111827] text-slate-100 shadow-xl shadow-black/30">
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-white/5"
                  onClick={() => run('toggle-read')}
                >
                  {item.status === 'read' ? (
                    <><RotateCcw className="mr-2 h-4 w-4" />Mark unread</>
                  ) : (
                    <><Check className="mr-2 h-4 w-4" />Mark read</>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-white/5"
                  onClick={() => onRequestRenameTitle?.(item)}
                >
                  <Pencil className="mr-2 h-4 w-4" />Rename title
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem className="cursor-pointer focus:bg-white/5" onClick={() => run('clear-folder')}>
                  <FolderInput className="mr-2 h-4 w-4" />No folder
                </DropdownMenuItem>
                {folders.map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    className="cursor-pointer focus:bg-white/5"
                    onClick={() => run('move-folder', { folder_id: folder.id })}
                  >
                    <FolderInput className="mr-2 h-4 w-4" />{folder.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {section === 'trash' && (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-emerald-200 hover:bg-emerald-500/20"
                onClick={() => run('restore')}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-red-300 hover:bg-red-500/20"
                onClick={() => run('delete-forever')}
              >
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ItemGrid({ items, section, viewMode, folders = [], onAction, onRequestRenameTitle, onOpenItem, isLoading }: ItemGridProps) {
  if (isLoading) {
    return (
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3' : 'flex flex-col gap-2'}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className={viewMode === 'grid' ? 'h-96 rounded-2xl border border-white/5 bg-white/5' : 'h-16 rounded-xl border border-white/5 bg-white/5'} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState section={section} />;
  }

  if (viewMode === 'list') {
    return (
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex flex-col gap-2">
        {items.map((item) => (
          <ListRow
            key={item.id}
            item={item}
            section={section}
            folders={folders}
            onAction={onAction}
            onRequestRenameTitle={onRequestRenameTitle}
            onOpenItem={onOpenItem}
          />
        ))}
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
      >
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            section={section}
            folders={folders}
            onAction={onAction}
            onRequestRenameTitle={onRequestRenameTitle}
            onOpenItem={onOpenItem}
          />
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
