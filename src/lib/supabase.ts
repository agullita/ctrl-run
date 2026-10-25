import { createClient, type User } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function ensureSupabaseUser(): Promise<User | null> {
  if (!supabase) return null;

  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) return data.session.user;

    const { data: anonymous, error } = await supabase.auth.signInAnonymously();
    if (error) return null;

    return anonymous.user ?? null;
  } catch {
    return null;
  }
}

export async function invokeSupabaseFunction<T>(
  name: string,
  body: Record<string, unknown>,
): Promise<T> {
  if (!supabase) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  await ensureSupabaseUser();
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error("SUPABASE_SESSION_MISSING");
  }

  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (error) {
    throw new Error(error.message || `EDGE_FUNCTION_${name.toUpperCase()}_FAILED`);
  }

  return data as T;
}
