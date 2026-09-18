import { db } from "../db";

// 订单服务：核心是调用数据库事务 RPC create_order_with_items，
// 由数据库保证「检查库存 → 建单 → 改 reserved」原子完成，杜绝超卖。
export class OrderService {
  // 传入 product_ids，返回 { order_id, total_price }
  async createOrder(input: {
    userId: string;
    productIds: string[];
    rentalDays: number;
    shippingAddress?: string;
  }) {
    const { data, error } = await db.rpc("create_order_with_items", {
      p_user_id: input.userId,
      p_product_ids: input.productIds,
      p_rental_days: input.rentalDays,
      p_shipping_address: input.shippingAddress ?? null,
    });

    if (error) {
      // 业务异常（如商品不可用）由数据库 raise exception 触发，转成友好错误
      throw new Error(`下单失败：${error.message}`);
    }
    return data as { order_id: string; total_price: number };
  }

  // 查订单 + 明细（后台/用户通用）
  async getOrderById(orderId: string) {
    const { data: order, error } = await db
      .from("orders")
      .select("*, order_items(order_id, product_id, rental_price, product:products(*))")
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw new Error(`查询订单失败：${error.message}`);
    return order;
  }
}

export const orderService = new OrderService();