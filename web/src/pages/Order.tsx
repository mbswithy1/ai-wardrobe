import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { userApi, Order } from "../api/client";

const statusText: Record<string, string> = {
  pending: "待确认",
  reserved: "已锁定",
  rented: "租赁中",
  returned: "已归还",
  cancelled: "已取消",
};
const statusColor: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  reserved: "bg-blue-100 text-blue-700",
  rented: "bg-purple-100 text-purple-700",
  returned: "bg-green-100 text-green-700",
  cancelled: "bg-gray-200 text-gray-600",
};

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    userApi.getOrder(id)
      .then(({ order }) => setOrder(order))
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 text-center text-gray-400">加载中...</div>;
  if (error || !order) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
        <p className="text-gray-500">{error ?? "订单不存在"}</p>
        <button className="btn-primary mt-4" onClick={() => navigate("/")}>回首页</button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pb-10 pt-8">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">✓</div>
        <h1 className="text-xl font-bold">下单成功</h1>
        <p className="mt-1 text-sm text-gray-500">订单号：{order.id.slice(0, 13)}...</p>
        <span className={`badge mt-2 ${statusColor[order.status] ?? "bg-gray-100"}`}>
          {statusText[order.status] ?? order.status}
        </span>
      </div>

      <div className="card mt-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <span className="text-gray-500">订单金额</span>
          <span className="text-xl font-bold">¥{order.total_price * order.rental_days}</span>
        </div>
        <div className="mt-3 space-y-2">
          {order.order_items?.map(item => (
            <div key={item.product_id} className="flex items-center gap-3 text-sm">
              <img src={item.product?.image_url ?? ""} alt="" className="h-10 w-10 rounded-lg bg-gray-100 object-cover"
                onError={e => { (e.target as HTMLImageElement).style.visibility = "hidden"; }} />
              <span className="flex-1 truncate">{item.product?.name ?? "商品"}</span>
              <span className="text-gray-500">¥{item.rental_price}/天 × {order.rental_days}天</span>
            </div>
          ))}
        </div>
        <div className="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-500">
          租期 {order.rental_days} 天 · 地址：{order.shipping_address ?? "未填写"}
        </div>
      </div>

      <button className="btn-primary mt-6 w-full !py-3.5" onClick={() => navigate("/")}>再配一套</button>
    </div>
  );
}