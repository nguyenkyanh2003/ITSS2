import { useState, useMemo, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Store, Clock, MessageCircle } from "lucide-react";
import { useProducts, ProductQueryParams } from "../store/ProductStore";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useLanguage } from "../context/LanguageContext";
import { LanguageToggle } from "../components/LanguageToggle";
import { useAuth } from "../context/AuthContext";
import { useUnreadMessages } from "../hooks/useUnreadMessages";
import { useNotification } from "../../context/NotificationContext";
import { getApiUrl } from "../../utils/api";

type SuggestionItem = {
  type: "title" | "category";
  value: string;
};

const categoryMap: Record<string, string[]> = {
  "Điện tử & Công nghệ": [
    "Laptop & PC",
    "Tai nghe & Phụ kiện",
    "Điện thoại & Tablet",
    "Laptop & máy tính",
    "Tai nghe & phụ kiện",
  ],
  "Giáo trình & Sách học": ["Giáo trình & Tài liệu"],
  "Đồ dùng phòng trọ": ["Nội thất nhỏ & Đồ phòng"],
  "Gia dụng & Sinh hoạt": ["Đồ gia dụng nhỏ"],
  "Phương tiện di chuyển": ["Xe đạp & Phụ tùng"],
  "Quần áo & Thời trang": ["Thời trang & Phụ kiện"],
  "Khác": ["Khác"],
};

const areaMap: Record<string, string> = {
  "Nhà B1": "KTX Bách Khoa",
  "Thư viện Tạ Quang Bửu": "Thư viện TTA",
  "Cổng Parabol": "Khu giảng đường",
  "Cổng Trần Đại Nghĩa": "Khu thực hành",
};

const mapFrontendCategoryToBackend = (value: string) => {
  if (!value) return [];
  return categoryMap[value] || [value];
};

const mapFrontendAreaToCampusArea = (value: string) => {
  if (!value) return "";
  return areaMap[value] || value;
};

const mapConditionToProductStatus = (value: string) => {
  if (!value) return [];
  if (value === "Mới") return ["new"];
  if (value === "Đã qua sử dụng") return ["used"];
  return ["other"];
};

const mapSortByToBackend = (value: string, hasKeyword: boolean) => {
  if (value === "price-low") return "price_asc";
  if (value === "price-high") return "price_desc";
  if (value === "newest") return "created_at_desc";
  if (!value && hasKeyword) return "relevance";
  return "";
};

const recentSearches = ["Macbook", "Giải tích 1"];
const DEFAULT_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop";

