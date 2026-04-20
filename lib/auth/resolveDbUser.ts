import { supabaseAdmin } from '@/lib/supabase';

type SessionUser = {
  id?: string;
  email?: string | null;
};

type SessionLike = {
  user?: SessionUser;
};

export async function resolveDbUser(session: SessionLike): Promise<{ id: string } | null> {
  const sessionUserId = session?.user?.id;
  if (sessionUserId) {
    const byId = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', sessionUserId)
      .single();

    if (byId.data) {
      return byId.data;
    }
  }

  const email = session?.user?.email;
  if (email) {
    const byEmail = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (byEmail.data) {
      return byEmail.data;
    }
  }

  return null;
}