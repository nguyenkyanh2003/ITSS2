import { AppRoutes } from "./routes";
import { ProductProvider } from "./store/ProductStore";
import { LanguageProvider } from "./context/LanguageContext";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { AppNotificationProvider } from "./context/AppNotificationContext";

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppNotificationProvider>
          <ProductProvider>
            <CartProvider>
              <AppRoutes />
            </CartProvider>
          </ProductProvider>
        </AppNotificationProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
