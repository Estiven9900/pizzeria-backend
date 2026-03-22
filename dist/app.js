"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const frontendPort = process.env.FRONTEND_PORT ?? "5173";
app.use((0, cors_1.default)({
    origin: `http://localhost:${frontendPort}`,
}));
app.use(express_1.default.json());
app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
});
const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
//# sourceMappingURL=app.js.map