export function HomePage() {
  const { products, isLoading, errorMessage, fetchProducts } = useProducts();
  const { t, lang } = useLanguage();
  const { isAuthenticated, user, logout } = useAuth();
  const { showNotification } = useNotification();
  const errorTitle = "Lỗi";
  const navigate = useNavigate();
  const { unreadCount } = useUnreadMessages(isAuthenticated);

  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [condition, setCondition] = useState("");
  const [category, setCategory] = useState("");
  const [area, setArea] = useState("");
  const [stockAvailable, setStockAvailable] = useState(false);
  const [stockSold, setStockSold] = useState(false);
  const [sortBy, setSortBy] = useState("");

  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showSuggestions) {
      setSuggestions([]);
      setIsSuggesting(false);
      return;
    }

    const keyword = searchQuery.trim();
    if (keyword.length < 2) {
      setSuggestions([]);
      setIsSuggesting(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setIsSuggesting(true);
        const res = await fetch(
          getApiUrl(`/api/products/suggestions?keyword=${encodeURIComponent(keyword)}&limit=10`),
          { signal: controller.signal }
        );
        const data = await res.json();
        if (data?.success && Array.isArray(data.data?.suggestions)) {
          setSuggestions(data.data.suggestions);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSuggesting(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, showSuggestions]);

  const productQuery = useMemo<ProductQueryParams>(() => {
    const params: ProductQueryParams = { limit: 100 };
    const keyword = searchQuery.trim();
    const minValue = Number(priceFrom);
    const maxValue = Number(priceTo);

    if (keyword) params.keyword = keyword;
    if (priceFrom && Number.isFinite(minValue)) params.minPrice = minValue;
    if (priceTo && Number.isFinite(maxValue)) params.maxPrice = maxValue;

    const mappedCategories = mapFrontendCategoryToBackend(category);
    if (mappedCategories.length) params.category = mappedCategories;

    const productStatuses = mapConditionToProductStatus(condition);
    if (productStatuses.length) params.productStatus = productStatuses;

    const campusArea = mapFrontendAreaToCampusArea(area);
    if (campusArea) params.campusArea = campusArea;

    const statusFilters: string[] = [];
    if (stockAvailable) statusFilters.push("available");
    if (stockSold) statusFilters.push("sold");
    if (statusFilters.length) params.status = statusFilters;

    const sortParam = mapSortByToBackend(sortBy, Boolean(keyword));
    if (sortParam) params.sortBy = sortParam;

    return params;
  }, [
    searchQuery,
    priceFrom,
    priceTo,
    condition,
    category,
    area,
    sortBy,
    stockAvailable,
    stockSold,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(productQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchProducts, productQuery]);

  const filteredProducts = products;

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
  };

  const filteredSuggestions = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }
    return suggestions;
  }, [searchQuery, suggestions]);

  // Determine what to show in dropdown
  const shouldShowRecent = showSuggestions && !searchQuery.trim();
  const shouldShowFiltered = showSuggestions && searchQuery.trim();
  const hasNoResults = shouldShowFiltered && !isSuggesting && filteredSuggestions.length === 0;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[#FF5C00] px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Store className="w-8 h-8 text-white" />
              <h1 className="text-white text-2xl font-bold whitespace-nowrap">{t.appName}</h1>
            </div>
            <div className="flex-1 min-w-[200px] max-w-2xl relative" ref={searchRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border-none outline-none"
              />
              {/* Search Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white text-gray-900 border border-gray-200 shadow-lg rounded-lg overflow-hidden z-50">
                  {/* Recent Searches (Empty State) */}
                  {shouldShowRecent && (
                    <div>
                      <div className="px-4 py-2 text-xs text-gray-500 font-semibold flex items-center gap-2 border-b border-gray-100">
                        <Clock className="w-3.5 h-3.5" />
                        {t.recentSearches}
                      </div>
                      {recentSearches.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(item)}
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 text-gray-900"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Filtered Results (Typing State) */}
                  {shouldShowFiltered && isSuggesting && (
                    <div className="px-4 py-2 text-sm text-gray-500">{t.loadingSuggestions}</div>
                  )}

                  {shouldShowFiltered && !hasNoResults && (
                    <div>
                      {filteredSuggestions.map((item, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(item.value)}
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 text-gray-900"
                        >
                          {item.value}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* No Match State */}
                  {hasNoResults && (
                    <div className="px-4 py-3 text-gray-500 text-sm">
                      {t.noResults} '{searchQuery}'
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <LanguageToggle />

              {!isAuthenticated ? (
                <Link
                  to="/login"
                  className="text-white hover:underline whitespace-nowrap"
                >
                  {t.loginRegister}
                </Link>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/messages"
                    className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/15 text-white hover:bg-white/25 transition-colors"
                    aria-label="Tin nhắn"
                    title="Tin nhắn"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-white text-[#FF5C00] text-xs font-bold flex items-center justify-center">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/profile"
                    className="flex items-center"
                    aria-label={user?.fullName || t.profileTitle}
                    title={user?.fullName || t.profileTitle}
                  >
                    <span className="sr-only">{user?.fullName || t.profileTitle}</span>
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-white/60 bg-white/20">
                      <ImageWithFallback
                        src={user?.avatarUrl || DEFAULT_AVATAR}
                        alt={user?.fullName || t.profileTitle}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </Link>
                  <button
                    onClick={logout}
                    className="text-white text-sm hover:underline"
                  >
                    {t.logout}
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    showNotification(errorTitle, t.errLoginRequired || "Vui lòng đăng nhập để thực hiện chức năng này!", "error");
                    navigate("/login");
                  } else {
                    navigate("/add");
                  }
                }}
                className="bg-white text-[#FF5C00] px-5 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                <Plus className="w-5 h-5" />
                {t.postListing}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-row items-center gap-4 flex-nowrap overflow-x-auto w-full">
          {/* Price Range */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <label className="text-sm text-gray-700 whitespace-nowrap">{t.priceLabel}</label>
            <input
              type="number"
              placeholder={t.priceFrom}
              value={priceFrom}
              onChange={(e) => setPriceFrom(e.target.value)}
              className="w-24 px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 border border-gray-200 shadow-lg"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              placeholder={t.priceTo}
              value={priceTo}
              onChange={(e) => setPriceTo(e.target.value)}
              className="w-24 px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white text-gray-900 border border-gray-200 shadow-lg"
            />
          </div>

          {/* Condition */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <label className="text-xs text-gray-700 whitespace-nowrap">{t.conditionLabel}</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="px-2 py-1.5 rounded-md text-xs bg-white text-gray-900 border border-gray-200 shadow-lg cursor-pointer hover:bg-gray-50"
            >
              <option value="">{t.all}</option>
              <option value="Mới">{t.conditionNew}</option>
              <option value="Đã qua sử dụng">{t.conditionUsed}</option>
            </select>
          </div>

          {/* Category */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <label className="text-xs text-gray-700 whitespace-nowrap">{t.categoryLabel}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-2 py-1.5 rounded-md text-xs bg-white text-gray-900 border border-gray-200 shadow-lg cursor-pointer hover:bg-gray-50"
            >
              <option value="">{t.all}</option>
              <option value="Điện tử & Công nghệ">{t.catElectronics}</option>
              <option value="Giáo trình & Sách học">{t.catBooks}</option>
              <option value="Đồ dùng phòng trọ">{t.catDormItems}</option>
              <option value="Gia dụng & Sinh hoạt">{t.catHousehold}</option>
              <option value="Phương tiện di chuyển">{t.catVehicles}</option>
              <option value="Quần áo & Thời trang">{t.catFashion}</option>
              <option value="Khác">{t.catOther}</option>
            </select>
          </div>

          {/* Campus Area */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <label className="text-xs text-gray-700 whitespace-nowrap">{t.areaLabel}</label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="px-2 py-1.5 rounded-md text-xs bg-white text-gray-900 border border-gray-200 shadow-lg cursor-pointer hover:bg-gray-50"
            >
              <option value="">{t.all}</option>
              <option value="Nhà B1">{t.areaNhaB1}</option>
              <option value="Thư viện Tạ Quang Bửu">{t.areaLibrary}</option>
              <option value="Cổng Parabol">{t.areaParabol}</option>
              <option value="Cổng Trần Đại Nghĩa">{t.areaTranDaiNghia}</option>
            </select>
          </div>

          {/* Stock Status */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <label className="text-xs text-gray-700 whitespace-nowrap">{t.stockLabel}</label>
            <label className="flex items-center gap-1 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={stockAvailable}
                onChange={(e) => setStockAvailable(e.target.checked)}
                className="accent-[#FF5C00]"
              />
              {t.stockAvailable}
            </label>
            <label className="flex items-center gap-1 text-xs text-gray-700">
              <input
                type="checkbox"
                checked={stockSold}
                onChange={(e) => setStockSold(e.target.checked)}
                className="accent-[#FF5C00]"
              />
              {t.stockSold}
            </label>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <label className="text-xs text-gray-700 whitespace-nowrap">{t.sortLabel}</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-2 py-1.5 rounded-md text-xs bg-white text-gray-900 border border-gray-200 shadow-lg cursor-pointer hover:bg-gray-50"
            >
              <option value="">{t.sortRelevance}</option>
              <option value="newest">{t.sortNewest}</option>
              <option value="price-low">{t.sortPriceLow}</option>
              <option value="price-high">{t.sortPriceHigh}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF5C00]"></div>
          </div>
        ) : errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {errorMessage}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.id}`}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden group"
                >
                  <div className="aspect-square overflow-hidden bg-gray-100 relative">
                    <ImageWithFallback
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Status Badge */}
                    {product.status && product.status !== "inactive" && (
                      <div
                        className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium text-white ${
                          product.status === "in-stock" ? "bg-green-600" : (product.status === "reserved" ? "bg-orange-500" : "bg-red-600")
                        }`}
                      >
                        {product.status === "in-stock"
                          ? t.statusInStock
                          : (product.status === "reserved" ? t.statusReserved : t.statusSold)}
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="text-[#FF5C00] text-xl font-bold mb-2">
                      {product.price.toLocaleString("vi-VN")} đ
                    </div>
                    <h3 className="text-gray-900 mb-2 line-clamp-2">
                      {lang === "ja" && product.titleJa ? product.titleJa : product.title}
                    </h3>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span>{product.distance}</span>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-500">⭐</span>
                        <span>{product.seller.rating}</span>
                      </div>
                    </div>
                    {product.seller.verified && (
                      <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded text-xs">
                        <span className="text-green-600">✓</span>
                        {t.trustedSeller}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-gray-500">{t.noProducts}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
