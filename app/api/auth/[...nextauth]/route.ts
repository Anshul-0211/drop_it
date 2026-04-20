import NextAuth, { type AuthOptions } from 'next-auth';
import GithubProvider from 'next-auth/providers/github';
import { supabaseAdmin } from '@/lib/supabase';

export const authOptions: AuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID || '',
      clientSecret: process.env.GITHUB_SECRET || '',
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async signIn({ user, account, profile }: any) {
      const githubId =
        (profile as any)?.id?.toString() ||
        account?.providerAccountId?.toString();

      // GitHub users can hide email; provide a stable fallback identity.
      const email =
        user?.email ||
        (profile as any)?.email ||
        (githubId ? `${githubId}@users.noreply.github.local` : undefined);

      try {
        // Keep auth permissive: DB sync should not block OAuth login.
        if (githubId || email) {
          const payload: Record<string, string> = {};
          if (email) payload.email = email;
          if (githubId) payload.github_id = githubId;

          if (payload.email) {
            const { error } = await supabaseAdmin.from('users').upsert(payload, {
              onConflict: 'email',
              ignoreDuplicates: false,
            });

            if (error) {
              console.error('Non-blocking user sync error during sign-in:', error);
            }
          }
        }
      } catch (error) {
        console.error('Non-blocking sign-in sync exception:', error);
      }

      // Always allow OAuth login; application-level linking happens after sign-in.
      return true;
    },

    async session({ session, token }: any) {
      if (session?.user) {
        try {
          let dbUser: { id: string } | null = null;

          if (session.user.email) {
            const byEmail = await supabaseAdmin
              .from('users')
              .select('id')
              .eq('email', session.user.email)
              .single();
            dbUser = byEmail.data;
          }

          if (!dbUser && token?.githubId) {
            const byGithubId = await supabaseAdmin
              .from('users')
              .select('id')
              .eq('github_id', token.githubId)
              .single();
            dbUser = byGithubId.data;
          }

          if (dbUser) {
            session.user.id = dbUser.id;
          }
        } catch (error) {
          console.error('Non-blocking session user lookup error:', error);
        }
      }
      return session;
    },

    async jwt({ token, user, account, profile }: any) {
      if (user) {
        token.id = user.id;
      }
      token.githubId =
        token.githubId ||
        account?.providerAccountId?.toString() ||
        (profile as any)?.id?.toString();
      return token;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
