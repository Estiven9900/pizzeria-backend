import { Router } from "express";
import { getAllProducts } from "../services/productService";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const products = await getAllProducts();
    res.json(products);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

export default router;
