import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router";
import { ArrowLeft, Upload } from "lucide-react";
import { useProducts } from "../store/ProductStore";
import { useLanguage } from "../context/LanguageContext";
import { LanguageToggle } from "../components/LanguageToggle";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";

const CAMPUS_SPOTS = [
  "Nhà B1",
  "Thư viện Tạ Quang Bửu",
  "Cổng Parabol",
  "Cổng Trần Đại Nghĩa",
];

export function AddProductPage() {
  const navigate = useNavigate();
  const { addProduct } = useProducts();
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const { showNotification } = useNotification();
  const errorTitle = "Lỗi";
  const successTitle = "Thành công";

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [condition, setCondition] = useState<"Mới" | "Đã qua sử dụng">("Đã qua sử dụng");
  const [category, setCategory] = useState<
    "Điện tử & Công nghệ" | "Giáo trình & Sách học" | "Đồ dùng phòng trọ" | "Gia dụng & Sinh hoạt" | "Phương tiện di chuyển" | "Quần áo & Thời trang" | "Khác"
  >("Điện tử & Công nghệ");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 6);
    setImageFiles(files);
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (f) setVideoFile(f);
  };

  const [timeSlot1Day, setTimeSlot1Day] = useState("");
  const [timeSlot1Time, setTimeSlot1Time] = useState("");
  const [timeSlot2Day, setTimeSlot2Day] = useState("");
  const [timeSlot2Time, setTimeSlot2Time] = useState("");
  const [timeSlot3Day, setTimeSlot3Day] = useState("");
  const [timeSlot3Time, setTimeSlot3Time] = useState("");

  const [selectedSpots, setSelectedSpots] = useState<string[]>([]);
  const [customSpot, setCustomSpot] = useState("");

  const toggleSpot = (spot: string) => {
    setSelectedSpots((prev) =>
      prev.includes(spot) ? prev.filter((s) => s !== spot) : [...prev, spot]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !description || !price) {
      showNotification(errorTitle, t.errFillAll, "error");
      return;
    }
 
    const parsedStock = Number(stock);
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      showNotification(errorTitle, t.errInvalidStock || "Số lượng tồn kho không hợp lệ.", "error");
      return;
    }

    if (
      !timeSlot1Day ||
      !timeSlot1Time ||
      !timeSlot2Day ||
      !timeSlot2Time ||
      !timeSlot3Day ||
      !timeSlot3Time
    ) {
      showNotification(errorTitle, t.errFillSlots, "error");
      return;
    }

    const finalSpots = [...selectedSpots];
    if (customSpot.trim() && !finalSpots.includes(customSpot.trim())) {
      finalSpots.push(customSpot.trim());
    }

    if (finalSpots.length === 0) {
      showNotification(errorTitle, t.errSelectSpot, "error");
      return;
    }

    // If files selected, build FormData and send multipart request via addProduct
    if (imageFiles.length || videoFile) {
      const token = localStorage.getItem('token');
      if (!token) {
        showNotification(errorTitle, t.errLoginRequired || "Vui lòng đăng nhập", "error");
        return;
      }

      const form = new FormData();
      form.append('title', title);
      form.append('description', description);
      form.append('price', String(Number(price)));
      form.append('stock', String(parsedStock));
      form.append('productStatus', condition === 'Mới' ? 'new' : 'used');
      form.append('category', category);
      form.append('location', JSON.stringify({ campusArea: CAMPUS_SPOTS[0] }));
      form.append('meetingSpots', JSON.stringify(finalSpots));
      form.append('availableTimeSlots', JSON.stringify([
        { note: `${timeSlot1Day} ${timeSlot1Time}`.trim() || "", day: timeSlot1Day, time: timeSlot1Time },
        { note: `${timeSlot2Day} ${timeSlot2Time}`.trim() || "", day: timeSlot2Day, time: timeSlot2Time },
        { note: `${timeSlot3Day} ${timeSlot3Time}`.trim() || "", day: timeSlot3Day, time: timeSlot3Time },
      ]));

      imageFiles.forEach((file) => form.append('images', file));
      if (videoFile) form.append('video', videoFile);

      try {
        await addProduct(form as any);
        showNotification(successTitle, t.successPost, "success");
        navigate('/');
      } catch (error: any) {
        showNotification(errorTitle, error.message || "Lỗi thêm sản phẩm", "error");
      }

      return;
    }

    const newProduct = {
      title,
      description,
      price: Number(price),
      stock: parsedStock,
      condition,
      category,
      image: imageUrl.trim(),
      distance: "100m",
      seller: {
        name: "Bạn",
        avatar:
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
        rating: 5.0,
        totalReviews: 0,
        soldItems: 0,
        memberSince: "2026",
        verified: true,
        phone: "0900000000",
      },
      availableTimeSlots: [
        { day: timeSlot1Day, time: timeSlot1Time },
        { day: timeSlot2Day, time: timeSlot2Time },
        { day: timeSlot3Day, time: timeSlot3Time },
      ],
      preferredSpots: finalSpots,
    };

    try {
      await addProduct(newProduct as any);
      showNotification(successTitle, t.successPost, "success");
      navigate('/');
    } catch (error: any) {
      showNotification(errorTitle, error.message || "Lỗi thêm sản phẩm", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#FF5C00] px-6 py-4 shadow-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-white hover:opacity-80">
            <ArrowLeft className="w-5 h-5" />
            <span>{t.back}</span>
          </Link>
          <LanguageToggle />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">{t.addProductTitle}</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Name */}
            <div>
              <label className="block font-semibold text-gray-900 mb-2">
                {t.productNameLabel} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.productNamePlaceholder}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00] focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block font-semibold text-gray-900 mb-2">
                {t.descriptionLabel} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.descriptionPlaceholder}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00] focus:border-transparent"
              />
            </div>

            {/* Price & Condition */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-gray-900 mb-2">
                  {t.priceVND} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-900 mb-2">
                  {t.stockQuantityLabel || "Số lượng tồn kho"} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder={t.stockQuantityPlaceholder || "1"}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-900 mb-2">
                  {t.conditionFieldLabel} <span className="text-red-500">*</span>
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00] focus:border-transparent bg-white text-gray-900 border border-gray-200 shadow-lg"
                >
                  <option value="Mới">{t.conditionNew}</option>
                  <option value="Đã qua sử dụng">{t.conditionUsed}</option>
                </select>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block font-semibold text-gray-900 mb-2">
                {t.categoryFieldLabel} <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00] focus:border-transparent bg-white text-gray-900 border border-gray-200 shadow-lg"
              >
                <option value="Điện tử & Công nghệ">{t.catElectronics}</option>
                <option value="Giáo trình & Sách học">{t.catBooks}</option>
                <option value="Đồ dùng phòng trọ">{t.catDormItems}</option>
                <option value="Gia dụng & Sinh hoạt">{t.catHousehold}</option>
                <option value="Phương tiện di chuyển">{t.catVehicles}</option>
                <option value="Quần áo & Thời trang">{t.catFashion}</option>
                <option value="Khác">{t.catOther}</option>
              </select>
            </div>

            {/* Image URL */}
            <div>
              <label className="block font-semibold text-gray-900 mb-2">{t.imageUrlLabel}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => document.getElementById('product-images-input')?.click()}
                  className="mt-2 flex-shrink-0 text-gray-400 hover:text-gray-600"
                  title={t.uploadImagesLabel || 'Upload ảnh'}
                >
                  <Upload className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder={t.imageUrlPlaceholder}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00] focus:border-transparent"
                />
              </div>

              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700">{t.uploadImagesLabel || 'Upload ảnh (tối đa 6)'}</label>
                <input
                  id="product-images-input"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="mt-2"
                />
                <div className="flex gap-2 mt-2 flex-wrap">
                  {previews.map((p, idx) => (
                    <img key={idx} src={p} alt={`preview-${idx}`} className="w-24 h-24 object-cover rounded" />
                  ))}
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">{t.uploadVideoLabel || 'Upload video (tùy chọn)'}</label>
                    <button
                      type="button"
                      onClick={() => document.getElementById('product-video-input')?.click()}
                      className="text-gray-400 hover:text-gray-600"
                      title={t.uploadVideoLabel || 'Upload video'}
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    id="product-video-input"
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="mt-2"
                  />
                  {videoFile && <div className="mt-2 text-sm text-gray-600">{videoFile.name}</div>}
                </div>
              </div>
            </div>

            {/* Time Slots */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">
                {t.timeSlotsTitle} <span className="text-red-500">*</span>
              </h3>
              <div className="space-y-4">
                {[
                  {
                    day: timeSlot1Day,
                    setDay: setTimeSlot1Day,
                    time: timeSlot1Time,
                    setTime: setTimeSlot1Time,
                    i: 0,
                  },
                  {
                    day: timeSlot2Day,
                    setDay: setTimeSlot2Day,
                    time: timeSlot2Time,
                    setTime: setTimeSlot2Time,
                    i: 1,
                  },
                  {
                    day: timeSlot3Day,
                    setDay: setTimeSlot3Day,
                    time: timeSlot3Time,
                    setTime: setTimeSlot3Time,
                    i: 2,
                  },
                ].map(({ day, setDay, time, setTime, i }) => (
                  <div key={i} className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      value={day}
                      onChange={(e) => setDay(e.target.value)}
                      placeholder={t.dayPlaceholders[i]}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00] focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      placeholder={t.timePlaceholders[i]}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00] focus:border-transparent"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Preferred Spots */}
            <div className="border-t pt-6">
              <h3 className="font-semibold text-lg text-gray-900 mb-4">
                {t.preferredSpotsTitle} <span className="text-red-500">*</span>
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {CAMPUS_SPOTS.map((spot) => (
                  <label
                    key={spot}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedSpots.includes(spot)
                        ? "border-[#FF5C00] bg-orange-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSpots.includes(spot)}
                      onChange={() => toggleSpot(spot)}
                      className="w-4 h-4 text-[#FF5C00] focus:ring-[#FF5C00] rounded"
                    />
                    <span className="ml-3 text-sm">{spot}</span>
                  </label>
                ))}
              </div>
              <div className="mt-2">
                <input
                  type="text"
                  value={customSpot}
                  onChange={(e) => setCustomSpot(e.target.value)}
                  placeholder="Hoặc nhập địa điểm khác..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00] focus:border-transparent"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-4 pt-6">
              <Link
                to="/"
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg text-center hover:bg-gray-50 transition-colors"
              >
                {t.cancel}
              </Link>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-[#FF5C00] text-white rounded-lg font-semibold hover:bg-[#E65100] transition-colors"
              >
                {t.submitBtn}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
