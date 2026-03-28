"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cartService_1 = require("../services/cartService");
const router = (0, express_1.Router)();
router.post("/lock", async (req, res) => {
    try {
        const { product_config_id, session_id } = req.body;
        if (!product_config_id || !session_id) {
            res
                .status(400)
                .json({ error: "product_config_id y session_id son requeridos" });
            return;
        }
        const lock = await (0, cartService_1.createLock)(product_config_id, session_id);
        res.status(201).json(lock);
    }
    catch (err) {
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
        const deleted = await (0, cartService_1.releaseLock)(lockId);
        if (!deleted) {
            res.status(404).json({ error: "Bloqueo no encontrado" });
            return;
        }
        res.json({ message: "Bloqueo liberado" });
    }
    catch (err) {
        console.error("Error releasing lock:", err);
        res.status(500).json({ error: "Error al liberar bloqueo" });
    }
});
exports.default = router;
//# sourceMappingURL=cartRoutes.js.map