import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./public-config";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createClient() {
  const { url, key } = getSupabasePublicConfig();
  browserClient ??= createBrowserClient(url, key);
  return browserClient;
}
