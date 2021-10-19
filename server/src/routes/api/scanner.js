"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scannerRoutes = void 0;
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
const app_1 = require("../../app");
const common_1 = require("../../common");
const schema_1 = require("../../schema");
const middleware_1 = require("../../middleware");
exports.scannerRoutes = express_1.default.Router();
exports.scannerRoutes.get("/time", (request, response) => {
    response.send(Math.round(Date.now() / 1000).toString());
});
exports.scannerRoutes.post("/heartbeat", body_parser_1.default.text({ type: "text/plain" }), middleware_1.arduinoAuth, async (request, response) => {
    const scannerID = request.body.split("|")[0].trim().toLowerCase();
    let scanner = await schema_1.Scanner.findOne({ id: scannerID });
    const now = new Date();
    if (scanner) {
        scanner.turnedOn = now;
        scanner.lastContact = now;
    }
    else {
        scanner = (0, schema_1.createNew)(schema_1.Scanner, {
            id: scannerID,
            turnedOn: now,
            lastContact: now,
            batteryPercentage: 0,
            batteryVoltage: 0,
        });
    }
    await scanner.save();
    response.json({ success: true });
});
exports.scannerRoutes.post("/battery", body_parser_1.default.text({ type: "text/plain" }), middleware_1.arduinoAuth, async (request, response) => {
    const body = request.body.split("|");
    const scannerID = body[0].trim().toLowerCase();
    const batteryVoltage = parseInt(body[1]);
    const batteryPercentage = parseInt(body[2]);
    if (!scannerID) {
        response.json({
            error: "Invalid scanner ID",
        });
        return;
    }
    if (isNaN(batteryVoltage) || isNaN(batteryPercentage)) {
        response.json({
            error: "Invalid battery voltage or percentage",
        });
        return;
    }
    let scanner = await schema_1.Scanner.findOne({ id: scannerID });
    const now = new Date();
    if (scanner) {
        scanner.lastContact = now;
        scanner.batteryVoltage = batteryVoltage;
        scanner.batteryPercentage = batteryPercentage;
    }
    else {
        scanner = (0, schema_1.createNew)(schema_1.Scanner, {
            id: scannerID,
            turnedOn: now,
            lastContact: now,
            batteryPercentage,
            batteryVoltage,
        });
    }
    await scanner.save();
    response.json({ success: true });
});
exports.scannerRoutes.post("/visit", body_parser_1.default.text({ type: "text/plain" }), middleware_1.arduinoAuth, async (request, response) => {
    var _a, _b;
    const body = request.body.split("|");
    const scannerID = body[0].trim().toLowerCase();
    const uuid = (_a = body[1]) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase();
    const scanningEmployees = await schema_1.User.find({
        "company.verified": true,
        "company.scannerIDs": scannerID,
    });
    if (scanningEmployees.length === 0) {
        console.log("Invalid scanner ID:", scannerID);
        response.status(400).json({
            error: "Invalid scanner ID",
        });
        return;
    }
    const company = await schema_1.Company.findOne({ name: (_b = scanningEmployees[0].company) === null || _b === void 0 ? void 0 : _b.name });
    if (!company) {
        console.log("Could not match scanner to company:", scannerID, scanningEmployees[0].name);
        response.status(400).json({
            error: "Could not match scanner to company",
        });
        return;
    }
    const participant = await schema_1.Participant.findOne({ uuid });
    if (!participant) {
        console.log("Invalid UUID:", uuid);
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
    response.json({ success: true });
});

//# sourceMappingURL=scanner.js.map
