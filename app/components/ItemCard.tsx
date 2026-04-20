'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Check, RotateCcw, Trash2, Bookmark, BookmarkCheck, Undo2, X, FolderInput, Pencil } from 'lucide-react';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Folder, Item, ItemSection } from '@/lib/types';

export type ItemAction =
  | 'toggle-read'
  | 'save'
  | 'unsave'
  | 'trash'
  | 'restore'
  | 'delete-forever'
  | 'move-folder'
  | 'clear-folder'
  | 'rename-title';

interface ItemCardProps {
  item: Item;
  section: ItemSection;
  folders?: Folder[];
  onAction: (item: Item, action: ItemAction, payload?: Record<string, unknown>) => Promise<void>;
  onRequestRenameTitle?: (item: Item) => void;
  onOpenItem?: (item: Item) => Promise<void>;
}

export default function ItemCard({ item, section, onAction, folders = [], onRequestRenameTitle, onOpenItem }: ItemCardProps) {
  const [isActing, setIsActing] = useState(false);

  const runAction = async (action: ItemAction, payload?: Record<string, unknown>) => {
    setIsActing(true);
    try {
      await onAction(item, action, payload);
    } finally {
      setIsActing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full overflow-hidden rounded-2xl border border-white/5 bg-[#111827] shadow-lg shadow-black/20 transition-all duration-200 hover:bg-[#1F2937]">
        {item.preview_image && (
          <div className="relative aspect-video overflow-hidden bg-slate-800">
            <img
              src={item.preview_image}
              alt={item.title}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />

            <div className="absolute right-3 top-3 flex items-center gap-2">
              <Badge className="rounded-full border border-white/10 bg-black/50 text-white backdrop-blur-sm" variant="secondary">
                {item.status}
              </Badge>
              {item.is_saved && section !== 'trash' && (
                <Badge className="rounded-full border border-indigo-300/30 bg-indigo-500/20 text-indigo-100" variant="secondary">
                  saved
                </Badge>
              )}
            </div>

            {(item.url || item.file_url) && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 hover:opacity-100 bg-black/35">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => void onOpenItem?.(item)}
                  className="gap-2 rounded-full border border-white/10 bg-white/90 text-slate-900 hover:bg-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open
                </Button>
              </div>
            )}
          </div>
        )}

        <CardContent className="space-y-3 p-4">
          <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-white">{item.title}</h3>

          {item.description && (
            <p className="line-clamp-2 text-sm text-slate-400">{item.description}</p>
          )}

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="rounded-full border-white/10 bg-white/5 text-slate-300">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          <p className="text-xs text-slate-500">
            {new Date(item.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: new Date(item.created_at).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
            })}
          </p>
        </CardContent>

        <CardFooter className="flex flex-wrap gap-2 border-t border-white/5 p-4">
          {section !== 'trash' && (item.url || item.file_url) && (
            <Button
              size="sm"
              disabled={isActing}
              onClick={() => void onOpenItem?.(item)}
              className="h-9 flex-1 rounded-xl bg-blue-500/20 text-blue-100 hover:bg-blue-500/30"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open
            </Button>
          )}

          {section !== 'trash' && (
            <Button
              size="sm"
              disabled={isActing}
              onClick={() => runAction('toggle-read')}
              className="h-9 flex-1 rounded-xl bg-[#1F2937] text-slate-100 hover:bg-[#263244]"
            >
              {item.status === 'read' ? (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Mark Unread
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Mark Read
                </>
              )}
            </Button>
          )}

          {section !== 'trash' && (
            <Button
              size="sm"
              variant="outline"
              disabled={isActing}
              onClick={() => runAction(item.is_saved ? 'unsave' : 'save')}
              className="h-9 rounded-xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
            >
              {item.is_saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
            </Button>
          )}

          {section !== 'trash' && (
            <Button
              size="sm"
              variant="outline"
              disabled={isActing}
              onClick={() => runAction('trash')}
              className="h-9 rounded-xl border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}

          {section !== 'trash' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isActing}
                  className="h-9 rounded-xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                  title="Move to folder"
                >
                  <FolderInput className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-white/10 bg-[#111827] text-slate-100 shadow-xl shadow-black/30">
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-white/5"
                  onClick={() => runAction('clear-folder')}
                >
                  No Folder
                </DropdownMenuItem>
                {folders.map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    className="cursor-pointer focus:bg-white/5"
                    onClick={() => runAction('move-folder', { folder_id: folder.id })}
                  >
                    {folder.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {section !== 'trash' && (
            <Button
              size="sm"
              variant="outline"
              disabled={isActing}
              onClick={() => onRequestRenameTitle?.(item)}
              className="h-9 rounded-xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
              title="Rename title"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}

          {section === 'trash' && (
            <>
              <Button
                size="sm"
                disabled={isActing}
                onClick={() => runAction('restore')}
                className="h-9 flex-1 rounded-xl bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30"
              >
                <Undo2 className="mr-2 h-4 w-4" />
                Restore
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isActing}
                onClick={() => runAction('delete-forever')}
                className="h-9 rounded-xl border-red-500/50 bg-red-500/10 text-red-200 hover:bg-red-500/20"
              >
                <X className="mr-2 h-4 w-4" />
                Delete Forever
              </Button>
            </>
          )}
        </CardFooter>
      </Card>
    </motion.div>
  );
}
