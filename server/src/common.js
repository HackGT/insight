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
exports.formatSize = exports.S3_ENGINE = exports.formatName = exports.mongoose = exports.wait = exports.COOKIE_OPTIONS = exports.VERSION_HASH = exports.VERSION_NUMBER = exports.PORT = exports.config = void 0;
const fs = __importStar(require("fs"));
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
exports.mongoose = mongoose_1.default;
const storage_1 = require("./storage");
class Config {
    constructor(fileName = "config.json") {
        this.secrets = {
            session: crypto.randomBytes(32).toString("hex"),
            apiKey: crypto.randomBytes(32).toString("hex"),
            groundTruth: {
                url: "https://login.hack.gt",
                id: "",
                secret: "",
            },
            registration: {
                url: "https://registration.hack.gt/graphql",
                key: "",
            },
            gcs: {
                region: "us",
                bucket: "",
                privateKey: "",
                clientEmail: "",
                uploadDirectory: "uploads",
            },
        };
        this.server = {
            isProduction: false,
            port: 3000,
            versionHash: fs.existsSync(".git") ? require("git-rev-sync").short() : "",
            cookieMaxAge: 1000 * 60 * 60 * 24 * 30 * 6,
            cookieSecureOnly: false,
            mongoURL: "mongodb://localhost/insight",
            defaultTimezone: "America/New_York",
            name: "HackGT Insight",
            adminDomains: [],
            admins: [],
        };
        this.sessionSecretSet = false;
        this.loadFromJSON(fileName);
        this.loadFromEnv();
    }
    loadFromJSON(fileName) {
        let config = null;
        try {
            config = JSON.parse(fs.readFileSync(path.resolve(__dirname, "./config", fileName), "utf8"));
        }
        catch (err) {
            if (err.code !== "ENOENT") {
                throw err;
            }
        }
        if (!config) {
            return;
        }
        if (config.secrets) {
            for (const key of Object.keys(config.secrets)) {
                this.secrets[key] = config.secrets[key];
            }
        }
        if (config.secrets && config.secrets.session) {
            this.sessionSecretSet = true;
        }
        if (config.server) {
            for (const key of Object.keys(config.server)) {
                this.server[key] = config.server[key];
            }
        }
    }
    loadFromEnv() {
        if (process.env.SESSION_SECRET) {
            this.secrets.session = process.env.SESSION_SECRET;
            this.sessionSecretSet = true;
        }
        if (process.env.API_KEY) {
            this.secrets.apiKey = process.env.API_KEY;
        }
        if (process.env.GROUND_TRUTH_URL) {
            this.secrets.groundTruth.url = process.env.GROUND_TRUTH_URL;
        }
        if (process.env.GROUND_TRUTH_ID) {
            this.secrets.groundTruth.id = process.env.GROUND_TRUTH_ID;
        }
        if (process.env.GROUND_TRUTH_SECRET) {
            this.secrets.groundTruth.secret = process.env.GROUND_TRUTH_SECRET;
        }
        if (process.env.REGISTRATION_URL) {
            this.secrets.registration.url = process.env.REGISTRATION_URL;
        }
        if (process.env.REGISTRATION_KEY) {
            this.secrets.registration.key = process.env.REGISTRATION_KEY;
        }
        if (process.env.GCS_REGION) {
            this.secrets.gcs.region = process.env.GCS_REGION;
        }
        if (process.env.GCS_BUCKET) {
            this.secrets.gcs.bucket = process.env.GCS_BUCKET;
        }
        if (process.env.GCS_CLIENT_EMAIL) {
            this.secrets.gcs.clientEmail = process.env.GCS_CLIENT_EMAIL;
        }
        if (process.env.GCS_PRIVATE_KEY) {
            this.secrets.gcs.privateKey = process.env.GCS_PRIVATE_KEY;
        }
        if (process.env.GCS_UPLOAD_DIRECTORY) {
            this.secrets.gcs.uploadDirectory = process.env.GCS_UPLOAD_DIRECTORY;
        }
        if (process.env.PRODUCTION && process.env.PRODUCTION.toLowerCase() === "true") {
            this.server.isProduction = true;
        }
        if (process.env.PORT) {
            const port = parseInt(process.env.PORT);
            if (!Number.isNaN(port) && port > 0) {
                this.server.port = port;
            }
        }
        if (process.env.VERSION_HASH) {
            this.server.versionHash = process.env.VERSION_HASH;
        }
        if (process.env.SOURCE_REV) {
            this.server.versionHash = process.env.SOURCE_REV;
        }
        if (process.env.SOURCE_VERSION) {
            this.server.versionHash = process.env.SOURCE_VERSION;
        }
        if (process.env.COOKIE_MAX_AGE) {
            const maxAge = parseInt(process.env.COOKIE_MAX_AGE);
            if (!Number.isNaN(maxAge) && maxAge > 0) {
                this.server.cookieMaxAge = maxAge;
            }
        }
        if (process.env.COOKIE_SECURE_ONLY && process.env.COOKIE_SECURE_ONLY.toLowerCase() === "true") {
            this.server.cookieSecureOnly = true;
        }
        if (process.env.MONGO_URL) {
            this.server.mongoURL = process.env.MONGO_URL;
        }
        if (process.env.DEFAULT_TIMEZONE) {
            this.server.defaultTimezone = process.env.DEFAULT_TIMEZONE;
        }
        if (process.env.NAME) {
            this.server.name = process.env.NAME;
        }
        if (process.env.ADMIN_DOMAINS) {
            this.server.adminDomains = process.env.ADMIN_DOMAINS.split(",");
        }
        if (process.env.ADMINS) {
            this.server.admins = process.env.ADMINS.split(",");
        }
    }
}
exports.config = new Config();
exports.PORT = exports.config.server.port;
exports.VERSION_NUMBER = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8")).version;
exports.VERSION_HASH = exports.config.server.versionHash;
exports.COOKIE_OPTIONS = {
    path: "/",
    maxAge: exports.config.server.cookieMaxAge,
    secure: exports.config.server.cookieSecureOnly,
    httpOnly: true,
};
function wait(ms) {
    return new Promise(resolve => {
        setTimeout(() => resolve(), ms);
    });
}
exports.wait = wait;
mongoose_1.default.connect(exports.config.server.mongoURL).catch(err => {
    throw err;
});
function formatName(user) {
    return `${user.name.preferred || user.name.first} ${user.name.last}`;
}
exports.formatName = formatName;
exports.S3_ENGINE = new storage_1.S3StorageEngine(exports.config.secrets.gcs);
function formatSize(size, binary = true) {
    const base = binary ? 1024 : 1000;
    const labels = binary ? ["bytes", "KiB", "MiB", "GiB", "TiB"] : ["bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(size) / Math.log(base));
    let formattedSize = `${(size / base ** i).toFixed(2)} ${labels[i]}`;
    if (size <= 0) {
        formattedSize = "0 bytes";
    }
    return formattedSize;
}
exports.formatSize = formatSize;

//# sourceMappingURL=common.js.map
