'use client';

import { signOut, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useTheme } from 'next-themes';
import { Moon, Sun, LogOut, Search, Settings2, Menu, Inbox, Bookmark, Trash2, Folder as FolderIcon, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Folder, ItemSection } from '@/lib/types';

type SectionCounts = {
  inbox: number;
  saved: number;
  trash: number;
};

interface NavbarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  activeSection?: ItemSection;
  onSectionChange?: (section: ItemSection) => void;
  counts?: SectionCounts;
  folders?: Folder[];
  activeFolderId?: string | null;
  onFolderSelect?: (folderId: string | null) => void;
  onCreateFolder?: () => void;
}

export default function Navbar({
  searchValue = '',
  onSearchChange,
  activeSection,
  onSectionChange,
  counts,
  folders = [],
  activeFolderId,
  onFolderSelect,
  onCreateFolder,
}: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [telegramUserId, setTelegramUserId] = useState('');
  const [isLoadingTelegramId, setIsLoadingTelegramId] = useState(false);
  const [isSavingTelegramId, setIsSavingTelegramId] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!settingsOpen) return;

    const loadTelegramId = async () => {
      setIsLoadingTelegramId(true);
      setSettingsMessage(null);
      setLinkToken(null);
      setLinkUrl(null);
      try {
        const response = await fetch('/api/user/telegram');
        const data = await response.json();
        if (response.ok) {
          setTelegramUserId(data.telegramUserId ? String(data.telegramUserId) : '');
        } else {
          setSettingsMessage(data.error || 'Failed to load Telegram user ID.');
        }
      } catch {
        setSettingsMessage('Failed to load Telegram user ID.');
      } finally {
        setIsLoadingTelegramId(false);
      }
    };

    loadTelegramId();
  }, [settingsOpen]);

  const handleSaveTelegramId = async () => {
    setIsSavingTelegramId(true);
    setSettingsMessage(null);
    try {
      const response = await fetch('/api/user/telegram', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ telegramUserId }),
      });

      const data = await response.json();
      if (!response.ok) {
        setSettingsMessage(data.error || 'Failed to save Telegram user ID.');
        return;
      }

      setSettingsMessage('Telegram user ID linked successfully.');
    } catch {
      setSettingsMessage('Failed to save Telegram user ID.');
    } finally {
      setIsSavingTelegramId(false);
    }
  };

  const handleGenerateLinkingUrl = async () => {
    setIsGeneratingLink(true);
    setSettingsMessage(null);
    try {
      const response = await fetch('/api/linking');
      const data = await response.json();
      if (!response.ok) {
        setSettingsMessage(data.error || 'Failed to generate linking URL.');
        return;
      }

      setLinkToken(data.token);
      setLinkUrl(data.linkUrl);
      setSettingsMessage(
        'Linking URL generated. Share this link with your Telegram account or click the button below to open it.'
      );
    } catch {
      setSettingsMessage('Failed to generate linking URL.');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  return (
    <>
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="sticky top-0 z-50 h-16 border-b border-white/5 bg-[#0B0F1A]/80 backdrop-blur-xl"
      >
        <div className="mx-auto grid h-full max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6">
          <div className="justify-self-start">
            <motion.h1 
              whileHover={{ scale: 1.03 }}
              className="text-xl font-semibold tracking-tight bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent cursor-pointer"
            >
              drop_it
            </motion.h1>
          </div>

          <div className="hidden w-full justify-center px-2 lg:flex">
            <div className="relative w-full max-w-2xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={searchValue}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder="Search saved content"
                className="h-10 rounded-xl border-white/10 bg-[#111827] pl-10 text-slate-100 placeholder:text-slate-500 shadow-inner shadow-black/25 focus-visible:ring-1 focus-visible:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-self-end gap-1.5 sm:gap-2">
            {/* Mobile + Tablet Navigation */}
            <DropdownMenu open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-slate-300 hover:bg-white/5 hover:text-white lg:hidden"
                  title="Open navigation"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 border-white/10 bg-[#111827] text-slate-100 shadow-xl shadow-black/30 lg:hidden">
                <DropdownMenuItem disabled className="text-xs uppercase tracking-[0.14em] text-slate-500">
                  Navigation
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={`cursor-pointer focus:bg-white/5 ${activeSection === 'inbox' ? 'bg-white/5' : ''}`}
                  onSelect={(event) => {
                    event.preventDefault();
                    onSectionChange?.('inbox');
                    setMobileNavOpen(false);
                  }}
                >
                  <Inbox className="mr-2 h-4 w-4" />
                  Inbox
                  <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs">{counts?.inbox ?? 0}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={`cursor-pointer focus:bg-white/5 ${activeSection === 'saved' ? 'bg-white/5' : ''}`}
                  onSelect={(event) => {
                    event.preventDefault();
                    onSectionChange?.('saved');
                    setMobileNavOpen(false);
                  }}
                >
                  <Bookmark className="mr-2 h-4 w-4" />
                  Saved
                  <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs">{counts?.saved ?? 0}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={`cursor-pointer focus:bg-white/5 ${activeSection === 'trash' ? 'bg-white/5' : ''}`}
                  onSelect={(event) => {
                    event.preventDefault();
                    onSectionChange?.('trash');
                    setMobileNavOpen(false);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Trash
                  <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs">{counts?.trash ?? 0}</span>
                </DropdownMenuItem>

                <DropdownMenuItem disabled className="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500">
                  Folders
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={`cursor-pointer focus:bg-white/5 ${activeFolderId === null ? 'bg-white/5' : ''}`}
                  onSelect={(event) => {
                    event.preventDefault();
                    onFolderSelect?.(null);
                    setMobileNavOpen(false);
                  }}
                >
                  <FolderIcon className="mr-2 h-4 w-4" />
                  All folders
                </DropdownMenuItem>
                {folders.map((folder) => (
                  <DropdownMenuItem
                    key={folder.id}
                    className={`cursor-pointer focus:bg-white/5 ${activeFolderId === folder.id ? 'bg-white/5' : ''}`}
                    onSelect={(event) => {
                      event.preventDefault();
                      onFolderSelect?.(folder.id);
                      setMobileNavOpen(false);
                    }}
                  >
                    <FolderIcon className="mr-2 h-4 w-4" />
                    <span className="truncate">{folder.name}</span>
                    <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs">{folder.item_count ?? 0}</span>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  className="cursor-pointer focus:bg-white/5"
                  onSelect={(event) => {
                    event.preventDefault();
                    onCreateFolder?.();
                    setMobileNavOpen(false);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-slate-300 hover:bg-white/5 hover:text-white"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            </motion.div>

            {/* User Menu */}
            {session && (
              <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full text-slate-300 hover:bg-white/5 hover:text-white">
                    <Settings2 className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#111827] text-slate-100 shadow-xl shadow-black/30">
                  <DropdownMenuItem disabled className="text-xs text-slate-500">
                    {session.user?.email}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(event) => {
                      event.preventDefault();
                      setSettingsOpen(true);
                    }}
                    className="cursor-pointer focus:bg-white/5"
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => signOut()}
                    className="cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-300"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </motion.nav>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="border-white/10 bg-[#0F172A] text-slate-100">
          <DialogHeader>
            <DialogTitle>Account Settings</DialogTitle>
            <DialogDescription>
              Link your Telegram account so bot messages can be saved to your dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-4 space-y-3 shadow-lg shadow-black/20">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-slate-300">
                  Generate a private link for Telegram setup
                </p>
                <Button
                  variant="outline"
                  className="rounded-xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                  onClick={handleGenerateLinkingUrl}
                  disabled={isGeneratingLink || isLoadingTelegramId}
                >
                  {isGeneratingLink ? 'Generating...' : 'Generate Link'}
                </Button>
              </div>
              {linkUrl && (
                <div className="space-y-2 text-sm text-slate-300">
                  <p className="font-medium text-slate-100">Linking URL</p>
                  <code className="block break-all rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-slate-200">
                    {linkUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                    onClick={() => {
                      navigator.clipboard.writeText(linkUrl);
                      setSettingsMessage('Link copied to clipboard!');
                    }}
                  >
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                    onClick={() => window.open(linkUrl, '_blank')}
                  >
                    Open & Link Now
                  </Button>
                </div>
              )}
            </div>

            <label className="text-xs text-slate-400" htmlFor="telegram-user-id">
              Manual fallback: Telegram User ID
            </label>
            <Input
              id="telegram-user-id"
              inputMode="numeric"
              placeholder="e.g. 123456789"
              value={telegramUserId}
              disabled={isLoadingTelegramId || isSavingTelegramId}
              className="rounded-xl border-white/10 bg-[#111827] text-slate-100 placeholder:text-slate-500"
              onChange={(event) => setTelegramUserId(event.target.value.replace(/\D/g, ''))}
            />
            <p className="text-xs text-slate-400">
              If needed, send <span className="font-medium">/start</span> to your bot and use your numeric Telegram ID here.
            </p>
            {settingsMessage && (
              <p className="text-xs text-slate-300">{settingsMessage}</p>
            )}
          </div>

          <DialogFooter showCloseButton>
            <Button
              className="rounded-xl bg-indigo-500 text-white hover:bg-indigo-400"
              onClick={handleSaveTelegramId}
              disabled={isLoadingTelegramId || isSavingTelegramId || telegramUserId.length < 5}
            >
              {isSavingTelegramId ? 'Saving...' : 'Save Telegram ID'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
