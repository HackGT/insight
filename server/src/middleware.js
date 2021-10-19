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
exports.arduinoAuth = exports.isAnEmployer = exports.isAdminOrEmployee = exports.isAdmin = exports.apiAuth = exports.authenticateWithRedirect = exports.uploadHandler = exports.MAX_FILE_SIZE = exports.postParser = void 0;
const body_parser_1 = __importDefault(require("body-parser"));
const multer_1 = __importDefault(require("multer"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const common_1 = require("./common");
exports.postParser = body_parser_1.default.urlencoded({
    extended: false,
});
exports.MAX_FILE_SIZE = 50000000;
exports.uploadHandler = (0, multer_1.default)({
    storage: multer_1.default.diskStorage({
        destination: (req, file, cb) => {
            cb(null, os.tmpdir());
        },
        filename: (req, file, cb) => {
            cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
        },
    }),
    limits: {
        fileSize: exports.MAX_FILE_SIZE,
        files: 1,
    },
});
async function authenticateWithRedirect(request, response, next) {
    response.setHeader("Cache-Control", "private");
    const user = request.user;
    if (!request.isAuthenticated() || !user) {
        if (request.session) {
            request.session.returnTo = request.originalUrl;
        }
        response.redirect("/auth/login");
    }
    else {
        next();
    }
}
exports.authenticateWithRedirect = authenticateWithRedirect;
function apiAuth(request, response, next) {
    response.setHeader("Cache-Control", "private");
    const user = request.user;
    const auth = request.headers.authorization;
    if (auth && typeof auth === "string" && auth.indexOf(" ") > -1) {
        const key = Buffer.from(auth.split(" ")[1], "base64").toString();
        if (key === common_1.config.secrets.apiKey) {
            next();
        }
        else {
            response.status(401).json({
                error: "Invalid API key",
            });
        }
    }
    else if (!request.isAuthenticated() || !user) {
        response.status(401).json({
            error: "You must log in to access this endpoint",
        });
    }
    else if ((!user.company || !user.company.verified) && !user.admin) {
        response.status(403).json({
            error: "You are not permitted to access this endpoint",
        });
    }
    else {
        next();
    }
}
exports.apiAuth = apiAuth;
function isAdmin(request, response, next) {
    authenticateWithRedirect(request, response, (err) => {
        if (err) {
            next(err);
            return;
        }
        if (!request.user || !request.user.admin) {
            response.redirect("/");
            return;
        }
        next();
    });
}
exports.isAdmin = isAdmin;
function isAdminOrEmployee(request, response, next) {
    authenticateWithRedirect(request, response, (err) => {
        if (err) {
            next(err);
            return;
        }
        const user = request.user;
        if (user) {
            if (user.company && user.company.verified && user.company.name === request.params.company) {
                next();
                return;
            }
            if (user.admin) {
                next();
                return;
            }
        }
        response.redirect("/");
    });
}
exports.isAdminOrEmployee = isAdminOrEmployee;
function isAnEmployer(request, response, next) {
    authenticateWithRedirect(request, response, (err) => {
        var _a;
        if (err) {
            next(err);
            return;
        }
        if (!request.user || request.user.type !== "employer") {
            response.redirect("/");
            return;
        }
        const user = request.user;
        if (!((_a = user === null || user === void 0 ? void 0 : user.company) === null || _a === void 0 ? void 0 : _a.verified)) {
            response.redirect("/");
            return;
        }
        next();
    });
}
exports.isAnEmployer = isAnEmployer;
function arduinoAuth(request, response, next) {
    const bodyText = request.body.toString("utf-8").split("\n");
    const auth = bodyText.shift();
    const message = bodyText.join("\n");
    if (!auth || auth.indexOf(" ") === -1) {
        console.log("Invalid authorization:", auth);
        response.status(401).json({ error: "Invalid authorization" });
        return;
    }
    const hash = auth.split(" ")[0];
    const time = parseInt(auth.split(" ")[1]);
    const correctHash = crypto
        .createHmac("sha256", common_1.config.secrets.apiKey + time.toString())
        .update(message)
        .digest()
        .toString("hex");
    if (hash !== correctHash) {
        console.log("Invalid HMAC hash:", hash, correctHash);
        response.status(401).json({ error: "Invalid HMAC hash" });
        return;
    }
    if (isNaN(time) || Math.abs(Date.now() - time * 1000) > 60000) {
        console.log("Expired or invalid HMAC hash:", time * 1000, Date.now());
    }
    request.body = message;
    next();
}
exports.arduinoAuth = arduinoAuth;

//# sourceMappingURL=middleware.js.map
