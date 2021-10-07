import bodyParser from "body-parser";
import express from "express";

import { webSocketServer } from "../../app";
import { config, formatName } from "../../common";
import { Scanner, Company, Participant, Visit, createNew, User } from "../../schema";
import { arduinoAuth } from "../../middleware";

export const scannerRoutes = express.Router();

scannerRoutes.get("/time", (request, response) => {
  response.send(Math.round(Date.now() / 1000).toString());
});
scannerRoutes.post(
  "/heartbeat",
  bodyParser.text({ type: "text/plain" }),
  arduinoAuth,
  async (request, response) => {
    const scannerID = request.body.split("|")[0].trim().toLowerCase();

    let scanner = await Scanner.findOne({ id: scannerID });
    const now = new Date();
    if (scanner) {
      scanner.turnedOn = now;
      scanner.lastContact = now;
    } else {
      scanner = createNew(Scanner, {
        id: scannerID,
        turnedOn: now,
        lastContact: now,
        batteryPercentage: 0,
        batteryVoltage: 0,
      });
    }
    await scanner.save();
    response.json({ success: true });
  }
);
scannerRoutes.post(
  "/battery",
  bodyParser.text({ type: "text/plain" }),
  arduinoAuth,
  async (request, response) => {
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

    let scanner = await Scanner.findOne({ id: scannerID });
    const now = new Date();
    if (scanner) {
      scanner.lastContact = now;
      scanner.batteryVoltage = batteryVoltage;
      scanner.batteryPercentage = batteryPercentage;
    } else {
      scanner = createNew(Scanner, {
        id: scannerID,
        turnedOn: now,
        lastContact: now,
        batteryPercentage,
        batteryVoltage,
      });
    }
    await scanner.save();
    response.json({ success: true });
  }
);

// TODO: deduplicate this handler
scannerRoutes.post(
  "/visit",
  bodyParser.text({ type: "text/plain" }),
  arduinoAuth,
  async (request, response) => {
    const body = request.body.split("|");
    const scannerID = body[0].trim().toLowerCase();
    const uuid = body[1]?.trim().toLowerCase();

    const scanningEmployees = await User.find({
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

    // Scanners are guaranteed to belong to only a single company
    const company = await Company.findOne({ name: scanningEmployees[0].company?.name });
    if (!company) {
      console.log("Could not match scanner to company:", scannerID, scanningEmployees[0].name);
      response.status(400).json({
        error: "Could not match scanner to company",
      });
      return;
    }

    const participant = await Participant.findOne({ uuid });
    if (!participant) {
      console.log("Invalid UUID:", uuid);
      response.status(400).json({
        error: "Invalid UUID",
      });
      return;
    }
    let visit = await Visit.findOne({ company: company.name, participant: participant.uuid });
    if (visit) {
      visit.time = new Date();
    } else {
      visit = createNew(Visit, {
        participant: participant.uuid,
        company: company.name,
        tags: [],
        notes: [],
        time: new Date(),
        scannerID: scannerID || null,
        employees: scanningEmployees.map(employee => ({
          uuid: employee.uuid,
          name: formatName(employee),
          email: employee.email,
        })),
      });
      company.visits.push(visit._id);
    }
    await visit.save();
    await company.save();

    if (visit.scannerID) {
      for (const employee of scanningEmployees) {
        webSocketServer.visitNotification(employee.uuid, participant, visit);
      }
    }
    webSocketServer.reloadParticipant(company.name, participant, visit);

    response.json({ success: true });
  }
);
