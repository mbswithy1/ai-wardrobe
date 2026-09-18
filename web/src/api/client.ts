// 统一 API 客户端：走 Vite 代理 /api -> localhost:3001
const BASE = "/api";

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as any).error ?? `请求失败(${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ---------- 类型 ----------
export type Product = {
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
  sale_price: number | null;
  condition: string | null;
  image_url: string | null;
  status: string;
  created_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  total_price: number;
  rental_days: number;
  status: string;
  shipping_address: string | null;
  created_at: string;
  order_items: {
    product_id: string;
    rental_price: number;
    product: Product | null;
  }[];
};

// ---------- 用户端 API ----------
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

export type Outfit = {
  items: OutfitItem[];
  total_price: number;
  rental_days: number;
  reason: string;
  driver: string;
};

export const userApi = {
  // 生成穿搭
  generateOutfit: (input: { occasion: string; style: string; budget: number; height: number; weight: number }) =>
    api<{ outfit: Outfit }>("/ai/outfit", { method: "POST", body: JSON.stringify(input) }),

  // 游客注册（简化：前端首次进入时创建）
  createUser: (u: { nickname?: string; gender?: string; height_cm?: number; weight_kg?: number; style_preferences?: string[]; budget_max?: number }) =>
    api<{ user: { id: string; nickname: string | null } }>("/users", { method: "POST", body: JSON.stringify(u) }),

  // 创建订单
  createOrder: (input: { user_id: string; product_ids: string[]; rental_days: number; shipping_address?: string }) =>
    api<{ order_id: string; total_price: number }>("/orders", { method: "POST", body: JSON.stringify(input) }),

  // 查订单
  getOrder: (id: string) => api<{ order: Order }>(`/orders/${id}`),
};

// ---------- 后台 API ----------
export const adminApi = {
  listProducts: () => api<{ products: Product[] }>("/admin/products"),
  createProduct: (p: Partial<Product>) => api<{ product: Product }>("/admin/products", { method: "POST", body: JSON.stringify(p) }),
  updateProduct: (id: string, p: Partial<Product>) => api<{ product: Product }>(`/admin/products/${id}`, { method: "PUT", body: JSON.stringify(p) }),
  setStatus: (id: string, status: string) => api<{ product: Product }>(`/admin/products/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  listOrders: () => api<{ orders: Order[] }>("/admin/orders"),
  setOrderStatus: (id: string, status: string) => api<{ order: Order }>(`/admin/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};