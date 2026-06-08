import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, MessageCircle, Clock, ChevronRight, Star, MapPin } from "lucide-react";
import { useProducts, ProductQueryParams } from "../store/ProductStore";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { useUnreadMessages } from "../hooks/useUnreadMessages";
import { useNotification } from "../../context/NotificationContext";
import { getApiUrl } from "../../utils/api";

type SuggestionItem = {
  type: "title" | "category";
  value: string;
};

// ─── Category config ─────────────────────────────────────────────────────────

const CATEGORIES = [
  { label: "Điện tử", icon: "💻", backend: ["Laptop & PC", "Tai nghe & Phụ kiện", "Điện thoại & Tablet", "Laptop & máy tính", "Tai nghe & phụ kiện"] },
  { label: "Sách vở", icon: "📚", backend: ["Giáo trình & Tài liệu"] },
  { label: "Đồ phòng", icon: "🛋️", backend: ["Nội thất nhỏ & Đồ phòng"] },
  { label: "Gia dụng", icon: "🏠", backend: ["Đồ gia dụng nhỏ"] },
  { label: "Xe cộ", icon: "🚲", backend: ["Xe đạp & Phụ tùng"] },
  { label: "Thời trang", icon: "👕", backend: ["Thời trang & Phụ kiện"] },
  { label: "Khác", icon: "📦", backend: ["Khác"] },
];

const AREA_OPTIONS = [
  { label: "Tất cả", value: "" },
  { label: "Nhà B1", value: "KTX Bách Khoa" },
  { label: "Thư viện", value: "Thư viện TTA" },
  { label: "Cổng Parabol", value: "Khu giảng đường" },
  { label: "Cổng TĐN", value: "Khu thực hành" },
];

const SORT_OPTIONS = [
  { label: "Liên quan", value: "" },
  { label: "Mới nhất", value: "newest" },
  { label: "Giá thấp", value: "price-low" },
  { label: "Giá cao", value: "price-high" },
];

const recentSearches = ["Macbook", "Giải tích 1", "Tai nghe", "Xe đạp"];
const DEFAULT_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop";

const mapSortByToBackend = (value: string, hasKeyword: boolean) => {
  if (value === "price-low") return "price_asc";
  if (value === "price-high") return "price_desc";
  if (value === "newest") return "created_at_desc";
  if (!value && hasKeyword) return "relevance";
  return "";
};

// ─── Component ────────────────────────────────────────────────────────────────

