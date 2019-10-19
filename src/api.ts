import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as express from "express";
import {
	IUser, User,
	ICompany, Company,
	IVisit, Visit,
	IParticipant, Participant,
	createNew, Model
} from "./schema";
import { postParser, isAdmin, isAdminOrEmployee, isAnEmployer, apiAuth, authenticateWithRedirect } from "./middleware";
import { formatName, config } from "./common";
import { agenda } from "./tasks";
import { webSocketServer } from "./app";

export let apiRoutes = express.Router();

// Used to authorize WebSocket connections
apiRoutes.route("/authorize")
	.get(authenticateWithRedirect, async (request, response) => {
		let user = request.user as IUser;
		let time = Date.now();

		response.json({
			"success": true,
			"uuid": user.uuid,
			"time": time.toString(),
			"token": crypto
				.createHmac("sha256", config.secrets.apiKey + time)
				.update(user.uuid)
				.digest()
				.toString("hex")
		});
	});

apiRoutes.route("/export")
	.get(apiAuth, async (request, response) => {
		response.setHeader("Cache-Control", "no-store");
		const jobID = request.query.id as string || "";
		if (!jobID) {
			response.status(404).send("Invalid download ID");
		}
		let filetype = request.query.filetype as string || "";
		if (filetype !== "zip" && filetype !== "csv") {
			response.status(400).send();
			return;
		}

		const file = path.join(os.tmpdir(), jobID + "." + filetype);
		let stream = fs.createReadStream(file);
		stream.on("end", async () => {
			await fs.promises.unlink(file);
		});
		stream.on("error", err => {
			console.error(err);
			response.status(404).send("Invalid download ID");
		});
		response.attachment(`export.${filetype}`);
		stream.pipe(response);
	})
	.post(apiAuth, postParser, async (request, response) => {
		let user = request.user as IUser | undefined;
		let type = request.body.type as string || "";
		let filetype = request.body.filetype as "zip" | "csv" || "";
		if (filetype !== "zip" && filetype !== "csv") {
			response.json({
				"error": "Invalid download file type"
			});
			return;
		}

		let jobID = crypto.randomBytes(16).toString("hex");
		let participantIDs: string[] = [];
		if (type === "all") {
			participantIDs = (await Participant.find().sort({ "name": 1 })).map(p => p.uuid);
		}
		else if (type === "visited") {
			if (!user?.company?.verified) {
				response.json({
					"error": "Must be authenticated as an employer if downloading visited resumes"
				});
				return;
			}
			participantIDs = (await Visit.aggregate([
				{ $match: { "company": user.company.name } },
				{ $sort: { time: -1 } }, // Sort newest first
			])).map(v => v.participant);
		}
		else if (type === "selected") {
			participantIDs = JSON.parse(request.body.ids || "[]");
		}
		else {
			response.json({
				"error": "Invalid download request type"
			});
			return;
		}

		const jobName = filetype === "csv" ? "export-csv" : "export";
		await agenda.now(jobName, { id: jobID, participantIDs, requesterUUID: user?.uuid, requesterName: user?.name });
		response.json({ "success": true, "id": jobID });
	});

apiRoutes.route("/search")
	.get(isAnEmployer, async (request, response) => {
		let query: string = request.query.q || "";
		const PAGE_SIZE = 20;
		let page = parseInt(request.query.page, 10);
		if (isNaN(page) || page < 0) {
			page = 0;
		}
		let filterTags: string[] = [];
		try {
			let json = JSON.parse(request.query.filter);
			if (Array.isArray(json)) filterTags = json;
		}
		catch {}

		let pipeline: any[] = [];
		if (query || filterTags.length === 0) {
			pipeline.push({ $match: { "$text": { "$search": query } } });
			pipeline.push({ $sort: { score: { "$meta": "textScore" } } });
		}
		pipeline.push({ $lookup: {
			from: "visits",
			localField: "uuid",
			foreignField: "participant",
			as: "visitData"
		} });
		pipeline.push({ $unwind: { path: "$visitData", preserveNullAndEmptyArrays: true } }); // Turns arrays of 0 to 1 documents into that document or unsets the field
		if (filterTags.length > 0) {
			pipeline.push({ $match: { "visitData.tags": { $elemMatch: { $in: filterTags } } } });
		}
		let total = (await Participant.aggregate(pipeline)).length;
		pipeline.push({ $skip: page * PAGE_SIZE });
		pipeline.push({ $limit: PAGE_SIZE });
		pipeline.push({ $project: { "resume.extractedText": 0 } }); // Not needed so let's reduce response size

		let participants = await Participant.aggregate(pipeline);

		response.json({
			"success": true,
			page,
			pageSize: PAGE_SIZE,
			total,
			participants
		});
	});

