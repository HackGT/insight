import * as express from "express";
import { IUser, User, Company } from "./schema";
import { postParser, isAdmin, isAdminOrEmployee, isAnEmployer } from "./middleware";

export let apiRoutes = express.Router();

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
		let company = new Company({ name });
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
