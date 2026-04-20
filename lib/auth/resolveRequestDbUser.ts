import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { resolveDbUser } from './resolveDbUser';

export async function resolveRequestDbUser(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const dbUser = await resolveDbUser(session as any);

  if (dbUser) {
    return dbUser;
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return null;
  }

  return resolveDbUser({
    user: {
      id: (token.id as string | undefined) || undefined,
      email: (token.email as string | undefined) || undefined,
    },
  } as any);
}