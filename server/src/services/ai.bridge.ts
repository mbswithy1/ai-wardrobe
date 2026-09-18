// TeleAgent 桥接驱动：可选演示模式。
// 生成一段「给 AI 助手的指令」，用户复制后发给 TeleAgent，把回复粘贴回来自动解析。
// 适合没有 API Key 但有 TeleAgent 的场景。
import { config } from "../config";
import { IAIService, OutfitRequest, ProductCandidate, OutfitResult, AIServiceError } from "./ai.types";

export class TeleAgentBridgeDriver implements IAIService {
  async generateOutfit(_req: OutfitRequest, _candidates: ProductCandidate[]): Promise<OutfitResult> {
    // MVP 阶段：桥接模式需用户手动参与，服务端只提供指令模板。
    // 实际使用时前端引导用户复制指令 → 发 TeleAgent → 粘贴回复 → 调用本接口解析。
    throw new AIServiceError(
      "TeleAgent 桥接模式需要在调用前先生成指令并取得用户回复，请通过 /api/ai/outfit/bridge 流程使用。"
    );
  }

  // 生成给 TeleAgent 的指令文本
  buildPrompt(req: OutfitRequest, candidates: ProductCandidate[]): string {
    return `你是一位时尚造型师。请根据以下用户需求，从候选库存中挑选3~5件商品组成完整穿搭，并给出理由。\n\n用户需求：${JSON.stringify(req)}\n\n候选库存：${JSON.stringify(candidates.map(c => ({ id: c.id, name: c.name, category: c.category, brand: c.brand, color: c.color, size: c.size, style_tags: c.style_tags, occasion_tags: c.occasion_tags, rental_price: c.rental_price })))}\n\n请只返回 JSON 数组，每项包含 product_id、category。`;
  }
}