import { Routes, Route } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { AddProductPage } from "./pages/AddProductPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ChatPage } from "./pages/ChatPage";
import { MessagesPage } from "./pages/MessagesPage";
import { CheckoutPage } from "./pages/CheckoutPage";

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/product/:id" element={<ProductDetailPage />} />
      <Route path="/add" element={<AddProductPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/chat/:userId" element={<ChatPage />} />
      <Route path="/messages" element={<MessagesPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
    </Routes>
  );
};