interface IVisitWithParticipant {
	visit: Model<IVisit>;
	participant: Model<IParticipant>;
}
async function getVisit(request: express.Request, response: express.Response): Promise<IVisitWithParticipant | null> {
	const user = request.user as IUser | undefined;
	if (!user?.company?.verified) {
		response.status(403).send();
		return null;
	}
	const visit = await Visit.findById(request.params.id);
	if (!visit || visit.company !== user.company.name) {
		response.status(403).json({
			"error": "Invalid visit ID"
		});
		return null;
	}
	const participant = await Participant.findOne({ uuid: visit.participant });
	if (!participant) {
		response.status(500).json({
			"error": "Visit does not correspond to a valid participant"
		});
		return null;
	}
	return { visit, participant };
}

apiRoutes.route("/tags")
	.get(isAnEmployer, async (request, response) => {
		const user = request.user as IUser | undefined;
		if (!user?.company?.verified) {
			response.status(403).send();
			return;
		}

		let tagResults: { tags: string[] }[] = await Visit.aggregate([
			{ $match: { company: user.company.name } },
			{ $unwind: "$tags" },
			{ $group: { _id: "tags", tags: { $addToSet: "$tags" } } }
		]);
		let tags = tagResults[0]?.tags ?? [];
		tags = tags.sort();
		response.json({
			"success": true,
			tags
		});
	});
apiRoutes.route("/visit/:id/tag")
	.get(isAnEmployer, async (request, response) => {
		const data = await getVisit(request, response);
		if (!data) return;
		const { visit } = data;

		response.json({
			"success": true,
			"tags": visit.tags
		});
	})
	.post(isAnEmployer, postParser, async (request, response) => {
		const data = await getVisit(request, response);
		if (!data) return;
		const { participant, visit } = data;

		const tag = (request.body.tag as string || "").trim().toLowerCase();
		if (!tag) {
			response.json({
				"error": "Missing tag"
			});
			return;
		}

		let tags = new Set(visit.tags);
		tags.add(tag);
		visit.tags = [...tags];
		await visit.save();
		await webSocketServer.reloadParticipant(visit.company, participant, visit);

		response.json({ "success": true });
	})
	.delete(isAnEmployer, postParser, async (request, response) => {
		const data = await getVisit(request, response);
		if (!data) return;
		const { participant, visit } = data;

		const tag = (request.body.tag as string || "").trim().toLowerCase();
		if (!tag) {
			response.json({
				"error": "Missing tag"
			});
			return;
		}

		visit.tags = visit.tags.filter(t => t !== tag);
		await visit.save();
		await webSocketServer.reloadParticipant(visit.company, participant, visit);

		response.json({ "success": true });
	});

apiRoutes.route("/visit/:id/note")
	.post(isAnEmployer, postParser, async (request, response) => {
		const data = await getVisit(request, response);
		if (!data) return;
		const { participant, visit } = data;

		const note = (request.body.note as string || "").trim();
		if (!note) {
			response.json({
				"error": "Missing note"
			});
			return;
		}

		visit.notes.push(note);
		await visit.save();
		await webSocketServer.reloadParticipant(visit.company, participant, visit);
		response.json({ "success": true });
	})
	.delete(isAnEmployer, postParser, async (request, response) => {
		const data = await getVisit(request, response);
		if (!data) return;
		const { participant, visit } = data;

		const note = (request.body.note as string || "").trim();
		if (!note) {
			response.json({
				"error": "Missing note"
			});
			return;
		}

		visit.notes = visit.notes.filter(n => n !== note);
		await visit.save();
		await webSocketServer.reloadParticipant(visit.company, participant, visit);
		response.json({ "success": true });
	});

