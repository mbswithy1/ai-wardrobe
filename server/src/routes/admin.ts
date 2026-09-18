import { Router } from "express";
import { z } from "zod";
import { db } from "../db";

// 后台管理 API（MVP 简化版，仅本地/演示使用）
// 生产环境务必加管理员鉴权！见 README 安全说明。
const router = Router();

// ---------- 商品管理 ----------

const productSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  category: z.enum(["top", "bottom", "outerwear", "dress", "shoes", "accessory", "bag", "other"]),
  brand: z.string().max(50).optional().nullable(),
  size: z.string().max(20).optional().nullable(),
  color: z.string().max(30).optional().nullable(),
  material: z.string().max(50).optional().nullable(),
  style_tags: z.array(z.string()).optional(),
  occasion_tags: z.array(z.string()).optional(),
  rental_price: z.number().min(0),
  sale_price: z.number().min(0).optional().nullable(),
  condition: z.string().max(30).optional(),
  image_url: z.string().url().optional().nullable(),
  status: z.enum(["available", "reserved", "rented", "cleaning", "repair", "offline"]).optional(),
});

// GET /api/admin/products —— 全部商品（含非 available）
router.get("/products", async (_req, res) => {
  const { data, error } = await db.from("products").select("*").order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ products: data ?? [] });
});

// POST /api/admin/products —— 新增商品
router.post("/products", async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "参数不合法", detail: parsed.error.flatten() });
  const { data, error } = await db.from("products").insert(parsed.data).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ product: data });
});

// PUT /api/admin/products/:id —— 修改商品
router.put("/products/:id", async (req, res) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "参数不合法", detail: parsed.error.flatten() });
  const { data, error } = await db.from("products").update(parsed.data).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: "商品不存在" });
  res.json({ product: data });
});

// PATCH /api/admin/products/:id/status —— 修改库存状态
router.patch("/products/:id/status", async (req, res) => {
  const statusSchema = z.object({
    status: z.enum(["available", "reserved", "rented", "cleaning", "repair", "offline"]),
  });
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "状态不合法" });
  const { data, error } = await db.from("products").update({ status: parsed.data.status }).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ product: data });
});

// ---------- 订单管理 ----------

// GET /api/admin/orders —— 全部订单
router.get("/orders", async (_req, res) => {
  const { data, error } = await db
    .from("orders")
    .select("*, order_items(order_id, product_id, rental_price, product:products(*))")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ orders: data ?? [] });
});

// PATCH /api/admin/orders/:id/status —— 修改订单状态（触发商品状态同步）
router.patch("/orders/:id/status", async (req, res) => {
  const statusSchema = z.object({
    status: z.enum(["pending", "reserved", "rented", "returned", "cancelled"]),
  });
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "状态不合法" });
  const { data, error } = await db.from("orders").update({ status: parsed.data.status }).eq("id", req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ order: data });
});

export default router;