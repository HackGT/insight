import * as crypto from "crypto";
import * as express from "express";
import { IUser, User, Company, IVisit, createNew, Visit } from "./schema";
import { postParser, isAdmin, isAdminOrEmployee, isAnEmployer, apiAuth, authenticateWithRedirect } from "./middleware";
import { createVisit } from "./registration";
import { config, formatName } from "./common";

export let apiRoutes = express.Router();

apiRoutes.route("/scan/:id")
	.get(isAnEmployer, async (request, response) => {
		const user = request.user as IUser | undefined;
		if (!user || !user.company || !user.company.verified) {
			response.status(403).send();
			return;
		}
		const visit = await Visit.findById(request.params.id);
		if (!visit || visit.company !== user.company.name) {
			response.status(403).json({
				"error": "Invalid visit ID"
			});
			return;
		}
		if (visit.resume) {
			let time = Date.now();
			let key = config.secrets.apiKey + time;
			let hash = crypto.createHmac("sha256", key).update("/" + visit.resume.path).digest().toString("hex");
			visit.resume.path = `/${visit.resume.path}?time=${time}&key=${hash}`;
		}
		response.json({
			"success": true,
			"visit": visit.toObject()
		});
	});
apiRoutes.route("/scan")
	.get(isAnEmployer, async (request, response) => {
		const user = request.user as IUser | undefined;
		if (!user || !user.company || !user.company.verified) {
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

		response.json({
			"success": true,
			"visits": visits.map(visit => visit.toObject())
		});
	})
	.post(apiAuth, postParser, async (request, response) => {
		let scannerID = (request.body.scanner as string || "").trim().toLowerCase();
		let uuid = (request.body.uuid as string || "").trim().toLowerCase();

		let scanningEmployees = await User.find({ "company.verified": true, "company.scannerIDs": scannerID });
		if (scanningEmployees.length === 0) {
			response.status(400).json({
				"error": "Invalid scanner ID"
			});
			return;
		}

		// Scanners are guaranteed to belong to only a single company
		let company = await Company.findOne({ name: scanningEmployees[0].company!.name });
		if (!company) {
			response.status(400).json({
				"error": "Could not match scanner to company"
			});
			return;
		}

		let visit = await createVisit(uuid);
		if (!visit) {
			response.status(400).json({
				"error": "Invalid UUID"
			});
			return;
		}

		visit.company = company.name;
		visit.tags = [];
		visit.notes = [];
		visit.time = new Date();
		visit.scannerID = scannerID;
		visit.employees = scanningEmployees.map(employee => ({
			uuid: employee.uuid,
			name: formatName(employee),
			email: employee.email
		}));

		let visitDocument = createNew(Visit, visit as IVisit);
		company.visits.push(visitDocument._id);
		await visitDocument.save();
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
