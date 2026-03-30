"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCatalogWithAvailability = getCatalogWithAvailability;
const database_1 = require("../config/database");
// ─── Query principal con CTEs ──────────────────────────────
const CATALOG_QUERY = `
  WITH active_locks AS (
    -- CTE 1: Locks vigentes agrupados por product_config_id
    SELECT
      pl.product_config_id,
      SUM(pl.quantity)::int AS locked_qty
    FROM product_locks pl
    WHERE pl.expires_at > now()
    GROUP BY pl.product_config_id
  ),

  ingredient_demand AS (
    -- CTE 2: Demanda de cada ingrediente causada por locks activos.
    --         Para cada config bloqueada, multiplicamos locked_qty
    --         por la quantity_required de la receta.
    SELECT
      ci.ingredient_id,
      SUM(ci.quantity_required * COALESCE(al.locked_qty, 0)) AS total_reserved
    FROM config_ingredients ci
    LEFT JOIN active_locks al ON al.product_config_id = ci.config_id
    GROUP BY ci.ingredient_id
  ),

  effective_stock AS (
    -- CTE 3: Stock real de cada ingrediente después de descontar la
    --         demanda reservada por locks.
    SELECT
      i.id AS ingredient_id,
      GREATEST(i.stock_quantity - COALESCE(id.total_reserved, 0), 0) AS available
    FROM ingredients i
    LEFT JOIN ingredient_demand id ON id.ingredient_id = i.id
  ),

  config_availability AS (
    -- CTE 4: Una product_config es available solo si TODOS sus
    --         ingredientes tienen stock >= quantity_required.
    --         Si la config no tiene ingredientes registrados, se
    --         asume disponible (catálogo sin receta aún).
    SELECT
      pc.id AS product_config_id,
      CASE
        WHEN COUNT(ci.ingredient_id) = 0 THEN true
        WHEN bool_and(
               es.available >= ci.quantity_required
             ) THEN true
        ELSE false
      END AS is_available
    FROM product_configs pc
    LEFT JOIN config_ingredients ci ON ci.config_id = pc.id
    LEFT JOIN effective_stock    es ON es.ingredient_id = ci.ingredient_id
    GROUP BY pc.id
  )

  -- Query final: une todo y devuelve el catálogo plano.
  SELECT
    p.id          AS pizza_id,
    p.name        AS pizza_name,
    p.description,
    p.image_url,
    pc.id         AS product_config_id,
    s.name        AS size_name,
    pc.price,
    pc.sku,
    COALESCE(ca.is_available, false) AS is_available
  FROM pizzas p
  JOIN product_configs     pc ON pc.pizza_id = p.id
  JOIN sizes               s  ON s.id = pc.size_id
  LEFT JOIN config_availability ca ON ca.product_config_id = pc.id
  WHERE p.is_active = true
  ORDER BY p.name, s.id;
`;
// ─── Función pública ───────────────────────────────────────
async function getCatalogWithAvailability() {
    const { rows } = await database_1.pool.query(CATALOG_QUERY);
    const map = new Map();
    for (const row of rows) {
        let pizza = map.get(row.pizza_id);
        if (!pizza) {
            pizza = {
                id: row.pizza_id,
                name: row.pizza_name,
                description: row.description,
                image_url: row.image_url,
                sizes: [],
            };
            map.set(row.pizza_id, pizza);
        }
        pizza.sizes.push({
            product_config_id: row.product_config_id,
            size: row.size_name,
            price: row.price,
            sku: row.sku,
            is_available: row.is_available,
        });
    }
    return [...map.values()];
}
//# sourceMappingURL=productService.js.map