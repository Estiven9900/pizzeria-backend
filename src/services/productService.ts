import { pool } from "../config/database";

interface SizeOption {
  config_id: number;
  size: string;
  price: string;
}

interface PizzaProduct {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  options: SizeOption[];
}

export async function getAllProducts(): Promise<PizzaProduct[]> {
  const { rows } = await pool.query<{
    pizza_id: number;
    name: string;
    description: string | null;
    image_url: string | null;
    config_id: number;
    size: string;
    price: string;
  }>(`
    SELECT
      p.id    AS pizza_id,
      p.name,
      p.description,
      p.image_url,
      pc.id   AS config_id,
      s.name  AS size,
      pc.price::text AS price
    FROM pizzas p
    JOIN product_configs pc ON pc.pizza_id = p.id
    JOIN sizes s            ON s.id = pc.size_id
    ORDER BY p.id, s.id
  `);

  const map = new Map<number, PizzaProduct>();

  for (const row of rows) {
    let pizza = map.get(row.pizza_id);

    if (!pizza) {
      pizza = {
        id: row.pizza_id,
        name: row.name,
        description: row.description,
        image_url: row.image_url,
        options: [],
      };
      map.set(row.pizza_id, pizza);
    }

    pizza.options.push({
      config_id: row.config_id,
      size: row.size,
      price: row.price,
    });
  }
  
  return [...map.values()];
}
