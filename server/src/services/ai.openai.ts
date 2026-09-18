// OpenAI 兼容驱动：接任意 OpenAI 兼容端点（天翼云 TokenHub / DeepSeek / OpenAI 等）
// 通过 fetch 调用 /v1/chat/completions，要求模型返回严格 JSON。
import { config } from "../config";
import { IAIService, OutfitRequest, ProductCandidate, OutfitResult, AIServiceError } from "./ai.types";

export class OpenAICompatDriver implements IAIService {
  async generateOutfit(req: OutfitRequest, candidates: ProductCandidate[]): Promise<OutfitResult> {
    const base = config.ai.baseUrl.replace(/\/$/, "");
    const url = `${base}/v1/chat/completions`;

    // 候选商品压缩成轻量清单给模型（省 token）
    const catalog = candidates.map(c => ({
      id: c.id, sku: c.sku, name: c.name, category: c.category,
      brand: c.brand, size: c.size, color: c.color,
      style_tags: c.style_tags, occasion_tags: c.occasion_tags,
      rental_price: c.rental_price, image_url: c.image_url,
    }));

    const system = `你是「AI 循环衣橱」的造型师。根据用户需求，从候选库存中挑选 3~5 件商品组成一套完整穿搭。
规则：
1. 只从候选库存中选，不得虚构商品；每个商品用其 id 引用。
2. 品类尽量完整：上衣/下装/鞋 必备，外套与配饰按需。
3. 总租金不得超过用户预算。
4. 必须返回合法 JSON，格式：
{"items":[{"product_id":"...","category":"..."}],"rental_days":3,"reason":"给用户的简短中文理由"}
不要输出任何多余文字。`;

    const user = `用户需求：场景=${req.occasion}，风格=${req.style}，预算=${req.budget}元，身高=${req.height}cm，体重=${req.weight}kg。
候选库存：${JSON.stringify(catalog)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: config.ai.model || "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new AIServiceError(`AI 服务调用失败(${res.status}): ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    let parsed: any;
    try {
      parsed = JSON.parse(extractJson(content));
    } catch {
      throw new AIServiceError("AI 返回内容不是合法 JSON");
    }

    // 校验：AI 选择的 id 必须存在于候选库
    const validIds = new Set(candidates.map(c => c.id));
    const selected = (parsed.items ?? []).filter((it: any) => validIds.has(it.product_id));

    if (selected.length === 0) throw new AIServiceError("AI 未选出有效商品");

    // 组装完整商品信息返回
    const byId = new Map(candidates.map(c => [c.id, c]));
    const items = selected.map((it: any) => {
      const p = byId.get(it.product_id)!;
      return {
        product_id: p.id, category: p.category, name: p.name, sku: p.sku,
        size: p.size, color: p.color, image_url: p.image_url, rental_price: Number(p.rental_price),
      };
    });
    const total = items.reduce((s: number, i: any) => s + i.rental_price, 0);

    if (total > req.budget) {
      // 超预算也返回，交由上层判断；这里给出提示
    }

    return {
      items,
      total_price: Math.round(total * 100) / 100,
      rental_days: Number(parsed.rental_days) || 3,
      reason: String(parsed.reason ?? "").slice(0, 500),
      driver: "openai-compatible",
    };
  }
}

function extractJson(s: string): string {
  // 模型偶尔在 JSON 外包 markdown 代码块
  const m = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  return m ? m[1] : s;
}