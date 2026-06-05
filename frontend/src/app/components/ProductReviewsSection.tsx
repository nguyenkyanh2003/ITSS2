import { useEffect, useState } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useLanguage } from "../context/LanguageContext";
import { getApiUrl, getAssetUrl } from "../../utils/api";

interface ReviewItem {
  id: string;
  rating: number;
  comment?: string;
  createdAt?: string;
  reviewer?: {
    id?: string;
    fullName?: string | null;
    avatarUrl?: string | null;
  } | string | null;
}

export function ProductReviewsSection({ sellerId }: { sellerId: string }) {
  const { lang } = useLanguage();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sellerId) return;

    const controller = new AbortController();
    const loadReviews = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(getApiUrl(`/api/reviews/seller/${sellerId}?limit=20`), {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Không thể tải đánh giá");
        }
        setReviews(data.data?.reviews || []);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message || "Không thể tải đánh giá");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadReviews();
    return () => controller.abort();
  }, [sellerId]);

  if (!sellerId) return null;

  const title = lang === "ja" ? "購入者のレビュー" : "Đánh giá từ người mua";
  const emptyText = lang === "ja" ? "まだレビューがありません。" : "Chưa có đánh giá nào.";
  const errorText = lang === "ja" ? "レビューを読み込めません。" : "Không thể tải đánh giá.";
  const loadingText = lang === "ja" ? "読み込み中..." : "Đang tải...";

  const renderStars = (value: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i += 1) {
      stars.push(
        <span key={i} className={i <= value ? "text-yellow-400" : "text-gray-300"}>
          ★
        </span>
      );
    }
    return <div className="flex gap-0.5 text-sm">{stars}</div>;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="font-semibold text-lg mb-4">{title}</h3>

      {isLoading ? (
        <div className="text-sm text-gray-500">{loadingText}</div>
      ) : error ? (
        <div className="text-sm text-red-500">{errorText}</div>
      ) : reviews.length === 0 ? (
        <div className="text-sm text-gray-500">{emptyText}</div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const reviewerObj = typeof review.reviewer === "object" ? review.reviewer : null;
            const reviewerName = reviewerObj?.fullName || (lang === "ja" ? "購入者" : "Người mua");
            const reviewerAvatar = reviewerObj?.avatarUrl
              ? getAssetUrl(reviewerObj.avatarUrl)
              : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop";
            const reviewDate = review.createdAt
              ? new Date(review.createdAt).toLocaleDateString(lang === "ja" ? "ja-JP" : "vi-VN")
              : "";

            return (
              <div key={review.id} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                    <ImageWithFallback
                      src={reviewerAvatar}
                      alt={reviewerName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900">{reviewerName}</div>
                      <div className="text-xs text-gray-500">{reviewDate}</div>
                    </div>
                    <div className="mt-1">{renderStars(review.rating || 0)}</div>
                    <p className="text-sm text-gray-700 mt-2">
                      {review.comment?.trim()
                        ? review.comment
                        : lang === "ja"
                        ? "コメントなし"
                        : "(Không có nhận xét)"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
