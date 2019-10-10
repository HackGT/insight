import express from "express";
import bodyParser from "body-parser";
import multer from "multer";
import * as os from "os";
import * as path from "path";

import { config } from "./common";
import { IUser } from "./schema";

export const postParser = bodyParser.urlencoded({
	extended: false
});

export const MAX_FILE_SIZE = 50000000; // 50 MB
export let uploadHandler = multer({
	"storage": multer.diskStorage({
		destination: (req, file, cb) => {
			// The OS's default temporary directory
			// Should be changed (or moved via fs.rename()) if the files are to be persisted
			cb(null, os.tmpdir());
		},
		filename: (req, file, cb) => {
			cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
		}
	}),
	"limits": {
		"fileSize": MAX_FILE_SIZE,
		"files": 1
	}
});


export async function authenticateWithRedirect(request: express.Request, response: express.Response, next: express.NextFunction) {
	response.setHeader("Cache-Control", "private");
	const user = request.user as IUser | undefined;
	if (!request.isAuthenticated() || !user) {
		if (request.session) {
			request.session.returnTo = request.originalUrl;
		}
		response.redirect("/login");
	}
	else {
		next();
	}
}

export function apiAuth(request: express.Request, response: express.Response, next: express.NextFunction) {
	response.setHeader("Cache-Control", "private");
	const user = request.user as IUser | undefined;
	const auth = request.headers.authorization;

	if (auth && typeof auth === "string" && auth.indexOf(" ") > -1) {
		const key = Buffer.from(auth.split(" ")[1], "base64").toString();
		if (key === config.secrets.apiKey) {
			next();
		}
		else {
			response.status(401).json({
				"error": "Invalid API key"
			});
		}
	}
	else if (!request.isAuthenticated() || !user) {
		response.status(401).json({
			"error": "You must log in to access this endpoint"
		});
	}
	else if ((!user.company || !user.company.verified) && !user.admin) {
		response.status(403).json({
			"error": "You are not permitted to access this endpoint"
		});
	}
	else {
		next();
	}
}

export function isAdmin(request: express.Request, response: express.Response, next: express.NextFunction) {
	authenticateWithRedirect(request, response, (err?: any) => {
		if (err) {
			next(err);
			return;
		}
		if (!request.user || !(request.user as IUser).admin) {
			response.redirect("/");
			return;
		}
		next();
	});
}

export function isAdminOrEmployee(request: express.Request, response: express.Response, next: express.NextFunction) {
	authenticateWithRedirect(request, response, (err?: any) => {
		if (err) {
			next(err);
			return;
		}
		let user = request.user as IUser | undefined;
		if (user) {
			if (user.company && user.company.verified && user.company.name === request.params.company) {
				next();
				return;
			}
			else if (user.admin) {
				next();
				return;
			}
		}
		response.redirect("/");
	});
}

export function isAnEmployer(request: express.Request, response: express.Response, next: express.NextFunction) {
	authenticateWithRedirect(request, response, (err?: any) => {
		if (err) {
			next(err);
			return;
		}
		if (!request.user || (request.user as IUser).type !== "employer") {
			response.redirect("/");
			return;
		}
		next();
	});
}
