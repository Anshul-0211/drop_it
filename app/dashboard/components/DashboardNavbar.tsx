'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sun, Moon, Command, Settings, LogOut, ChevronDown, X, Copy, Check } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardNavbarProps {
  onOpenPalette: () => void;
}

export default function DashboardNavbar({ onOpenPalette }: DashboardNavbarProps) {
  const { data: session } = useSession();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [profileOpen, setProfileOpen] = useState(false);

  // Settings / Telegram connection state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [telegramUserId, setTelegramUserId] = useState('');
  const [isLoadingTelegramId, setIsLoadingTelegramId] = useState(false);
  const [isSavingTelegramId, setIsSavingTelegramId] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('dt-theme') as 'light' | 'dark' | null;
    const preferred = stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(preferred);
  }, []);

  // Fetch Telegram ID when Settings modal opens
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

    void loadTelegramId();
  }, [settingsOpen]);

  const applyTheme = (t: 'light' | 'dark') => {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('dt-theme', t);
    setTheme(t);
  };

  const toggleTheme = useCallback(() => {
    applyTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme]);

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
      setSettingsMessage('Linking URL generated successfully!');
    } catch {
      setSettingsMessage('Failed to generate linking URL.');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (!linkUrl) return;
    navigator.clipboard.writeText(linkUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? session?.user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between gap-4 px-4 lg:px-6">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="text-xl font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              drop<span style={{ color: 'var(--accent-primary)' }}>_it</span>
            </span>
          </div>

          {/* Command Bar Hint — center */}
          <button
            onClick={onOpenPalette}
            className="hidden md:flex items-center mx-5 gap-3 px-4 py-2 rounded-xl text-sm transition-all"
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              minWidth: '500px',
            }}
          >
            <Command size={14} />
            <span>Search or jump to...</span>
            <kbd
              className="ml-auto text-xs px-1.5 py-0.5 rounded-md font-mono"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              ⌘ K
            </kbd>
          </button>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {/* Mobile palette */}
            <button
              onClick={onOpenPalette}
              className="md:hidden p-2 rounded-lg"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
            >
              <Command size={18} />
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg transition-all"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              <motion.div
                key={theme}
                initial={{ rotate: -30, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
              </motion.div>
            </button>

            {/* Settings trigger */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-lg transition-all"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              title="Account Settings"
            >
              <Settings size={17} />
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl transition-all"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
              >
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: 'var(--accent-primary)', color: 'var(--text-inverse)' }}
                >
                  {userInitial}
                </div>
                <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate" style={{ color: 'var(--text-primary)' }}>
                  {session?.user?.name ?? session?.user?.email}
                </span>
                <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-52 rounded-2xl z-20 overflow-hidden"
                      style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-lg)',
                      }}
                    >
                      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-muted)' }}>Signed in as</p>
                        <p className="text-sm font-semibold truncate mt-0.5" style={{ color: 'var(--text-primary)' }}>
                          {session?.user?.email}
                        </p>
                      </div>
                      <div className="p-1.5">
                        <button
                          onClick={() => signOut({ callbackUrl: '/' })}
                          className="flex w-full items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all"
                          style={{ color: 'var(--destructive)' }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--destructive-soft)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <LogOut size={15} />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Account Settings Modal */}
      <AnimatePresence>
        {settingsOpen && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            onClick={() => setSettingsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className="w-full max-w-md rounded-2xl p-5"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-lg)',
                color: 'var(--text-primary)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-display)' }}>Account Settings</h2>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <X size={18} />
                </button>
              </div>

              <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
                Link your Telegram account so bot messages, files, and links save directly to your dashboard.
              </p>

              <div className="space-y-4">
                {/* One-Click Linking Section */}
                <div className="p-3.5 rounded-xl border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-text)' }}>
                      Quick Setup Link
                    </span>
                    <button
                      onClick={handleGenerateLinkingUrl}
                      disabled={isGeneratingLink || isLoadingTelegramId}
                      className="dt-btn-primary text-xs py-1 px-3"
                    >
                      {isGeneratingLink ? 'Generating...' : 'Generate Link'}
                    </button>
                  </div>

                  {linkUrl && (
                    <div className="space-y-2 mt-3">
                      <code className="block break-all text-[11px] p-2 rounded border font-mono" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                        {linkUrl}
                      </code>

                      {linkToken && (
                        <button
                          className="w-full text-center text-xs font-bold py-2 rounded-xl transition-all"
                          style={{ background: 'var(--accent-primary)', color: 'var(--text-inverse)' }}
                          onClick={() => {
                            const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'your_bot_username';
                            window.open(`https://t.me/${botUsername}?start=${linkToken}`, '_blank');
                          }}
                        >
                          ✈️ Link in Telegram (One-Click)
                        </button>
                      )}

                      <button
                        onClick={handleCopyLink}
                        className="dt-btn-ghost w-full text-xs justify-center py-1.5"
                      >
                        {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                        {copiedLink ? 'Copied!' : 'Copy Setup Link'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Manual Fallback Section */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold" htmlFor="telegram-id-field">
                    Manual fallback: Telegram User ID
                  </label>
                  <input
                    id="telegram-id-field"
                    type="text"
                    value={telegramUserId}
                    placeholder="e.g. 123456789"
                    disabled={isLoadingTelegramId || isSavingTelegramId}
                    onChange={(e) => setTelegramUserId(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-sm px-3 py-2 rounded-xl outline-none border"
                    style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    If needed, send <span className="font-semibold text-amber-600">/start</span> to your bot to find your numeric ID.
                  </p>
                </div>

                {/* Message display */}
                {settingsMessage && (
                  <p className="text-xs font-medium pl-1 text-center" style={{ color: 'var(--accent-text)' }}>
                    {settingsMessage}
                  </p>
                )}

                {/* Save button */}
                <div className="flex justify-end gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  <button
                    onClick={() => setSettingsOpen(false)}
                    className="dt-btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTelegramId}
                    disabled={isLoadingTelegramId || isSavingTelegramId || telegramUserId.length < 5}
                    className="dt-btn-primary"
                  >
                    {isSavingTelegramId ? 'Saving...' : 'Save Telegram ID'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
