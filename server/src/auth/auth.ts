import session from "express-session";
import MongoStore from "connect-mongo";

import { config, mongoose, COOKIE_OPTIONS } from "../common";
import { User } from "../schema";
import { GroundTruthStrategy } from "./strategies";

// Passport authentication
import { app } from "../app";

const passport = require("passport") as typeof import("passport");

if (!config.server.isProduction) {
  console.warn("OAuth callback(s) running in development mode");
} else {
  app.enable("trust proxy");
}

if (!config.sessionSecretSet) {
  console.warn("No session secret set; sessions won't carry over server restarts");
}

export const sessionMiddleware = session({
  name: "insightid",
  secret: config.secrets.session,
  cookie: COOKIE_OPTIONS,
  resave: false,
  store: MongoStore.create({
    mongoUrl: config.server.mongoURL,
    touchAfter: 24 * 60 * 60, // Check for TTL every 24 hours at minimum
  }),
  saveUninitialized: false,
});

app.use(sessionMiddleware);

passport.serializeUser<string>((user, done) => {
  done(null, user.uuid);
});

passport.deserializeUser<string>(async (id, done) => {
  const user = await User.findOne({ uuid: id });

  if (user) {
    done(null, user);
  } else {
    done("No user found", undefined);
  }
});

app.use(passport.initialize());
app.use(passport.session());

const groundTruthStrategy = new GroundTruthStrategy(config.secrets.groundTruth.url);

passport.use(groundTruthStrategy);
