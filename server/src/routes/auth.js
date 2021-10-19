"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const crypto = __importStar(require("crypto"));
const url_1 = require("url");
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const strategies_1 = require("../auth/strategies");
const common_1 = require("../common");
exports.authRoutes = express_1.default.Router();
exports.authRoutes.get("/login", strategies_1.validateAndCacheHostName, (request, response, next) => {
    const callbackURL = (0, strategies_1.createLink)(request, "auth/login/callback");
    passport_1.default.authenticate("oauth2", { callbackURL })(request, response, next);
});
exports.authRoutes.get("/login/callback", strategies_1.validateAndCacheHostName, (request, response, next) => {
    const callbackURL = (0, strategies_1.createLink)(request, "auth/login/callback");
    if (request.query.error === "access_denied") {
        request.flash("error", "Authentication request was denied");
        response.redirect("/login");
        return;
    }
    passport_1.default.authenticate("oauth2", {
        failureRedirect: "/login",
        successReturnToOrRedirect: "/",
        callbackURL,
    })(request, response, next);
});
exports.authRoutes.get("/validatehost/:nonce", (request, response) => {
    const nonce = request.params.nonce || "";
    response.send(crypto.createHmac("sha256", common_1.config.secrets.session).update(nonce).digest().toString("hex"));
});
exports.authRoutes.route("/check").get((req, res) => {
    if (req.user) {
        return res.status(200).json(req.user);
    }
    return res.status(400).json({ success: false });
});
exports.authRoutes.all("/logout", async (request, response) => {
    const user = request.user;
    if (user) {
        const groundTruthURL = new url_1.URL(common_1.config.secrets.groundTruth.url);
        try {
            await strategies_1.GroundTruthStrategy.apiRequest("POST", new url_1.URL("/api/user/logout", groundTruthURL).toString(), user.token || "");
        }
        catch (err) {
            console.error(err);
        }
        request.logout();
    }
    if (request.session) {
        request.session.loginAction = "render";
    }
    response.redirect("/login");
});

//# sourceMappingURL=auth.js.map
