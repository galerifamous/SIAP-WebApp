export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export function cleanSupabaseUrl(url: string): string {
  if (!url) return "";
  let clean = url.trim();
  while (clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }
  if (clean.endsWith('/rest/v1')) {
    clean = clean.slice(0, -8);
  }
  while (clean.endsWith('/')) {
    clean = clean.slice(0, -1);
  }
  return clean;
}

export function getClientSupabaseConfig(): SupabaseConfig {
  // 1. Check localStorage for custom user-configured credentials
  try {
    const saved = localStorage.getItem('siap_supabase_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.supabaseUrl && parsed.supabaseAnonKey) {
        return {
          supabaseUrl: cleanSupabaseUrl(parsed.supabaseUrl),
          supabaseAnonKey: parsed.supabaseAnonKey.trim(),
        };
      }
    }
  } catch (e) {
    console.warn("Failed to load supabase config from localStorage:", e);
  }

  // 2. Fallback to Vite/Client Environment Variables
  const metaEnv = (import.meta as any).env;
  const envUrl = metaEnv ? metaEnv.VITE_SUPABASE_URL : undefined;
  const envKey = metaEnv ? metaEnv.VITE_SUPABASE_ANON_KEY : undefined;

  return {
    supabaseUrl: cleanSupabaseUrl(envUrl || ""),
    supabaseAnonKey: (envKey || "").trim(),
  };
}

export function getClientSupabaseHeaders(): Record<string, string> {
  const config = getClientSupabaseConfig();
  if (config.supabaseUrl && config.supabaseAnonKey) {
    return {
      "x-supabase-config": encodeURIComponent(JSON.stringify(config))
    };
  }
  return {};
}

export function isClientSupabaseActive(): boolean {
  const config = getClientSupabaseConfig();
  return !!(config.supabaseUrl && config.supabaseAnonKey);
}

export function saveClientSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem('siap_supabase_config', JSON.stringify(config));
}

export function clearClientSupabaseConfig(): void {
  localStorage.removeItem('siap_supabase_config');
}
