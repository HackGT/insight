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
exports.parseResumeJobHandler = void 0;
const path = __importStar(require("path"));
const common_1 = require("../common");
const schema_1 = require("../schema");
const parseResumeJobHandler = async (job) => {
    const { uuid } = job.attrs.data;
    const participant = await schema_1.Participant.findOne({ uuid });
    if (!participant) {
        job.fail(`Participant does not exist`);
        await job.save();
        return;
    }
    if (!participant.resume || !participant.resume.path) {
        job.fail(`No resume defined`);
        await job.save();
        return;
    }
    let textResult;
    try {
        textResult = await common_1.S3_ENGINE.getText(path.basename(participant.resume.path));
    }
    catch (err) {
        console.log("Error: Cannot parse resume", err);
    }
    if (textResult === null) {
        job.fail(`Unsupported format: ${participant.resume.path}`);
        await job.save();
        return;
    }
    participant.resume.extractedText = textResult;
    await participant.save();
};
exports.parseResumeJobHandler = parseResumeJobHandler;

//# sourceMappingURL=parseResume.js.map
