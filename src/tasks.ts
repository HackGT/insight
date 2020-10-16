import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import Agenda from "agenda";
const Agendash = require("agendash");
import * as express from "express";
import archiver from "archiver";
import * as json2csv from "json2csv";
import { config, wait, S3_ENGINE, formatSize } from "./common";
import { getAllParticipants } from "./registration";
import { Participant, createNew, IParticipant, IVisit } from "./schema";
import { isAdmin } from "./middleware";
import { webSocketServer } from "./app";

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
	let textResult;
	try {
		textResult = await S3_ENGINE.getText(path.basename(participant.resume.path));
	} catch (err) {
		console.log("Error: Cannot parse resume");
	}
	
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

agenda.define("export", { concurrency: 1, priority: "normal" }, async (job, done) => {
	const startTime = Date.now();
	let requesterUUID: string | undefined = job.attrs.data.requesterUUID;
	let participantIDs: string[] = job.attrs.data.participantIDs;
	let participants: (IParticipant & { visitData?: IVisit })[] = await Participant.aggregate([
		{ $match: {  $and: [ {uuid: { $in: participantIDs }}, {"gdpr": {$ne:null} } ] }},
		{ $sort: { name: 1 } }, // Sort newest first
		{ $lookup: {
			from: "visits",
			localField: "uuid",
			foreignField: "participant",
			as: "visitData"
		} },
		{ $unwind: { path: "$visitData", preserveNullAndEmptyArrays: true } } // Turns array of 1 document into just that document
	]);

	const exportFile = path.join(os.tmpdir(), job.attrs.data.id + ".zip");
	const output = fs.createWriteStream(exportFile);
	const archive = archiver("zip", { zlib: { level: 9 } });

	output.on("close", async () => {
		job.attrs.data.elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1) + " seconds";
		job.attrs.data.total = participants.length;
		job.attrs.data.size = formatSize(archive.pointer());
		job.attrs.data.exportFile = exportFile;
		await job.save();
		if (requesterUUID) {
			webSocketServer.exportComplete(requesterUUID, job.attrs.data.id, "zip");
		}
		done();
	});
	archive.on("error", err => done(err));
	archive.pipe(output);

	for (let [i, participant] of participants.entries()) {
		if (requesterUUID) {
			let percentage = Math.round((i / participants.length) * 100);
			webSocketServer.exportUpdate(requesterUUID, percentage);
		}

		let folderName = `${participant.name} - ${participant.uuid}`;

		if (participant.resume?.path) {
			try{
				let fileStream = await S3_ENGINE.readFile(path.basename(participant.resume.path));
				archive.append(fileStream, { name: path.join(folderName, "resume" + path.extname(participant.resume.path)) });
			} catch{
				console.log("Error: Participant Resume not found");
			}
			
		}

		let about =
`Name: ${participant.name}
Email: ${participant.email}
Major: ${participant.major || "Unknown"}
School: ${participant.university || "Unknown"}
Github: ${participant.github || "None"}
`;
		archive.append(about, { name: path.join(folderName, participant.name.trim() + ".txt") });

		if (participant.visitData) {
			let visit =
`Time: ${participant.visitData.time.toLocaleString()}

Tags: ${participant.visitData.tags.join(", ")}
Notes: ${participant.visitData.notes.join(", ")}
`;
			archive.append(visit, { name: path.join(folderName, "notes.txt") });
		}
	}
	archive.finalize();
});

agenda.define("export-csv", { concurrency: 1, priority: "normal" }, async job => {
	const startTime = Date.now();
	let requesterUUID: string | undefined = job.attrs.data.requesterUUID;
	let participantIDs: string[] = job.attrs.data.participantIDs;
	let participants: (IParticipant & { visitData?: IVisit })[] = await Participant.aggregate([
		{ $match: {  $and: [ {uuid: { $in: participantIDs }}, {  "gdpr": {$ne:null}   }] }},
		{ $sort: { name: 1 } }, // Sort newest first
		{ $lookup: {
			from: "visits",
			localField: "uuid",
			foreignField: "participant",
			as: "visitData"
		} },
		{ $unwind: { path: "$visitData", preserveNullAndEmptyArrays: true } } // Turns array of 1 document into just that document
	]);

	const exportFile = path.join(os.tmpdir(), job.attrs.data.id + ".csv");
	const output = fs.createWriteStream(exportFile);

	interface IRow {
		Name: string;
		Email: string;
		Major?: string;
		School?: string;
		Github?: string;
	}
	const fields: (keyof IRow)[] = ["Name", "Email", "Major", "School", "Github"];
	let data: IRow[] = [];

	for (let [i, participant] of participants.entries()) {
		if (requesterUUID) {
			let percentage = Math.round((i / participants.length) * 100);
			webSocketServer.exportUpdate(requesterUUID, percentage);
		}
		data.push({
			Name: participant.name,
			Email: participant.email,
			Major: participant.major || "Unknown",
			School: participant.university,
			Github: participant.github,
		});
	}

	let csv = await json2csv.parseAsync(data, { fields });
	output.write(csv);
	output.close();

	job.attrs.data.elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1) + " seconds";
	job.attrs.data.total = participants.length;
	job.attrs.data.exportFile = exportFile;
	await job.save();
	if (requesterUUID) {
		webSocketServer.exportComplete(requesterUUID, job.attrs.data.id, "csv");
	}
});

export async function startTaskEngine() {
	await agenda.start();
	await agenda.every("30 minutes", "update-participant-data");
}

export let taskDashboardRoutes = express.Router();

taskDashboardRoutes.use("/", isAdmin, Agendash(agenda));
