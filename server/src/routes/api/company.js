"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.companyRoutes = void 0;
const express_1 = __importDefault(require("express"));
const middleware_1 = require("../../middleware");
const schema_1 = require("../../schema");
exports.companyRoutes = express_1.default.Router();
exports.companyRoutes.route("/").get(async (request, response) => {
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
    response.json({
        companies,
    });
});
exports.companyRoutes
    .route("/:company/employee/:employee")
    .patch(middleware_1.isAdminOrEmployee, async (request, response) => {
    const user = await schema_1.User.findOne({ email: request.params.employee });
    if (!user) {
        response.status(400).json({
            error: "No existing user found with that email",
        });
        return;
    }
    if (!user.company || user.company.name !== request.params.company) {
        response.status(400).json({
            error: "User has invalid company set",
        });
        return;
    }
    user.company.verified = true;
    await user.save();
    response.json({
        success: true,
    });
})
    .delete(middleware_1.isAdminOrEmployee, async (request, response) => {
    const user = await schema_1.User.findOne({ email: request.params.employee });
    if (!user) {
        response.status(400).json({
            error: "No existing user found with that email",
        });
        return;
    }
    if (!user.company || user.company.name !== request.params.company) {
        response.status(400).json({
            error: "User has invalid company set",
        });
        return;
    }
    user.company = null;
    await user.save();
    response.json({
        success: true,
    });
})
    .post(middleware_1.isAdminOrEmployee, async (request, response) => {
    const user = await schema_1.User.findOne({ email: request.params.employee });
    if (!user) {
        response.status(400).json({
            error: "No existing user found with that email",
        });
        return;
    }
    const company = await schema_1.Company.findOne({ name: request.params.company });
    if (!company) {
        response.status(400).json({
            error: "Unknown company",
        });
        return;
    }
    user.company = {
        name: request.params.company,
        verified: true,
        scannerIDs: [],
    };
    await user.save();
    response.json({
        success: true,
    });
});
exports.companyRoutes
    .route("/:company/employee/:employee/scanners/:scanners?")
    .patch(middleware_1.isAdminOrEmployee, async (request, response) => {
    const user = await schema_1.User.findOne({ email: request.params.employee });
    if (!user) {
        response.status(400).json({
            error: "No existing user found with that email",
        });
        return;
    }
    if (!user.company || user.company.name !== request.params.company) {
        response.status(400).json({
            error: "User has invalid company set",
        });
        return;
    }
    const scanners = (request.params.scanners || "")
        .split(", ")
        .filter(scanner => !!scanner)
        .map(scanner => scanner.replace(/,/g, "").trim().toLowerCase());
    for (const scanner of scanners) {
        const existingScanners = await schema_1.User.find({
            "company.scannerIDs": scanner,
            "company.name": { $ne: user.company.name },
        });
        if (existingScanners.length > 0) {
            response.json({
                error: `Scanner ID ${scanner} is already associated with another company`,
            });
            return;
        }
    }
    user.company.scannerIDs = [...new Set(scanners)];
    await user.save();
    response.json({
        success: true,
    });
});
exports.companyRoutes
    .route("/:company")
    .patch(middleware_1.isAdminOrEmployee, middleware_1.postParser, async (request, response) => {
    const company = await schema_1.Company.findOne({ name: request.params.company });
    if (!company) {
        response.status(400).json({
            error: "Unknown company",
        });
        return;
    }
    const name = (request.body.name || "").trim();
    console.log(request.body);
    if (!name) {
        response.status(400).json({
            error: "Invalid name",
        });
        return;
    }
    const existingCompany = await schema_1.Company.findOne({ name });
    if (existingCompany) {
        response.status(409).json({
            error: "A company with that name already exists",
        });
        return;
    }
    company.name = name;
    await schema_1.User.updateMany({ "company.name": request.params.company }, { $set: { "company.name": name } });
    await company.save();
    response.json({
        success: true,
    });
})
    .delete(middleware_1.isAdmin, async (request, response) => {
    const company = await schema_1.Company.findOne({ name: request.params.company });
    if (!company) {
        response.status(400).json({
            error: "Unknown company",
        });
        return;
    }
    await schema_1.User.updateMany({ "company.name": request.params.company }, { $set: { company: null } });
    await company.remove();
    response.json({
        success: true,
    });
})
    .post(middleware_1.isAdmin, async (request, response) => {
    const name = (request.params.company || "").trim();
    if (!name) {
        response.status(400).json({
            error: "Company name cannot be blank",
        });
    }
    const company = (0, schema_1.createNew)(schema_1.Company, { name, visits: [] });
    await company.save();
    response.json({
        success: true,
    });
});
exports.companyRoutes
    .route("/:company/join")
    .post(async (request, response) => {
    var _a;
    const uuid = (_a = request.user) === null || _a === void 0 ? void 0 : _a.uuid;
    const user = await schema_1.User.findOne({ uuid });
    if ((user === null || user === void 0 ? void 0 : user.type) !== "employer") {
        response.status(403).json({
            error: "Must be an employer",
        });
        return;
    }
    const company = await schema_1.Company.findOne({ name: request.params.company });
    if (!company) {
        response.status(400).json({
            error: "Unknown company",
        });
        return;
    }
    if (!user) {
        response.status(400).json({
            error: "Unknown user",
        });
        return;
    }
    user.company = {
        name: company.name,
        verified: false,
        scannerIDs: [],
    };
    await user.save();
    response.json({
        success: true,
    });
});

//# sourceMappingURL=company.js.map