apiRoutes.route("/visit/:id")
	.get(isAnEmployer, async (request, response) => {
		const user = request.user as IUser | undefined;
		if (!user?.company?.verified) {
			response.status(403).send();
			return;
		}
		const participant = await Participant.findOne({ uuid: request.params.id });
		if (!participant) {
			response.status(404).json({
				"error": "Invalid participant ID"
			});
			return;
		}
		const visit = await Visit.findOne({ participant: request.params.id, company: user.company.name });
		if (!visit) {
			response.status(404).json({
				"error": "No visit found for that participant at your company"
			});
			return;
		}

		response.json({
			"success": true,
			"visit": visit.toObject(),
			"participant": participant.toObject()
		});
	})
	.delete(isAnEmployer, async (request, response) => {
		const data = await getVisit(request, response);
		if (!data) return;
		const { participant, visit } = data;
		const user = request.user as IUser;

		const company = await Company.findOne({ name: user.company!.name });
		if (!company) {
			response.json({
				"error": "Could not find company for user"
			});
			return;
		}
		company.visits = company.visits.filter(v => !v.equals(visit._id));
		await Promise.all([
			company.save(),
			visit.remove()
		]);
		webSocketServer.reloadParticipant(company.name, participant, undefined);
		response.json({ "success": true });
	});
apiRoutes.route("/visit")
	.get(isAnEmployer, async (request, response) => {
		const user = request.user as IUser | undefined;
		if (!user?.company?.verified) {
			response.status(403).send();
			return;
		}

		const PAGE_SIZE = 20;
		let page = parseInt(request.query.page, 10);
		if (isNaN(page) || page < 0) {
			page = 0;
		}
		let total = await Visit.countDocuments({ "company": user.company.name });
		let visits = await Visit.aggregate([
			{ $match: { "company": user.company.name } },
			{ $sort: { time: -1  } }, // Sort newest first
			{ $skip: page * PAGE_SIZE },
			{ $limit: PAGE_SIZE },
			{ $lookup: {
				from: "participants",
				localField: "participant",
				foreignField: "uuid",
				as: "participantData"
			} },
			{ $unwind: { path: "$participantData" } }, // Turns array of 1 document into just that document
			{ $project: { "participantData.resume.extractedText": 0 } } // Reduces size of response
		]);

		response.json({
			"success": true,
			page,
			pageSize: PAGE_SIZE,
			total,
			visits
		});
	})
	.post(apiAuth, postParser, async (request, response) => {
		let scannerID = (request.body.scanner as string || "").trim().toLowerCase();
		let uuid = (request.body.uuid as string || "").trim().toLowerCase();

		let scanningEmployees: IUser[] = [];
		if (scannerID) {
			scanningEmployees = await User.find({ "company.verified": true, "company.scannerIDs": scannerID });
			if (scanningEmployees.length === 0) {
				response.status(400).json({
					"error": "Invalid scanner ID"
				});
				return;
			}
		}
		else {
			let user = request.user as IUser | undefined;
			if (!user?.company?.verified) {
				response.status(400).json({
					"error": "Unauthorized user"
				});
				return;
			}
			scanningEmployees.push(user);
		}

		// Scanners are guaranteed to belong to only a single company
		let company = await Company.findOne({ name: scanningEmployees[0].company?.name });
		if (!company) {
			response.status(400).json({
				"error": "Could not match scanner to company"
			});
			return;
		}

		let participant = await Participant.findOne({ uuid });
		if (!participant) {
			response.status(400).json({
				"error": "Invalid UUID"
			});
			return;
		}
		let visit = await Visit.findOne({ company: company.name, participant: participant.uuid });
		if (visit) {
			visit.time = new Date();
		}
		else {
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
					email: employee.email
				}))
			});
			company.visits.push(visit._id);
		}
		await visit.save();
		await company.save();

		if (visit.scannerID) {
			for (let employee of scanningEmployees) {
				webSocketServer.visitNotification(employee.uuid, participant, visit);
			}
		}
		webSocketServer.reloadParticipant(company.name, participant, visit);

		response.json({
			"success": true
		});
	});

async function addRemoveEmployee(action: (user: IUser) => void, request: express.Request, response: express.Response) {
	let user = await User.findOne({ email: request.params.employee });
	if (!user) {
		response.status(400).json({
			"error": "No existing user found with that email"
		});
		return;
	}
	if (!user.company || user.company.name !== request.params.company) {
		response.status(400).json({
			"error": "User has invalid company set"
		});
		return;
	}

	action(user);
	await user.save();
	response.json({
		"success": true
	});
}
apiRoutes.route("/company/:company/employee/:employee")
	// Approve pending employees
	.patch(isAdminOrEmployee, addRemoveEmployee.bind(null, user => user.company!.verified = true))
	// Remove employees from company
	.delete(isAdminOrEmployee, addRemoveEmployee.bind(null, user => user.company = null))
	// Directly add employee to company
	.post(isAdminOrEmployee, async (request, response) => {
		let user = await User.findOne({ email: request.params.employee });
		if (!user) {
			response.status(400).json({
				"error": "No existing user found with that email"
			});
			return;
		}
		let company = await Company.findOne({ name: request.params.company });
		if (!company) {
			response.status(400).json({
				"error": "Unknown company"
			});
			return;
		}
		user.company = {
			name: request.params.company,
			verified: true,
			scannerIDs: []
		};
		await user.save();
		response.json({
			"success": true
		});
	});

