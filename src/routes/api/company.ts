import express from "express";

import { isAdminOrEmployee, postParser, isAdmin } from "../../middleware";
import { Company, createNew, IUser, User } from "../../schema";

async function addRemoveEmployee(
  action: (user: IUser) => void,
  request: express.Request,
  response: express.Response
) {
  const user = await User.findOne({ email: request.params.employee });
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

  action(user);
  await user.save();
  response.json({
    success: true,
  });
}

export const companyRoutes = express.Router();

companyRoutes
  .route("/:company/employee/:employee")
  // Approve pending employees
  .patch(
    isAdminOrEmployee,
    addRemoveEmployee.bind(null, user => (user.company!.verified = true))
  )
  // Remove employees from company
  .delete(
    isAdminOrEmployee,
    addRemoveEmployee.bind(null, user => (user.company = null))
  )
  // Directly add employee to company
  .post(isAdminOrEmployee, async (request, response) => {
    const user = await User.findOne({ email: request.params.employee });
    if (!user) {
      response.status(400).json({
        error: "No existing user found with that email",
      });
      return;
    }
    const company = await Company.findOne({ name: request.params.company });
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
    // Check if scanner is already tied to another company
    for (const scanner of scanners) {
      const existingScanners = await User.find({
        "company.scannerIDs": scanner,
        "company.name": { $ne: user!.company!.name },
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
  // Rename company
  .patch(isAdminOrEmployee, postParser, async (request, response) => {
    const company = await Company.findOne({ name: request.params.company });
    if (!company) {
      response.status(400).json({
        error: "Unknown company",
      });
      return;
    }
    const name: string = (request.body.name || "").trim();
    if (!name) {
      response.status(400).json({
        error: "Invalid name",
      });
      return;
    }
    const existingCompany = await Company.findOne({ name });
    if (existingCompany) {
      response.status(409).json({
        error: "A company with that name already exists",
      });
      return;
    }

    company.name = name;
    await User.updateMany(
      { "company.name": request.params.company },
      { $set: { "company.name": name } }
    );
    await company.save();
    response.json({
      success: true,
    });
  })
  // Delete company
  .delete(isAdmin, async (request, response) => {
    const company = await Company.findOne({ name: request.params.company });
    if (!company) {
      response.status(400).json({
        error: "Unknown company",
      });
      return;
    }

    await User.updateMany({ "company.name": request.params.company }, { $set: { company: null } });
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
    const company = await Company.findOne({ name: request.params.company });
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
