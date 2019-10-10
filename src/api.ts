import * as express from "express";
import {
	IUser, User,
	ICompany, Company,
	IVisit, Visit,
	IParticipant, Participant,
	createNew, Model
} from "./schema";
import { postParser, isAdmin, isAdminOrEmployee, isAnEmployer, apiAuth } from "./middleware";
import { formatName } from "./common";

export let apiRoutes = express.Router();

apiRoutes.route("/search")
	.get(isAnEmployer, async (request, response) => {
		let query: string = request.query.q || "";
		const PAGE_SIZE = 20;
		let page = parseInt(request.query.page, 10);
		if (isNaN(page) || page < 0) {
			page = 0;
		}

		let participants = await Participant
			.find(
				{ "$text": { "$search": query } },
				{ "score": { "$meta": "textScore" } }
			)
			.sort({ "score": { $meta: "textScore" } })
			.skip(page * PAGE_SIZE)
			.limit(PAGE_SIZE);
		let visits = await Promise.all(participants.map(participant => Visit.findOne({ participant: participant.uuid })));

		response.json({
			"success": true,
			"results": participants.map((participant, i) => ({
				participant: participant.toObject(),
				visit: visits[i] ? visits[i]!.toObject() : null
			}))
		});
	});

interface IVisitWithParticipant {
	visit: Model<IVisit>;
	participant: Model<IParticipant>;
}
async function getVisit(request: express.Request, response: express.Response): Promise<IVisitWithParticipant | null> {
	const user = request.user as IUser | undefined;
	if (!user || !user.company || !user.company.verified) {
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
		const { visit } = data;

		const tag = (request.body.tag as string || "").trim().toLowerCase();
		if (!tag) {
			response.json({
				"error": "Missing tag"
			});
		}

		let tags = new Set(visit.tags);
		tags.add(tag);
		visit.tags = [...tags];
		await visit.save();
		response.json({ "success": true });
	})
	.delete(isAnEmployer, postParser, async (request, response) => {
		const data = await getVisit(request, response);
		if (!data) return;
		const { visit } = data;

		const tag = (request.body.tag as string || "").trim().toLowerCase();
		if (!tag) {
			response.json({
				"error": "Missing tag"
			});
		}

		visit.tags = visit.tags.filter(t => t !== tag);
		await visit.save();
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
		let visits = await Visit
			.find({ "company": user.company.name })
			.sort({ "time": "desc" })
			.skip(page * PAGE_SIZE)
			.limit(PAGE_SIZE);
		let participants = await Promise.all(visits.map(visit => Participant.findOne({ uuid: visit.participant })));

		response.json({
			"success": true,
			"visits": visits.map((visit, i) => ({
				visit: visit.toObject(),
				participant: participants[i] ? participants[i]!.toObject() : null
			}))
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

		let visit = createNew(Visit, {
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
		await visit.save();
		await company.save();

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
	.post(isAnEmployer, async (request, response) => {
		let company = await Company.findOne({ name: request.params.company });
		if (!company) {
			response.status(400).json({
				"error": "Unknown company"
			});
			return;
		}
		let user = await User.findOne({ uuid: (request.user as IUser).uuid });
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
