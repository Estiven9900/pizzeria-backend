// ─── Enums ─────────────────────────────────────────────────

export type OrderStatus = "Pending" | "Confirmed" | "Ready" | "Delivered" | "Cancelled";

// ─── Tables ────────────────────────────────────────────────

export interface Role {
  id: number;
  name: string;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  password_hash: string;
  role_id: number;
}

export interface Size {
  id: number;
  name: string;
}

export interface Pizza {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  stock_quantity: number;
  unit: string;
}

export interface ProductConfig {
  id: string;
  pizza_id: string;
  size_id: string;
  price: number;
  sku: string | null;
  pizza?: Pizza;
  size?: Size;
}

export interface ConfigIngredient {
  config_id: string;
  ingredient_id: string;
  quantity_required: number;
}

export interface ProductLock {
  id: string;
  product_config_id: string;
  session_id: string;
  quantity: number;
  created_at: Date;
  expires_at: Date;
}

export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  delivery_address: string;
  reference_notes: string | null;
  customer_phone: string;
  latitude: number;
  longitude: number;
  total_price: number;
  status: OrderStatus;
  created_at: Date;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_config_id: string;
  quantity: number;
  price_at_purchase: number;
  subtotal: number;
}

export interface StoreCredit {
  id: string;
  order_id: string;
  customer_email: string;
  coupon_code: string;
  amount: number;
  is_redeemed: boolean;
  created_at: Date;
  redeemed_at: Date | null;
  expires_at: Date;
  redeemed_order_id: string | null;
}
