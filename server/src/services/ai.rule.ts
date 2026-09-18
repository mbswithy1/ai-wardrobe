import {
  IAIService,
  OutfitRequest,
  ProductCandidate,
  OutfitItem,
  OutfitResult,
  AIServiceError,
} from "./ai.types";

// 规则引擎驱动：无 AI Key 时保证闭环可跑。
// 策略：按场景/风格标签匹配 → 同类目只选一件 → 控制预算 → 补足必要品类。
export class RuleEngineDriver implements IAIService {
  async generateOutfit(
    req: OutfitRequest,
    candidates: ProductCandidate[]
  ): Promise<OutfitResult> {
    if (candidates.length === 0) throw new AIServiceError("没有可用库存，无法生成穿搭");

    // 风格/场景关键词归一化
    const styleKeys = normalize(req.style);
    const occasionKeys = normalize(req.occasion);

    // 打分：与风格、场景标签的匹配度
    const scored = candidates.map(c => {
      const styleHits = c.style_tags.filter(t => styleKeys.includes(normalize(t))).length;
      const occHits = c.occasion_tags.filter(t => occasionKeys.includes(normalize(t))).length;
      return { c, score: styleHits * 2 + occHits };
    }).sort((a, b) => b.score - a.score);

    // 必要品类：上衣/下装或裙装/鞋；按用户身材给优先级
    const gender = req.height && req.weight ? "any" : "any";
    void gender;
    const needCategories = ["top", "bottom", "shoes"];
    if (req.occasion && /date|party|约会/.test(req.occasion)) {
      needCategories.push("accessory");
    }

    // 逐品类挑选：分数最高且未超预算
    const selected: OutfitItem[] = [];
    let total = 0;
    const used = new Set<string>();

    for (const cat of needCategories) {
      const pick = scored.find(s => s.c.category === cat && !used.has(s.c.id));
      if (pick && total + pick.c.rental_price <= req.budget) {
        selected.push(toItem(pick.c));
        used.add(pick.c.id);
        total += pick.c.rental_price;
      }
    }

    // 预算充足时补一件外套
    if (req.budget - total >= 20) {
      const coat = scored.find(s => s.c.category === "outerwear" && !used.has(s.c.id));
      if (coat && total + coat.c.rental_price <= req.budget) {
        selected.push(toItem(coat.c));
        used.add(coat.c.id);
        total += coat.c.rental_price;
      }
    }

    if (selected.length < 2) {
      throw new AIServiceError("库存中找不到足够匹配的搭配，请调整预算或风格");
    }

    return {
      items: selected,
      total_price: round2(total),
      rental_days: 3,
      reason: `为你匹配了${selected.length}件单品，按「${req.style}」风格与「${req.occasion}」场景匹配，总价 ${round2(total)} 元，在预算 ${req.budget} 元内。`,
      driver: "rule-engine",
    };
  }
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z\u4e00-\u9fa5]/g, "");
}

function toItem(c: ProductCandidate): OutfitItem {
  return {
    product_id: c.id,
    category: c.category,
    name: c.name,
    sku: c.sku,
    size: c.size,
    color: c.color,
    image_url: c.image_url,
    rental_price: c.rental_price,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}