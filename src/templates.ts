import * as fs from "fs";
import * as path from "path";
import * as express from "express";
import * as Handlebars from "handlebars";

import { config, formatName } from "./common";
import { authenticateWithRedirect, isAdmin } from "./middleware";
import { TemplateContent, User, IUser, Company, ICompany } from "./schema";

Handlebars.registerHelper("ifCond", function (this: any, v1: any, v2: any, options: any) {
	if (v1 === v2) {
		return options.fn(this);
	}
	return options.inverse(this);
});
Handlebars.registerHelper("ifIn", function <T>(this: any, elem: T, list: T[], options: any) {
	if (list.includes(elem)) {
		return options.fn(this);
	}
	return options.inverse(this);
});
Handlebars.registerHelper("attr", (name: string, value: string): string => {
	if (value) {
		value = value.replace(/"/g, "&quot;");
		return `${name}="${value}"`;
	}
	else {
		return "";
	}
});
Handlebars.registerHelper("join", <T>(arr: T[]): string => {
	return arr.join(", ");
});
Handlebars.registerHelper("formatName", (name: { first: string; preferred: string; last: string; }): string => {
	return formatName({ name } as IUser);
});

if (config.server.isProduction) {
	Handlebars.registerPartial("main", fs.readFileSync(path.resolve("src/ui", "partials", "main.hbs"), "utf8"));
}
export class Template<T extends TemplateContent> {
	private template: Handlebars.TemplateDelegate<T> | null = null;

	constructor(private file: string) {
		this.loadTemplate();
	}

	private loadTemplate(): void {
		let data = fs.readFileSync(path.resolve("src/ui", this.file), "utf8");
		this.template = Handlebars.compile(data);
	}

	public render(input: object): string {
		if (!config.server.isProduction) {
			Handlebars.registerPartial("main", fs.readFileSync(path.resolve("src/ui", "partials", "main.hbs"), "utf8"));
			this.loadTemplate();
		}
		const renderData = {
			siteTitle: config.server.name,
			...input
		} as T;
		return this.template!(renderData);
	}
}

const EmployerTemplate = new Template("employer.hbs");
const LoginTemplate = new Template("login.hbs");
const AdminTemplate = new Template("admin.hbs");

export let uiRoutes = express.Router();

function serveStatic(url: string, file: string) {
	uiRoutes.route(url).get((request, response) => {
		response.type(path.extname(file));
		fs.createReadStream(path.resolve("src/ui", file)).pipe(response);
	});
}
serveStatic("/js/admin.js", "admin.js");
serveStatic("/js/employer.js", "employer.js");
serveStatic("/css/main.css", "main.css");

uiRoutes.route("/").get(authenticateWithRedirect, async (request, response) => {
	if (request.session) {
		let url = request.session.returnTo;
		if (url && url !== "/") {
			request.session.returnTo = undefined;
			response.redirect(url);
			return;
		}
	}
	const user = request.user as IUser;
	let users: IUser[] = [];
	let pendingUsers: IUser[] = [];
	let company: ICompany | null = null;
	if (user.company && user.company.verified) {
		users = await User.find({ "company.name": user.company.name, "company.verified": true });
		pendingUsers = await User.find({ "company.name": user.company.name, "company.verified": false });
		company = await Company.findOne({ "name": user.company.name });
	}

	if (user.type === "employer") {
		let templateData = {
			user,
			companies: await Company.aggregate([{
				"$sort": {
					"name": 1
				}
			}]),
			company,
			users,
			pendingUsers
		};
		response.send(EmployerTemplate.render(templateData));
	}
	else {
		response.send("Participant content here");
	}
});

uiRoutes.route("/login").get(async (request, response) => {
	let errorMessage = request.flash("error") as string[];
	if (request.session && request.session.loginAction === "render") {
		request.session.loginAction = "redirect";
		let templateData = {
			title: "Log out",
			isLogOut: true
		};
		response.send(LoginTemplate.render(templateData));
	}
	else if (errorMessage.length > 0) {
		let templateData = {
			title: "Log out",
			error: errorMessage.join(" "),
			isLogOut: false
		};
		response.send(LoginTemplate.render(templateData));
	}
	else {
		response.redirect("/auth/login");
	}
});

uiRoutes.route("/logout").all((request, response) => {
	response.redirect("/auth/logout");
});

uiRoutes.route("/admin").get(isAdmin, async (request, response) => {
	const user = request.user as IUser;

	let rawCompanies: (ICompany & { users: IUser[] })[] = await Company.aggregate([
		{
			"$lookup": {
				"from": "users",
				"localField": "name",
				"foreignField": "company.name",
				"as": "users"
			}
		},
		{
			"$sort": {
				"name": 1
			}
		}
	]);
	let companies = rawCompanies.map(company => ({
		...company,
		users: company.users.filter(user => user.company && user.company.verified),
		pendingUsers: company.users.filter(user => !user.company || !user.company.verified)
	}));

	let templateData = {
		uuid: user.uuid,

		companies,
		adminDomains: config.server.adminDomains,
		admins: config.server.admins,
		currentAdmins: await User.find({ admin: true }).sort("name.last")
	};
	response.send(AdminTemplate.render(templateData));
});
