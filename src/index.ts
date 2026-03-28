import "dotenv/config";
import cors from "cors";
import express from "express";
import { pool } from "./config/database";
import productRoutes from "./routes/productRoutes";

const app = express();

const frontendPort = process.env.FRONTEND_PORT ?? "5173";

app.use(
  cors({
    origin: `http://localhost:${frontendPort}`,
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/products", productRoutes);

const port = Number(process.env.PORT ?? 3000);

app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  try {
    await pool.query("SELECT 1");
    console.log("Conectado a PostgreSQL");
  } catch (err) {
    console.error("Error conectando a PostgreSQL:", err);
  }
});
