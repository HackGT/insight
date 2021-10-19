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
exports.createLink = exports.validateAndCacheHostName = exports.GroundTruthStrategy = void 0;
const crypto = __importStar(require("crypto"));
const http = __importStar(require("http"));
const https = __importStar(require("https"));
const url_1 = require("url");
const request_1 = __importDefault(require("request"));
const passport_oauth2_1 = require("passport-oauth2");
const common_1 = require("../common");
const schema_1 = require("../schema");
const registration_1 = require("../registration");
class GroundTruthStrategy extends passport_oauth2_1.Strategy {
    constructor(url) {
        const secrets = common_1.config.secrets.groundTruth;
        if (!secrets || !secrets.id || !secrets.secret) {
            throw new Error(`Client ID or secret not configured in config.json or environment variables for Ground Truth`);
        }
        const options = {
            authorizationURL: new url_1.URL("/oauth/authorize", url).toString(),
            tokenURL: new url_1.URL("/oauth/token", url).toString(),
            clientID: secrets.id,
            clientSecret: secrets.secret,
            passReqToCallback: true,
        };
        super(options, GroundTruthStrategy.passportCallback);
        this.url = url;
    }
    static async apiRequest(method, url, token) {
        return new Promise((resolve, reject) => {
            (0, request_1.default)(url, {
                method,
                auth: {
                    sendImmediately: true,
                    bearer: token,
                },
            }, (error, response, body) => {
                if (error) {
                    reject(error);
                    return;
                }
                try {
                    resolve(JSON.parse(body));
                }
                catch (_a) {
                    reject(new Error(`Invalid JSON: ${body}`));
                }
            });
        });
    }
    static get defaultUserProperties() {
        return {
            admin: false,
            company: null,
            resume: null,
        };
    }
    userProfile(accessToken, done) {
        GroundTruthStrategy.apiRequest("GET", new url_1.URL("/api/user", this.url).toString(), accessToken)
            .then(data => {
            try {
                const profile = {
                    ...data,
                    token: accessToken,
                };
                done(null, profile);
            }
            catch (err) {
                return done(err);
            }
        })
            .catch(err => {
            done(err);
        });
    }
    static async passportCallback(request, accessToken, refreshToken, profile, done) {
        let user = await schema_1.User.findOne({ uuid: profile.uuid });
        if (!user) {
            const participant = await (0, registration_1.isParticipant)(profile.uuid);
            user = (0, schema_1.createNew)(schema_1.User, {
                ...GroundTruthStrategy.defaultUserProperties,
                ...profile,
                name: profile.nameParts,
                type: participant ? "participant" : "employer",
            });
        }
        else {
            user.token = accessToken;
        }
        const domain = user.email.split("@").pop();
        if (domain && common_1.config.server.adminDomains.includes(domain)) {
            user.admin = true;
        }
        if (common_1.config.server.admins.includes(profile.email)) {
            user.admin = true;
        }
        await user.save();
        done(null, user);
    }
}
exports.GroundTruthStrategy = GroundTruthStrategy;
function getExternalPort(request) {
    function defaultPort() {
        return request.protocol === "http" ? 80 : 443;
    }
    const { host } = request.headers;
    if (!host || Array.isArray(host)) {
        return defaultPort();
    }
    const offset = host[0] === "[" ? host.indexOf("]") + 1 : 0;
    const index = host.indexOf(":", offset);
    if (index !== -1) {
        return parseInt(host.substring(index + 1), 10);
    }
    return defaultPort();
}
const validatedHostNames = [];
function validateAndCacheHostName(request, response, next) {
    if (validatedHostNames.find(hostname => hostname === request.hostname)) {
        next();
        return;
    }
    const nonce = crypto.randomBytes(64).toString("hex");
    function callback(message) {
        if (message.statusCode !== 200) {
            console.error(`Got non-OK status code when validating hostname: ${request.hostname}`);
            message.resume();
            return;
        }
        message.setEncoding("utf8");
        let data = "";
        message.on("data", chunk => (data += chunk));
        message.on("end", () => {
            const localHMAC = crypto
                .createHmac("sha256", common_1.config.secrets.session)
                .update(nonce)
                .digest()
                .toString("hex");
            if (localHMAC === data) {
                validatedHostNames.push(request.hostname);
                next();
            }
            else {
                console.error(`Got invalid HMAC when validating hostname: ${request.hostname}`);
            }
        });
    }
    function onError(err) {
        console.error(`Error when validating hostname: ${request.hostname}`, err);
    }
    if (request.protocol === "http") {
        http
            .get(`http://${request.hostname}:${getExternalPort(request)}/auth/validatehost/${nonce}`, callback)
            .on("error", onError);
    }
    else {
        https
            .get(`https://${request.hostname}:${getExternalPort(request)}/auth/validatehost/${nonce}`, callback)
            .on("error", onError);
    }
}
exports.validateAndCacheHostName = validateAndCacheHostName;
function createLink(request, link) {
    if (link[0] === "/") {
        link = link.substring(1);
    }
    if ((request.secure && getExternalPort(request) === 443) ||
        (!request.secure && getExternalPort(request) === 80)) {
        return `http${request.secure ? "s" : ""}://${request.hostname}/${link}`;
    }
    return `http${request.secure ? "s" : ""}://${request.hostname}:${getExternalPort(request)}/${link}`;
}
exports.createLink = createLink;

//# sourceMappingURL=strategies.js.map
