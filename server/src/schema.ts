// The database schema used by Mongoose
// Exports TypeScript interfaces to be used for type checking and Mongoose models derived from these interfaces
import { Mongo } from "@sentry/tracing/dist/integrations";
import { mongoose } from "./common";

export interface IGCSOptions {
  bucket: string;
  clientEmail: string;
  privateKey: string;
  uploadDirectory: string;
  region?: string;
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
    gcs: IGCSOptions;
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
export function createNew<T extends RootDocument>(
  model: mongoose.Model<T & mongoose.Document>,
  doc: mongoose.AnyKeys<T & mongoose.Document<any, any, any>> & mongoose.AnyObject
) {
  return new model(doc);
}
export type Model<T extends RootDocument> = T & mongoose.Document;

//
// DB types
//

interface IResume {
  path: string;
  size: number;
  extractedText?: string;
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
    company: mongoose.Types.ObjectId;
    verified: boolean;
    scannerIDs: string[];
  } | null;
}

// This is basically a type definition that exists at runtime and is derived manually from the IUser definition above
export const User = mongoose.model<Model<IUser>>(
  "User",
  new mongoose.Schema({
    uuid: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
      unique: true,
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
      company: mongoose.Types.ObjectId,
      verified: Boolean,
      scannerIDs: [String],
    },
  }).index({
    email: "text",

    name: "text",
  })
);

export interface IVisit extends RootDocument {
  participant: string;
  company: mongoose.Types.ObjectId;
  tags: string[];
  notes: string[];
  time: Date;
  scannerID: string | null;
  employees: {
    uuid: string;
    name: string;
    email: string;
  }[]; // Single scanner can be associated with multiple employees
}

export const Visit = mongoose.model<Model<IVisit>>(
  "Visit",
  new mongoose.Schema({
    participant: {
      type: String,
      index: true,
    },
    company: mongoose.Types.ObjectId,
    tags: [String],
    notes: [String],
    time: Date,
    scannerID: String,
    employees: [
      {
        uuid: String,
        name: String,
        email: String,
      },
    ],
  })
);

interface ICall {
  id: mongoose.Types.ObjectId;
  url: string;
  title: string;
  tags: string[];
  description: string;
}

export interface ICompany extends RootDocument {
  name: string;
  visits: mongoose.Types.ObjectId[];
  calls: [ICall];
  descriptionMarkdown: string;
}

export const Company = mongoose.model<Model<ICompany>>(
  "Company",
  new mongoose.Schema({
    name: {
      type: String,
      index: true,
    },
    visits: [mongoose.Types.ObjectId],
  })
);

export interface IScanner extends RootDocument {
  id: string;
  turnedOn: Date;
  lastContact: Date;
  batteryVoltage: number;
  batteryPercentage: number;
}

export const Scanner = mongoose.model<Model<IScanner>>(
  "Scanner",
  new mongoose.Schema({
    id: {
      type: String,
      index: true,
    },
    turnedOn: Date,
    lastContact: Date,
    batteryVoltage: Number,
    batteryPercentage: Number,
  })
);

export interface IParticipant extends RootDocument {
  uuid: string;
  name: string;
  email: string;
  university?: string;
  year?: string;
  major?: string;
  github?: string;
  timezone?: string;
  gdpr?: string;
  // lookingFor?: {
  // 	timeframe?: string[];
  // 	comments?: string;
  // };
  // interestingDetails?: {
  // 	favoriteLanguages?: string[];
  // 	fun1?: {
  // 		question: string;
  // 		answer?: string;
  // 	};
  // 	fun2?: {
  // 		question: string;
  // 		answer?: string;
  // 	};
  // };
  resume?: IResume;
  teammates: string[]; // UUIDs of teammates (can be empty)

  flagForUpdate: boolean; // Can be manually set to true to refresh cached data
}

export const Participant = mongoose.model<Model<IParticipant>>(
  "Participant",
  new mongoose.Schema({
    uuid: {
      type: String,
      index: true,
    },
    name: String,
    email: String,
    university: String,
    year: String,
    major: String,
    github: String,
    timezone: String,
    gdpr: String,
    // lookingFor: {
    // 	timeframe: [String],
    // 	comments: String
    // },
    // interestingDetails: {
    // 	favoriteLanguages: [String],
    // 	fun1: {
    // 		question: String,
    // 		answer: String
    // 	},
    // 	fun2: {
    // 		question: String,
    // 		answer: String
    // 	},
    // },
    resume: {
      path: String,
      size: Number,
      extractedText: String,
    },
    teammates: [String],

    flagForUpdate: Boolean,
  }).index(
    {
      "name": "text",
      "university": "text",
      "major": "text",
      "year": "text",
      "timezone": "text",
      // "lookingFor.timeframe": "text",
      // "lookingFor.comments": "text",
      // "interestingDetails.favoriteLanguages": "text",
      // "interestingDetails.fun1.answer": "text",
      // "interestingDetails.fun2.answer": "text",
      "resume.extractedText": "text",
    },
    {
      weights: {
        // Default weight is 1
        "name": 1,
        "university": 2,
        "major": 2,
        "year": 2,
        "timezone": 2,
        // "lookingFor.timeframe": 5,
        // "lookingFor.comments": 5,
        // "interestingDetails.favoriteLanguages": 5,
        // "interestingDetails.fun1.answer": 2,
        // "interestingDetails.fun2.answer": 2,
        "resume.extractedText": 10,
      },
      name: "ParticipantSearchIndex",
    }
  )
);

//
// Template schema
//

export interface TemplateContent {
  siteTitle: string;
  title?: string;
}
