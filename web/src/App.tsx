import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Outfit from "./pages/Outfit";
import Order from "./pages/Order";
import AdminProducts from "./pages/admin/Products";
import AdminOrders from "./pages/admin/Orders";
import AdminLayout from "./pages/admin/Layout";

export default function App() {
  return (
    <Routes>
      {/* 用户端 */}
      <Route path="/" element={<Home />} />
      <Route path="/outfit" element={<Outfit />} />
      <Route path="/order/:id" element={<Order />} />

      {/* 后台管理 */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/products" replace />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="orders" element={<AdminOrders />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}