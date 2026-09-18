import { config } from "../config";
import { IAIService, OutfitRequest, ProductCandidate, OutfitResult } from "./ai.types";
import { RuleEngineDriver } from "./ai.rule";
import { OpenAICompatDriver } from "./ai.openai";
import { TeleAgentBridgeDriver } from "./ai.bridge";

// AIService：统一入口。业务层只调 generateOutfit()，不关心底层是哪个模型。
// 驱动由 .env 的 AI_DRIVER 控制：openai-compatible | rule-engine | teleagent-bridge
export class AIService {
  private driver: IAIService;

  constructor() {
    const d = config.ai.driver;
    if (d === "openai-compatible" && config.ai.apiKey) {
      this.driver = new OpenAICompatDriver();
    } else if (d === "teleagent-bridge" && config.ai.teleagentBridgeUrl) {
      this.driver = new TeleAgentBridgeDriver();
    } else {
      // 默认/兜底：规则引擎（无 Key 也能跑通闭环）
      this.driver = new RuleEngineDriver();
    }
  }

  async generateOutfit(req: OutfitRequest, candidates: ProductCandidate[]): Promise<OutfitResult> {
    return this.driver.generateOutfit(req, candidates);
  }
}

export const aiService = new AIService();