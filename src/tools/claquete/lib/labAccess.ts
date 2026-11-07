import { supabase } from './supabase';

let activeUser: string | null = null;

/** The gate sets this only after Auth and has_tool both authorize the person. */
export function activateLabUser(userId: string | null): void {
  activeUser = userId;
}

export async function labCredentials(): Promise<{ userId: string; token: string }> {
  const { data, error } = await supabase.auth.getSession();
  const session = data?.session;
  if (error || !session?.access_token || !session.user?.id) {
    throw new Error('Entre no LAB para usar o Claquete.');
  }
  const userId = activeUser || session.user.id;
  return { userId, token: session.access_token };
}

export async function labAuthorization(): Promise<{ Authorization: string }> {
  const { token } = await labCredentials();
  return { Authorization: `Bearer ${token}` };
}
