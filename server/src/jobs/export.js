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
exports.exportJobHandler = void 0;
const archiver_1 = __importDefault(require("archiver"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const app_1 = require("../app");
const common_1 = require("../common");
const schema_1 = require("../schema");
const exportJobHandler = async (job, done) => {
    var _a;
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
    const exportFile = path.join(os.tmpdir(), `${job.attrs.data.id}.zip`);
    const output = fs.createWriteStream(exportFile);
    const archive = (0, archiver_1.default)("zip", { zlib: { level: 9 } });
    output.on("close", async () => {
        job.attrs.data.elapsedTime = `${((Date.now() - startTime) / 1000).toFixed(1)} seconds`;
        job.attrs.data.total = participants.length;
        job.attrs.data.size = (0, common_1.formatSize)(archive.pointer());
        job.attrs.data.exportFile = exportFile;
        await job.save();
        if (requesterUUID) {
            app_1.webSocketServer.exportComplete(requesterUUID, job.attrs.data.id, "zip");
        }
        done();
    });
    archive.on("error", err => done(err));
    archive.pipe(output);
    for (const [i, participant] of participants.entries()) {
        if (requesterUUID) {
            const percentage = Math.round((i / participants.length) * 100);
            app_1.webSocketServer.exportUpdate(requesterUUID, percentage);
        }
        const folderName = `${participant.name} - ${participant.uuid}`;
        if ((_a = participant.resume) === null || _a === void 0 ? void 0 : _a.path) {
            try {
                const fileStream = await common_1.S3_ENGINE.readFile(path.basename(participant.resume.path));
                archive.append(fileStream, {
                    name: path.join(folderName, `resume${path.extname(participant.resume.path)}`),
                });
            }
            catch (_b) {
                console.log("Error: Participant Resume not found");
            }
        }
        const about = `Name: ${participant.name}
Email: ${participant.email}
Major: ${participant.major || "Unknown"}
School: ${participant.university || "Unknown"}
Github: ${participant.github || "None"}
`;
        archive.append(about, { name: path.join(folderName, `${participant.name.trim()}.txt`) });
        if (participant.visitData) {
            const visit = `Time: ${participant.visitData.time.toLocaleString()}

Tags: ${participant.visitData.tags.join(", ")}
Notes: ${participant.visitData.notes.join(", ")}
`;
            archive.append(visit, { name: path.join(folderName, "notes.txt") });
        }
    }
    archive.finalize();
};
exports.exportJobHandler = exportJobHandler;

//# sourceMappingURL=export.js.map
