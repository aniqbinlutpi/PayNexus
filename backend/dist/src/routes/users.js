"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Get current user profile
router.get('/profile', async (req, res, next) => {
    try {
        res.json({
            success: true,
            data: {
                user: req.user,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map