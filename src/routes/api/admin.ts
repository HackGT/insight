import express from "express";

import { isAdmin, postParser } from "../../middleware";
import { User } from "../../schema";

export let adminRoutes = express.Router();
adminRoutes.use(isAdmin);
adminRoutes.use(postParser);

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
