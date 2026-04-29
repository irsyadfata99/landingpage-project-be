// ==========================================
// PRODUCT TYPES
// ==========================================

export type ProductType = "PHYSICAL" | "DIGITAL" | "BOTH";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  product_type: ProductType;
  stock: number | null; // null = unlimited (untuk digital)
  image_url: string | null;
  download_url: string | null; // untuk produk digital
  download_expires_hours: number; // berapa jam link download aktif
  is_active: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateProductBody {
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  product_type: ProductType;
  stock?: number;
  download_url?: string;
  download_expires_hours?: number;
  is_active?: boolean;
  sort_order?: number;
}

export interface UpdateProductBody extends Partial<CreateProductBody> {}

// Product yang ditampilkan ke customer (data terbatas, tanpa download_url)
export interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  original_price: number | null;
  product_type: ProductType;
  stock: number | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}
