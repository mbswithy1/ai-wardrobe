import { useCallback, useEffect, useState } from "react";
import { adminApi, Order } from "../../api/client";

const ORDER_STATUSES = ["pending", "reserved", "rented", "returned", "cancelled"] as const;
const orderStatusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  reserved: "bg-blue-100 text-blue-700",
  rented: "bg-purple-100 text-purple-700",
  returned: "bg-green-100 text-green-700",
  cancelled: "bg-gray-200 text-gray-600",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { orders } = await adminApi.listOrders();
      setOrders(orders);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const changeStatus = async (order: Order, status: string) => {
    try {
      await adminApi.setOrderStatus(order.id, status);
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-semibold">订单管理</h1>
        <p className="text-sm text-gray-500">共 {orders.length} 笔订单</p>
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}
      {loading && <div className="py-10 text-center text-gray-400">加载中...</div>}

      {!loading && orders.length === 0 && (
        <div className="py-10 text-center text-gray-400">暂无订单</div>
      )}

      <div className="space-y-3">
        {orders.map(o => (
          <div key={o.id} className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-mono text-xs text-gray-400">{o.id.slice(0, 13)}...</div>
                <div className="mt-0.5 text-sm">
                  <span className="font-semibold">¥{o.total_price}</span>
                  <span className="text-gray-500"> · {o.rental_days}天</span>
                  <span className="text-gray-400"> · {new Date(o.created_at).toLocaleString()}</span>
                </div>
              </div>
              <span className={`badge ${orderStatusColor[o.status] ?? "bg-gray-100"}`}>{o.status}</span>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <select
                value={o.status}
                onChange={e => changeStatus(o, e.target.value)}
                className="input flex-1 !py-1.5 text-xs"
              >
                {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                className="btn-secondary !px-3 !py-1.5 text-xs"
                onClick={() => setExpanded(expanded === o.id ? null : o.id)}
              >
                {expanded === o.id ? "收起" : "明细"}
              </button>
            </div>

            {expanded === o.id && (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <div className="mb-2 text-xs text-gray-500">
                  收货地址：{o.shipping_address ?? "未填写"}
                </div>
                <div className="space-y-1.5">
                  {o.order_items?.map(item => (
                    <div key={item.product_id} className="flex items-center gap-2 text-sm">
                      <img
                        src={item.product?.image_url ?? ""}
                        alt=""
                        className="h-8 w-8 rounded-lg bg-gray-100 object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.visibility = "hidden"; }}
                      />
                      <span className="flex-1 truncate">{item.product?.name ?? item.product_id}</span>
                      <span className="text-gray-500">¥{item.rental_price}/天</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}