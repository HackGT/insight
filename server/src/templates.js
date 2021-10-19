"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uiRoutes = exports.Template = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const express = __importStar(require("express"));
const Handlebars = __importStar(require("handlebars"));
const common_1 = require("./common");
const middleware_1 = require("./middleware");
const schema_1 = require("./schema");
const jobs_1 = require("./jobs");
Handlebars.registerHelper("ifCond", function (v1, v2, options) {
    if (v1 === v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});
Handlebars.registerHelper("ifIn", function (elem, list, options) {
    if (list.includes(elem)) {
        return options.fn(this);
    }
    return options.inverse(this);
});
Handlebars.registerHelper("attr", (name, value) => {
    if (value) {
        value = value.replace(/"/g, "&quot;");
        return `${name}="${value}"`;
    }
    return "";
});
Handlebars.registerHelper("join", (arr) => arr.join(", "));
Handlebars.registerHelper("formatName", (name) => (0, common_1.formatName)({ name }));
if (common_1.config.server.isProduction) {
    Handlebars.registerPartial("main", fs.readFileSync(path.resolve("src/ui", "partials", "main.hbs"), "utf8"));
}
class Template {
    constructor(file) {
        this.file = file;
        this.template = null;
        this.loadTemplate();
    }
    loadTemplate() {
        const data = fs.readFileSync(path.resolve("src/ui", this.file), "utf8");
        this.template = Handlebars.compile(data);
    }
    render(input) {
        if (!common_1.config.server.isProduction) {
            Handlebars.registerPartial("main", fs.readFileSync(path.resolve("src/ui", "partials", "main.hbs"), "utf8"));
            this.loadTemplate();
        }
        const renderData = {
            siteTitle: common_1.config.server.name,
            ...input,
        };
        return this.template(renderData);
    }
}
exports.Template = Template;
const IndexTemplate = new Template("index.hbs");
const PreEmployerTemplate = new Template("preemployer.hbs");
const EmployerTemplate = new Template("employer.hbs");
const LoginTemplate = new Template("login.hbs");
const AdminTemplate = new Template("admin.hbs");
exports.uiRoutes = express.Router();
function serveStatic(url, file) {
    exports.uiRoutes.route(url).get((request, response) => {
        response.header("Cache-Control", "private");
        response.type(path.extname(file));
        fs.createReadStream(path.resolve("src/ui", file)).pipe(response);
    });
}
serveStatic("/js/common.js", "common.js");
serveStatic("/js/admin.js", "admin.js");
serveStatic("/js/preemployer.js", "preemployer.js");
serveStatic("/js/employer.js", "employer.js");
serveStatic("/js/index.js", "index.js");
serveStatic("/css/main.css", "main.css");
serveStatic("/css/bulma-tooltip.min.css", "bulma-tooltip.min.css");
exports.uiRoutes.route("/").get(middleware_1.authenticateWithRedirect, async (request, response) => {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (request.session) {
        const url = request.session.returnTo;
        if (url && url !== "/") {
            request.session.returnTo = undefined;
            response.redirect(url);
            return;
        }
    }
    const user = request.user;
    let users = [];
    let pendingUsers = [];
    let company = null;
    if (user.company && user.company.verified) {
        users = await schema_1.User.find({ "company.name": user.company.name, "company.verified": true });
        pendingUsers = await schema_1.User.find({
            "company.name": user.company.name,
            "company.verified": false,
        });
        company = await schema_1.Company.findOne({ name: user.company.name });
    }
    if (user.type === "employer") {
        const templateData = {
            user,
            companies: await schema_1.Company.aggregate([
                {
                    $sort: {
                        name: 1,
                    },
                },
            ]),
            company,
            users,
            pendingUsers,
        };
        if (user.company && user.company.verified) {
            response.send(EmployerTemplate.render(templateData));
        }
        else {
            response.send(PreEmployerTemplate.render(templateData));
        }
    }
    else {
        const participant = await schema_1.Participant.findOne({ uuid: user.uuid });
        const resumeParseJobsUnsorted = await jobs_1.agenda.jobs({
            "name": "parse-resume",
            "data.uuid": user.uuid,
        });
        const resumeParseJobs = resumeParseJobsUnsorted.sort((a, b) => (a === null || a === void 0 ? void 0 : a.attrs.lastFinishedAt) > (b === null || b === void 0 ? void 0 : b.attrs.lastFinishedAt) ? -1 : 1);
        let invalidResume = false;
        if ((_a = resumeParseJobs[0]) === null || _a === void 0 ? void 0 : _a.attrs.failReason) {
            invalidResume = true;
        }
        let formattedParticipant = null;
        if (participant) {
            formattedParticipant = {
                name: participant.name,
                email: participant.email,
                school: (_b = participant.university) !== null && _b !== void 0 ? _b : "N/A",
                major: (_c = participant.major) !== null && _c !== void 0 ? _c : "N/A",
                resume: invalidResume ? undefined : (_d = participant.resume) === null || _d === void 0 ? void 0 : _d.path,
                resumeText: (_g = (_f = (_e = participant.resume) === null || _e === void 0 ? void 0 : _e.extractedText) === null || _f === void 0 ? void 0 : _f.trim().replace(/(\r?\n){2,}/g, "\n")) !== null && _g !== void 0 ? _g : "Your resume is currently being parsed. Check back in a few minutes.",
                resumeFailReason: (_h = resumeParseJobs[0]) === null || _h === void 0 ? void 0 : _h.attrs.failReason,
            };
        }
        const templateData = {
            user,
            participant: formattedParticipant,
        };
        response.send(IndexTemplate.render(templateData));
    }
});
exports.uiRoutes.route("/login").get(async (request, response) => {
    const errorMessage = request.flash("error");
    if (request.session && request.session.loginAction === "render") {
        request.session.loginAction = "redirect";
        const templateData = {
            title: "Log out",
            isLogOut: true,
        };
        response.send(LoginTemplate.render(templateData));
    }
    else if (errorMessage.length > 0) {
        const templateData = {
            title: "Log out",
            error: errorMessage.join(" "),
            isLogOut: false,
        };
        response.send(LoginTemplate.render(templateData));
    }
    else {
        response.redirect("/auth/login");
    }
});
exports.uiRoutes.route("/logout").all((request, response) => {
    response.redirect("/auth/logout");
});
exports.uiRoutes.route("/admin").get(middleware_1.isAdmin, async (request, response) => {
    const user = request.user;
    const rawCompanies = await schema_1.Company.aggregate([
        {
            $lookup: {
                from: "users",
                localField: "name",
                foreignField: "company.name",
                as: "users",
            },
        },
        {
            $sort: {
                name: 1,
            },
        },
    ]);
    const companies = rawCompanies.map(company => ({
        ...company,
        users: company.users.filter(user => user.company && user.company.verified),
        pendingUsers: company.users.filter(user => !user.company || !user.company.verified),
    }));
    const templateData = {
        uuid: user.uuid,
        companies,
        adminDomains: common_1.config.server.adminDomains,
        admins: common_1.config.server.admins,
        currentAdmins: await schema_1.User.find({ admin: true }).sort("name.last"),
    };
    response.send(AdminTemplate.render(templateData));
});

//# sourceMappingURL=templates.js.map
