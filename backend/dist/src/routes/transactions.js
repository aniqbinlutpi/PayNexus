"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Placeholder for transaction history and management
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Transaction routes - Coming soon',
        data: [],
    });
});
exports.default = router;
//# sourceMappingURL=transactions.js.map