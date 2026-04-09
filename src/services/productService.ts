import { pool } from "../config/database";

// ─── Tipos de respuesta del catálogo ───────────────────────

interface SizeOption {
  product_config_id: string;
  size: string;
  price: number;
  sku: string | null;
  is_available: boolean;
}

export interface PizzaCatalogItem {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sizes: SizeOption[];
}

// ─── Row devuelta por la query (una fila por pizza) ────────

interface CatalogRow {
  pizza_id: string;
  pizza_name: string;
  description: string | null;
  image_url: string | null;
  sizes: SizeOption[];
}

// ─── Query principal con CTEs ──────────────────────────────

const CATALOG_QUERY = `
  WITH active_locks AS (
    -- CTE 1: Suma de unidades bloqueadas por product_config_id (solo locks vigentes).
    SELECT
      pl.product_config_id,
      SUM(pl.quantity)::int AS locked_qty
    FROM product_locks pl
    WHERE pl.expires_at > now()
    GROUP BY pl.product_config_id
  ),

  ingredient_demand AS (
    -- CTE 2: Demanda total de cada ingrediente causada por locks activos.
    --         LEFT JOIN con active_locks → configs sin locks activos aportan 0 de demanda
    --         (COALESCE convierte el NULL del LEFT JOIN en 0).
    SELECT
      ci.ingredient_id,
      SUM(ci.quantity_required * COALESCE(al.locked_qty, 0)) AS total_reserved
    FROM config_ingredients ci
    LEFT JOIN active_locks al ON al.product_config_id = ci.config_id
    GROUP BY ci.ingredient_id
  ),

  effective_stock AS (
    -- CTE 3: Stock disponible de cada ingrediente descontando la demanda reservada.
    --         LEFT JOIN con ingredient_demand → ingredientes sin demanda activa
    --         conservan su stock completo (COALESCE convierte NULL en 0).
    SELECT
      i.id AS ingredient_id,
      GREATEST(i.stock_quantity - COALESCE(demand.total_reserved, 0), 0) AS available
    FROM ingredients i
    LEFT JOIN ingredient_demand demand ON demand.ingredient_id = i.id
  ),

  config_availability AS (
    -- CTE 4: Disponibilidad de cada product_config.
    --         LEFT JOIN con config_ingredients → configs sin ingredientes registrados
    --         caen en COUNT = 0 → is_available = false (receta incompleta).
    --         LEFT JOIN con effective_stock → verifica que TODOS los ingredientes
    --         tengan stock >= quantity_required (bool_and).
    SELECT
      pc.id AS product_config_id,
      CASE
        WHEN COUNT(ci.ingredient_id) = 0 THEN false   -- Sin ingredientes → no disponible
        WHEN bool_and(es.available >= ci.quantity_required) THEN true
        ELSE false
      END AS is_available
    FROM product_configs pc
    LEFT JOIN config_ingredients ci ON ci.config_id        = pc.id
    LEFT JOIN effective_stock    es ON es.ingredient_id    = ci.ingredient_id
    GROUP BY pc.id
  ),

  sizes_data AS (
    -- CTE 5: Construye el objeto JSON de cada tamaño/config por pizza.
    --         Separar JSON_BUILD_OBJECT aquí permite hacer
    --         FILTER (WHERE sizes_data IS NOT NULL) sobre el alias real
    --         en lugar de filtrar por pc.id (campo de JOIN).
    SELECT
      pc.pizza_id,
      s.id AS size_id,
      JSON_BUILD_OBJECT(
        'product_config_id', pc.id,
        'size',              s.name,
        'price',             pc.price,
        'sku',               pc.sku,
        'is_available',      COALESCE(ca.is_available, false)
      ) AS sizes_data
    FROM product_configs     pc
    LEFT JOIN sizes               s  ON s.id                 = pc.size_id
    LEFT JOIN config_availability ca ON ca.product_config_id = pc.id
  )

  -- Consulta final: una fila por pizza con sus opciones de tamaño serializadas en JSON.
  -- LEFT JOIN con sizes_data garantiza que pizzas sin configs aparezcan con sizes = [].
  -- FILTER (WHERE sd.sizes_data IS NOT NULL) opera sobre el valor JSON real,
  -- no sobre un campo de JOIN, evitando estructuras corruptas o errores silenciosos.
  SELECT
    p.id          AS pizza_id,
    p.name        AS pizza_name,
    p.description,
    p.image_url,
    COALESCE(
      JSON_AGG(sd.sizes_data ORDER BY sd.size_id)
      FILTER (WHERE sd.sizes_data IS NOT NULL),
      '[]'::json
    ) AS sizes
  FROM pizzas p
  LEFT JOIN sizes_data sd ON sd.pizza_id = p.id
  WHERE p.is_active = true
  GROUP BY p.id, p.name, p.description, p.image_url
  ORDER BY p.name;
`;

// ─── Función pública ───────────────────────────────────────

export async function getCatalogWithAvailability(): Promise<PizzaCatalogItem[]> {
  console.log("Query SQL ejecutada:\n", CATALOG_QUERY);

  const { rows } = await pool.query<CatalogRow>(CATALOG_QUERY);

  console.log("Filas obtenidas:", rows.length);
  console.log("Resultados brutos de la DB:", JSON.stringify(rows, null, 2));

  return rows.map((row) => ({
    id: row.pizza_id,
    name: row.pizza_name,
    description: row.description,
    image_url: row.image_url,
    sizes: row.sizes,
  }));
}
