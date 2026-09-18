import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { aiService } from "../services/ai.service";
import { TeleAgentBridgeDriver } from "../services/ai.bridge";
import { ProductCandidate } from "../services/ai.types";

const router = Router();

const outfitSchema = z.object({
  occasion: z.string().min(1).max(50),
  style: z.string().min(1).max(100),
  budget: z.number().min(0),
  height: z.number().min(100).max(250).optional(),
  weight: z.number().min(30).max(250).optional(),
});

// 查询可用库存作为候选
async function fetchCandidates(): Promise<ProductCandidate[]> {
  const { data, error } = await db
    .from("products")
    .select("id, sku, name, category, brand, size, color, material, style_tags, occasion_tags, rental_price, image_url")
    .eq("status", "available");
  if (error) throw error;
  return (data ?? []) as unknown as ProductCandidate[];
}

// POST /api/ai/outfit —— 核心：接收需求 → 取库存 → AI 选品 → 返回穿搭
router.post("/outfit", async (req, res) => {
  const parsed = outfitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "参数不合法", detail: parsed.error.flatten() });

  try {
    const candidates = await fetchCandidates();
    if (candidates.length === 0) return res.status(404).json({ error: "库存为空，暂无可用商品" });

    const outfit = await aiService.generateOutfit(
      { ...parsed.data, height: parsed.data.height ?? 170, weight: parsed.data.weight ?? 65 },
      candidates
    );

    // 校验：AI 返回的商品必须确实存在且状态可用
    const ids = outfit.items.map(i => i.product_id);
    const { data: verified, error: verifyErr } = await db
      .from("products")
      .select("id, status")
      .in("id", ids);
    if (verifyErr) return res.status(500).json({ error: verifyErr.message });

    const verifiedIds = new Set((verified ?? []).filter(p => p.status === "available").map(p => p.id));
    const finalItems = outfit.items.filter(i => verifiedIds.has(i.product_id));
    if (finalItems.length === 0) return res.status(500).json({ error: "AI 选择的商品已不可用，请重试" });

    res.json({
      outfit: { ...outfit, items: finalItems },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "生成穿搭失败" });
  }
});

// POST /api/ai/outfit/bridge —— 生成 TeleAgent 桥接指令（可选演示）
router.post("/outfit/bridge", async (req, res) => {
  const parsed = outfitSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "参数不合法", detail: parsed.error.flatten() });

  try {
    const candidates = await fetchCandidates();
    const driver = new TeleAgentBridgeDriver();
    const prompt = driver.buildPrompt(
      { ...parsed.data, height: parsed.data.height ?? 170, weight: parsed.data.weight ?? 65 },
      candidates
    );
    res.json({ prompt });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "生成指令失败" });
  }
});

export default router;