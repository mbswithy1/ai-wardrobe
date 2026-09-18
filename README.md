---
AIGC:
  ContentProducer: '001191110102MAD55U9H0F10002'
  ContentPropagator: '001191110102MAD55U9H0F10002'
  Label: '1'
  ProduceID: '7d806fa1-0c83-4381-b9e2-a7e42165945b'
  PropagateID: '7d806fa1-0c83-4381-b9e2-a7e42165945b'
  ReservedCode1: '5f98e957-329f-4c52-9ab6-495840dbb17b'
  ReservedCode2: '5f98e957-329f-4c52-9ab6-495840dbb17b'
---

# AI 循环衣橱 (ai-wardrobe)

移动端优先的「AI 穿搭 + 租赁」Web MVP。
用户输入身材/风格/场景/预算 → AI 从真实库存选品 → 生成穿搭 → 一键租赁 → 订单与库存状态同步。

## 技术栈
- 前端：React + TypeScript + Vite + Tailwind CSS（移动端优先）
- 后端：Node.js + TypeScript + Express（REST API）
- 数据库：Supabase（PostgreSQL + RLS + 事务 RPC）
- AI：独立 `AIService` 封装，支持 真实API / 规则引擎 / TeleAgent 桥接 三种驱动

---

## Step 1 · 数据库（Supabase 注册 + 建表）

> 大约 5 分钟。本机无需安装 PostgreSQL/Docker。

### 1.1 注册 Supabase
1. 打开 https://supabase.com → 右上角 **Start your project** → 用 GitHub 账号登录
2. 点 **New project**：
   - Organization：随便建一个（如 `wardrobe`）
   - Name：`ai-wardrobe`
   - Database Password：**务必记下来**（后面连接要用）
   - Region：选 **Southeast Asia (Singapore)** 或离你最近的区域
   - 点击 **Create new project**，等 1~2 分钟
3. 建好后进入项目 Dashboard，左侧菜单找到 **SQL Editor**

### 1.2 执行 migration + seed
1. 打开项目中的 `supabase/migration.sql`，全选复制
2. 粘贴到 **SQL Editor** → 点击 **Run**
3. 再打开 `supabase/seed.sql`，全选复制 → Run

> 顺序不能反：先建表，再灌数据。成功后会输出 `category | count` 的统计（如 top=8）。

### 1.3 获取连接信息（后端要用）
进入项目 → 左侧 **Project Settings → API**（或 Data API）：
- **Project URL**（形如 `https://xxxx.supabase.co`）
- **anon public key**（一串 `eyJ...`）
- 另：**Service Role Key**（`service_role`，仅放服务端，绝不能暴露给前端）

把这三个值填入根目录 `.env`（见下文 `.env.example`）。

---

## 后续步骤（逐步实现中）
- Step 2：后端 API
- Step 3：商品后台
- Step 4：AI 穿搭接口
- Step 5：用户页面
- Step 6：订单系统
- Step 7：部署
- Step 8：完整测试

---

## Step 2 · 后端 API（已实现）

### 启动
```bash
cd server
cp .env.example .env   # 填入 Supabase 三个值
npm install
npm run dev            # http://localhost:3001
```

### 接口清单
| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /api/health | 健康检查 |
| GET | /api/products | 可用商品列表 |
| POST | /api/users | 简化游客注册 |
| POST | /api/ai/outfit | AI 穿搭生成 |
| POST | /api/ai/outfit/bridge | TeleAgent 桥接指令 |
| POST | /api/orders | 创建订单（事务防超卖） |
| GET | /api/orders/:id | 查看订单 |
| GET | /api/admin/products | 后台-商品列表 |
| POST | /api/admin/products | 后台-新增商品 |
| PUT | /api/admin/products/:id | 后台-修改商品 |
| PATCH | /api/admin/products/:id/status | 后台-改库存状态 |
| GET | /api/admin/orders | 后台-订单列表 |
| PATCH | /api/admin/orders/:id/status | 后台-改订单状态 |

### 测试
```bash
cd server && npm run build && npm test   # 类型检查 + 单测（Step 8 补全）
```

---

## Step 3 · 商品后台管理页面（已实现）

React + Vite + Tailwind 管理后台，浏览器访问 `/admin`：

- **商品管理**：列表、新增、编辑、改库存状态（available/reserved/rented/cleaning/repair/offline）
- **订单管理**：订单列表、明细展开、改订单状态（自动同步商品状态）

### 启动
```bash
# 终端1：后端
cd server && npm run dev
# 终端2：前端
cd web && npm install && npm run dev
# 浏览器打开 http://localhost:5173/admin/products
```

> AI生成