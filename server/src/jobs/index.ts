// @ts-ignore
import Agenda from "agenda/es";
import express from "express";

import { config } from "../common";
import { isAdmin } from "../middleware";
import { exportJobHandler } from "./export";
import { exportCsvJobHandler } from "./exportCsv";
import { parseMissingResumeJobHandler } from "./parseMissingResume";
import { parseResumeJobHandler } from "./parseResume";
import { updateParticipantDataJobHandler } from "./updateParticipantData";

export const agenda = new Agenda({ db: { address: config.server.mongoURL } });

// Define jobs

export type JobHandler = (
  job: Agenda.Job<Agenda.JobAttributesData>,
  done: (err?: Error) => void
) => void;

agenda.define(
  "update-participant-data",
  { concurrency: 1, priority: "high" },
  updateParticipantDataJobHandler
);
agenda.define("parse-resume", { concurrency: 1, priority: "normal" }, parseResumeJobHandler);
agenda.define(
  "parse-missing-resumes",
  { concurrency: 1, priority: "low" },
  parseMissingResumeJobHandler
);
agenda.define("export", { concurrency: 1, priority: "normal" }, exportJobHandler);
agenda.define("export-csv", { concurrency: 1, priority: "normal" }, exportCsvJobHandler);

export async function startTaskEngine() {
  await agenda.start();
  await agenda.now("update-participant-data");
  await agenda.every("30 minutes", "update-participant-data");
}

// Start agenda dashboard

const Agendash = require("agendash");

export const taskDashboardRoutes = express.Router();
taskDashboardRoutes.use("/", isAdmin, Agendash(agenda));
