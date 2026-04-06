import { pool } from "../config/database";
import type { OrderStatus } from "../models";

// ─── Tipos de entrada ──────────────────────────────────────

export interface CheckoutInput {
  session_id: string;
  customer_name: string;
  customer_email: string;
  delivery_address: string;
  reference_notes?: string | undefined;
  customer_phone: string;
  latitude: number;
  longitude: number;
  items: CheckoutItemInput[];
}

interface CheckoutItemInput {
  product_config_id: string;
  quantity: number;
}

// ─── Tipos de respuesta ────────────────────────────────────

interface OrderItemResult {
  id: string;
  product_config_id: string;
  quantity: number;
  price_at_purchase: string;
  subtotal: string;
}

interface CheckoutResult {
  id: string;
  customer_name: string;
  customer_email: string;
  delivery_address: string;
  reference_notes: string | null;
  customer_phone: string;
  latitude: number;
  longitude: number;
  total_price: string;
  status: OrderStatus;
  created_at: string;
  items: OrderItemResult[];
}

// ─── Tipo auxiliar para config_ingredients ──────────────────

interface RecipeRow {
  ingredient_id: string;
  quantity_required: number;
}

// ─── Checkout transaccional ────────────────────────────────

export async function checkout(input: CheckoutInput): Promise<CheckoutResult> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Creación de la orden con datos del cliente
    const { rows: orderRows } = await client.query<Omit<CheckoutResult, "items">>(
      `INSERT INTO orders
         (customer_name, customer_email, delivery_address, reference_notes,
          customer_phone, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, customer_name, customer_email, delivery_address,
                 reference_notes, customer_phone, latitude, longitude,
                 total_price::text, status, created_at::text`,
      [
        input.customer_name,
        input.customer_email,
        input.delivery_address,
        input.reference_notes ?? null,
        input.customer_phone,
        input.latitude,
        input.longitude,
      ],
    );
    const order = orderRows[0]!;

    // 2. Procesamiento de items
    const insertedItems: OrderItemResult[] = [];

    for (const item of input.items) {
      // 2a. Insertar en order_items capturando price_at_purchase desde product_configs
      const { rows: itemRows } = await client.query<OrderItemResult>(
        `INSERT INTO order_items (order_id, product_config_id, quantity, price_at_purchase, subtotal)
         SELECT $1, pc.id, $2, pc.price, pc.price * $2
         FROM product_configs pc
         WHERE pc.id = $3
         RETURNING id, product_config_id, quantity, price_at_purchase::text, subtotal::text`,
        [order.id, item.quantity, item.product_config_id],
      );

      if (!itemRows[0]) {
        throw new Error(
          `product_config_id ${item.product_config_id} no encontrado`,
        );
      }
      insertedItems.push(itemRows[0]);

      // 2b. RF-01 — Resta de stock por ingrediente
      const { rows: recipe } = await client.query<RecipeRow>(
        `SELECT ingredient_id, quantity_required
         FROM config_ingredients
         WHERE config_id = $1`,
        [item.product_config_id],
      );

      for (const row of recipe) {
        const { rowCount } = await client.query(
          `UPDATE ingredients
           SET stock_quantity = stock_quantity - ($1 * $2)
           WHERE id = $3
             AND stock_quantity >= ($1 * $2)`,
          [row.quantity_required, item.quantity, row.ingredient_id],
        );

        if (rowCount === 0) {
          throw new Error(
            `Stock insuficiente para el ingrediente ${row.ingredient_id}`,
          );
        }
      }
    }

    // 3. Actualizar el total de la orden con la suma real de subtotales
    const { rows: totalRows } = await client.query<{ total_price: string }>(
      `UPDATE orders
       SET total_price = (
         SELECT COALESCE(SUM(subtotal), 0) FROM order_items WHERE order_id = $1
       )
       WHERE id = $1
       RETURNING total_price::text`,
      [order.id],
    );

    // 4. RF-02 — Liberar locks del session_id del cliente
    await client.query(
      `DELETE FROM product_locks WHERE session_id = $1`,
      [input.session_id],
    );

    await client.query("COMMIT");

    return {
      ...order,
      total_price: totalRows[0]!.total_price,
      items: insertedItems,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
