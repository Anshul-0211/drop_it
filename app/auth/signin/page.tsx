'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl p-8 space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              drop_it
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Save, organize, and revisit your favorite content
            </p>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <div className="flex gap-3">
              <span className="text-2xl">🚀</span>
              <div>
                <p className="font-semibold text-sm">Zero-friction capture</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Share directly from Telegram
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">🏷️</span>
              <div>
                <p className="font-semibold text-sm">Organized & searchable</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Find what you saved instantly
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-2xl">✨</span>
              <div>
                <p className="font-semibold text-sm">Beautiful dashboard</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  View and manage all your content
                </p>
              </div>
            </div>
          </motion.div>

          {/* Sign In Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="pt-4"
          >
            <Button
              onClick={() => signIn('github', { callbackUrl: '/dashboard' })}
              className="w-full h-12 text-base font-semibold"
              size="lg"
            >
              👨‍💻 Continue with GitHub
            </Button>
          </motion.div>

          {/* Footer */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center text-xs text-slate-500 dark:text-slate-400"
          >
            We only use GitHub for authentication. Your data is secure.
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
