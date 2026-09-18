import { Router } from "express";
import { z } from "zod";
import { orderService } from "../services/order.service";

const router = Router();

const createOrderSchema = z.object({
  user_id: z.string().uuid(),
  product_ids: z.array(z.string().uuid()).min(1).max(10),
  rental_days: z.number().int().min(1).max(30).default(3),
  shipping_address: z.string().max(200).optional(),
});

// POST /api/orders —— 创建租赁订单（数据库事务，防超卖）
router.post("/", async (req, res) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "参数不合法", detail: parsed.error.flatten() });

  try {
    const result = await orderService.createOrder({
      userId: parsed.data.user_id,
      productIds: parsed.data.product_ids,
      rentalDays: parsed.data.rental_days,
      shippingAddress: parsed.data.shipping_address,
    });
    res.status(201).json({ order_id: result.order_id, total_price: result.total_price });
  } catch (e: any) {
    res.status(409).json({ error: e?.message ?? "下单失败" });
  }
});

// GET /api/orders/:id —— 查看订单
router.get("/:id", async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: "订单不存在" });
    res.json({ order });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "查询失败" });
  }
});

export default router;