"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMissingResumeJobHandler = void 0;
const _1 = require(".");
const schema_1 = require("../schema");
const parseMissingResumeJobHandler = async () => {
    const participants = await schema_1.Participant.find({ "resume.extractedText": { $exists: false } });
    await Promise.all(participants.map(participant => _1.agenda.now("parse-resume", { uuid: participant.uuid, type: "Missing extracted text" })));
};
exports.parseMissingResumeJobHandler = parseMissingResumeJobHandler;

//# sourceMappingURL=parseMissingResume.js.map
