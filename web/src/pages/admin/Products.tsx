import { useCallback, useEffect, useState } from "react";
import { adminApi, Product } from "../../api/client";

const CATEGORIES = ["top", "bottom", "outerwear", "dress", "shoes", "accessory", "bag", "other"] as const;
const STATUSES = ["available", "reserved", "rented", "cleaning", "repair", "offline"] as const;

const statusColor: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  reserved: "bg-blue-100 text-blue-700",
  rented: "bg-purple-100 text-purple-700",
  cleaning: "bg-yellow-100 text-yellow-700",
  repair: "bg-orange-100 text-orange-700",
  offline: "bg-gray-200 text-gray-600",
};
const catLabel: Record<string, string> = {
  top: "上衣", bottom: "下装", outerwear: "外套", dress: "裙装",
  shoes: "鞋履", accessory: "配饰", bag: "包袋", other: "其他",
};

const emptyForm = {
  sku: "", name: "", category: "top" as string, brand: "", size: "", color: "",
  material: "", style_tags: "", occasion_tags: "", rental_price: 0,
  sale_price: "", condition: "good", image_url: "", status: "available" as string,
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { products } = await adminApi.listProducts();
      setProducts(products);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowForm(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      sku: p.sku, name: p.name, category: p.category, brand: p.brand ?? "", color: p.color ?? "",
      size: p.size ?? "", material: p.material ?? "", style_tags: (p.style_tags ?? []).join(", "),
      occasion_tags: (p.occasion_tags ?? []).join(", "), rental_price: p.rental_price,
      sale_price: p.sale_price ? String(p.sale_price) : "", condition: p.condition ?? "good",
      image_url: p.image_url ?? "", status: p.status,
    });
    setShowForm(true);
  };

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        sku: form.sku.trim(), name: form.name.trim(), category: form.category,
        brand: form.brand.trim() || null, size: form.size.trim() || null, color: form.color.trim() || null,
        material: form.material.trim() || null,
        style_tags: form.style_tags.split(",").map(s => s.trim()).filter(Boolean),
        occasion_tags: form.occasion_tags.split(",").map(s => s.trim()).filter(Boolean),
        rental_price: Number(form.rental_price),
        sale_price: form.sale_price ? Number(form.sale_price) : null,
        condition: form.condition, image_url: form.image_url.trim() || null, status: form.status,
      };
      if (editing) await adminApi.updateProduct(editing.id, payload);
      else await adminApi.createProduct(payload);
      setShowForm(false);
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (p: Product, status: string) => {
    try {
      await adminApi.setStatus(p.id, status);
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">商品管理</h1>
          <p className="text-sm text-gray-500">共 {products.length} 件商品</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ 新增商品</button>
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}
      {loading && <div className="py-10 text-center text-gray-400">加载中...</div>}

      {!loading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map(p => (
            <div key={p.id} className="card">
              <div className="flex gap-3">
                <img
                  src={p.image_url ?? ""}
                  alt={p.name}
                  className="h-20 w-20 rounded-xl bg-gray-100 object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.visibility = "hidden"; }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.sku} · {catLabel[p.category] ?? p.category}</div>
                  <div className="mt-1 text-sm font-semibold">¥{p.rental_price}/天</div>
                  <span className={`badge mt-1 ${statusColor[p.status] ?? "bg-gray-100"}`}>{p.status}</span>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <select
                  value={p.status}
                  onChange={e => changeStatus(p, e.target.value)}
                  className="input flex-1 !py-1.5 text-xs"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button className="btn-secondary !px-3 !py-1.5 text-xs" onClick={() => openEdit(p)}>编辑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setShowForm(false)}>
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold">{editing ? "编辑商品" : "新增商品"}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">SKU*</label><input className="input" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div>
              <div><label className="label">名称*</label><input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><label className="label">品类</label>
                <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{catLabel[c]}</option>)}
                </select>
              </div>
              <div><label className="label">品牌</label><input className="input" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} /></div>
              <div><label className="label">尺码</label><input className="input" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} /></div>
              <div><label className="label">颜色</label><input className="input" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} /></div>
              <div><label className="label">租金(元/天)*</label><input type="number" className="input" value={form.rental_price} onChange={e => setForm({ ...form, rental_price: Number(e.target.value) })} /></div>
              <div><label className="label">售价(元)</label><input className="input" value={form.sale_price} onChange={e => setForm({ ...form, sale_price: e.target.value })} /></div>
              <div><label className="label">材质</label><input className="input" value={form.material} onChange={e => setForm({ ...form, material: e.target.value })} /></div>
              <div><label className="label">成色</label><input className="input" value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} /></div>
              <div className="col-span-2"><label className="label">风格标签(逗号分隔)</label><input className="input" value={form.style_tags} onChange={e => setForm({ ...form, style_tags: e.target.value })} /></div>
              <div className="col-span-2"><label className="label">场景标签(逗号分隔)</label><input className="input" value={form.occasion_tags} onChange={e => setForm({ ...form, occasion_tags: e.target.value })} /></div>
              <div className="col-span-2"><label className="label">图片URL</label><input className="input" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." /></div>
              <div><label className="label">库存状态</label>
                <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button className="btn-secondary flex-1" onClick={() => setShowForm(false)}>取消</button>
              <button className="btn-primary flex-1" disabled={saving} onClick={submit}>{saving ? "保存中..." : "保存"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}