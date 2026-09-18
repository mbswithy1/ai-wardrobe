import dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`缺少环境变量 ${name}，请参考 .env.example 配置`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  supabaseUrl: required("SUPABASE_URL"),
  supabaseAnonKey: required("SUPABASE_ANON_KEY"),
  // service role 仅服务端使用
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173").split(",").map(s => s.trim()),
  ai: {
    driver: (process.env.AI_DRIVER ?? "rule-engine") as "openai-compatible" | "rule-engine" | "teleagent-bridge",
    baseUrl: process.env.AI_BASE_URL ?? "",
    apiKey: process.env.AI_API_KEY ?? "",
    model: process.env.AI_MODEL ?? "",
    teleagentBridgeUrl: process.env.TELEAGENT_BRIDGE_URL ?? "",
  },
};