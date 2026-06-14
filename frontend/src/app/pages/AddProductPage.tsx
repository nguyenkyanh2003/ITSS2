import { useState, useRef } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { ArrowLeft, X, ImagePlus, Video } from "lucide-react";
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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("1");
  const [condition, setCondition] = useState<"Mới" | "Đã qua sử dụng">("Đã qua sử dụng");
  const [category, setCategory] = useState<
    "Điện tử & Công nghệ" | "Học tập & Văn phòng phẩm" | "Đồ dùng phòng trọ" | "Gia dụng & Sinh hoạt" | "Phương tiện di chuyển" | "Quần áo & Thời trang" | "Khác"
  >("Điện tử & Công nghệ");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [timeSlot1Day, setTimeSlot1Day] = useState("");
  const [timeSlot1Time, setTimeSlot1Time] = useState("");
  const [timeSlot2Day, setTimeSlot2Day] = useState("");
  const [timeSlot2Time, setTimeSlot2Time] = useState("");
  const [timeSlot3Day, setTimeSlot3Day] = useState("");
  const [timeSlot3Time, setTimeSlot3Time] = useState("");

  const [selectedSpots, setSelectedSpots] = useState<string[]>([]);
  const [customSpot, setCustomSpot] = useState("");

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = Array.from(e.target.files || []);
    setImageFiles((prev) => {
      const combined = [...prev, ...newFiles].slice(0, 6);
      setPreviews(combined.map((f) => URL.createObjectURL(f)));
      return combined;
    });
    e.target.value = '';
  };

  const handleRemoveImage = (idx: number) => {
    setImageFiles((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      setPreviews(next.map((f) => URL.createObjectURL(f)));
      return next;
    });
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files && e.target.files[0];
    if (f) {
      setVideoFile(f);
      setVideoPreview(URL.createObjectURL(f));
    }
    e.target.value = '';
  };

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
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#EE4D2D] px-6 py-4 shadow-md">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EE4D2D] focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EE4D2D] focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EE4D2D] focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EE4D2D] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-900 mb-2">
                  {t.conditionFieldLabel} <span className="text-red-500">*</span>
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EE4D2D] focus:border-transparent bg-white text-gray-900 border border-gray-200 shadow-lg"
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
                className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EE4D2D] focus:border-transparent bg-white text-gray-900 border border-gray-200 shadow-lg"
              >
                <option value="Điện tử & Công nghệ">{t.catElectronics}</option>
                <option value="Học tập & Văn phòng phẩm">{t.catBooks}</option>
                <option value="Đồ dùng phòng trọ">{t.catDormItems}</option>
                <option value="Gia dụng & Sinh hoạt">{t.catHousehold}</option>
                <option value="Phương tiện di chuyển">{t.catVehicles}</option>
                <option value="Quần áo & Thời trang">{t.catFashion}</option>
                <option value="Khác">{t.catOther}</option>
              </select>
            </div>

            {/* Media Upload */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block font-semibold text-gray-900">
                  Ảnh sản phẩm
                </label>
                <span className="text-sm text-gray-500">{previews.length}/6 ảnh</span>
              </div>

              {/* Image grid */}
              <div className="grid grid-cols-3 gap-3">
                {previews.map((p, idx) => (
                  <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50 group">
                    <img src={p} alt={`ảnh-${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 transition-opacity opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 bg-[#EE4D2D] text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                        Ảnh bìa
                      </span>
                    )}
                  </div>
                ))}

                {previews.length < 6 && (
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-[#EE4D2D] hover:bg-orange-50 flex flex-col items-center justify-center gap-1 transition-colors text-gray-400 hover:text-[#EE4D2D]"
                  >
                    <ImagePlus className="w-8 h-8" />
                    <span className="text-xs font-medium">Thêm ảnh</span>
                  </button>
                )}
              </div>

              <input
                ref={imageInputRef}
                type="file"
                multiple
                accept="image/*,.jfif,.jfif-tbnl,.jpe"
                onChange={handleAddImages}
                className="hidden"
              />

              {/* Video upload */}
              <div className="mt-4">
                <label className="block font-semibold text-gray-900 mb-2">
                  Video sản phẩm <span className="text-gray-400 font-normal text-sm">(tùy chọn)</span>
                </label>
                {videoFile ? (
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                    <video
                      src={videoPreview || undefined}
                      controls
                      className="w-full max-h-48 object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => { setVideoFile(null); setVideoPreview(null); }}
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="w-full py-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-[#EE4D2D] hover:bg-orange-50 flex items-center justify-center gap-2 transition-colors text-gray-400 hover:text-[#EE4D2D]"
                  >
                    <Video className="w-6 h-6" />
                    <span className="text-sm font-medium">Thêm video</span>
                  </button>
                )}
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="hidden"
                />
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
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EE4D2D] focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      placeholder={t.timePlaceholders[i]}
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EE4D2D] focus:border-transparent"
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
                        ? "border-[#EE4D2D] bg-orange-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSpots.includes(spot)}
                      onChange={() => toggleSpot(spot)}
                      className="w-4 h-4 text-[#EE4D2D] focus:ring-[#EE4D2D] rounded"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#EE4D2D] focus:border-transparent"
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
                className="flex-1 px-6 py-3 bg-[#EE4D2D] text-white rounded-lg font-semibold hover:bg-[#E65100] transition-colors"
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
