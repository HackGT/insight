"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.visitRoutes = void 0;
const express_1 = __importDefault(require("express"));
const app_1 = require("../../app");
const common_1 = require("../../common");
const middleware_1 = require("../../middleware");
const schema_1 = require("../../schema");
async function getVisit(request, response) {
    var _a;
    const user = request.user;
    if (!((_a = user === null || user === void 0 ? void 0 : user.company) === null || _a === void 0 ? void 0 : _a.verified)) {
        response.status(403).send();
        return null;
    }
    const visit = await schema_1.Visit.findById(request.params.id);
    if (!visit || visit.company !== user.company.name) {
        response.status(403).json({
            error: "Invalid visit ID",
        });
        return null;
    }
    const participant = await schema_1.Participant.findOne({ uuid: visit.participant });
    if (!participant) {
        response.status(500).json({
            error: "Visit does not correspond to a valid participant",
        });
        return null;
    }
    return { visit, participant };
}
exports.visitRoutes = express_1.default.Router();
exports.visitRoutes
    .route("/:id/tag")
    .get(middleware_1.isAnEmployer, async (request, response) => {
    const data = await getVisit(request, response);
    if (!data)
        return;
    const { visit } = data;
    response.json({
        success: true,
        tags: visit.tags,
    });
})
    .post(middleware_1.isAnEmployer, middleware_1.postParser, async (request, response) => {
    const data = await getVisit(request, response);
    if (!data)
        return;
    const { participant, visit } = data;
    const tag = (request.body.tag || "").trim().toLowerCase();
    if (!tag) {
        response.json({
            error: "Missing tag",
        });
        return;
    }
    const tags = new Set(visit.tags);
    tags.add(tag);
    visit.tags = [...tags];
    await visit.save();
    await app_1.webSocketServer.reloadParticipant(visit.company, participant, visit);
    response.json({ success: true });
})
    .delete(middleware_1.isAnEmployer, middleware_1.postParser, async (request, response) => {
    const data = await getVisit(request, response);
    if (!data)
        return;
    const { participant, visit } = data;
    const tag = (request.body.tag || "").trim().toLowerCase();
    if (!tag) {
        response.json({
            error: "Missing tag",
        });
        return;
    }
    visit.tags = visit.tags.filter(t => t !== tag);
    await visit.save();
    await app_1.webSocketServer.reloadParticipant(visit.company, participant, visit);
    response.json({ success: true });
});
exports.visitRoutes
    .route("/:id/note")
    .post(middleware_1.isAnEmployer, middleware_1.postParser, async (request, response) => {
    const data = await getVisit(request, response);
    if (!data)
        return;
    const { participant, visit } = data;
    const note = (request.body.note || "").trim();
    if (!note) {
        response.json({
            error: "Missing note",
        });
        return;
    }
    visit.notes.push(note);
    await visit.save();
    await app_1.webSocketServer.reloadParticipant(visit.company, participant, visit);
    response.json({ success: true });
})
    .delete(middleware_1.isAnEmployer, middleware_1.postParser, async (request, response) => {
    const data = await getVisit(request, response);
    if (!data)
        return;
    const { participant, visit } = data;
    const note = (request.body.note || "").trim();
    if (!note) {
        response.json({
            error: "Missing note",
        });
        return;
    }
    visit.notes = visit.notes.filter(n => n !== note);
    await visit.save();
    await app_1.webSocketServer.reloadParticipant(visit.company, participant, visit);
    response.json({ success: true });
});
exports.visitRoutes
    .route("/:id")
    .get(middleware_1.isAnEmployer, async (request, response) => {
    var _a;
    const user = request.user;
    if (!((_a = user === null || user === void 0 ? void 0 : user.company) === null || _a === void 0 ? void 0 : _a.verified)) {
        response.status(403).send();
        return;
    }
    const participant = await schema_1.Participant.findOne({ uuid: request.params.id });
    if (!participant) {
        response.status(404).json({
            error: "Invalid participant ID",
        });
        return;
    }
    const visit = await schema_1.Visit.findOne({
        participant: request.params.id,
        company: user.company.name,
    });
    if (!visit) {
        response.status(404).json({
            error: "No visit found for that participant at your company",
        });
        return;
    }
    response.json({
        success: true,
        visit: visit.toObject(),
        participant: participant.toObject(),
    });
})
    .delete(middleware_1.isAnEmployer, async (request, response) => {
    const data = await getVisit(request, response);
    if (!data)
        return;
    const { participant, visit } = data;
    const user = request.user;
    const company = await schema_1.Company.findOne({ name: user.company.name });
    if (!company) {
        response.json({
            error: "Could not find company for user",
        });
        return;
    }
    company.visits = company.visits.filter(v => !v.equals(visit._id));
    await Promise.all([company.save(), visit.remove()]);
    app_1.webSocketServer.reloadParticipant(company.name, participant, undefined);
    response.json({ success: true });
});
exports.visitRoutes
    .route("/")
    .get(middleware_1.isAnEmployer, async (request, response) => {
    var _a;
    const user = request.user;
    if (!((_a = user === null || user === void 0 ? void 0 : user.company) === null || _a === void 0 ? void 0 : _a.verified)) {
        response.status(403).send();
        return;
    }
    const PAGE_SIZE = 20;
    let page = parseInt(request.query.page);
    if (Number.isNaN(page) || page < 0) {
        page = 0;
    }
    const total = await schema_1.Visit.countDocuments({ company: user.company.name });
    const visits = await schema_1.Visit.aggregate([
        { $match: { company: user.company.name } },
        { $sort: { time: -1 } },
        { $skip: page * PAGE_SIZE },
        { $limit: PAGE_SIZE },
        {
            $lookup: {
                from: "participants",
                localField: "participant",
                foreignField: "uuid",
                as: "participantData",
            },
        },
        { $unwind: { path: "$participantData" } },
        { $project: { "participantData.resume.extractedText": 0 } },
    ]);
    response.json({
        success: true,
        page,
        pageSize: PAGE_SIZE,
        total,
        visits,
    });
})
    .post(middleware_1.apiAuth, middleware_1.postParser, async (request, response) => {
    var _a, _b;
    const scannerID = (request.body.scanner || "").trim().toLowerCase();
    const uuid = (request.body.uuid || "").trim().toLowerCase();
    let scanningEmployees = [];
    if (scannerID) {
        scanningEmployees = await schema_1.User.find({
            "company.verified": true,
            "company.scannerIDs": scannerID,
        });
        if (scanningEmployees.length === 0) {
            response.status(400).json({
                error: "Invalid scanner ID",
            });
            return;
        }
    }
    else {
        const user = request.user;
        if (!((_a = user === null || user === void 0 ? void 0 : user.company) === null || _a === void 0 ? void 0 : _a.verified)) {
            response.status(400).json({
                error: "Unauthorized user",
            });
            return;
        }
        scanningEmployees.push(user);
    }
    const company = await schema_1.Company.findOne({ name: (_b = scanningEmployees[0].company) === null || _b === void 0 ? void 0 : _b.name });
    if (!company) {
        response.status(400).json({
            error: "Could not match scanner to company",
        });
        return;
    }
    const participant = await schema_1.Participant.findOne({ uuid });
    if (!participant) {
        response.status(400).json({
            error: "Invalid UUID",
        });
        return;
    }
    let visit = await schema_1.Visit.findOne({ company: company.name, participant: participant.uuid });
    if (visit) {
        visit.time = new Date();
    }
    else {
        visit = (0, schema_1.createNew)(schema_1.Visit, {
            participant: participant.uuid,
            company: company.name,
            tags: [],
            notes: [],
            time: new Date(),
            scannerID: scannerID || null,
            employees: scanningEmployees.map(employee => ({
                uuid: employee.uuid,
                name: (0, common_1.formatName)(employee),
                email: employee.email,
            })),
        });
        company.visits.push(visit._id);
    }
    await visit.save();
    await company.save();
    if (visit.scannerID) {
        for (const employee of scanningEmployees) {
            app_1.webSocketServer.visitNotification(employee.uuid, participant, visit);
        }
    }
    app_1.webSocketServer.reloadParticipant(company.name, participant, visit);
    response.json({
        success: true,
    });
});

//# sourceMappingURL=visit.js.map
