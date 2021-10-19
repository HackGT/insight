"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskDashboardRoutes = exports.startTaskEngine = exports.agenda = void 0;
const es_1 = __importDefault(require("agenda/es"));
const express_1 = __importDefault(require("express"));
const common_1 = require("../common");
const middleware_1 = require("../middleware");
const export_1 = require("./export");
const exportCsv_1 = require("./exportCsv");
const parseMissingResume_1 = require("./parseMissingResume");
const parseResume_1 = require("./parseResume");
const updateParticipantData_1 = require("./updateParticipantData");
exports.agenda = new es_1.default({ db: { address: common_1.config.server.mongoURL } });
exports.agenda.define("update-participant-data", { concurrency: 1, priority: "high" }, updateParticipantData_1.updateParticipantDataJobHandler);
exports.agenda.define("parse-resume", { concurrency: 1, priority: "normal" }, parseResume_1.parseResumeJobHandler);
exports.agenda.define("parse-missing-resumes", { concurrency: 1, priority: "low" }, parseMissingResume_1.parseMissingResumeJobHandler);
exports.agenda.define("export", { concurrency: 1, priority: "normal" }, export_1.exportJobHandler);
exports.agenda.define("export-csv", { concurrency: 1, priority: "normal" }, exportCsv_1.exportCsvJobHandler);
async function startTaskEngine() {
    await exports.agenda.start();
    await exports.agenda.now("update-participant-data");
    await exports.agenda.every("30 minutes", "update-participant-data");
}
exports.startTaskEngine = startTaskEngine;
const Agendash = require("agendash");
exports.taskDashboardRoutes = express_1.default.Router();
exports.taskDashboardRoutes.use("/", middleware_1.isAdmin, Agendash(exports.agenda));

//# sourceMappingURL=index.js.map
