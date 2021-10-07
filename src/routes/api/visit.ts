import express from "express";
import { webSocketServer } from "../../app";
import { formatName } from "../../common";
import { isAnEmployer, postParser, apiAuth } from "../../middleware";
import { IUser, Participant, Visit, Company, IVisit, IParticipant, Model, User, createNew } from "../../schema";

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

export let visitRoutes = express.Router();

visitRoutes.route("/:id/tag")
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

visitRoutes.route("/:id/note")
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

visitRoutes.route("/:id")
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

visitRoutes.route("/")
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
