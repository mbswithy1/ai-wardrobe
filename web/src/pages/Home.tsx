import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { userApi } from "../api/client";

const STYLE_PRESETS = [
  { label: "日系简约", value: "japanese minimalist" },
  { label: "通勤商务", value: "smart casual" },
  { label: "街头休闲", value: "street" },
  { label: "优雅复古", value: "elegant vintage" },
  { label: "运动户外", value: "sporty" },
];

const OCCASION_PRESETS = [
  { label: "约会", value: "date" },
  { label: "上班", value: "work" },
  { label: "旅行", value: "travel" },
  { label: "日常", value: "daily" },
  { label: "聚会", value: "party" },
];

export default function Home() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    height: 175,
    weight: 65,
    style: "japanese minimalist",
    occasion: "date",
    budget: 200,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      const { outfit } = await userApi.generateOutfit({
        occasion: form.occasion,
        style: form.style,
        budget: form.budget,
        height: form.height,
        weight: form.weight,
      });
      // 把穿搭结果通过 sessionStorage 传给结果页（避免 URL 太长）
      sessionStorage.setItem("lastOutfit", JSON.stringify(outfit));
      sessionStorage.setItem("lastInput", JSON.stringify(form));
      navigate("/outfit");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-8 pt-10">
      <div className="mb-8 text-center">
        <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-2xl text-white">衣</div>
        <h1 className="text-2xl font-bold">AI 循环衣橱</h1>
        <p className="mt-1 text-sm text-gray-500">告诉 AI 你的需求，一键租到合适的穿搭</p>
      </div>

      <div className="card space-y-5 !p-5">
        <div>
          <label className="label">使用场景</label>
          <div className="flex flex-wrap gap-2">
            {OCCASION_PRESETS.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => setForm({ ...form, occasion: o.value })}
                className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                  form.occasion === o.value
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">风格偏好</label>
          <div className="flex flex-wrap gap-2">
            {STYLE_PRESETS.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => setForm({ ...form, style: s.value })}
                className={`rounded-full px-3.5 py-1.5 text-sm transition ${
                  form.style === s.value
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">身高 (cm)</label>
            <input
              type="number"
              className="input"
              value={form.height}
              onChange={e => setForm({ ...form, height: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">体重 (kg)</label>
            <input
              type="number"
              className="input"
              value={form.weight}
              onChange={e => setForm({ ...form, weight: Number(e.target.value) })}
            />
          </div>
        </div>

        <div>
          <label className="label">预算：¥{form.budget} / 套</label>
          <input
            type="range"
            min={50}
            max={500}
            step={10}
            value={form.budget}
            onChange={e => setForm({ ...form, budget: Number(e.target.value) })}
            className="w-full accent-brand-600"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>¥50</span><span>¥500</span>
          </div>
        </div>

        {error && <div className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</div>}

        <button className="btn-primary w-full !py-3.5 text-base" onClick={submit} disabled={loading}>
          {loading ? "AI 搭配中..." : "生成我的穿搭"}
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">租金按天计，衣物循环使用更环保</p>
    </div>
  );
}