import express from "express";
import bodyParser from "body-parser";

import { IUser } from "./schema";

export const postParser = bodyParser.urlencoded({
	extended: false
});

export async function authenticateWithRedirect(request: express.Request, response: express.Response, next: express.NextFunction) {
	response.setHeader("Cache-Control", "private");
	let user = request.user as IUser | undefined;
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
