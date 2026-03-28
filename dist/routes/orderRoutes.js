"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const orderService_1 = require("../services/orderService");
const router = (0, express_1.Router)();
router.post("/", async (req, res) => {
    try {
        const body = req.body;
        if (!body.customer_name ||
            !body.customer_email ||
            !body.delivery_address ||
            !body.customer_phone ||
            body.latitude == null ||
            body.longitude == null) {
            res.status(400).json({
                error: "Se requieren: customer_name, customer_email, delivery_address, customer_phone, latitude, longitude",
            });
            return;
        }
        if (!body.items || body.items.length === 0) {
            res.status(400).json({ error: "Se requiere al menos un item" });
            return;
        }
        for (const item of body.items) {
            if (!item.product_config_id || !item.quantity || item.quantity < 1) {
                res
                    .status(400)
                    .json({ error: "Cada item necesita product_config_id y quantity >= 1" });
                return;
            }
        }
        const order = await (0, orderService_1.createOrder)({
            customer_name: body.customer_name,
            customer_email: body.customer_email,
            delivery_address: body.delivery_address,
            reference_notes: body.reference_notes ?? undefined,
            customer_phone: body.customer_phone,
            latitude: body.latitude,
            longitude: body.longitude,
        }, body.items);
        res.status(201).json(order);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : "Error desconocido";
        if (message.includes("no encontrado")) {
            res.status(404).json({ error: message });
            return;
        }
        console.error("Error creating order:", err);
        res.status(500).json({ error: "Error al crear la orden" });
    }
});
exports.default = router;
//# sourceMappingURL=orderRoutes.js.map