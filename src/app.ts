import "dotenv/config";
import cors from "cors";
import express from "express";

const app = express();

const frontendPort = process.env.FRONTEND_PORT ?? "5173";

app.use(
  cors({
    origin: `http://localhost:${frontendPort}`,
  }),
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
