"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productService_1 = require("../services/productService");
const router = (0, express_1.Router)();
router.get("/", async (_req, res) => {
    try {
        const products = await (0, productService_1.getCatalogWithAvailability)();
        res.json(products);
    }
    catch (err) {
        console.error("Error fetching products:", err);
        res.status(500).json({ error: "Error al obtener productos" });
    }
});
exports.default = router;
//# sourceMappingURL=productRoutes.js.map