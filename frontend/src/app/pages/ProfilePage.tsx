import { useState, useMemo, useEffect, useCallback, useRef, type ChangeEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, User as UserIcon, Star, CheckCircle, Package, ShoppingBag, Store, X, Camera, MessageCircle, KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useProducts } from "../store/ProductStore";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { LanguageToggle } from "../components/LanguageToggle";
import { useUnreadMessages } from "../hooks/useUnreadMessages";
import { useNotification } from "../../context/NotificationContext";
import { getApiUrl, getAssetUrl } from "../../utils/api";

export function ProfilePage() {
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const { t, lang } = useLanguage();
  const { products } = useProducts();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const errorTitle = "Lỗi";
  const successTitle = "Thành công";
  const currentUserId = user?.id ? String(user.id) : null;
  const { unreadCount } = useUnreadMessages(isAuthenticated);
  
  const [activeTab, setActiveTab] = useState<"listings" | "purchases" | "sales">("listings");
  
  // States for Edit Profile Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(user?.fullName || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  const [editAvatarFile, setEditAvatarFile] = useState<File | null>(null);
  const [editAvatarPreview, setEditAvatarPreview] = useState(user?.avatarUrl || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  // State for My Orders Tab
  const [orderStatusTab, setOrderStatusTab] = useState<"all" | "pending" | "shipping" | "delivered" | "cancelled">("all");
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelReasonOther, setCancelReasonOther] = useState("");
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);

  // States for Review Modal
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  // Optional: keep track of reviewed orders locally to disable button
  const [reviewedOrders, setReviewedOrders] = useState<Set<string>>(new Set());

  const handleCompleteOrder = async (orderId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(getApiUrl(`/api/orders/${orderId}/complete`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        const successMessage = activeTab === "sales" ? "Đã giao hàng thành công." : "Đã nhận hàng thành công.";
        showNotification(successTitle, successMessage, "success");
        if (loadOrders) loadOrders();
      } else {
        const errorMessage = activeTab === "sales" ? "Lỗi xác nhận đã giao hàng" : "Lỗi xác nhận đã nhận hàng";
        showNotification(errorTitle, data.message || errorMessage, "error");
      }
    } catch (error: any) {
      const errorMessage = activeTab === "sales" ? "Lỗi xác nhận đã giao hàng" : "Lỗi xác nhận đã nhận hàng";
      showNotification(errorTitle, error.message || errorMessage, "error");
    }
  };

  const handleConfirmOrder = async (orderId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(getApiUrl(`/api/orders/${orderId}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'pending' }) // Cập nhật trạng thái thành Đang giao (pending)
      });
      const data = await res.json();
      if (data.success) {
        showNotification(successTitle, "Đã xác nhận đơn hàng.", "success");
        if (loadOrders) loadOrders();
      } else {
        showNotification(errorTitle, data.message || "Lỗi xác nhận đơn", "error");
      }
    } catch (error: any) {
      showNotification(errorTitle, error.message || "Lỗi xác nhận đơn", "error");
    }
  };

  const openReviewModal = (orderId: string) => {
    setReviewOrderId(orderId);
    setReviewRating(5);
    setReviewComment("");
    setIsReviewModalOpen(true);
  };

  const closeReviewModal = () => {
    setIsReviewModalOpen(false);
    setReviewOrderId(null);
    setReviewRating(5);
    setReviewComment("");
    setIsSubmittingReview(false);
  };

  const handleSubmitReview = async () => {
    if (!reviewOrderId) return;
    if (reviewRating < 1 || reviewRating > 5) {
      showNotification(errorTitle, "Vui lòng chọn số sao từ 1 đến 5.", "error");
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      showNotification(errorTitle, "Vui lòng đăng nhập lại để đánh giá.", "error");
      logout();
      return;
    }

    try {
      setIsSubmittingReview(true);
      const res = await fetch(getApiUrl(`/api/reviews`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: reviewOrderId,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể gửi đánh giá');
      }

      showNotification(successTitle, "Đánh giá thành công!", "success");
      
      // Add to reviewed set so we can disable the button
      setReviewedOrders(prev => {
        const newSet = new Set(prev);
        newSet.add(reviewOrderId);
        return newSet;
      });
      
      closeReviewModal();
    } catch (error: any) {
      showNotification(errorTitle, error.message || "Không thể gửi đánh giá", "error");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const cancelReasons = [
    "Thay đổi quyết định",
    "Không sắp xếp được thời gian giao dịch",
    "Tìm được sản phẩm khác",
    "Người bán phản hồi chậm",
    "Lý do khác",
  ];

  // Handlers for Edit Modal
  const resetPasswordFields = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsChangingPassword(false);
  };

  const openEditModal = () => {
    setEditName(user.fullName);
    setEditPhone(user.phone);
    setEditAvatarFile(null);
    setEditAvatarPreview(user.avatarUrl || "");
    resetPasswordFields();
    setIsEditModalOpen(true);
  };

  const revokePreviewUrl = (value: string) => {
    if (value && value.startsWith("blob:")) {
      URL.revokeObjectURL(value);
    }
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showNotification(errorTitle, "Chỉ cho phép ảnh JPG, PNG, WEBP, GIF.", "error");
      event.currentTarget.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showNotification(errorTitle, "Ảnh vượt quá 2MB.", "error");
      event.currentTarget.value = "";
      return;
    }

    revokePreviewUrl(editAvatarPreview);
    const previewUrl = URL.createObjectURL(file);
    setEditAvatarFile(file);
    setEditAvatarPreview(previewUrl);
    event.currentTarget.value = "";
  };

  const closeEditModal = () => {
    revokePreviewUrl(editAvatarPreview);
    setEditAvatarFile(null);
    setEditAvatarPreview(user.avatarUrl || "");
    resetPasswordFields();
    setIsEditModalOpen(false);
  };

  const handleSaveProfile = async () => {
    const trimmedName = editName.trim();
    const trimmedPhone = editPhone.trim();

    if (!trimmedName || !trimmedPhone) {
      showNotification(errorTitle, "Vui lòng nhập đầy đủ họ tên và số điện thoại.", "error");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      showNotification(errorTitle, "Vui lòng đăng nhập lại để cập nhật hồ sơ.", "error");
      logout();
      return;
    }

    let latestUser: any | null = null;
    try {

      const resProfile = await fetch(getApiUrl("/api/users/me"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: trimmedName,
          phoneNumber: trimmedPhone,
        }),
      });

      const dataProfile = await resProfile.json();
      if (!resProfile.ok || !dataProfile.success) {
        throw new Error(dataProfile.message || "Không thể cập nhật hồ sơ.");
      }

      latestUser = dataProfile.data.user;

      if (editAvatarFile) {
        const formData = new FormData();
        formData.append("image", editAvatarFile);

        const resAvatar = await fetch(getApiUrl("/api/users/me/avatar"), {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const dataAvatar = await resAvatar.json();
        if (!resAvatar.ok || !dataAvatar.success) {
          throw new Error(dataAvatar.message || "Không thể cập nhật ảnh đại diện.");
        }

        latestUser = dataAvatar.data.user;
      }

      updateUser(latestUser, trimmedPhone);
      revokePreviewUrl(editAvatarPreview);
      setEditAvatarFile(null);
      setIsEditModalOpen(false);
      showNotification(successTitle, "Cập nhật hồ sơ thành công!", "success");
    } catch (error: any) {
      if (latestUser) {
        updateUser(latestUser, trimmedPhone);
      }
      if (error?.message?.includes("ảnh")) {
        showNotification(errorTitle, error.message, "error");
        return;
      }
      showNotification(errorTitle, error.message || "Không thể cập nhật hồ sơ.", "error");
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showNotification(errorTitle, "Vui lòng nhập đầy đủ thông tin đổi mật khẩu.", "error");
      return;
    }

    if (newPassword.length < 6) {
      showNotification(errorTitle, "Mật khẩu mới cần ít nhất 6 ký tự.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification(errorTitle, "Mật khẩu xác nhận không khớp.", "error");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      showNotification(errorTitle, "Vui lòng đăng nhập lại để đổi mật khẩu.", "error");
      logout();
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await fetch(getApiUrl("/api/users/me/password"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Không thể đổi mật khẩu.");
      }

      resetPasswordFields();
      showNotification(successTitle, "Đổi mật khẩu thành công.", "success");
    } catch (error: any) {
      showNotification(errorTitle, error.message || "Không thể đổi mật khẩu.", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const [ordersRaw, setOrdersRaw] = useState<any[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [hasLoadedOrders, setHasLoadedOrders] = useState(false);

  const mapOrderStatus = (status: string) => {
    if (status === "scheduling") return { tab: "pending", text: t.orderStatusPending };
    if (status === "pending") return { tab: "shipping", text: t.orderStatusShipping };
    if (status === "completed") return { tab: "delivered", text: t.orderStatusDelivered };
    if (status === "cancelled") return { tab: "cancelled", text: t.orderStatusCancelled };
    return { tab: "pending", text: t.orderStatusPending };
  };

  const toId = (value: any) => {
    if (!value) return null;
    if (typeof value === "object") {
      const rawId = value.id || value._id;
      return rawId ? String(rawId) : null;
    }
    return String(value);
  };

  const mappedOrders = useMemo(() => {
    return ordersRaw.map((order) => {
      const sellerName = order?.seller?.fullName || t.sellerLabel;
      const sellerId = toId(order?.seller) || null;
      const buyerName = order?.buyer?.fullName || t.buyerLabel;
      const buyerId = toId(order?.buyer) || null;
      const statusInfo = mapOrderStatus(order.status);

      let items = [];
      if (order.items && Array.isArray(order.items) && order.items.length > 0) {
        items = order.items.map((item: any) => {
          const product = item.product || {};
          const productId = product._id || product.id || item.product;
          const productStatus = product.productStatus || product.condition || "used";
          const variant = productStatus === "new" ? t.conditionNew : (productStatus === "other" ? t.catOther : t.conditionUsed);

          let image = "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop";
          if (product.images && product.images.length > 0) {
            image = getAssetUrl(product.images[0].url || product.images[0]);
          } else if (product.image) {
            image = getAssetUrl(product.image);
          }

          return {
            id: String(productId),
            name: product.title || t.productDefault,
            variant,
            quantity: Number(item.quantity || 1),
            image,
            price: Number(item.price || product.price || 0),
          };
        });
      } else {
        // Fallback for old order data if any
        const productFromOrder = order?.product && typeof order.product === "object" ? order.product : null;
        const productFallback = products.find((p) => p.id === order.product);
        const product = productFromOrder || productFallback || {};

        const productId = product?._id || product?.id || order.product || order.id;
        const productStatus = product?.productStatus || product?.condition || "used";
        const variant = productStatus === "new" ? t.conditionNew : (productStatus === "other" ? t.catOther : t.conditionUsed);
        const price = Number(product?.price || 0);
        const firstImage = Array.isArray(product?.images) ? product.images[0] : null;
        const image = getAssetUrl(product?.image || firstImage?.url || firstImage) || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&h=200&fit=crop";

        items = [{
          id: String(productId),
          name: product?.title || t.productDefault,
          variant,
          quantity: 1,
          image,
          price,
        }];
      }

      const totalAmount = order.totalPrice || items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      return {
        id: order.id || order._id,
        rawStatus: order.status,
        status: statusInfo.tab,
        statusText: statusInfo.text,
        sellerName,
        sellerId,
        buyerName,
        buyerId,
        items,
        totalAmount,
      };
    });
  }, [ordersRaw, products, t]);

  const completedOrders = useMemo(() => {
    return ordersRaw.filter((order) => order.status === "completed");
  }, [ordersRaw]);

  const totalSoldCount = useMemo(() => {
    if (!user) return 0;
    return completedOrders.filter((order) => toId(order.seller) === currentUserId).length;
  }, [completedOrders, currentUserId, user]);

  const totalBoughtCount = useMemo(() => {
    if (!user) return 0;
    return completedOrders.filter((order) => toId(order.buyer) === currentUserId).length;
  }, [completedOrders, currentUserId, user]);

  // Lọc sản phẩm của user hiện tại (so sánh bằng email hoặc fullName)
  const myListings = useMemo(() => {
    return products.filter(
      (p) => p.seller.name === user?.fullName || p.seller.email === user?.email
    );
  }, [products, user]);

  const loadOrders = useCallback(async () => {
    setIsOrdersLoading(true);
    setOrdersError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setOrdersError('Vui lòng đăng nhập lại để xem đơn hàng.');
        logout();
        return;
      }

      const res = await fetch(getApiUrl('/api/orders/me'), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.status === 401 || res.status === 403) {
        setOrdersError('Token không hợp lệ hoặc đã hết hạn.');
        logout();
        return;
      }

      const data = await res.json();
      if (data.success) {
        setOrdersRaw(data.data.orders || []);
        setHasLoadedOrders(true);
      } else {
        setOrdersError(data.message || 'Lỗi khi lấy danh sách đơn hàng');
      }
    } catch (err: any) {
      console.error("Failed to fetch orders:", err);
      setOrdersError("Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
    } finally {
      setIsOrdersLoading(false);
    }
  }, [logout]);

  const handleContactSeller = useCallback(async (sellerId: string | null, sellerName?: string) => {
    if (!sellerId) {
      showNotification(errorTitle, "Không tìm thấy người bán để liên hệ.", "error");
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      showNotification(errorTitle, "Vui lòng đăng nhập lại để liên hệ người bán.", "error");
      logout();
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/chats/conversations'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sellerId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể tạo cuộc trò chuyện');
      }

      const conversationId = data.data?.conversation?.id;
      navigate(`/chat/${sellerId}`, {
        state: {
          conversationId,
          sellerName,
        },
      });
    } catch (error: any) {
      showNotification(errorTitle, error.message || "Không thể liên hệ người bán", "error");
    }
  }, [logout, navigate]);

  const openCancelModal = useCallback((orderId: string) => {
    setCancelOrderId(orderId);
    setCancelReason("");
    setCancelReasonOther("");
    setIsCancelModalOpen(true);
  }, []);

  const closeCancelModal = useCallback(() => {
    setIsCancelModalOpen(false);
    setCancelOrderId(null);
    setCancelReason("");
    setCancelReasonOther("");
    setIsCancellingOrder(false);
  }, []);

  const handleCancelOrder = useCallback(async () => {
    if (!cancelOrderId) return;
    if (!cancelReason) {
      showNotification(errorTitle, "Vui lòng chọn lý do hủy đơn.", "error");
      return;
    }
    if (cancelReason === "Lý do khác" && !cancelReasonOther.trim()) {
      showNotification(errorTitle, "Vui lòng nhập lý do hủy.", "error");
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification(errorTitle, "Vui lòng đăng nhập lại để hủy đơn hàng.", "error");
      logout();
      return;
    }

    try {
      setIsCancellingOrder(true);
      const res = await fetch(getApiUrl(`/api/orders/${cancelOrderId}/cancel`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: cancelReason === "Lý do khác" ? cancelReasonOther.trim() : cancelReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể hủy đơn hàng');
      }

      setOrdersRaw((prev) => prev.map((order) => {
        const orderIdValue = order.id || order._id;
        if (String(orderIdValue) !== String(cancelOrderId)) return order;
        return { ...order, status: 'cancelled' };
      }));

      closeCancelModal();
      showNotification(successTitle, "Đã hủy đơn hàng.", "success");
    } catch (error: any) {
      showNotification(errorTitle, error.message || "Không thể hủy đơn hàng", "error");
    } finally {
      setIsCancellingOrder(false);
    }
  }, [cancelOrderId, cancelReason, cancelReasonOther, closeCancelModal, logout]);

  useEffect(() => {
    if (activeTab === "purchases" || activeTab === "sales") {
      loadOrders();
    }
  }, [activeTab, loadOrders]);

  // Reload orders when other parts of app signal an update (e.g., reschedule completed)
  useEffect(() => {
    const handler = () => {
      if (activeTab === 'orders') loadOrders();
    };
    window.addEventListener('ordersUpdated', handler);
    return () => window.removeEventListener('ordersUpdated', handler);
  }, [activeTab, loadOrders]);

  useEffect(() => {
    if (isAuthenticated && user && !hasLoadedOrders) {
      loadOrders();
    }
  }, [isAuthenticated, user, hasLoadedOrders, loadOrders]);

  const filteredOrders = useMemo(() => {
    let base = mappedOrders;
    if (activeTab === "purchases") {
      base = currentUserId ? base.filter(o => o.buyerId === currentUserId) : [];
    } else if (activeTab === "sales") {
      base = currentUserId ? base.filter(o => o.sellerId === currentUserId) : [];
    }
    if (orderStatusTab !== "all") {
      base = base.filter(o => o.status === orderStatusTab);
    }
    return base;
  }, [mappedOrders, activeTab, orderStatusTab, currentUserId]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12 relative">
      {/* Header */}
      <header className="bg-[#EE4D2D] px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-white hover:opacity-80">
            <ArrowLeft className="w-5 h-5" />
            <span>{t.back}</span>
          </Link>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <Link
              to="/messages"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/15 text-white hover:bg-white/25 transition-colors"
              aria-label={t.messagesLink}
              title={t.messagesLink}
            >
              <MessageCircle className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-white text-[#EE4D2D] text-xs font-bold flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
            <button
              onClick={logout}
              className="text-white text-sm hover:underline"
            >
              {t.logout}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t.profileTitle}</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - User Info */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="w-24 h-24 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4 overflow-hidden">
                {user.avatarUrl ? (
                  <ImageWithFallback
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{user.fullName}</h2>
              <div className="flex items-center justify-center gap-1 text-green-600 text-sm mb-4">
                <CheckCircle className="w-4 h-4" />
                <span>{t.verified}</span>
              </div>
              <div className="text-left space-y-3 pt-4 border-t border-gray-100">
                <div className="text-sm">
                  <span className="text-gray-500 block mb-1">{t.contactInfo}</span>
                  <div className="font-medium text-gray-900">{user.email}</div>
                  <div className="font-medium text-gray-900">{user.phone}</div>
                </div>
              </div>
              <button 
                onClick={openEditModal}
                className="w-full mt-6 px-4 py-2 border border-[#EE4D2D] text-[#EE4D2D] rounded-lg hover:bg-orange-50 font-medium transition-colors"
              >
                {t.editProfile}
              </button>
              <Link
                to="/messages"
                className="w-full mt-3 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{t.messagesLink}</span>
                {unreadCount > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#EE4D2D] text-white text-xs flex items-center justify-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            </div>

            {/* Stats */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold text-gray-900 mb-4">{t.stats}</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{t.rating}</span>
                  <div className="flex items-center gap-1 font-medium">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    5.0
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{t.totalSold}</span>
                  <span className="font-medium">{totalSoldCount} {t.itemsUnit}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{t.totalBought}</span>
                  <span className="font-medium">{totalBoughtCount} {t.itemsUnit}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Tabs & Content */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("listings")}
                  className={`flex-1 py-4 px-6 text-center font-medium flex items-center justify-center gap-2 transition-colors ${
                    activeTab === "listings"
                      ? "text-[#EE4D2D] border-b-2 border-[#EE4D2D]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Package className="w-5 h-5" />
                  {t.myListings}
                </button>
                <button
                  onClick={() => { setActiveTab("purchases"); loadOrders(); }}
                  className={`flex-1 py-4 px-6 text-center font-medium flex items-center justify-center gap-2 transition-colors ${
                    activeTab === "purchases"
                      ? "text-[#EE4D2D] border-b-2 border-[#EE4D2D]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <ShoppingBag className="w-5 h-5" />
                  {t.myPurchases}
                </button>
                <button
                  onClick={() => { setActiveTab("sales"); loadOrders(); }}
                  className={`flex-1 py-4 px-6 text-center font-medium flex items-center justify-center gap-2 transition-colors ${
                    activeTab === "sales"
                      ? "text-[#EE4D2D] border-b-2 border-[#EE4D2D]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Store className="w-5 h-5" />
                  {t.mySales}
                </button>
              </div>

              <div className="p-6">
                {activeTab === "listings" && (
                  <div>
                    {myListings.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        {t.noListings}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {myListings.map((product) => (
                          <Link
                            key={product.id}
                            to={`/product/${product.id}`}
                            className="border border-gray-200 rounded-lg overflow-hidden group hover:border-[#EE4D2D] transition-colors"
                          >
                            <div className="aspect-video bg-gray-100 relative">
                              <ImageWithFallback
                                src={product.image}
                                alt={product.title}
                                className="w-full h-full object-cover"
                              />
                              {product.status && product.status !== "inactive" && (
                                <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium text-white ${
                                  product.status === "in-stock" ? "bg-green-600" : (product.status === "reserved" ? "bg-orange-500" : "bg-red-600")
                                }`}>
                                  {product.status === "in-stock"
                                    ? t.statusInStock
                                    : (product.status === "reserved" ? t.statusReserved : t.statusSold)}
                                </div>
                              )}
                            </div>
                            <div className="p-4">
                              <div className="font-bold text-[#EE4D2D] mb-1">
                                {product.price.toLocaleString("vi-VN")} đ
                              </div>
                              <h3 className="text-gray-900 text-sm line-clamp-2">
                                {lang === "ja" && product.titleJa ? product.titleJa : product.title}
                              </h3>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {(activeTab === "purchases" || activeTab === "sales") && (
                  <div>
                    {/* Order Status Tabs */}
                    <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
                      {[
                        { id: "all", label: t.orderStatusAll },
                        { id: "pending", label: t.orderStatusPending },
                        { id: "shipping", label: t.orderStatusShipping },
                        { id: "delivered", label: t.orderStatusDelivered },
                        { id: "cancelled", label: t.orderStatusCancelled }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setOrderStatusTab(tab.id as any)}
                          className={`whitespace-nowrap px-6 py-3 font-medium transition-colors border-b-2 ${
                            orderStatusTab === tab.id
                              ? "border-[#EE4D2D] text-[#EE4D2D]"
                              : "border-transparent text-gray-600 hover:text-[#EE4D2D]"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Order Cards */}
                    <div className="space-y-4">
                      {isOrdersLoading ? (
                        <div className="text-center py-12 text-gray-500 flex flex-col items-center justify-center gap-2">
                          <div className="w-8 h-8 border-4 border-[#EE4D2D] border-t-transparent rounded-full animate-spin"></div>
                          <p>{t.loadingOrders}</p>
                        </div>
                      ) : ordersError ? (
                        <div className="text-center py-12 text-red-500">
                          <p>{ordersError}</p>
                          <button
                            onClick={() => loadOrders()}
                            className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                          >
                            {t.retryBtn}
                          </button>
                        </div>
                      ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          {t.noOrders}
                        </div>
                      ) : (
                        filteredOrders.map(order => (
                          <div key={order.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                            {/* Card Header */}
                            <div className="flex justify-between items-center p-4 border-b border-gray-100">
                              <div className="flex items-center gap-2 font-medium text-gray-900">
                                <Store className="w-5 h-5 text-gray-500" />
                                {activeTab === "purchases" ? order.sellerName : order.buyerName}
                              </div>
                              <div className="text-[#EE4D2D] text-sm font-medium uppercase">
                                {order.statusText}
                              </div>
                            </div>
                            
                            {/* Card Items */}
                            <div className="p-4 space-y-4">
                              {order.items.map(item => (
                                <div key={item.id} className="flex gap-4">
                                  <ImageWithFallback
                                    src={item.image}
                                    alt={item.name}
                                    className="w-20 h-20 object-cover rounded border border-gray-100"
                                  />
                                  <div className="flex-1">
                                    <h4 className="text-gray-900 font-medium line-clamp-1">{item.name}</h4>
                                    <p className="text-gray-500 text-sm mt-1">{t.orderClassificationLabel}{item.variant}</p>
                                    <div className="text-gray-700 text-sm mt-1">x{item.quantity}</div>
                                  </div>
                                  <div className="text-[#EE4D2D] font-medium">
                                    {item.price.toLocaleString("vi-VN")} đ
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* Card Footer */}
                            <div className="bg-gray-50 p-4 rounded-b-lg border-t border-gray-100 flex flex-col sm:flex-row justify-end items-end sm:items-center gap-4">
                              <div className="text-gray-900 mr-auto sm:mr-0">
                                {t.orderTotalLabel}<span className="text-xl font-bold text-[#EE4D2D] ml-2">{order.totalAmount.toLocaleString("vi-VN")} đ</span>
                              </div>
                              <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                {order.status === "delivered" ? (
                                  <>
                                    {activeTab === "purchases" && (
                                      <>
                                        <button 
                                          onClick={() => openReviewModal(order.id)}
                                          disabled={reviewedOrders.has(order.id)}
                                          className="flex-1 sm:flex-none px-6 py-2 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {reviewedOrders.has(order.id) ? t.reviewedBtn : t.reviewBtn}
                                        </button>
                                        <button className="flex-1 sm:flex-none px-6 py-2 bg-[#EE4D2D] text-white rounded hover:bg-[#E54F00] font-medium transition-colors shadow-sm">
                                          {t.buyAgainBtn}
                                        </button>
                                      </>
                                    )}
                                  </>
                                ) : order.status === "pending" ? (
                                  <>
                                    {activeTab === "purchases" && (
                                      <button
                                        onClick={() => openCancelModal(order.id)}
                                        className="w-full sm:w-auto px-6 py-2 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50 font-medium transition-colors"
                                      >
                                        {t.cancelOrderBtn}
                                      </button>
                                    )}
                                    {activeTab === "sales" && (
                                      <>
                                        <button
                                          onClick={() => openCancelModal(order.id)}
                                          className="w-full sm:w-auto px-6 py-2 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50 font-medium transition-colors"
                                        >
                                          {t.rejectOrderBtn}
                                        </button>
                                        <button
                                          onClick={() => handleConfirmOrder(order.id)}
                                          className="w-full sm:w-auto px-6 py-2 bg-[#EE4D2D] text-white rounded hover:bg-[#E54F00] font-medium transition-colors shadow-sm"
                                        >
                                          {t.confirmOrderBtn}
                                        </button>
                                      </>
                                    )}
                                  </>
                                ) : order.status === "shipping" ? (
                                  <>
                                    {activeTab === "purchases" ? (
                                      <button
                                        onClick={() => handleCompleteOrder(order.id)}
                                        className="w-full sm:w-auto px-6 py-2 bg-[#EE4D2D] text-white rounded hover:bg-[#E54F00] font-medium transition-colors shadow-sm"
                                      >
                                        {t.receivedBtn}
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleCompleteOrder(order.id)}
                                        className="w-full sm:w-auto px-6 py-2 bg-[#EE4D2D] text-white rounded hover:bg-[#E54F00] font-medium transition-colors shadow-sm"
                                      >
                                        {t.deliveredBtn}
                                      </button>
                                    )}
                                  </>
                                ) : order.status === "cancelled" ? (
                                  <button
                                    onClick={() => handleContactSeller(activeTab === "purchases" ? order.sellerId : order.buyerId, activeTab === "purchases" ? order.sellerName : order.buyerName)}
                                    className="w-full sm:w-auto px-6 py-2 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-50 font-medium transition-colors"
                                  >
                                    {t.contactBtn}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Chỉnh sửa hồ sơ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">{t.editProfileTitle}</h3>
              <button 
                onClick={closeEditModal} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
                    {editAvatarPreview ? (
                      <ImageWithFallback
                        src={editAvatarPreview}
                        alt={editName || user.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-12 h-12 text-gray-400" />
                    )}
                  </div>
                  <button
                    type="button"
        onClick={() => avatarInputRef.current?.click()}
        className="absolute bottom-0 right-0 bg-white border border-gray-200 p-2 rounded-full shadow-sm hover:bg-gray-50 text-gray-600 transition-colors"
        aria-label="Tải ảnh đại diện"
      >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <span className="text-sm text-gray-500 mt-3">{t.avatarFormatHint}</span>
              </div>
               
              {/* Inputs */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.fullNameLabel}</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE4D2D] focus:border-[#EE4D2D] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.phoneLabel}</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE4D2D] focus:border-[#EE4D2D] outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.emailIdentityLabel}</label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed outline-none"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 space-y-4">
                <div className="flex items-center gap-2 text-gray-900 font-semibold">
                  <KeyRound className="w-5 h-5 text-[#EE4D2D]" />
                  <span>{t.changePasswordLabel}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.currentPasswordLabel}</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE4D2D] focus:border-[#EE4D2D] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.newPasswordLabel}</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE4D2D] focus:border-[#EE4D2D] outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.confirmNewPasswordLabel}</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE4D2D] focus:border-[#EE4D2D] outline-none transition-all"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors disabled:opacity-60"
                >
                  {isChangingPassword ? t.changingPassword : t.changePasswordBtn}
                </button>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={closeEditModal}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSaveProfile}
                className="px-6 py-2 bg-[#EE4D2D] text-white rounded-lg hover:bg-[#E54F00] font-medium transition-colors shadow-sm"
              >
                {t.saveChangesBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hủy đơn */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">{t.cancelOrderTitle}</h3>
              <button
                onClick={closeCancelModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">{t.cancelReasonPrompt}</p>
              <div className="space-y-3">
                {cancelReasons.map((reason) => (
                  <label
                    key={reason}
                    className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-[#EE4D2D] transition-colors"
                  >
                    <input
                      type="radio"
                      name="cancel-reason"
                      value={reason}
                      checked={cancelReason === reason}
                      onChange={() => {
                        setCancelReason(reason);
                        if (reason !== "Lý do khác") {
                          setCancelReasonOther("");
                        }
                      }}
                      className="mt-1"
                    />
                    <span className="text-gray-800">{reason}</span>
                  </label>
                ))}
                {cancelReason === "Lý do khác" && (
                  <div className="pt-1">
                    <textarea
                      value={cancelReasonOther}
                      onChange={(event) => setCancelReasonOther(event.target.value)}
                      placeholder={t.cancelReasonOtherPlaceholder}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE4D2D] focus:border-[#EE4D2D] outline-none transition-all"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={closeCancelModal}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                disabled={isCancellingOrder}
              >
                {t.cancel}
              </button>
              <button
                onClick={handleCancelOrder}
                className="px-6 py-2 bg-[#EE4D2D] text-white rounded-lg hover:bg-[#E54F00] font-medium transition-colors shadow-sm disabled:opacity-60"
                disabled={!cancelReason || (cancelReason === "Lý do khác" && !cancelReasonOther.trim()) || isCancellingOrder}
              >
                {isCancellingOrder ? t.cancelling : t.confirmCancelBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Đánh giá */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">{t.reviewSellerTitle}</h3>
              <button
                onClick={closeReviewModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Rating Stars */}
              <div className="flex flex-col items-center gap-2">
                <span className="text-sm font-medium text-gray-700">{t.reviewQualityLabel}</span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 ${
                          star <= reviewRating
                            ? "text-yellow-400 fill-current"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="text-sm text-gray-500">
                  {reviewRating === 1 && t.reviewRating1}
                  {reviewRating === 2 && t.reviewRating2}
                  {reviewRating === 3 && t.reviewRating3}
                  {reviewRating === 4 && t.reviewRating4}
                  {reviewRating === 5 && t.reviewRating5}
                </span>
              </div>

              {/* Comment Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.reviewCommentLabel}
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={t.reviewCommentPlaceholder}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#EE4D2D] focus:border-[#EE4D2D] outline-none transition-all resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
              <button
                onClick={closeReviewModal}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition-colors"
                disabled={isSubmittingReview}
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={isSubmittingReview}
                className="px-6 py-2 bg-[#EE4D2D] text-white rounded-lg hover:bg-[#E54F00] font-medium transition-colors shadow-sm disabled:opacity-60"
              >
                {isSubmittingReview ? t.submittingReview : t.submitReviewBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