export function HomePage() {
  const { products, isLoading, errorMessage, fetchProducts } = useProducts();
  const { t } = useLanguage();
  const { isAuthenticated, user, logout } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages(isAuthenticated);

  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [condition, setCondition] = useState("");
  const [activeCategoryIdx, setActiveCategoryIdx] = useState<number | null>(null);
  const [activeArea, setActiveArea] = useState("");
  const [sortBy, setSortBy] = useState("");

  const searchRef = useRef<HTMLDivElement>(null);

  // ── Click-outside to close suggestions
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Debounced suggestions fetch
  useEffect(() => {
    if (!showSuggestions) { setSuggestions([]); return; }
    const keyword = searchQuery.trim();
    if (keyword.length < 2) { setSuggestions([]); return; }

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setIsSuggesting(true);
        const res = await fetch(
          getApiUrl(`/api/products/suggestions?keyword=${encodeURIComponent(keyword)}&limit=10`),
          { signal: ctrl.signal }
        );
        const data = await res.json();
        setSuggestions(data?.success && Array.isArray(data.data?.suggestions) ? data.data.suggestions : []);
      } catch {
        if (!ctrl.signal.aborted) setSuggestions([]);
      } finally {
        if (!ctrl.signal.aborted) setIsSuggesting(false);
      }
    }, 300);

    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [searchQuery, showSuggestions]);

  // ── Build query params
  const productQuery = useMemo<ProductQueryParams>(() => {
    const params: ProductQueryParams = { limit: 60 };
    const keyword = searchQuery.trim();
    const minValue = Number(priceFrom);
    const maxValue = Number(priceTo);

    if (keyword) params.keyword = keyword;
    if (priceFrom && Number.isFinite(minValue)) params.minPrice = minValue;
    if (priceTo && Number.isFinite(maxValue)) params.maxPrice = maxValue;

    if (activeCategoryIdx !== null) {
      params.category = CATEGORIES[activeCategoryIdx].backend;
    }

    if (condition === "new") params.productStatus = ["new"];
    else if (condition === "used") params.productStatus = ["used"];

    if (activeArea) params.campusArea = activeArea;

    const sortParam = mapSortByToBackend(sortBy, Boolean(keyword));
    if (sortParam) params.sortBy = sortParam;

    return params;
  }, [searchQuery, priceFrom, priceTo, condition, activeCategoryIdx, activeArea, sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(productQuery), 300);
    return () => clearTimeout(timer);
  }, [fetchProducts, productQuery]);

  const handleSearch = () => {
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (value: string) => {
    setSearchQuery(value);
    setShowSuggestions(false);
  };

  const shouldShowRecent = showSuggestions && !searchQuery.trim();
  const shouldShowFiltered = showSuggestions && !!searchQuery.trim();
  const hasNoResults = shouldShowFiltered && !isSuggesting && suggestions.length === 0;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#F5F5F5" }}>

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header style={{ backgroundColor: "#EE4D2D" }}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-1.5 shrink-0">
              <span className="text-white text-2xl font-black tracking-tight select-none">
                Hust<span className="text-yellow-300">Trade</span>
              </span>
            </Link>

            {/* Search bar */}
            <div className="flex-1 relative" ref={searchRef}>
              <div className="flex rounded-sm overflow-hidden shadow-sm">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Tìm kiếm sản phẩm, sách vở, đồ dùng..."
                  className="flex-1 px-4 py-2.5 text-sm outline-none text-gray-800 bg-white placeholder-gray-400"
                />
                <button
                  onClick={handleSearch}
                  className="px-5 py-2.5 flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: "#EE4D2D", border: "2px solid #fff2" }}
                >
                  <Search className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Suggestions dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white shadow-xl rounded-sm z-50 overflow-hidden">
                  {shouldShowRecent && (
                    <>
                      <div className="px-4 pt-3 pb-1 text-xs text-gray-400 flex items-center gap-1.5 uppercase tracking-wide">
                        <Clock className="w-3 h-3" /> Tìm kiếm gần đây
                      </div>
                      {recentSearches.map((item) => (
                        <button key={item} onClick={() => handleSuggestionClick(item)}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-orange-50 flex items-center gap-3">
                          <Clock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                          {item}
                        </button>
                      ))}
                    </>
                  )}
                  {shouldShowFiltered && isSuggesting && (
                    <div className="px-4 py-3 text-sm text-gray-400">Đang tìm kiếm...</div>
                  )}
                  {shouldShowFiltered && !hasNoResults && suggestions.map((item, i) => (
                    <button key={i} onClick={() => handleSuggestionClick(item.value)}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-orange-50 flex items-center gap-3">
                      <Search className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      {item.value}
                      <span className="ml-auto text-xs text-gray-400">{item.type === "category" ? "Danh mục" : ""}</span>
                    </button>
                  ))}
                  {hasNoResults && (
                    <div className="px-4 py-3 text-sm text-gray-400">
                      Không tìm thấy kết quả cho '<span className="text-gray-700 font-medium">{searchQuery}</span>'
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 shrink-0">
              {isAuthenticated ? (
                <>
                  <Link to="/messages" className="relative flex flex-col items-center gap-0.5 text-white hover:text-yellow-200 transition-colors">
                    <div className="relative">
                      <MessageCircle className="w-6 h-6" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 rounded-full bg-yellow-400 text-[10px] font-bold text-gray-900 flex items-center justify-center">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] hidden sm:block">Chat</span>
                  </Link>

                  <Link to="/profile" className="flex flex-col items-center gap-0.5 text-white hover:text-yellow-200 transition-colors">
                    <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white/60">
                      <ImageWithFallback src={user?.avatarUrl || DEFAULT_AVATAR} alt={user?.fullName || ""} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[10px] hidden sm:block max-w-16 truncate">{user?.fullName?.split(" ").pop()}</span>
                  </Link>

                  <button onClick={logout} className="text-white/80 text-xs hover:text-white hidden sm:block">Đăng xuất</button>
                </>
              ) : (
                <Link to="/login" className="text-white text-sm hover:text-yellow-200 font-medium transition-colors whitespace-nowrap">
                  Đăng nhập
                </Link>
              )}

              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    showNotification("Lỗi", "Vui lòng đăng nhập để đăng sản phẩm!", "error");
                    navigate("/login");
                  } else {
                    navigate("/add");
                  }
                }}
                className="flex items-center gap-1.5 bg-white text-sm font-medium px-4 py-2 rounded-sm transition-opacity hover:opacity-90 whitespace-nowrap"
                style={{ color: "#EE4D2D" }}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Đăng bán</span>
              </button>
            </div>
          </div>
        </div>

        {/* Category nav bar */}
        <div style={{ backgroundColor: "#D73211" }}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
              <button
                onClick={() => setActiveCategoryIdx(null)}
                className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap ${
                  activeCategoryIdx === null
                    ? "bg-white text-orange-600"
                    : "text-white hover:bg-white/10"
                }`}
              >
                Tất cả
              </button>
              {CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.label}
                  onClick={() => setActiveCategoryIdx(activeCategoryIdx === idx ? null : idx)}
                  className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap flex items-center gap-1 ${
                    activeCategoryIdx === idx
                      ? "bg-white text-orange-600"
                      : "text-white hover:bg-white/10"
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 py-4">

        {/* Banner */}
        <div className="rounded-sm overflow-hidden mb-4 relative" style={{ background: "linear-gradient(135deg, #EE4D2D 0%, #ff7854 100%)" }}>
          <div className="px-8 py-6 flex items-center justify-between">
            <div className="text-white">
              <p className="text-xs uppercase tracking-widest opacity-80 mb-1">Chợ đồ cũ sinh viên</p>
              <h2 className="text-2xl font-black mb-1">HUST<span className="text-yellow-300">TRADE</span></h2>
              <p className="text-sm opacity-90">Mua bán đồ cũ – Kết nối cộng đồng Bách Khoa</p>
            </div>
            <div className="text-6xl opacity-20 select-none">🎓</div>
          </div>
        </div>

        {/* Category icons grid */}
        <div className="bg-white rounded-sm p-4 mb-4 shadow-sm">
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {CATEGORIES.map((cat, idx) => (
              <button
                key={cat.label}
                onClick={() => setActiveCategoryIdx(activeCategoryIdx === idx ? null : idx)}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-sm transition-all ${
                  activeCategoryIdx === idx ? "bg-orange-50 ring-1 ring-orange-300" : "hover:bg-gray-50"
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs text-gray-600 text-center leading-tight">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Filter & sort bar */}
        <div className="bg-white rounded-sm px-4 py-3 mb-4 shadow-sm flex flex-wrap items-center gap-3">
          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 whitespace-nowrap">Giá:</span>
            <input type="number" placeholder="Từ" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)}
              className="w-20 px-2 py-1 border border-gray-200 rounded-sm text-xs outline-none focus:border-orange-400" />
            <span className="text-gray-400 text-xs">—</span>
            <input type="number" placeholder="Đến" value={priceTo} onChange={(e) => setPriceTo(e.target.value)}
              className="w-20 px-2 py-1 border border-gray-200 rounded-sm text-xs outline-none focus:border-orange-400" />
          </div>

          {/* Condition */}
          <div className="flex items-center gap-1.5">
            {["", "new", "used"].map((val) => (
              <button key={val} onClick={() => setCondition(val)}
                className={`px-3 py-1 text-xs rounded-sm border transition-colors ${
                  condition === val
                    ? "border-orange-400 text-orange-500 bg-orange-50"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}>
                {val === "" ? "Tất cả" : val === "new" ? "Mới" : "Đã dùng"}
              </button>
            ))}
          </div>

          {/* Area */}
          <select value={activeArea} onChange={(e) => setActiveArea(e.target.value)}
            className="px-2 py-1 border border-gray-200 rounded-sm text-xs text-gray-600 outline-none focus:border-orange-400 bg-white cursor-pointer">
            {AREA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Sort */}
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-xs text-gray-400">Sắp xếp:</span>
            {SORT_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => setSortBy(o.value)}
                className={`px-3 py-1 text-xs rounded-sm border transition-colors ${
                  sortBy === o.value
                    ? "border-orange-400 text-orange-500 bg-orange-50"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 rounded-full" style={{ backgroundColor: "#EE4D2D" }} />
            <h2 className="text-base font-semibold text-gray-800">
              {activeCategoryIdx !== null ? CATEGORIES[activeCategoryIdx].label : "Gợi ý hôm nay"}
            </h2>
          </div>
          <span className="text-sm text-gray-400">
            {isLoading ? "Đang tải..." : `${products.length} sản phẩm`}
          </span>
        </div>

        {/* Product grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-sm overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : errorMessage ? (
          <div className="bg-red-50 border border-red-200 rounded-sm px-4 py-3 text-red-600 text-sm">{errorMessage}</div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-sm shadow-sm">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-gray-500 text-sm">Không tìm thấy sản phẩm phù hợp</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {products.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="bg-white rounded-sm overflow-hidden hover:shadow-md transition-shadow group"
              >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <ImageWithFallback
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Discount badge */}
                  {(product.discountPercent ?? 0) > 0 && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-bl-sm">
                      -{product.discountPercent}%
                    </div>
                  )}
                  {/* Status badge */}
                  {product.status === "reserved" && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">
                      Đã giữ chỗ
                    </div>
                  )}
                  {product.status === "sold" && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="text-white font-bold text-sm border-2 border-white px-2 py-1 rounded">ĐÃ BÁN</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-2.5">
                  <h3 className="text-xs text-gray-800 line-clamp-2 leading-snug mb-1.5 min-h-[2.5em]">
                    {product.title}
                  </h3>

                  {/* Price row */}
                  <div className="flex items-baseline gap-1.5 flex-wrap mb-1">
                    <span className="text-sm font-bold" style={{ color: "#EE4D2D" }}>
                      {product.price.toLocaleString("vi-VN")}đ
                    </span>
                    {(product.originalPrice ?? 0) > product.price && (
                      <span className="text-[10px] text-gray-400 line-through">
                        {product.originalPrice!.toLocaleString("vi-VN")}đ
                      </span>
                    )}
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <div className="flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate max-w-16">{product.area || "HUST"}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400 shrink-0" />
                      <span>{product.seller.rating > 0 ? product.seller.rating.toFixed(1) : "Mới"}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer spacing */}
        <div className="h-8" />
      </div>
    </div>
  );
}
