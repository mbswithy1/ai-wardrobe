import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "./config";

// 服务端专用客户端：使用 service role 绕过 RLS，可读写全部数据（仅后端使用，绝不暴露给前端）
export const db: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  { auth: { persistSession: false } }
);

// 需要按用户上下文（anon）访问时使用
export const anonDb = (token?: string) =>
  createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
    auth: { persistSession: false },
  });