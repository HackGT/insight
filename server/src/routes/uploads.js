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
exports.uploadsRoutes = void 0;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const express_1 = __importDefault(require("express"));
const common_1 = require("../common");
const middleware_1 = require("../middleware");
const schema_1 = require("../schema");
const jobs_1 = require("../jobs");
function publicLink(file) {
    file = path.basename(file);
    const time = Date.now();
    const key = crypto
        .createHmac("sha256", common_1.config.secrets.apiKey + time)
        .update(file)
        .digest()
        .toString("hex");
    return `${file}?key=${key}&time=${time}`;
}
exports.uploadsRoutes = express_1.default.Router();
exports.uploadsRoutes.route("/:file").get(async (request, response) => {
    var _a;
    response.setHeader("Cache-Control", "no-store");
    const user = request.user;
    const key = request.query.key || "";
    const time = parseInt(request.query.time || "");
    const correctHash = crypto
        .createHmac("sha256", common_1.config.secrets.apiKey + time)
        .update(request.params.file)
        .digest()
        .toString("hex");
    if (!user && key !== correctHash) {
        response.status(401).send();
        return;
    }
    if (user && user.type !== "employer" && !user.admin) {
        const participant = await schema_1.Participant.findOne({ uuid: user.uuid });
        if (!participant ||
            !((_a = participant.resume) === null || _a === void 0 ? void 0 : _a.path) ||
            path.basename(participant.resume.path) !== request.params.file) {
            response.status(403).send();
            return;
        }
    }
    if (request.query.public === "true") {
        response.json({
            success: true,
            link: publicLink(request.params.file),
        });
        return;
    }
    console.log(`${request.params.file} requested`);
    try {
        const stream = await common_1.S3_ENGINE.readFile(request.params.file);
        console.log(stream);
        if (request.query.download === "true") {
            response.attachment(request.params.file);
        }
        stream.pipe(response);
    }
    catch (_b) {
        response.status(404).send("The requested file could not be found");
    }
});
exports.uploadsRoutes
    .route("/")
    .post(middleware_1.authenticateWithRedirect, middleware_1.uploadHandler.single("resume"), async (request, response) => {
    var _a;
    const user = await schema_1.User.findOne({ uuid: request.user.uuid });
    const participant = await schema_1.Participant.findOne({ uuid: user ? user.uuid : "" });
    const resume = request.file;
    if (!resume) {
        response.status(400).send({ error: true, message: "No resume sent" });
        return;
    }
    if (!user || !participant || user.type !== "participant") {
        if (resume) {
            await fs.promises.unlink(resume.path);
        }
        response.status(403).send();
        return;
    }
    if ((_a = participant.resume) === null || _a === void 0 ? void 0 : _a.path) {
        try {
            await common_1.S3_ENGINE.deleteFile(participant.resume.path);
        }
        catch (err) {
            console.error("Could not delete existing resume from S3:", err);
        }
    }
    try {
        await common_1.S3_ENGINE.saveFile(resume.path, resume.filename);
    }
    catch (err) {
        console.error("Could not delete existing resume from S3:", err);
        response.status(403).send();
        return;
    }
    await fs.promises.unlink(resume.path);
    participant.resume = {
        path: `uploads/${resume.filename}`,
        size: resume.size,
    };
    await participant.save();
    await jobs_1.agenda.now("parse-resume", { uuid: participant.uuid });
    response.status(201).send();
});

//# sourceMappingURL=uploads.js.map
