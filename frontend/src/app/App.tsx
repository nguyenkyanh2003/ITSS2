import { AppRoutes } from "./routes";
import { ProductProvider } from "./store/ProductStore";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ProductProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </ProductProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
