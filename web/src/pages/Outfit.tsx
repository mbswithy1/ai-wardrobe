import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Outfit, userApi } from "../api/client";

const catLabel: Record<string, string> = {
  top: "上衣", bottom: "下装", outerwear: "外套", dress: "裙装",
  shoes: "鞋履", accessory: "配饰", bag: "包袋", other: "其他",
};

export default function OutfitPage() {
  const navigate = useNavigate();
  const [outfit] = useState<Outfit | null>(() => {
    const raw = sessionStorage.getItem("lastOutfit");
    return raw ? JSON.parse(raw) : null;
  });
  const [rentalDays, setRentalDays] = useState(3);
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!outfit) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 text-center">
        <p className="text-gray-500">还没有穿搭结果，先回去生成一套吧</p>
        <button className="btn-primary mt-4" onClick={() => navigate("/")}>去生成</button>
      </div>
    );
  }

  const rent = async () => {
    setSubmitting(true);
    try {
      // 游客：首次下单时自动创建用户
      let userId = localStorage.getItem("wardrobe_user_id");
      if (!userId) {
        const { user } = await userApi.createUser({
          nickname: "游客",
          gender: "other",
          height_cm: Number(sessionStorage.getItem("lastInput") ? JSON.parse(sessionStorage.getItem("lastInput")!).height : 170),
          weight_kg: Number(sessionStorage.getItem("lastInput") ? JSON.parse(sessionStorage.getItem("lastInput")!).weight : 65),
        });
        userId = user.id;
        localStorage.setItem("wardrobe_user_id", userId);
      }
      const { order_id } = await userApi.createOrder({
        user_id: userId!,
        product_ids: outfit.items.map(i => i.product_id),
        rental_days: rentalDays,
        shipping_address: address || undefined,
      });
      navigate(`/order/${order_id}`);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pb-10 pt-6">
      <button className="mb-4 text-sm text-gray-500" onClick={() => navigate(-1)}>← 返回修改</button>

      <div className="mb-5">
        <h1 className="text-xl font-bold">AI 为你搭配好了</h1>
        <p className="mt-1 text-sm text-gray-500">{outfit.reason}</p>
      </div>

      <div className="space-y-3">
        {outfit.items.map(item => (
          <div key={item.product_id} className="card flex gap-3">
            <img
              src={item.image_url ?? ""}
              alt={item.name}
              className="h-24 w-24 rounded-xl bg-gray-100 object-cover"
              onError={e => { (e.target as HTMLImageElement).style.visibility = "hidden"; }}
            />
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <span className="truncate font-medium">{item.name}</span>
                <span className="shrink-0 font-semibold text-brand-600">¥{item.rental_price}/天</span>
              </div>
              <div className="mt-0.5 text-xs text-gray-500">
                {catLabel[item.category] ?? item.category}
                {item.size ? ` · ${item.size}` : ""}
                {item.color ? ` · ${item.color}` : ""}
              </div>
              <div className="mt-auto pt-2">
                <span className="badge bg-gray-100 text-gray-500">{item.sku}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card mt-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <span className="text-gray-500">租金合计（{rentalDays}天）</span>
          <span className="text-xl font-bold text-brand-600">¥{outfit.total_price * rentalDays}</span>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <label className="label !mb-0">租期</label>
          <select className="input flex-1" value={rentalDays} onChange={e => setRentalDays(Number(e.target.value))}>
            {[1, 2, 3, 5, 7].map(d => <option key={d} value={d}>{d} 天</option>)}
          </select>
        </div>

        <div className="mt-3">
          <label className="label">收货地址（可选）</label>
          <input className="input" value={address} onChange={e => setAddress(e.target.value)} placeholder="省市区+详细地址" />
        </div>

        <button className="btn-primary mt-4 w-full !py-3.5 text-base" onClick={rent} disabled={submitting}>
          {submitting ? "下单中..." : "立即租赁"}
        </button>
        <p className="mt-2 text-center text-xs text-gray-400">下单后库存将锁定，订单状态可在后台查看</p>
      </div>
    </div>
  );
}