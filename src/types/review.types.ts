export interface ProductReview {
  id: string;
  product_id: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateReviewBody {
  product_id: string;
  order_id: string;
  customer_email: string;
  rating: number;
  comment?: string;
}

export interface ReviewFilter {
  product_id?: string;
  is_approved?: boolean;
  page?: number;
  limit?: number;
}
