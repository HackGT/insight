"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_session_1 = __importDefault(require("express-session"));
const connect_mongo_1 = __importDefault(require("connect-mongo"));
const common_1 = require("../common");
const schema_1 = require("../schema");
const strategies_1 = require("./strategies");
const app_1 = require("../app");
const passport = require("passport");
if (!common_1.config.server.isProduction) {
    console.warn("OAuth callback(s) running in development mode");
}
else {
    app_1.app.enable("trust proxy");
}
if (!common_1.config.sessionSecretSet) {
    console.warn("No session secret set; sessions won't carry over server restarts");
}
app_1.app.use((0, express_session_1.default)({
    name: "insightid",
    secret: common_1.config.secrets.session,
    cookie: common_1.COOKIE_OPTIONS,
    resave: false,
    store: connect_mongo_1.default.create({
        mongoUrl: common_1.config.server.mongoURL,
        touchAfter: 24 * 60 * 60,
    }),
    saveUninitialized: false,
}));
passport.serializeUser((user, done) => {
    done(null, user.uuid);
});
passport.deserializeUser(async (id, done) => {
    const user = await schema_1.User.findOne({ uuid: id });
    if (user) {
        done(null, user);
    }
    else {
        done("No user found", undefined);
    }
});
app_1.app.use(passport.initialize());
app_1.app.use(passport.session());
const groundTruthStrategy = new strategies_1.GroundTruthStrategy(common_1.config.secrets.groundTruth.url);
passport.use(groundTruthStrategy);

//# sourceMappingURL=auth.js.map
