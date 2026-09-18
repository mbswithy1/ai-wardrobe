import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { config } from "./config";
import productsRouter from "./routes/products";
import usersRouter from "./routes/users";
import aiRouter from "./routes/ai";
import ordersRouter from "./routes/orders";
import adminRouter from "./routes/admin";

const app = express();

app.use(cors({ origin: config.corsOrigins }));
app.use(express.json());

// 健康检查
app.get("/api/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

// 业务路由
app.use("/api/products", productsRouter);
app.use("/api/users", usersRouter);
app.use("/api/ai", aiRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRouter);

// 托管前端构建产物（单服务部署：前后端同端口）
// dist 路径：server/../../web/dist 相对于本文件编译后的位置
const distPath = path.resolve(__dirname, "../../web/dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback：非 /api 的 GET 请求回退到 index.html
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  console.log(`[static] 前端资源已挂载: ${distPath}`);
} else {
  console.warn(`[static] 未找到前端构建产物，跳过静态托管: ${distPath}`);
}

// 统一错误兜底
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[error]", err);
  res.status(500).json({ error: err?.message ?? "服务器内部错误" });
});

app.listen(config.port, () => {
  console.log(`AI 循环衣橱 API 已启动: http://localhost:${config.port}`);
});