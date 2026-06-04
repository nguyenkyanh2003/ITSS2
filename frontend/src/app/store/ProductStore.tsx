import { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef } from "react";
import { getApiUrl, getAssetUrl } from "../../utils/api";

export interface TimeSlot {
  day: string;
  time: string;
}

export interface Product {
  id: string;
  title: string;
  titleJa?: string;
  price: number;
  stock?: number;
  description: string;
  descriptionJa?: string;
  condition: string;
  category: string;
  image: string;
  distance: string;
  area?: string;
  status?: string;
  reservedBy?: string | null;
  seller: {
    id: string;
    name: string;
    avatar: string;
    rating: number;
    totalReviews: number;
    soldItems: number;
    memberSince: string;
    verified: boolean;
    phone: string;
    soldHistory?: string[];
  };
  availableTimeSlots: TimeSlot[];
  preferredSpots: string[];
  booking?: {
    time: string;
    spot: string;
  };
}

export interface ProductQueryParams {
  keyword?: string;
  minPrice?: number;
  maxPrice?: number;
  category?: string[];
  productStatus?: string[];
  status?: string[];
  campusArea?: string;
  location?: string;
  sortBy?: string;
  limit?: number;
}

interface ProductContextType {
  products: Product[];
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  removeProduct: (id: string) => void;
  getProduct: (id: string) => Promise<Product | undefined>;
  fetchProducts: (params?: ProductQueryParams) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

const mapCategory = (dbCategory: string) => {
  const cat = dbCategory || '';
  if (['Laptop & PC', 'Tai nghe & Phụ kiện', 'Điện thoại & Tablet', 'Laptop & máy tính', 'Tai nghe & phụ kiện'].includes(cat)) return 'Điện tử & Công nghệ';
  if (cat === 'Giáo trình & Tài liệu') return 'Giáo trình & Sách học';
  if (cat === 'Nội thất nhỏ & Đồ phòng') return 'Đồ dùng phòng trọ';
  if (cat === 'Đồ gia dụng nhỏ') return 'Gia dụng & Sinh hoạt';
  if (cat === 'Xe đạp & Phụ tùng') return 'Phương tiện di chuyển';
  if (cat === 'Thời trang & Phụ kiện') return 'Quần áo & Thời trang';
  return cat;
};

const mapArea = (dbArea: string) => {
  const area = dbArea || '';
  if (['KTX Bách Khoa', 'B1'].includes(area)) return 'Nhà B1';
  if (['Thư viện TTA'].includes(area)) return 'Thư viện Tạ Quang Bửu';
  if (['Khu giảng đường'].includes(area)) return 'Cổng Parabol';
  if (['Khu thực hành'].includes(area)) return 'Cổng Trần Đại Nghĩa';
  return area || 'Nhà B1';
};

const parseTimeSlotNote = (note: string) => {
  const trimmed = note.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(Thứ\s+\d+|Chủ nhật)\s+(.*)$/i);
  if (match) {
    return { day: match[1], time: match[2] };
  }

  return { day: 'N/A', time: trimmed };
};

const resolveProductImage = (bp: any) => {
  if (bp?.image) return getAssetUrl(bp.image);
  if (bp?.images && bp.images.length > 0) {
    const first = bp.images[0];
    return getAssetUrl(typeof first === 'string' ? first : first?.url);
  }
  return '';
};

