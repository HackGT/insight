import session from "express-session";
import connectMongo from "connect-mongo";
const MongoStore = connectMongo(session);
const passport = require("passport") as typeof import("passport");

import {
	config, mongoose, COOKIE_OPTIONS
} from "../common";
import {
	IUser, User
} from "../schema";
import {
	GroundTruthStrategy
} from "./strategies";

// Passport authentication
import { app } from "../app";

if (!config.server.isProduction) {
	console.warn("OAuth callback(s) running in development mode");
}
else {
	app.enable("trust proxy");
}

if (!config.sessionSecretSet) {
	console.warn("No session secret set; sessions won't carry over server restarts");
}

app.use(session({
	name: "insightid",
	secret: config.secrets.session,
	cookie: COOKIE_OPTIONS,
	resave: false,
	store: new MongoStore({
		mongooseConnection: mongoose.connection,
		touchAfter: 24 * 60 * 60 // Check for TTL every 24 hours at minimum
	}),
	saveUninitialized: false
}));

passport.serializeUser<IUser, string>((user, done) => {
	done(null, user.uuid);
});

passport.deserializeUser<IUser, string>((id, done) => {
	User.findOne({ uuid: id }, (err, user) => {
		done(err, user!);
	});
});

app.use(passport.initialize());
app.use(passport.session());

const groundTruthStrategy = new GroundTruthStrategy(config.secrets.groundTruth.url);

passport.use(groundTruthStrategy);
