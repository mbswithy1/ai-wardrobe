import { Router } from "express";
import { db } from "../db";

const router = Router();

// GET /api/products —— 商品库存（普通用户只看 available）
router.get("/", async (_req, res) => {
  const { data, error } = await db
    .from("products")
    .select("id, sku, name, category, brand, size, color, material, style_tags, occasion_tags, rental_price, sale_price, condition, image_url, status")
    .eq("status", "available")
    .order("category", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ products: data ?? [] });
});

export default router;