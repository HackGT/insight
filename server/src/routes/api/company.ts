/* eslint-disable no-underscore-dangle */
import express from "express";
import { mongoose } from "../../common";

import { isAdminOrEmployee, postParser, isAdmin } from "../../middleware";
import { Company, createNew, ICompany, IUser, User } from "../../schema";

export const companyRoutes = express.Router();

companyRoutes.route("/").get(isAdminOrEmployee, async (request, response) => {
  console.log(request.user);
  const rawCompanies: (ICompany & { users: IUser[] })[] = await Company.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "company.company",
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

companyRoutes
  .route("/:company/employee/:employee")
  // Approve pending employees
  .patch(isAdminOrEmployee, async (request, response) => {
    const user = await User.findOne({ email: request.params.employee });
    if (!user) {
      response.status(400).json({
        error: "No existing user found with that email",
      });
      return;
    }
    if (!user.company || user.company.company._id.toString() !== request.params.company) {
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
  // Remove employees from company
  .delete(isAdminOrEmployee, async (request, response) => {
    const user = await User.findOne({ email: request.params.employee });
    if (!user) {
      response.status(400).json({
        error: "No existing user found with that email",
      });
      return;
    }
    if (!user.company || user.company.company._id.toString() !== request.params.company) {
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
  // Directly add employee to company
  .post(isAdminOrEmployee, async (request, response) => {
    const user = await User.findOne({ email: request.params.employee });
    if (!user) {
      response.status(400).json({
        error: "No existing user found with that email",
      });
      return;
    }
    const company = await Company.findById(request.params.company);
    if (!company) {
      response.status(400).json({
        error: "Unknown company",
      });
      return;
    }

    user.company = {
      company: new mongoose.Types.ObjectId(request.params.company),
      verified: true,
      scannerIDs: [],
    };

    await user.save();
    response.json({
      success: true,
    });
  });

companyRoutes
  .route("/:company/employee/:employee/scanners/:scanners?")
  // Change attached scanners
  .patch(isAdminOrEmployee, async (request, response) => {
    const user = await User.findOne({ email: request.params.employee });
    if (!user) {
      response.status(400).json({
        error: "No existing user found with that email",
      });
      return;
    }
    if (!user.company || user.company.company._id.toString() !== request.params.company) {
      response.status(400).json({
        error: "User has invalid company set",
      });
      return;
    }

    const scanners = (request.params.scanners || "")
      .split(", ")
      .filter(scanner => !!scanner)
      .map(scanner => scanner.replace(/,/g, "").trim().toLowerCase());
    // Check if scanner is already tied to another company
    for (const scanner of scanners) {
      // eslint-disable-next-line no-await-in-loop
      const existingScanners = await User.find({
        "company.scannerIDs": scanner,
        "company.company": { $ne: user?.company?.company },
      });
      if (existingScanners.length > 0) {
        response.json({
          error: `Scanner ID ${scanner} is already associated with another company`,
        });
        return;
      }
    }

    user.company.scannerIDs = [...new Set(scanners)]; // Eliminates duplicates
    await user.save();
    response.json({
      success: true,
    });
  });

companyRoutes
  .route("/:company")
  // Get company user information
  .get(isAdminOrEmployee, async (request, response) => {
    const company = await Company.findById(request.params.company);
    if (!company) {
      response.status(400).json({
        error: "Unknown company",
      });
      return;
    }

    const users = await User.find({ "company.company": company, "company.verified": true });
    const pendingUsers = await User.find({
      "company.company": company,
      "company.verified": false,
    });

    response.json({
      users,
      pendingUsers,
      company,
    });
  })
  // Rename company or update hasResumeAccess
  .patch(isAdminOrEmployee, postParser, async (request, response) => {
    const company = await Company.findById(request.params.company);
    if (!company) {
      response.status(400).json({
        error: "Unknown company",
      });
      return;
    }

    const name = (request.body.name || "").trim();
    const { hasResumeAccess } = request.body;

    // if (!name) {
    //   response.status(400).json({
    //     error: "Invalid name",
    //   });
    //   return;
    // }

    if (name) {
      const existingCompany = await Company.findOne({ name });
      if (existingCompany) {
        response.status(409).json({
          error: "A company with that name already exists",
        });
        return;
      }
      company.name = name;
    }

    if (hasResumeAccess !== undefined) {
      company.hasResumeAccess = hasResumeAccess;
    }

    await company.save();
    response.json({
      success: true,
    });
  })
  // Delete company
  .delete(isAdmin, async (request, response) => {
    const company = await Company.findById(request.params.company);
    if (!company) {
      response.status(400).json({
        error: "Unknown company",
      });
      return;
    }

    await User.updateMany({ "company.company": company }, { $set: { company: null } });
    await company.remove();
    response.json({
      success: true,
    });
  })
  // Create new company
  .post(isAdmin, async (request, response) => {
    const name = (request.params.company || "").trim();
    if (!name) {
      response.status(400).json({
        error: "Company name cannot be blank",
      });
    }
    const company = createNew(Company, { name, visits: [] });
    await company.save();
    response.json({
      success: true,
    });
  });

companyRoutes
  .route("/:company/join")
  // Request to join company
  .post(async (request, response) => {
    const uuid = (request.user as IUser | undefined)?.uuid;
    const user = await User.findOne({ uuid });
    if (user?.type !== "employer") {
      response.status(403).json({
        error: "Must be an employer",
      });
      return;
    }
    const company = await Company.findById(request.params.company);
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
      company: company._id,
      verified: false,
      scannerIDs: [],
    };

    await user.save();
    response.json({
      success: true,
    });
  });
