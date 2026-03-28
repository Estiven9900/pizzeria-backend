import { Router } from "express";
import { createLock, releaseLock } from "../services/cartService";

const router = Router();

router.post("/lock", async (req, res) => {
  try {
    const { product_config_id, session_id } = req.body as {
      product_config_id?: string;
      session_id?: string;
    };

    if (!product_config_id || !session_id) {
      res
        .status(400)
        .json({ error: "product_config_id y session_id son requeridos" });
      return;
    }

    const lock = await createLock(product_config_id, session_id);
    res.status(201).json(lock);
  } catch (err) {
    console.error("Error creating lock:", err);
    res.status(500).json({ error: "Error al crear bloqueo" });
  }
});

router.delete("/lock/:id", async (req, res) => {
  try {
    const lockId = req.params.id;

    if (!lockId) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }

    const deleted = await releaseLock(lockId);

    if (!deleted) {
      res.status(404).json({ error: "Bloqueo no encontrado" });
      return;
    }

    res.json({ message: "Bloqueo liberado" });
  } catch (err) {
    console.error("Error releasing lock:", err);
    res.status(500).json({ error: "Error al liberar bloqueo" });
  }
});

export default router;
