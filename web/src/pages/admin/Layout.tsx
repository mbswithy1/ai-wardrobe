import { NavLink, Outlet } from "react-router-dom";

const tabs = [
  { to: "/admin/products", label: "商品管理" },
  { to: "/admin/orders", label: "订单管理" },
];

export default function AdminLayout() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">AI 循环衣橱</span>
            <span className="badge bg-gray-100 text-gray-500">后台</span>
          </div>
          <nav className="flex gap-1">
            {tabs.map(t => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    isActive ? "bg-brand-50 text-brand-600" : "text-gray-600 hover:bg-gray-100"
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}