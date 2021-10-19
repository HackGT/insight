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
exports.exportCsvJobHandler = void 0;
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const json2csv = __importStar(require("json2csv"));
const app_1 = require("../app");
const schema_1 = require("../schema");
const exportCsvJobHandler = async (job) => {
    const startTime = Date.now();
    const { requesterUUID } = job.attrs.data;
    const { participantIDs } = job.attrs.data;
    const participants = await schema_1.Participant.aggregate([
        { $match: { $and: [{ uuid: { $in: participantIDs } }, { gdpr: { $ne: null } }] } },
        { $sort: { name: 1 } },
        {
            $lookup: {
                from: "visits",
                localField: "uuid",
                foreignField: "participant",
                as: "visitData",
            },
        },
        { $unwind: { path: "$visitData", preserveNullAndEmptyArrays: true } },
    ]);
    const exportFile = path.join(os.tmpdir(), `${job.attrs.data.id}.csv`);
    const output = fs.createWriteStream(exportFile);
    const fields = ["Name", "Email", "Major", "School", "Github"];
    const data = [];
    for (const [i, participant] of participants.entries()) {
        if (requesterUUID) {
            const percentage = Math.round((i / participants.length) * 100);
            app_1.webSocketServer.exportUpdate(requesterUUID, percentage);
        }
        data.push({
            Name: participant.name,
            Email: participant.email,
            Major: participant.major || "Unknown",
            School: participant.university,
            Github: participant.github,
        });
    }
    const csv = await json2csv.parseAsync(data, { fields });
    output.write(csv);
    output.close();
    job.attrs.data.elapsedTime = `${((Date.now() - startTime) / 1000).toFixed(1)} seconds`;
    job.attrs.data.total = participants.length;
    job.attrs.data.exportFile = exportFile;
    await job.save();
    if (requesterUUID) {
        app_1.webSocketServer.exportComplete(requesterUUID, job.attrs.data.id, "csv");
    }
};
exports.exportCsvJobHandler = exportCsvJobHandler;

//# sourceMappingURL=exportCsv.js.map
