import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, CheckCircle, Phone, Upload, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { useProducts, Product } from "../store/ProductStore";
import { BookingModal } from "../components/BookingModal";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useLanguage } from "../context/LanguageContext";
import { LanguageToggle } from "../components/LanguageToggle";
import { useAuth } from "../context/AuthContext";
import Swal from "sweetalert2";
import { useNotification } from "../../context/NotificationContext";
import { getApiUrl, getAssetUrl } from "../../utils/api";
import { ProductReviewsSection } from "../components/ProductReviewsSection";

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getProduct, updateProduct, removeProduct } = useProducts();
  const { t, lang } = useLanguage();
  const { isAuthenticated, user } = useAuth();
  const { showNotification } = useNotification();
  const errorTitle = "Lỗi";
  const successTitle = "Thành công";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [product, setProduct] = useState<Product | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    price: 0,
    condition: '',
    image: '',
    availableTimeSlots: [] as {day: string, time: string}[],
  });
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const handleUpdateProduct = async () => {
    if (!product) return;
    const token = localStorage.getItem('token');
    try {
      const formData = new FormData();
      formData.append('title', editFormData.title);
      if (editFormData.description) {
        formData.append('description', editFormData.description);
      }
      formData.append('price', String(editFormData.price));
      formData.append('productStatus', editFormData.condition === 'Mới' ? 'new' : (editFormData.condition === 'Khác' ? 'other' : 'used'));
      
      if (editFormData.availableTimeSlots && editFormData.availableTimeSlots.length > 0) {
        formData.append('availableTimeSlots', JSON.stringify(editFormData.availableTimeSlots.map(slot => ({
          ...slot,
          note: `${slot.day} ${slot.time}`.trim()
        }))));
      }

      if (editImageFile) {
        formData.append('images', editImageFile);
      }

      const res = await fetch(getApiUrl(`/api/products/${product.id}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      const data = await res.json();
      if (data.success) {
        showNotification(successTitle, "Cập nhật sản phẩm thành công", "success");
        const updatedProductInfo = data.data?.product || {};
        const updates = {
          title: editFormData.title,
          description: editFormData.description,
          price: editFormData.price,
          condition: editFormData.condition,
          availableTimeSlots: editFormData.availableTimeSlots,
          image: getAssetUrl(updatedProductInfo.image) || editFormData.image,
        };
        updateProduct(product.id, updates);
        setProduct({ ...product, ...updates, image: updates.image });
        setIsEditModalOpen(false);
      } else {
        showNotification(errorTitle, data.message || "Lỗi cập nhật sản phẩm", "error");
      }
    } catch (error: any) {
      showNotification(errorTitle, error.message || "Lỗi cập nhật sản phẩm", "error");
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      if (!id) {
        setProduct(undefined);
        setErrorMessage("ID san pham khong hop le.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const loadedProduct = await getProduct(id);
        if (!isMounted) return;

        setProduct(loadedProduct);
        if (!loadedProduct) {
          setErrorMessage("Khong the tai san pham hoac san pham khong ton tai.");
        }
      } catch (error) {
        if (!isMounted) return;

        console.error("Error loading product detail:", {
          error,
          productId: id,
        });
        setProduct(undefined);
        setErrorMessage("Khong the tai san pham. Vui long thu lai sau.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [id, getProduct]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#EE4D2D]"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">{errorMessage || t.productNotFound}</h2>
          <Link to="/" className="text-[#EE4D2D] hover:underline">
            {t.goHome}
          </Link>
        </div>
      </div>
    );
  }

  const currentUserId = user?.id ? String(user.id) : null;
  const sellerId = product?.seller?.id ? String(product.seller.id) : null;
  const isSeller = Boolean(currentUserId && sellerId && currentUserId === sellerId);

  const handleContactSeller = async () => {
    if (!sellerId) {
      showNotification(errorTitle, "Không tìm thấy người bán để liên hệ.", "error");
      return;
    }

    const token = localStorage.getItem("token");
    if (!isAuthenticated || !token) {
      showNotification(errorTitle, "Vui lòng đăng nhập để nhắn tin người bán.", "error");
      navigate("/login");
      return;
    }

    try {
      const res = await fetch(getApiUrl("/api/chats/conversations"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sellerId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Không thể tạo cuộc trò chuyện");
      }

      navigate(`/chat/${sellerId}`, {
        state: {
          conversationId: data.data?.conversation?.id,
          sellerName: product.seller.name,
        },
      });
    } catch (error: any) {
      showNotification(errorTitle, error.message || "Không thể liên hệ người bán", "error");
    }
  };

  const handleBooking = async (time: string, spot: string) => {
    if (!product) return;

    const token = localStorage.getItem('token');
    if (!token) {
      showNotification(errorTitle, t.errLoginToBook || "Vui lòng đăng nhập để đặt lịch hẹn!", "error");
      navigate('/login');
      return;
    }

    const isReschedule = (
      product.status === 'reserved' &&
      currentUserId &&
      product.reservedBy &&
      currentUserId === String(product.reservedBy)
    ) || Boolean(product.booking);

    try {
      const res = await fetch(getApiUrl(`/api/products/${product.id}/${isReschedule ? "reschedule" : "reserve"}`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          meetingSpot: spot,
          note: `Time: ${time}`,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Lỗi đặt chỗ');
      }

      if (isReschedule) {
        updateProduct(product.id, { booking: { time, spot } });
        setProduct({ ...product, booking: { time, spot } });
      } else {
        const currentQty = product.quantity !== undefined ? product.quantity : (product.stock || 1);
        const newQty = Math.max(0, currentQty - 1);
        const newStatus = newQty === 0 ? 'sold' : 'reserved';
        
        updateProduct(product.id, { 
          status: newStatus, 
          booking: { time, spot }, 
          reservedBy: currentUserId || undefined,
          quantity: newQty,
          stock: newQty
        });
        setProduct({ 
          ...product, 
          status: newStatus, 
          booking: { time, spot }, 
          reservedBy: currentUserId || product.reservedBy,
          quantity: newQty,
          stock: newQty
        });
      }
      setIsModalOpen(false);
      showNotification(successTitle, isReschedule ? "Đã đổi lịch hẹn." : "Mua hàng / Đặt lịch hẹn thành công!", "success");
      // Notify other parts of the app (e.g., Profile orders) to refresh
      try {
        window.dispatchEvent(new Event('ordersUpdated'));
      } catch (e) {
        // ignore in non-browser environments
      }
    } catch (error: any) {
      showNotification(errorTitle, error.message || "Lỗi đặt chỗ", "error");
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F5F5" }}>
      {/* Header */}
      <header style={{ backgroundColor: "#EE4D2D" }} className="sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="inline-flex items-center gap-1.5 text-white hover:text-yellow-200 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Quay lại</span>
          </Link>
          <span className="text-white/40">|</span>
          <span className="text-white text-sm font-bold">
            Hust<span className="text-yellow-300">Trade</span>
          </span>
          <div className="ml-auto">
            <LanguageToggle />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Product Images & Info */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Image gallery */}
              {(() => {
                const allImages = product.images && product.images.length > 0
                  ? product.images
                  : product.image ? [product.image] : [];
                const clampedIdx = Math.min(activeImageIdx, allImages.length - 1);
                return (
                  <>
                    {/* Main image */}
                    <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                      <ImageWithFallback
                        src={allImages[clampedIdx]}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                      {allImages.length > 1 && (
                        <>
                          <button
                            onClick={() => setActiveImageIdx((prev) => (prev - 1 + allImages.length) % allImages.length)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow-md transition-colors"
                          >
                            <ChevronLeft className="w-5 h-5 text-gray-700" />
                          </button>
                          <button
                            onClick={() => setActiveImageIdx((prev) => (prev + 1) % allImages.length)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1.5 shadow-md transition-colors"
                          >
                            <ChevronRight className="w-5 h-5 text-gray-700" />
                          </button>
                          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full">
                            {clampedIdx + 1} / {allImages.length}
                          </div>
                        </>
                      )}
                    </div>
                    {/* Thumbnail strip */}
                    {allImages.length > 1 && (
                      <div className="flex gap-2 px-4 py-3 bg-white border-t overflow-x-auto">
                        {allImages.map((imgUrl, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveImageIdx(idx)}
                            className={`flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-colors ${
                              idx === clampedIdx
                                ? 'border-[#EE4D2D]'
                                : 'border-gray-200 hover:border-gray-400'
                            }`}
                          >
                            <ImageWithFallback
                              src={imgUrl}
                              alt={`${product.title} - ảnh ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
              <div className="p-6">
                {/* Price section */}
                <div className="flex items-center gap-3 flex-wrap mb-4">
                  <span className="text-[#EE4D2D] text-3xl font-bold">
                    {product.price.toLocaleString("vi-VN")}đ
                  </span>
                  {(product.originalPrice ?? 0) > product.price && (
                    <>
                      <span className="text-gray-400 text-lg line-through">
                        {product.originalPrice!.toLocaleString("vi-VN")}đ
                      </span>
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                        -{product.discountPercent}%
                      </span>
                    </>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-4">
                  {lang === "ja" && product.titleJa ? product.titleJa : product.title}
                </h1>
                <div className="flex gap-4 mb-6 flex-wrap">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {product.distance} {t.fromYou}
                    </span>
                  </div>
                  <div className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                    {product.condition === "Mới" ? t.conditionNew : t.conditionUsed}
                  </div>
                  <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                    {product.category === "Điện tử & Công nghệ"
                      ? t.catElectronics
                      : product.category === "Giáo trình & Sách học"
                      ? t.catBooks
                      : product.category === "Đồ dùng phòng trọ"
                      ? t.catDormItems
                      : product.category === "Gia dụng & Sinh hoạt"
                      ? t.catHousehold
                      : product.category === "Phương tiện di chuyển"
                      ? t.catVehicles
                      : product.category === "Quần áo & Thời trang"
                      ? t.catFashion
                      : t.catOther}
                  </div>
                </div>
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">{t.descriptionSection}</h3>
                  <p className="text-gray-700 whitespace-pre-line">
                    {lang === "ja" && product.descriptionJa
                      ? product.descriptionJa
                      : product.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Available Time Slots */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#EE4D2D]" />
                {t.availableSlots}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {product.availableTimeSlots.map((slot, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-3 text-center"
                  >
                    <div className="font-semibold text-gray-900">
                      {t.days[slot.day] ?? slot.day}
                    </div>
                    <div className="text-sm text-gray-600">{slot.time}</div>
                  </div>
                ))}
              </div>
            </div>

            {product.seller?.id && (
              <ProductReviewsSection sellerId={product.seller.id} />
            )}
          </div>

          {/* Right Column - Seller Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
              <h3 className="font-semibold text-lg mb-4">{t.sellerInfo}</h3>

              <div className="flex items-start gap-4 mb-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                  <ImageWithFallback
                    src={product.seller.avatar}
                    alt={product.seller.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{product.seller.name}</h4>
                  {product.seller.verified && (
                    <div className="flex items-center gap-1 text-green-600 text-sm mb-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>{t.verifiedStudent}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 mb-6 pb-6 border-b">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{t.ratingLabel}</span>
                  <span className="font-semibold">
                    {product.seller.rating}/5 ⭐ ({product.seller.totalReviews}{" "}
                    {t.reviewsUnit})
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{t.soldLabel}</span>
                  <span className="font-semibold">
                    {product.seller.soldItems} {t.itemsUnit}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{t.memberSinceLabel}</span>
                  <span className="font-semibold">{product.seller.memberSince}</span>
                </div>
              </div>

              {/* Seller Sold History */}
              {product.seller.soldHistory && product.seller.soldHistory.length > 0 && (
                <div className="mb-6 pb-6 border-b">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">{t.soldHistory}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {product.seller.soldHistory.map((imageUrl, index) => (
                      <div
                        key={index}
                        className="aspect-square rounded-lg overflow-hidden bg-gray-100"
                      >
                        <ImageWithFallback
                          src={imageUrl}
                          alt={`Sold item ${index + 1}`}
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isSeller ? (
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setEditFormData({
                        title: product.title,
                        description: product.description || '',
                        price: product.price,
                        condition: product.condition,
                        image: product.image,
                        availableTimeSlots: product.availableTimeSlots ? [...product.availableTimeSlots] : [],
                      });
                      setEditImageFile(null);
                      setIsEditModalOpen(true);
                    }}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Sửa sản phẩm
                  </button>
                  <button
                    onClick={() => {
                      Swal.fire({
                        title: 'Bạn có chắc chắn?',
                        text: "Sản phẩm này sẽ bị xóa khỏi hệ thống!",
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#d33',
                        cancelButtonColor: '#3085d6',
                        confirmButtonText: 'Đồng ý',
                        cancelButtonText: 'Hủy'
                      }).then(async (result) => {
                        if (result.isConfirmed) {
                          try {
                            const res = await fetch(getApiUrl(`/api/products/${product.id}`), {
                              method: 'DELETE',
                              headers: {
                                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                              },
                            });
                            const data = await res.json();
                            if (data.success) {
                              showNotification(successTitle, "Xóa sản phẩm thành công", "success");
                              removeProduct(product.id);
                              navigate('/');
                            } else {
                              showNotification(errorTitle, data.message || "Lỗi xóa sản phẩm", "error");
                            }
                          } catch (error) {
                            showNotification(errorTitle, "Lỗi xóa sản phẩm", "error");
                          }
                        }
                      });
                    }}
                    className="w-full bg-white text-red-600 border border-red-600 px-6 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors"
                  >
                    Xóa sản phẩm
                  </button>
                </div>
              ) : product.booking ? (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-green-800 font-semibold mb-2">{t.bookedLabel}</div>
                    <div className="text-sm text-green-700">
                      <div className="mb-1">
                        <strong>{t.bookingTimeLabel}</strong> {product.booking.time}
                      </div>
                      <div>
                        <strong>{t.bookingSpotLabel}</strong> {product.booking.spot}
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-800 mb-2">
                      <Phone className="w-4 h-4" />
                      <span className="font-semibold">{t.sellerPhone}</span>
                    </div>
                    <div className="text-lg font-bold text-blue-900">
                      {product.seller.phone}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        showNotification(errorTitle, t.errLoginToBook || "Vui lòng đăng nhập để đặt lịch hẹn!", "error");
                        navigate('/login');
                      } else {
                        setIsModalOpen(true);
                      }
                    }}
                    className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {t.changeBooking}
                  </button>
                </div>
              ) : (product.status === 'reserved') ? (
                // reserved but may be reserved by current user
                currentUserId && product.reservedBy && currentUserId === String(product.reservedBy) ? (
                  <button
                    onClick={() => {
                      if (!isAuthenticated) {
                        showNotification(errorTitle, t.errLoginToBook || "Vui lòng đăng nhập để đặt lịch hẹn!", "error");
                        navigate('/login');
                      } else {
                        setIsModalOpen(true);
                      }
                    }}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors ring-2 ring-blue-300 shadow-lg focus:outline-none"
                    style={{ boxShadow: '0 6px 18px rgba(59,130,246,0.25)' }}
                  >
                    Đổi lịch hẹn
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full bg-gray-300 text-gray-500 px-6 py-3 rounded-lg font-semibold cursor-not-allowed transition-colors"
                  >
                    Đã có người đặt
                  </button>
                )
              ) : (product.quantity === 0 || product.stock === 0 || product.status === 'sold') ? (
                <button
                  disabled
                  className="w-full bg-gray-300 text-gray-500 px-6 py-3 rounded-lg font-semibold cursor-not-allowed transition-colors"
                >
                  Đã hết hàng
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      showNotification(errorTitle, t.errLoginToBook || "Vui lòng đăng nhập để đặt hàng!", "error");
                      navigate('/login');
                    } else {
                      setIsModalOpen(true);
                    }
                  }}
                  className="w-full bg-[#EE4D2D] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#E65100] transition-colors"
                >
                  {product.quantity && product.quantity > 0 ? "Mua ngay" : t.bookNow}
                </button>
              )}
              {!isSeller && sellerId && (
                <button
                  onClick={handleContactSeller}
                  className="mt-3 w-full border border-[#EE4D2D] text-[#EE4D2D] px-6 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-5 h-5" />
                  Nhắn tin người bán
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <BookingModal
          product={product}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleBooking}
        />
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Sửa sản phẩm</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm</label>
                <input
                  type="text"
                  className="w-full border rounded p-2 focus:ring-2 focus:ring-[#EE4D2D] outline-none"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea
                  className="w-full border rounded p-2 focus:ring-2 focus:ring-[#EE4D2D] outline-none"
                  rows={4}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giá</label>
                  <input
                    type="number"
                    className="w-full border rounded p-2 focus:ring-2 focus:ring-[#EE4D2D] outline-none"
                    value={editFormData.price}
                    onChange={(e) => setEditFormData({ ...editFormData, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tình trạng</label>
                  <select
                    className="w-full border rounded p-2 focus:ring-2 focus:ring-[#EE4D2D] outline-none"
                    value={editFormData.condition}
                    onChange={(e) => setEditFormData({ ...editFormData, condition: e.target.value })}
                  >
                    <option value="Mới">Mới</option>
                    <option value="Đã qua sử dụng">Đã qua sử dụng</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Khung giờ có thể gặp</label>
                <div className="space-y-2">
                  {editFormData.availableTimeSlots.map((slot, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Thứ (VD: Thứ 2, CN...)"
                        className="flex-1 border rounded p-2 text-sm focus:ring-2 focus:ring-[#EE4D2D] outline-none"
                        value={slot.day}
                        onChange={(e) => {
                          const newSlots = [...editFormData.availableTimeSlots];
                          newSlots[index].day = e.target.value;
                          setEditFormData({ ...editFormData, availableTimeSlots: newSlots });
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Giờ (VD: 09:00 - 11:00)"
                        className="flex-1 border rounded p-2 text-sm focus:ring-2 focus:ring-[#EE4D2D] outline-none"
                        value={slot.time}
                        onChange={(e) => {
                          const newSlots = [...editFormData.availableTimeSlots];
                          newSlots[index].time = e.target.value;
                          setEditFormData({ ...editFormData, availableTimeSlots: newSlots });
                        }}
                      />
                      <button
                        onClick={() => {
                          const newSlots = editFormData.availableTimeSlots.filter((_, i) => i !== index);
                          setEditFormData({ ...editFormData, availableTimeSlots: newSlots });
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded"
                        title="Xóa khung giờ"
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setEditFormData({
                        ...editFormData,
                        availableTimeSlots: [...editFormData.availableTimeSlots, { day: '', time: '' }]
                      });
                    }}
                    className="text-sm text-[#EE4D2D] hover:underline"
                  >
                    + Thêm khung giờ
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh mới (Tùy chọn)</label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => document.getElementById('edit-product-image')?.click()}
                    className="flex items-center justify-center w-12 h-12 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#EE4D2D] hover:text-[#EE4D2D] text-gray-500 transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                  </button>
                  <input
                    id="edit-product-image"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setEditImageFile(e.target.files[0]);
                      } else {
                        setEditImageFile(null);
                      }
                    }}
                  />
                  {editImageFile && (
                    <span className="text-sm text-gray-600 truncate max-w-[200px]">
                      {editImageFile.name}
                    </span>
                  )}
                </div>
                {!editImageFile && editFormData.image && (
                  <div className="mt-2 text-sm text-gray-500">
                    <p>Ảnh hiện tại:</p>
                    <img src={editFormData.image} alt="Current" className="h-20 object-contain rounded mt-1 border" />
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end mt-6 pt-4 border-t">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleUpdateProduct}
                  className="px-4 py-2 bg-[#EE4D2D] text-white rounded hover:bg-[#E65100]"
                >
                  Lưu thay đổi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
           