const buildQueryString = (params?: ProductQueryParams) => {
  const searchParams = new URLSearchParams();
  const limit = params?.limit ?? 100;
  searchParams.set('limit', String(limit));

  if (params?.keyword) searchParams.set('keyword', params.keyword);
  if (Number.isFinite(params?.minPrice)) searchParams.set('minPrice', String(params?.minPrice));
  if (Number.isFinite(params?.maxPrice)) searchParams.set('maxPrice', String(params?.maxPrice));
  if (params?.category && params.category.length) searchParams.set('category', params.category.join(','));
  if (params?.productStatus && params.productStatus.length) searchParams.set('productStatus', params.productStatus.join(','));
  if (params?.status && params.status.length) searchParams.set('status', params.status.join(','));
  if (params?.campusArea) searchParams.set('campusArea', params.campusArea);
  if (params?.location) searchParams.set('location', params.location);
  if (params?.sortBy) searchParams.set('sort_by', params.sortBy);

  return searchParams.toString();
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getRetryDelayMs = (attempt: number) => {
  const base = 600 * attempt;
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(2500, base + jitter);
};

const getProductFetchErrorMessage = (error: unknown) => {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return "Backend đang khởi động quá lâu. Vui lòng thử lại sau vài giây.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.";
};

const mapBackendToFrontendProduct = (bp: any): Product => {
  return {
    id: bp.id,
    title: bp.title,
    titleJa: bp.title, // or fallback
    price: bp.price,
    stock: typeof bp.stock === 'number' ? bp.stock : undefined,
    description: bp.description,
    descriptionJa: bp.description,
    condition: bp.productStatus === 'new' ? 'Mới' : (bp.productStatus === 'other' ? 'Khác' : 'Đã qua sử dụng'),
    category: mapCategory(bp.category),
    // Prefer top-level `image` returned by backend (already normalized),
    // fallback to first image url in `images[]`.
    image: resolveProductImage(bp),
    distance: "100m", // mock distance as it's not strictly calculated
    area: mapArea(bp.location?.campusArea),
    status: bp.status === 'available' || bp.status === 'in-stock'
      ? 'in-stock'
      : (bp.status === 'reserved' ? 'reserved' : (bp.status === 'sold' ? 'sold' : 'inactive')),
    seller: {
      id: bp.seller?.id || '',
      name: bp.seller?.fullName || bp.seller?.email || 'Unknown',
      avatar: getAssetUrl(bp.seller?.avatarUrl || bp.seller?.profile?.avatarUrl) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
      rating: bp.seller?.trustStats?.averageRating || 5.0,
      totalReviews: bp.seller?.stats?.totalReviews || 0,
      soldItems: bp.seller?.stats?.totalSales || 0,
      memberSince: '2024',
      verified: bp.seller?.isVerified || false,
      phone: bp.seller?.phone || bp.seller?.phoneNumber || '0123456789',
      soldHistory: []
    },
    booking: bp.booking ? { time: bp.booking.time || '', spot: bp.booking.spot || '' } : undefined,
    reservedBy: bp.reservedBy?.id || bp.reservedBy?._id || bp.reservedBy || null,
    availableTimeSlots: Array.isArray(bp.availableTimeSlots) ? bp.availableTimeSlots.map((slot: any) => {
      if (slot?.day && slot?.time) return { day: slot.day, time: slot.time };
      if (slot?.startAt && slot?.endAt) {
        const start = new Date(slot.startAt);
        const end = new Date(slot.endAt);
        const days = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
        const day = days[start.getDay()] || "N/A";
        const time = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
        return { day, time };
      }
      if (slot?.note) {
        return parseTimeSlotNote(String(slot.note)) || { day: 'N/A', time: 'N/A' };
      }
      return { day: 'N/A', time: 'N/A' };
    }) : [],
    preferredSpots: Array.isArray(bp.meetingSpots) ? bp.meetingSpots : []
  };
};

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const productsRef = useRef<Product[]>([]);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const fetchProducts = useCallback(async (params?: ProductQueryParams) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const queryString = buildQueryString(params);
      const url = queryString ? getApiUrl(`/api/products?${queryString}`) : getApiUrl('/api/products');
      const maxAttempts = 3;
      const timeoutMs = 8000;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
          const res = await fetch(url, { signal: controller.signal });
          let data: any = null;

          try {
            data = await res.json();
          } catch (jsonError) {
            if (res.ok) {
              throw jsonError;
            }
          }

          if (!res.ok || !data?.success) {
            const retryableStatus = res.status >= 500 && res.status <= 599;
            if (retryableStatus && attempt < maxAttempts) {
              await sleep(getRetryDelayMs(attempt));
              continue;
            }

            const message = data?.message || `API trả về lỗi ${res.status}`;
            throw new Error(message);
          }

          const mapped = data.data.products.map(mapBackendToFrontendProduct);
          // Preserve cached booking/reservedBy for products already in state
          setProducts((prev) => {
            const prevById = new Map(prev.map((p) => [p.id, p]));
            return mapped.map((p: Product) => {
              const existing = prevById.get(p.id);
              if (!existing) return p;
              return {
                ...p,
                booking: existing.booking || p.booking,
                reservedBy: existing.reservedBy || p.reservedBy,
              };
            });
          });
          return;
        } catch (error) {
          const isAbort = error instanceof DOMException && error.name === 'AbortError';
          const isNetwork = error instanceof TypeError;
          if ((isAbort || isNetwork) && attempt < maxAttempts) {
            await sleep(getRetryDelayMs(attempt));
            continue;
          }
          throw error;
        } finally {
          clearTimeout(timeout);
        }
      }
    } catch (error) {
      console.error("Error fetching products:", {
        error,
        params,
      });
      setErrorMessage(getProductFetchErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addProduct = useCallback(async (product: Omit<Product, "id">) => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error("Vui lòng đăng nhập");
    // Support FormData for multipart uploads (images/video) or plain JSON payload
    let res;
    if (product instanceof FormData) {
      res = await fetch(getApiUrl('/api/products'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: product,
      });
    } else {
      const normalizedSlots = Array.isArray(product.availableTimeSlots)
        ? product.availableTimeSlots
            .map((slot: any) => {
              if (!slot) return null;
              if (typeof slot === 'string') {
                const note = slot.trim();
                return note ? { note } : null;
              }
              if (slot.note) {
                const note = String(slot.note).trim();
                return note ? { note } : null;
              }
              const day = slot.day ? String(slot.day).trim() : '';
              const time = slot.time ? String(slot.time).trim() : '';
              const note = [day, time].filter(Boolean).join(' ').trim();
              return note ? { note } : null;
            })
            .filter(Boolean)
        : [];

      const imageUrl = product.image ? String(product.image).trim() : '';
      const payload = {
        title: product.title,
        description: product.description,
        price: product.price,
        stock: typeof product.stock === 'number' ? product.stock : 1,
        productStatus: product.condition === 'Mới' ? 'new' : (product.condition === 'Khác' ? 'other' : 'used'),
        category: product.category,
        images: imageUrl ? [{ url: imageUrl }] : [],
        location: { campusArea: product.area || 'Nhà B1' },
        meetingSpots: product.preferredSpots,
        availableTimeSlots: normalizedSlots,
      };

      res = await fetch(getApiUrl('/api/products'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    }
    
    const data = await res.json();
    if (data.success) {
      setProducts(prev => [mapBackendToFrontendProduct(data.data.product), ...prev]);
    } else {
      throw new Error(data.message || "Không thể thêm sản phẩm");
    }
  }, []);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    // Only implemented state update for now to keep UI responsive
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }, []);

  const removeProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const getProduct = useCallback(async (id: string) => {
    const existing = productsRef.current.find((p) => p.id === id);
    if (existing) {
      const token = localStorage.getItem('token');
      if (token && !existing.booking) {
        console.debug('[ProductStore] refreshing product from server for id', id);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        try {
          const res = await fetch(getApiUrl(`/api/products/${id}`), {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          const data = await res.json();
          console.debug('[ProductStore] fetched product response', { ok: res.ok, status: res.status });

          if (!res.ok || !data.success) {
            throw new Error(data.message || `API trả về lỗi ${res.status}`);
          }

          const mapped = mapBackendToFrontendProduct(data.data.product);
          setProducts((prev) => [mapped, ...prev.filter((p) => p.id !== mapped.id)]);
          return mapped;
        } catch (err: any) {
          if (err.name === 'AbortError') {
            console.error('[ProductStore] fetch aborted (timeout) for product', id);
          } else {
            console.error('[ProductStore] Error refreshing product booking:', err);
          }
          // fallthrough to return existing cached product
        } finally {
          clearTimeout(timeout);
        }
      }
      return existing;
    }
    
    // Fetch if not in state
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      console.debug('[ProductStore] fetching product id', id);
      const token = localStorage.getItem('token');
      const headers: Record<string,string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(getApiUrl(`/api/products/${id}`), { headers, signal: controller.signal });
      const data = await res.json();
      console.debug('[ProductStore] fetch result', { ok: res.ok, status: res.status });

      if (!res.ok || !data.success) {
        throw new Error(data.message || `API trả về lỗi ${res.status}`);
      }

      const mapped = mapBackendToFrontendProduct(data.data.product);
      // Cache the fetched product so returning to this page shows the same UI
      setProducts((prev) => [mapped, ...prev.filter((p) => p.id !== mapped.id)]);
      return mapped;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[ProductStore] fetch aborted (timeout) for product', id);
      } else {
        console.error('Error fetching product by ID:', error);
      }
    } finally {
      clearTimeout(timeout);
    }
    return undefined;
  }, []);

  const contextValue = {
    products,
    addProduct,
    updateProduct,
    removeProduct,
    getProduct,
    fetchProducts,
    isLoading,
    errorMessage,
  };

  return (
    <ProductContext.Provider value={contextValue}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProducts must be used within ProductProvider");
  }
  return context;
}
