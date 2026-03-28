import { pool } from "../config/database";
import type { OrderStatus } from "../models";

interface OrderInput {
  customer_name: string;
  customer_email: string;
  delivery_address: string;
  reference_notes?: string | undefined;
  customer_phone: string;
  latitude: number;
  longitude: number;
}

interface OrderItemInput {
  product_config_id: string;
  quantity: number;
}

interface OrderItemResult {
  id: string;
  product_config_id: string;
  quantity: number;
  price_at_purchase: string;
  subtotal: string;
}

interface OrderResult {
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

export async function createOrder(
  customer: OrderInput,
  items: OrderItemInput[],
): Promise<OrderResult> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Crear la orden; el total se calculará después de insertar los items
    const { rows: orderRows } = await client.query<Omit<OrderResult, "items">>(
      `INSERT INTO orders
         (customer_name, customer_email, delivery_address, reference_notes,
          customer_phone, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, customer_name, customer_email, delivery_address,
                 reference_notes, customer_phone, latitude, longitude,
                 total_price::text, status, created_at::text`,
      [
        customer.customer_name,
        customer.customer_email,
        customer.delivery_address,
        customer.reference_notes ?? null,
        customer.customer_phone,
        customer.latitude,
        customer.longitude,
      ],
    );
    const order = orderRows[0]!;

    // 2. Insertar items buscando el precio real en product_configs
    const insertedItems: OrderItemResult[] = [];

    for (const item of items) {
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

    // 4. Limpiar locks asociados a los items de esta orden
    const configIds = items.map((i) => i.product_config_id);
    await client.query(
      `DELETE FROM product_locks WHERE product_config_id = ANY($1::uuid[])`,
      [configIds],
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
