'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Navbar from '@/app/components/Navbar';

export default function LinkingPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [telegramUserId, setTelegramUserId] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const token = params.token;
  const tgFromUrl = searchParams.get('tg');

  // If Telegram ID is in URL, auto-link
  useEffect(() => {
    if (!tgFromUrl || !session) return;

    const autoLink = async () => {
      setIsLinking(true);
      try {
        const response = await fetch('/api/linking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            telegramUserId: parseInt(tgFromUrl, 10),
          }),
        });

        const data = await response.json();
        if (response.ok) {
          setMessage('✅ Telegram account linked! Redirecting...');
          setTimeout(() => router.push('/dashboard'), 2000);
        } else {
          setMessage(data.error || 'Failed to link account');
        }
      } catch {
        setMessage('Failed to link account');
      } finally {
        setIsLinking(false);
      }
    };

    autoLink();
  }, [tgFromUrl, session, token, router]);

  // If not authenticated, ask to sign in
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-4 py-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Link Your Telegram Account</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Sign in to link your Telegram account to your drop_it dashboard.
          </p>
          <Button onClick={() => signIn('github')} className="w-full">
            Sign In with GitHub
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-slate-950 rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold mb-4 text-center">Link Telegram Account</h1>

            {message ? (
              <div className="text-center">
                <p className="text-slate-700 dark:text-slate-300">{message}</p>
              </div>
            ) : isLinking ? (
              <div className="text-center">
                <div className="text-4xl mb-4">⏳</div>
                <p className="text-slate-600 dark:text-slate-400">Linking your account...</p>
              </div>
            ) : tgFromUrl ? (
              <div className="text-center">
                <div className="text-4xl mb-4">✅</div>
                <p className="text-slate-600 dark:text-slate-400">
                  Auto-linking Telegram ID {tgFromUrl}...
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center pb-6 border-b border-slate-200 dark:border-slate-800">
                  <Button
                    onClick={() => {
                      const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'your_bot_username';
                      window.open(`https://t.me/${botUsername}?start=${token}`, '_blank');
                    }}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold flex items-center justify-center gap-2"
                  >
                    ✈️ Link in Telegram (One-Click)
                  </Button>
                  <p className="text-xs text-slate-500 mt-2">
                    Open Telegram and link your account instantly.
                  </p>
                </div>

                <div className="space-y-4">
                  <p className="text-xs text-center uppercase tracking-wider text-slate-400 font-semibold">Or Link Manually</p>
                  <div>
                    <label htmlFor="tg-id" className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                      Enter Your Telegram User ID
                    </label>
                    <Input
                      id="tg-id"
                      inputMode="numeric"
                      placeholder="e.g. 123456789"
                      value={telegramUserId}
                      onChange={(e) => setTelegramUserId(e.target.value.replace(/\D/g, ''))}
                      disabled={isLinking}
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      Don't know your ID? Send <span className="font-semibold">/start</span> to your bot to find it.
                    </p>
                  </div>
                </div>

                <Button
                  onClick={async () => {
                    if (!telegramUserId) {
                      setMessage('Please enter your Telegram user ID');
                      return;
                    }

                    setIsLinking(true);
                    try {
                      const response = await fetch('/api/linking', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          token,
                          telegramUserId: parseInt(telegramUserId, 10),
                        }),
                      });

                      const data = await response.json();
                      if (response.ok) {
                        setMessage('✅ Telegram account linked! Redirecting...');
                        setTimeout(() => router.push('/dashboard'), 2000);
                      } else {
                        setMessage(data.error || 'Failed to link account');
                      }
                    } catch {
                      setMessage('Failed to link account');
                    } finally {
                      setIsLinking(false);
                    }
                  }}
                  disabled={isLinking || !telegramUserId}
                  className="w-full"
                >
                  {isLinking ? 'Linking...' : 'Link Account'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
