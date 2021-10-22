// @ts-ignore
import Agenda from "agenda/es";
import express from "express";

import { config } from "../common";
import { isAdmin } from "../middleware";
import { exportZipJobHandler } from "./exportZip";
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
  { concurrency: 1, priority: "normal" },
  updateParticipantDataJobHandler
);
agenda.define("parse-resume", { concurrency: 1, priority: "normal" }, parseResumeJobHandler);
agenda.define(
  "parse-missing-resumes",
  { concurrency: 1, priority: "low" },
  parseMissingResumeJobHandler
);
agenda.define("export-zip", { concurrency: 3, priority: "high" }, exportZipJobHandler);
agenda.define("export-csv", { concurrency: 3, priority: "high" }, exportCsvJobHandler);

export async function startTaskEngine() {
  await agenda.start();
  await agenda.now("update-participant-data");
  await agenda.every("30 minutes", "update-participant-data");
}

// Start agenda dashboard

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Agendash = require("agendash");

export const taskDashboardRoutes = express.Router();
taskDashboardRoutes.use("/", isAdmin, Agendash(agenda));