apiRoutes.route("/company/:company/employee/:employee/scanners/:scanners?")
	// Change attached scanners
	.patch(isAdminOrEmployee, async (request, response) => {
		let user = await User.findOne({ email: request.params.employee });
		if (!user) {
			response.status(400).json({
				"error": "No existing user found with that email"
			});
			return;
		}
		if (!user.company || user.company.name !== request.params.company) {
			response.status(400).json({
				"error": "User has invalid company set"
			});
			return;
		}

		let scanners = (request.params.scanners || "")
			.split(", ")
			.filter(scanner => !!scanner)
			.map(scanner => scanner.replace(/,/g, "").trim().toLowerCase());
		// Check if scanner is already tied to another company
		for (let scanner of scanners) {
			let existingScanners = await User.find({ "company.scannerIDs": scanner, "company.name": { "$ne": user!.company!.name } });
			if (existingScanners.length > 0) {
				response.json({
					"error": `Scanner ID ${scanner} is already associated with another company`
				});
				return;
			}
		}

		user.company.scannerIDs = [...new Set(scanners)]; // Eliminates duplicates
		await user.save();
		response.json({
			"success": true
		});
	});

apiRoutes.route("/company/:company")
	// Rename company
	.patch(isAdminOrEmployee, postParser, async (request, response) => {
		let company = await Company.findOne({ name: request.params.company });
		if (!company) {
			response.status(400).json({
				"error": "Unknown company"
			});
			return;
		}
		let name: string = (request.body.name || "").trim();
		if (!name) {
			response.status(400).json({
				"error": "Invalid name"
			});
			return;
		}
		let existingCompany = await Company.findOne({ name });
		if (existingCompany) {
			response.status(409).json({
				"error": "A company with that name already exists"
			});
			return;
		}

		company.name = name;
		await User.updateMany({ "company.name": request.params.company }, { "$set": { "company.name": name }});
		await company.save();
		response.json({
			"success": true
		});
	})
	// Delete company
	.delete(isAdmin, async (request, response) => {
		let company = await Company.findOne({ name: request.params.company });
		if (!company) {
			response.status(400).json({
				"error": "Unknown company"
			});
			return;
		}

		await User.updateMany({ "company.name": request.params.company }, { "$set": { "company": null }});
		await company.remove();
		response.json({
			"success": true
		});
	})
	// Create new company
	.post(isAdmin, async (request, response) => {
		let name = (request.params.company || "").trim();
		if (!name) {
			response.status(400).json({
				"error": "Company name cannot be blank"
			});
		}
		let company = createNew(Company, { name, visits: [] });
		await company.save();
		response.json({
			"success": true
		});
	});

apiRoutes.route("/company/:company/join")
	// Request to join company
	.post(async (request, response) => {
		let uuid = (request.user as IUser | undefined)?.uuid;
		let user = await User.findOne({ uuid });
		if (user?.type !== "employer") {
			response.status(403).json({
				"error": "Must be an employer"
			})
			return;
		}
		let company = await Company.findOne({ name: request.params.company });
		if (!company) {
			response.status(400).json({
				"error": "Unknown company"
			});
			return;
		}
		if (!user) {
			response.status(400).json({
				"error": "Unknown user"
			});
			return;
		}
		user.company = {
			name: company.name,
			verified: false,
			scannerIDs: []
		};
		await user.save();
		response.json({
			"success": true
		});
	});

let adminRoutes = express.Router();
apiRoutes.use("/admin", isAdmin, postParser, adminRoutes);

async function changeAdminStatus(isAdmin: boolean, request: express.Request, response: express.Response) {
	let user = await User.findOne({ email: (request.body.email || "").trim().toLowerCase() });
	if (!user) {
		response.status(400).json({
			"error": "No existing user found with that email"
		});
		return;
	}

	user.admin = isAdmin;
	await user.save();
	response.json({
		"success": true
	});
}
adminRoutes.route("/")
	.post(changeAdminStatus.bind(null, true))
	.delete(changeAdminStatus.bind(null, false));
