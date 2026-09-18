// AIService 统一接口：业务代码只依赖这个抽象，不直接接触具体模型供应商
// 支持三种驱动：openai-compatible / rule-engine / teleagent-bridge
// 后续切换/新增模型供应商时，只需扩展实现，业务层零改动。

export type OutfitRequest = {
  occasion: string;
  style: string;
  budget: number;
  height: number;
  weight: number;
};

export type ProductCandidate = {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string | null;
  size: string | null;
  color: string | null;
  material: string | null;
  style_tags: string[];
  occasion_tags: string[];
  rental_price: number;
  image_url: string | null;
};

export type OutfitItem = {
  product_id: string;
  category: string;
  name: string;
  sku: string;
  size: string | null;
  color: string | null;
  image_url: string | null;
  rental_price: number;
};

export type OutfitResult = {
  items: OutfitItem[];
  total_price: number;
  rental_days: number;
  reason: string;
  driver: string; // 标记实际使用的驱动，便于排查
};

export interface IAIService {
  generateOutfit(req: OutfitRequest, candidates: ProductCandidate[]): Promise<OutfitResult>;
}

export class AIServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIServiceError";
  }
}