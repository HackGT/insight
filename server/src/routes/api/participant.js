"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.participantRoutes = void 0;
const express_1 = __importDefault(require("express"));
const middleware_1 = require("../../middleware");
const schema_1 = require("../../schema");
const jobs_1 = require("../../jobs");
exports.participantRoutes = express_1.default.Router();
exports.participantRoutes.route("/").get(middleware_1.authenticateWithRedirect, async (request, response) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const user = request.user;
    const participant = await schema_1.Participant.findOne({ uuid: user.uuid });
    const resumeParseJobsUnsorted = await jobs_1.agenda.jobs({
        "name": "parse-resume",
        "data.uuid": user.uuid,
    });
    const resumeParseJobs = resumeParseJobsUnsorted.sort((a, b) => (a === null || a === void 0 ? void 0 : a.attrs.lastFinishedAt) > (b === null || b === void 0 ? void 0 : b.attrs.lastFinishedAt) ? -1 : 1);
    let invalidResume = false;
    if ((_a = resumeParseJobs[0]) === null || _a === void 0 ? void 0 : _a.attrs.failReason) {
        invalidResume = true;
    }
    let formattedParticipant = null;
    if (participant) {
        formattedParticipant = {
            name: participant.name,
            email: participant.email,
            school: (_b = participant.university) !== null && _b !== void 0 ? _b : "N/A",
            major: (_c = participant.major) !== null && _c !== void 0 ? _c : "N/A",
            resume: invalidResume ? undefined : (_d = participant.resume) === null || _d === void 0 ? void 0 : _d.path,
            resumeText: (_g = (_f = (_e = participant.resume) === null || _e === void 0 ? void 0 : _e.extractedText) === null || _f === void 0 ? void 0 : _f.trim().replace(/(\r?\n){2,}/g, "\n")) !== null && _g !== void 0 ? _g : "Your resume is currently being parsed. Check back in a few minutes.",
            resumeFailReason: (_h = resumeParseJobs[0]) === null || _h === void 0 ? void 0 : _h.attrs.failReason,
        };
    }
    response.json(formattedParticipant);
});

//# sourceMappingURL=participant.js.map
