import { pool } from "../config/database";

interface SizeOption {
  config_id: string;
  size: string;
  price: string;
  stock_available: number;
  is_available: boolean;
}

interface PizzaProduct {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  options: SizeOption[];
}

export async function getCatalogWithAvailability(): Promise<PizzaProduct[]> {
  const { rows } = await pool.query<{
    pizza_id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    is_active: boolean;
    config_id: string;
    size: string;
    price: string;
    effective_stock: number;
  }>(`
    SELECT
      p.id    AS pizza_id,
      p.name,
      p.description,
      p.image_url,
      p.is_active,
      pc.id   AS config_id,
      s.name  AS size,
      pc.price::text AS price,
      GREATEST(
        pc.stock_available - COALESCE(locked.total, 0),
        0
      )::int AS effective_stock
    FROM pizzas p
    JOIN product_configs pc ON pc.pizza_id = p.id
    JOIN sizes s            ON s.id = pc.size_id
    LEFT JOIN (
      SELECT product_config_id, SUM(quantity)::int AS total
      FROM product_locks
      WHERE expires_at > now()
      GROUP BY product_config_id
    ) locked ON locked.product_config_id = pc.id
    WHERE p.is_active = true
    ORDER BY p.id, s.id
  `);

  const map = new Map<string, PizzaProduct>();

  for (const row of rows) {
    let pizza = map.get(row.pizza_id);

    if (!pizza) {
      pizza = {
        id: row.pizza_id,
        name: row.name,
        description: row.description,
        image_url: row.image_url,
        is_active: row.is_active,
        options: [],
      };
      map.set(row.pizza_id, pizza);
    }

    pizza.options.push({
      config_id: row.config_id,
      size: row.size,
      price: row.price,
      stock_available: row.effective_stock,
      is_available: row.effective_stock > 0,
    });
  }
  
  return [...map.values()];
}
