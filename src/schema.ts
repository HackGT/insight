// The database schema used by Mongoose
// Exports TypeScript interfaces to be used for type checking and Mongoose models derived from these interfaces
import { mongoose } from "./common";

export interface IS3Options {
	region: string;
	bucket: string;
	accessKey: string;
	secretKey: string;
}

// Secrets JSON file schema
export namespace IConfig {
	export interface Secrets {
		session: string;
		apiKey: string;
		groundTruth: {
			url: string;
			id: string;
			secret: string;
		};
		registration: {
			url: string;
			key: string;
		};
		s3: IS3Options;
		bugsnag: string | null;
	}
	export interface Server {
		isProduction: boolean;
		port: number;
		versionHash: string;
		cookieMaxAge: number;
		cookieSecureOnly: boolean;
		mongoURL: string;
		defaultTimezone: string;
		name: string;
		adminDomains: string[];
		admins: string[];
	}

	export interface Main {
		secrets: Secrets;
		server: Server;
	}
}

// For stricter type checking of new object creation
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
interface RootDocument {
	_id: mongoose.Types.ObjectId;
}
export function createNew<T extends RootDocument>(model: mongoose.Model<T & mongoose.Document, {}>, doc: Omit<T, "_id">) {
	return new model(doc);
}
export type Model<T extends RootDocument> = T & mongoose.Document;

//
// DB types
//

interface IResume {
	path: string;
	size: number;
}

export interface IUser extends RootDocument {
	uuid: string;
	email: string;
	name: {
		first: string;
		preferred?: string;
		last: string;
	};
	token: string | null;
	admin: boolean;

	type: "participant" | "employer";
	// Only for employers
	company: {
		name: string;
		verified: boolean;
		scannerIDs: string[];
	} | null;
	// Only for participants
	resume: IResume | null;
}

// This is basically a type definition that exists at runtime and is derived manually from the IUser definition above
export const User = mongoose.model<Model<IUser>>("User", new mongoose.Schema({
	uuid: {
		type: String,
		required: true,
		index: true,
		unique: true
	},
	email: {
		type: String,
		required: true,
		index: true,
		unique: true
	},
	name: {
		first: String,
		preferred: String,
		last: String,
	},
	token: String,
	admin: Boolean,
	type: String,
	company: {
		name: String,
		verified: Boolean,
		scannerIDs: [String]
	},
	resume: {
		path: String,
		size: Number
	}
}).index({
	email: "text",
	name: "text"
}));

export interface IVisit extends RootDocument {
	uuid: string;
	name: string;
	email: string;
	major?: string;
	githubUsername?: string;
	website?: string;
	lookingFor?: {
		timeframe?: string[];
		comments?: string;
	};
	interestingDetails?: {
		favoriteLanguages?: string[];
		proudOf?: string;
		funFact?: string;
	};
	resume?: IResume;
	teammates: string[]; // UUIDs of teammates (can be empty)

	company: string;
	tags: string[];
	notes: string[];
	time: Date;
	scannerID: string;
	employees: {
		uuid: string;
		name: string;
		email: string;
	}[]; // Single scanner can be associated with multiple employees
}

export const Visit = mongoose.model<Model<IVisit>>("Visit", new mongoose.Schema({
	uuid: String,
	name: String,
	email: String,
	major: String,
	githubUsername: String,
	website: String,
	lookingFor: {
		timeframe: [String],
		comments: String
	},
	interestingDetails: {
		favoriteLanguages: [String],
		proudOf: String,
		funFact: String
	},
	resume: {
		path: String,
		size: Number
	},
	teammates: [String],

	company: String,
	tags: [String],
	notes: [String],
	time: Date,
	scannerID: String,
	employees: [{
		uuid: String,
		name: String,
		email: String
	}]
}));

export interface ICompany extends RootDocument {
	name: string;
	tags: string[];
	visits: mongoose.Types.ObjectId[];
}

export const Company = mongoose.model<Model<ICompany>>("Company", new mongoose.Schema({
	name: String,
	tags: [String],
	visits: [mongoose.Types.ObjectId]
}));

//
// Template schema
//

export interface TemplateContent {
	siteTitle: string;
	title?: string;
}
