import { Router } from "express";
import { db } from "../db";
import { z } from "zod";

const router = Router();

// 简化游客注册：创建一个本地 user 记录，返回 id
// MVP 阶段不接完整认证，用户上下文用一个 uuid 标识即可。
const userSchema = z.object({
  nickname: z.string().max(50).optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  height_cm: z.number().int().min(100).max(250).optional(),
  weight_kg: z.number().int().min(30).max(250).optional(),
  body_type: z.string().max(30).optional(),
  style_preferences: z.array(z.string()).optional(),
  budget_max: z.number().min(0).optional(),
});

router.post("/", async (req, res) => {
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "参数不合法", detail: parsed.error.flatten() });

  const { data, error } = await db.from("users").insert(parsed.data).select("id, nickname, created_at").single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ user: data });
});

export default router;