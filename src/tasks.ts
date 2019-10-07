import * as path from "path";
import Agenda from "agenda";
const Agendash = require("agendash");
import * as express from "express";
import { config, wait, S3_ENGINE } from "./common";
import { getAllParticipants } from "./registration";
import { Participant, createNew } from "./schema";
import { isAdmin } from "./middleware";

export const agenda = new Agenda({ db: { address: config.server.mongoURL } });

agenda.define("update-participant-data", { concurrency: 1, priority: "high" }, async job => {
	let start = Date.now();
	let participants = await getAllParticipants();
	let time = Date.now() - start;
	job.attrs.data = job.attrs.data || {};
	job.attrs.data.registration = {
		elapsedMs: time,
		count: participants.length
	};
	await job.save();
	for (let participant of participants) {
		let existingParticipant = await Participant.findOne({ uuid: participant.uuid });
		if (existingParticipant && existingParticipant.flagForUpdate) {
			// Update all fields but preserve the document's ID
			await Participant.updateOne({ _id: existingParticipant._id }, {
				...participant,
				_id: existingParticipant._id
			});
			await agenda.now("parse-resume", { uuid: participant.uuid, type: "Flagged for update" });
		}
		else if (!existingParticipant) {
			await createNew(Participant, participant).save();
			await agenda.now("parse-resume", { uuid: participant.uuid, type: "New participant" });
		}
		await wait(100);
		await job.touch();
	}
});

agenda.define("parse-resume", { concurrency: 1, priority: "normal" }, async job => {
	let uuid: string = job.attrs.data.uuid;
	let participant = await Participant.findOne({ uuid });
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
	let textResult = await S3_ENGINE.getText(path.basename(participant.resume.path));
	if (textResult === null) {
		job.fail(`Unsupported format: ${participant.resume.path}`);
		await job.save();
		return;
	}
	participant.resume.extractedText = textResult;
	await participant.save();
});

agenda.define("parse-missing-resumes", { concurrency: 1, priority: "low" }, async job => {
	let participants = await Participant.find({ "resume.extractedText": { $exists: false } });
	for (let participant of participants) {
		await agenda.now("parse-resume", { uuid: participant.uuid, type: "Missing extracted text" });
	}
});

export async function startTaskEngine() {
	await agenda.start();
	await agenda.every("30 minutes", "update-participant-data");
}

export let taskDashboardRoutes = express.Router();

taskDashboardRoutes.use("/", isAdmin, Agendash(agenda));
