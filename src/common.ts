import * as fs from "fs";
import * as crypto from "crypto";
import * as path from "path";

//
// Config
//
import { IConfig, IUser } from "./schema";
class Config implements IConfig.Main {
	public secrets: IConfig.Secrets = {
		session: crypto.randomBytes(32).toString("hex"),
		groundTruth: {
			url: "https://login.hack.gt",
			id: "",
			secret: ""
		},
		bugsnag: null
	};
	public server: IConfig.Server = {
		isProduction: false,
		port: 3000,
		versionHash: fs.existsSync(".git") ? require("git-rev-sync").short() : "",
		cookieMaxAge: 1000 * 60 * 60 * 24 * 30 * 6, // 6 months
		cookieSecureOnly: false,
		mongoURL: "mongodb://localhost/insight",
		defaultTimezone: "America/New_York",
		name: "HackGT Insight",
		adminDomains: [],
		admins: []
	};

	public sessionSecretSet: boolean = false;

	constructor(fileName: string = "config.json") {
		this.loadFromJSON(fileName);
		this.loadFromEnv();
	}
	protected loadFromJSON(fileName: string): void {
		// tslint:disable-next-line:no-shadowed-variable
		let config: IConfig.Main | null = null;
		try {
			config = JSON.parse(fs.readFileSync(path.resolve(__dirname, "./config", fileName), "utf8"));
		}
		catch (err) {
			if (err.code !== "ENOENT") {
				throw err;
			}
		}
		if (!config) {
			return;
		}
		if (config.secrets) {
			for (let key of Object.keys(config.secrets) as (keyof IConfig.Secrets)[]) {
				(this.secrets as any)[key] = config.secrets[key];
			}
		}
		if (config.secrets && config.secrets.session) {
			this.sessionSecretSet = true;
		}
		if (config.server) {
			for (let key of Object.keys(config.server) as (keyof IConfig.Server)[]) {
				(this.server as any)[key] = config.server[key];
			}
		}
	}
	protected loadFromEnv(): void {
		// Secrets
		if (process.env.SESSION_SECRET) {
			this.secrets.session = process.env.SESSION_SECRET;
			this.sessionSecretSet = true;
		}
		if (process.env.BUGSNAG) {
			this.secrets.bugsnag = process.env.BUGSNAG;
		}
		// Server
		if (process.env.PRODUCTION && process.env.PRODUCTION.toLowerCase() === "true") {
			this.server.isProduction = true;
		}
		if (process.env.PORT) {
			let port = parseInt(process.env.PORT, 10);
			if (!isNaN(port) && port > 0) {
				this.server.port = port;
			}
		}
		if (process.env.VERSION_HASH) {
			this.server.versionHash = process.env.VERSION_HASH;
		}
		if (process.env.SOURCE_REV) {
			this.server.versionHash = process.env.SOURCE_REV;
		}
		if (process.env.SOURCE_VERSION) {
			this.server.versionHash = process.env.SOURCE_VERSION;
		}
		if (process.env.COOKIE_MAX_AGE) {
			let maxAge = parseInt(process.env.COOKIE_MAX_AGE, 10);
			if (!isNaN(maxAge) && maxAge > 0) {
				this.server.cookieMaxAge = maxAge;
			}
		}
		if (process.env.COOKIE_SECURE_ONLY && process.env.COOKIE_SECURE_ONLY.toLowerCase() === "true") {
			this.server.cookieSecureOnly = true;
		}
		if (process.env.MONGO_URL) {
			this.server.mongoURL = process.env.MONGO_URL;
		}
		if (process.env.DEFAULT_TIMEZONE) {
			this.server.defaultTimezone = process.env.DEFAULT_TIMEZONE;
		}
		if (process.env.NAME) {
			this.server.name = process.env.NAME;
		}
		if (process.env.ADMIN_DOMAINS) {
			this.server.adminDomains = process.env.ADMIN_DOMAINS.split(",");
		}
		if (process.env.ADMINS) {
			this.server.admins = process.env.ADMINS.split(",");
		}
	}
}
export let config = new Config();

//
// Constants
//
export const PORT = config.server.port;
export const VERSION_NUMBER = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8")).version;
export const VERSION_HASH = config.server.versionHash;
export const COOKIE_OPTIONS = {
	"path": "/",
	"maxAge": config.server.cookieMaxAge,
	"secure": config.server.cookieSecureOnly,
	"httpOnly": true
};

//
// Database connection
//
import mongoose from "mongoose";
mongoose.set("useNewUrlParser", true);
mongoose.set("useCreateIndex", true);
mongoose.set("useUnifiedTopology", true);
mongoose.connect(config.server.mongoURL, { useNewUrlParser: true }).catch(err => {
	throw err;
});
export { mongoose };

export function formatName(user: IUser): string {
	return `${user.name.preferred || user.name.first} ${user.name.last}`;
}
