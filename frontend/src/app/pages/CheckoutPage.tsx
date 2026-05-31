import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ArrowLeft, MapPin, Clock, CreditCard, ShoppingBag } from "lucide-react";
import { useNotification } from "../../context/NotificationContext";

const CAMPUS_LOCATIONS = [
  { id: 'GATE_MAIN', name: 'Cổng chính' },
  { id: 'LIBRARY', name: 'Thư viện' },
  { id: 'CAMPUS_SQUARE', name: 'Sân trường' },
  { id: 'HALL_A', name: 'Sảnh tòa nhà A' },
  { id: 'HALL_B', name: 'Sảnh tòa nhà B' },
];

export function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const errorTitle = "Lỗi";
  const successTitle = "Thành công";

  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [meetingLocationId, setMeetingLocationId] = useState("");
  const [meetingSpot, setMeetingSpot] = useState("");
  const [availableTimeSlots, setAvailableTimeSlots] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      showNotification(errorTitle, "Vui lòng đăng nhập để đặt hàng", "error");
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <ShoppingBag className="w-16 h-16 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Giỏ hàng của bạn đang trống</h2>
        <button
          onClick={() => navigate("/")}
          className="text-[#FF5C00] hover:underline"
        >
          Quay lại trang chủ để mua sắm
        </button>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    if (!meetingLocationId && !meetingSpot.trim()) {
      showNotification(errorTitle, "Vui lòng chọn hoặc nhập địa điểm nhận hàng", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem("token");
      
      const orderItems = items.map(item => ({
        product: item.productId,
        quantity: item.quantity,
        price: item.price
      }));

      const note = availableTimeSlots.trim() ? `Khung giờ rảnh: ${availableTimeSlots}` : "";

      const payload = {
        items: orderItems,
        paymentMethod,
        meetingLocationId: meetingLocationId || undefined,
        meetingSpot: meetingLocationId ? undefined : meetingSpot,
        note
      };

      const res = await fetch(getApiUrl("/api/orders"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      
      if (data.success) {
        showNotification(successTitle, "Đặt hàng thành công!", "success");
        clearCart();
        navigate("/profile"); // Hoặc trang chi tiết đơn hàng nếu có
      } else {
        showNotification(errorTitle, data.message || "Đặt hàng thất bại", "error");
      }
    } catch (error) {
      showNotification(errorTitle, "Đã xảy ra lỗi khi đặt hàng", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Quay lại giỏ hàng
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-8">Thanh toán & Đặt hàng</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Thông tin đơn hàng (Bên trái) */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Điểm hẹn */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <MapPin className="w-5 h-5 text-[#FF5C00] mr-2" />
                <h2 className="text-lg font-semibold">Địa điểm nhận hàng</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chọn địa điểm trong trường
                  </label>
                  <select
                    value={meetingLocationId}
                    onChange={(e) => {
                      setMeetingLocationId(e.target.value);
                      if (e.target.value) setMeetingSpot("");
                    }}
                    className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-[#FF5C00] focus:border-[#FF5C00]"
                  >
                    <option value="">-- Chọn địa điểm --</option>
                    {CAMPUS_LOCATIONS.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hoặc nhập địa điểm khác
                  </label>
                  <input
                    type="text"
                    value={meetingSpot}
                    onChange={(e) => {
                      setMeetingSpot(e.target.value);
                      if (e.target.value) setMeetingLocationId("");
                    }}
                    placeholder="VD: Cửa phòng trọ 101, Tòa B1..."
                    className="w-full border border-gray-300 rounded-md p-2.5 focus:ring-[#FF5C00] focus:border-[#FF5C00]"
                    disabled={!!meetingLocationId}
                  />
                </div>
              </div>
            </div>

            {/* Khung giờ rảnh */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <Clock className="w-5 h-5 text-[#FF5C00] mr-2" />
                <h2 className="text-lg font-semibold">Thời gian có thể nhận hàng</h2>
              </div>
              <textarea
                value={availableTimeSlots}
                onChange={(e) => setAvailableTimeSlots(e.target.value)}
                placeholder="VD: Chiều thứ 2 (14h-16h) hoặc Sáng thứ 4..."
                className="w-full border border-gray-300 rounded-md p-3 h-24 focus:ring-[#FF5C00] focus:border-[#FF5C00]"
              ></textarea>
              <p className="text-sm text-gray-500 mt-2">Người bán sẽ tham khảo khung giờ này để hẹn giao dịch với bạn.</p>
            </div>

            {/* Phương thức thanh toán */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center mb-4">
                <CreditCard className="w-5 h-5 text-[#FF5C00] mr-2" />
                <h2 className="text-lg font-semibold">Phương thức thanh toán</h2>
              </div>
              <div className="space-y-3">
                <label className="flex items-center p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={paymentMethod === "COD"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4 text-[#FF5C00] focus:ring-[#FF5C00]"
                  />
                  <span className="ml-3 font-medium">Tiền mặt khi nhận hàng (COD)</span>
                </label>
                <label className="flex items-center p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="TRANSFER"
                    checked={paymentMethod === "TRANSFER"}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4 text-[#FF5C00] focus:ring-[#FF5C00]"
                  />
                  <span className="ml-3 font-medium">Chuyển khoản ngân hàng</span>
                </label>
              </div>
            </div>

          </div>

          {/* Tóm tắt đơn hàng (Bên phải) */}
          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 sticky top-4">
              <h2 className="text-lg font-semibold mb-4">Tóm tắt đơn hàng</h2>
              
              <div className="space-y-4 max-h-60 overflow-y-auto mb-4 pr-2">
                {items.map(item => (
                  <div key={item.productId} className="flex gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                      <ImageWithFallback
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{item.title}</h3>
                      <div className="text-sm text-gray-500 mt-1">SL: {item.quantity}</div>
                      <div className="text-sm font-semibold text-[#FF5C00]">
                        {(item.price * item.quantity).toLocaleString("vi-VN")} đ
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tạm tính</span>
                  <span className="font-medium">{totalPrice.toLocaleString("vi-VN")} đ</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Phí vận chuyển</span>
                  <span className="font-medium text-green-600">Miễn phí</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-base font-bold text-gray-900">Tổng cộng</span>
                  <span className="text-xl font-bold text-[#FF5C00]">
                    {totalPrice.toLocaleString("vi-VN")} đ
                  </span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={isSubmitting}
                className="w-full bg-[#FF5C00] text-white py-3 rounded-lg font-semibold hover:bg-[#e65300] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Đang xử lý..." : "Đặt hàng"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
