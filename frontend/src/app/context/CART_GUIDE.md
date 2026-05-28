# Shopping Cart Implementation Guide

## 1. Setup CartProvider in App.tsx

Wrap your app with `CartProvider`:

```tsx
import { CartProvider } from "./app/context/CartContext";

function App() {
  return (
    <AuthProvider>
      <ProductProvider>
        <CartProvider>
          {/* Your routes and components */}
        </CartProvider>
      </ProductProvider>
    </AuthProvider>
  );
}
```

## 2. Using the useCart Hook

In any component, use the cart hook:

```tsx
import { useCart } from "@/app/context/CartContext";

export function MyComponent() {
  const { items, totalItems, totalPrice, addToCart, removeFromCart, updateQuantity } = useCart();

  return (
    <div>
      <p>Items in cart: {totalItems}</p>
      <p>Total: {totalPrice.toLocaleString()} VND</p>
    </div>
  );
}
```

## 3. Actions Available

### `addToCart(item, quantity)`
Add product to cart or increase quantity if already exists.

```tsx
addToCart({
  productId: "123",
  title: "Laptop",
  price: 5000000,
  quantity: 1,
  image: "/image.jpg",
  sellerId: "seller123",
  sellerName: "Seller Name"
}, 1);
```

### `removeFromCart(productId)`
Remove product from cart completely.

```tsx
removeFromCart("123");
```

### `updateQuantity(productId, quantity)`
Update quantity. If quantity ≤ 0, item is removed.

```tsx
updateQuantity("123", 3);
```

### `clearCart()`
Remove all items from cart.

```tsx
clearCart();
```

### `getCartItems()`
Get a copy of all cart items.

```tsx
const allItems = getCartItems();
```

## 4. Integration with ProductDetailPage

Update `ProductDetailPage.tsx`:

```tsx
import { useCart } from "@/app/context/CartContext";

export function ProductDetailPage() {
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    addToCart({
      productId: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
      sellerId: product.seller.id,
      sellerName: product.seller.name
    }, quantity);
    // Show toast: "Added to cart!"
  };

  return (
    <div>
      <input
        type="number"
        value={quantity}
        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
        min="1"
      />
      <button onClick={handleAddToCart}>Add to Cart</button>
    </div>
  );
}
```

## 5. Cart Page Example

Create `CartPage.tsx`:

```tsx
import { useCart } from "@/app/context/CartContext";
import { useNavigate } from "react-router";

export function CartPage() {
  const { items, totalPrice, removeFromCart, updateQuantity, clearCart } = useCart();
  const navigate = useNavigate();

  if (items.length === 0) {
    return <div>Cart is empty</div>;
  }

  const handleCheckout = () => {
    // Send items to checkout/order API
    navigate("/checkout");
  };

  return (
    <div>
      {items.map((item) => (
        <div key={item.productId}>
          <img src={item.image} alt={item.title} />
          <h3>{item.title}</h3>
          <p>{item.price.toLocaleString()} VND</p>
          <input
            type="number"
            value={item.quantity}
            onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
            min="1"
          />
          <button onClick={() => removeFromCart(item.productId)}>Remove</button>
        </div>
      ))}
      <h2>Total: {totalPrice.toLocaleString()} VND</h2>
      <button onClick={handleCheckout}>Proceed to Checkout</button>
      <button onClick={clearCart}>Clear Cart</button>
    </div>
  );
}
```

## 6. Checkout Integration

When user clicks checkout, prepare order items:

```tsx
const { items, clearCart } = useCart();

const handleCheckout = async () => {
  const orderItems = items.map((item) => ({
    product: item.productId,
    quantity: item.quantity,
    price: item.price
  }));

  const orderData = {
    items: orderItems,
    meetingLocationId: selectedLocation,
    meetingSpot: selectedSpot,
    paymentMethod: "COD"
  };

  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData)
  });

  if (response.ok) {
    clearCart();
    navigate("/orders");
  }
};
```

## 7. Data Flow

```
User clicks "Add to Cart"
  ↓
CartContext.addToCart() called
  ↓
items state updated
  ↓
useEffect saves to localStorage
  ↓
Component re-renders with updated cart info

---

On page refresh:
  ↓
CartProvider useEffect runs
  ↓
loadCartFromStorage() called
  ↓
Cart restored from localStorage
```

## 8. LocalStorage Format

Cart data is stored in LocalStorage under key `"shopping_cart"`:

```json
[
  {
    "productId": "123",
    "title": "Laptop Dell XPS",
    "price": 5000000,
    "quantity": 2,
    "image": "/images/laptop.jpg",
    "sellerId": "seller123",
    "sellerName": "Tech Store"
  },
  {
    "productId": "456",
    "title": "USB-C Cable",
    "price": 150000,
    "quantity": 1,
    "image": "/images/cable.jpg",
    "sellerId": "seller456",
    "sellerName": "Cable Shop"
  }
]
```

## 9. Features

✅ Persistent cart (survives page refresh)
✅ Auto-increment quantity if same product added twice
✅ LocalStorage synchronization
✅ Type-safe with TypeScript
✅ Easy to extend (add max quantity, wishlist, etc.)

## 10. Future Enhancements

- Add max quantity validation per product
- Group items by seller
- Add "Move to Wishlist" feature
- Add cart abandonment reminder
- Sync with backend when user is authenticated
