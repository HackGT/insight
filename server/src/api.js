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
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRoutes = void 0;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const express = __importStar(require("express"));
const schema_1 = require("./schema");
const middleware_1 = require("./middleware");
const common_1 = require("./common");
const jobs_1 = require("./jobs");
const admin_1 = require("./routes/api/admin");
const scanner_1 = require("./routes/api/scanner");
const company_1 = require("./routes/api/company");
const visit_1 = require("./routes/api/visit");
const participant_1 = require("./routes/api/participant");
exports.apiRoutes = express.Router();
exports.apiRoutes.use("/admin", middleware_1.isAdmin, middleware_1.postParser, admin_1.adminRoutes);
exports.apiRoutes.use("/scanner", scanner_1.scannerRoutes);
exports.apiRoutes.use("/company", company_1.companyRoutes);
exports.apiRoutes.use("/visit", visit_1.visitRoutes);
exports.apiRoutes.use("/participant", participant_1.participantRoutes);
exports.apiRoutes.route("/authorize").get(middleware_1.authenticateWithRedirect, async (request, response) => {
    const user = request.user;
    const time = Date.now();
    response.json({
        success: true,
        uuid: user.uuid,
        time: time.toString(),
        token: crypto
            .createHmac("sha256", common_1.config.secrets.apiKey + time)
            .update(user.uuid)
            .digest()
            .toString("hex"),
    });
});
exports.apiRoutes
    .route("/export")
    .get(middleware_1.apiAuth, async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    const jobID = request.query.id || "";
    if (!jobID) {
        response.status(404).send("Invalid download ID");
    }
    const filetype = request.query.filetype || "";
    if (filetype !== "zip" && filetype !== "csv") {
        response.status(400).send();
        return;
    }
    const file = path.join(os.tmpdir(), `${jobID}.${filetype}`);
    const stream = fs.createReadStream(file);
    stream.on("end", async () => {
        await fs.promises.unlink(file);
    });
    stream.on("error", err => {
        console.error(err);
        response.status(404).send("Invalid download ID");
    });
    response.attachment(`export.${filetype}`);
    stream.pipe(response);
})
    .post(middleware_1.apiAuth, middleware_1.postParser, async (request, response) => {
    var _a;
    const user = request.user;
    const type = request.body.type || "";
    const filetype = request.body.filetype || "";
    if (filetype !== "zip" && filetype !== "csv") {
        response.json({
            error: "Invalid download file type",
        });
        return;
    }
    const jobID = crypto.randomBytes(16).toString("hex");
    let participantIDs = [];
    if (type === "all") {
        participantIDs = (await schema_1.Participant.find().sort({ name: 1 })).map(p => p.uuid);
    }
    else if (type === "visited") {
        if (!((_a = user === null || user === void 0 ? void 0 : user.company) === null || _a === void 0 ? void 0 : _a.verified)) {
            response.json({
                error: "Must be authenticated as an employer if downloading visited resumes",
            });
            return;
        }
        participantIDs = (await schema_1.Visit.aggregate([
            { $match: { company: user.company.name } },
            { $sort: { time: -1 } },
        ])).map(v => v.participant);
    }
    else if (type === "selected") {
        participantIDs = JSON.parse(request.body.ids || "[]");
    }
    else {
        response.json({
            error: "Invalid download request type",
        });
        return;
    }
    const jobName = filetype === "csv" ? "export-csv" : "export";
    await jobs_1.agenda.now(jobName, {
        id: jobID,
        participantIDs,
        requesterUUID: user === null || user === void 0 ? void 0 : user.uuid,
        requesterName: user === null || user === void 0 ? void 0 : user.name,
    });
    response.json({ success: true, id: jobID });
});
exports.apiRoutes.route("/search").get(middleware_1.isAnEmployer, async (request, response) => {
    const user = request.user;
    const query = String(request.query.q) || "";
    const PAGE_SIZE = 20;
    let page = parseInt(String(request.query.page || ""));
    if (Number.isNaN(page) || page < 0) {
        page = 0;
    }
    let filterTags = [];
    try {
        const json = JSON.parse(String(request.query.filter || ""));
        if (Array.isArray(json))
            filterTags = json;
    }
    catch (_a) { }
    const pipeline = [];
    if (query) {
        pipeline.push({ $match: { $text: { $search: query } } });
        pipeline.push({ $sort: { score: { $meta: "textScore" } } });
    }
    pipeline.push({
        $lookup: {
            from: "visits",
            localField: "uuid",
            foreignField: "participant",
            as: "visitData",
        },
    });
    if (filterTags.length > 0) {
        pipeline.push({ $match: { "visitData.tags": { $elemMatch: { $in: filterTags } } } });
    }
    const total = (await schema_1.Participant.aggregate(pipeline)).length;
    pipeline.push({ $skip: page * PAGE_SIZE });
    pipeline.push({ $limit: PAGE_SIZE });
    pipeline.push({ $project: { "resume.extractedText": 0 } });
    let participants = await schema_1.Participant.aggregate(pipeline);
    participants = participants.map(p => {
        var _a;
        return ({
            ...p,
            visitData: (_a = p.visitData.filter((v) => { var _a; return v.company === ((_a = user.company) === null || _a === void 0 ? void 0 : _a.name); })[0]) !== null && _a !== void 0 ? _a : null,
        });
    });
    response.json({
        success: true,
        page,
        pageSize: PAGE_SIZE,
        total,
        participants,
    });
});
exports.apiRoutes.route("/tags").get(middleware_1.isAnEmployer, async (request, response) => {
    var _a, _b, _c;
    const user = request.user;
    if (!((_a = user === null || user === void 0 ? void 0 : user.company) === null || _a === void 0 ? void 0 : _a.verified)) {
        response.status(403).send();
        return;
    }
    const tagResults = await schema_1.Visit.aggregate([
        { $match: { company: user.company.name } },
        { $unwind: "$tags" },
        { $group: { _id: "tags", tags: { $addToSet: "$tags" } } },
    ]);
    let tags = (_c = (_b = tagResults[0]) === null || _b === void 0 ? void 0 : _b.tags) !== null && _c !== void 0 ? _c : [];
    tags = tags.sort();
    response.json({
        success: true,
        tags,
    });
});
exports.apiRoutes.route("/adminInfo").get(middleware_1.isAdmin, async (request, response) => {
    response.json({
        adminDomains: common_1.config.server.adminDomains,
        adminEmails: common_1.config.server.admins,
        currentAdmins: await schema_1.User.find({ admin: true }).sort("name.last"),
    });
});

//# sourceMappingURL=api.js.map
