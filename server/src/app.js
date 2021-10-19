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
exports.webSocketServer = exports.app = void 0;
require("source-map-support/register");
const http = __importStar(require("http"));
const express_1 = __importDefault(require("express"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const chalk = __importStar(require("chalk"));
const path_1 = __importDefault(require("path"));
const morgan_1 = __importDefault(require("morgan"));
const connect_flash_1 = __importDefault(require("connect-flash"));
const Sentry = __importStar(require("@sentry/browser"));
const tracing_1 = require("@sentry/tracing");
const common_1 = require("./common");
exports.app = (0, express_1.default)();
Sentry.init({
    dsn: "https://17e4bfb7ba4e4518b2d9653d92f2d2db@o429043.ingest.sentry.io/5459941",
    integrations: [new tracing_1.Integrations.BrowserTracing()],
    tracesSampleRate: 0.8,
});
exports.app.use((0, compression_1.default)());
const cookieParserInstance = (0, cookie_parser_1.default)(undefined, common_1.COOKIE_OPTIONS);
exports.app.use(cookieParserInstance);
morgan_1.default.format("hackgt", (tokens, request, response) => {
    let statusColorizer = input => input;
    if (response.statusCode >= 500) {
        statusColorizer = chalk.default.red;
    }
    else if (response.statusCode >= 400) {
        statusColorizer = chalk.default.yellow;
    }
    else if (response.statusCode >= 300) {
        statusColorizer = chalk.default.cyan;
    }
    else if (response.statusCode >= 200) {
        statusColorizer = chalk.default.green;
    }
    return [
        tokens.date(request, response, "iso"),
        tokens["remote-addr"](request, response),
        tokens.method(request, response),
        tokens.url(request, response),
        statusColorizer(tokens.status(request, response) || ""),
        tokens["response-time"](request, response),
        "ms",
        "-",
        tokens.res(request, response, "content-length"),
    ].join(" ");
});
exports.app.use((0, morgan_1.default)("hackgt"));
exports.app.use((0, connect_flash_1.default)());
exports.app.use(express_1.default.json());
process.on("unhandledRejection", err => {
    throw err;
});
require("./auth/auth");
const auth_1 = require("./routes/auth");
exports.app.use("/auth", auth_1.authRoutes);
exports.app.route("/version").get((request, response) => {
    response.json({
        version: common_1.VERSION_NUMBER,
        hash: common_1.VERSION_HASH,
        node: process.version,
    });
});
const api_1 = require("./api");
exports.app.use("/api", api_1.apiRoutes);
const uploads_1 = require("./routes/uploads");
exports.app.use("/uploads", uploads_1.uploadsRoutes);
const jobs_1 = require("./jobs");
exports.app.use("/admin/tasks", jobs_1.taskDashboardRoutes);
(0, jobs_1.startTaskEngine)().catch(err => {
    throw err;
});
const middleware_1 = require("./middleware");
exports.app.use(middleware_1.authenticateWithRedirect, express_1.default.static(path_1.default.join(__dirname, "../../client/build")));
exports.app.get("*", middleware_1.authenticateWithRedirect, (req, res) => {
    res.sendFile(path_1.default.join(__dirname, "../../client/build", "index.html"));
});
const server = http.createServer(exports.app);
const websocket_1 = require("./websocket");
exports.webSocketServer = new websocket_1.WebSocketServer(server);
server.listen(common_1.PORT, () => {
    console.log(`Insight system v${common_1.VERSION_NUMBER} @ ${common_1.VERSION_HASH} started on port ${common_1.PORT}`);
});

//# sourceMappingURL=app.js.map
