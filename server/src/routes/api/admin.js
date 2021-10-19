"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminRoutes = void 0;
const express_1 = __importDefault(require("express"));
const middleware_1 = require("../../middleware");
const schema_1 = require("../../schema");
exports.adminRoutes = express_1.default.Router();
exports.adminRoutes.use(middleware_1.isAdmin);
exports.adminRoutes.use(middleware_1.postParser);
async function changeAdminStatus(newAdminStatus, request, response) {
    const user = await schema_1.User.findOne({ email: (request.body.email || "").trim().toLowerCase() });
    if (!user) {
        response.status(400).json({
            error: "No existing user found with that email",
        });
        return;
    }
    user.admin = newAdminStatus;
    await user.save();
    response.json({
        success: true,
    });
}
exports.adminRoutes
    .route("/")
    .post(changeAdminStatus.bind(null, true))
    .delete(changeAdminStatus.bind(null, false));

//# sourceMappingURL=admin.js.map
