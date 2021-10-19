import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as express from "express";

import { IUser, IVisit, Visit, Participant, User } from "./schema";
import { postParser, isAdmin, isAnEmployer, apiAuth, authenticateWithRedirect } from "./middleware";
import { config } from "./common";
import { agenda } from "./jobs";
import { adminRoutes } from "./routes/api/admin";
import { scannerRoutes } from "./routes/api/scanner";
import { companyRoutes } from "./routes/api/company";
import { visitRoutes } from "./routes/api/visit";
import { participantRoutes } from "./routes/api/participant";

export const apiRoutes = express.Router();

apiRoutes.use("/admin", isAdmin, postParser, adminRoutes);
apiRoutes.use("/scanner", scannerRoutes);
apiRoutes.use("/company", companyRoutes);
apiRoutes.use("/visit", visitRoutes);
apiRoutes.use("/participant", participantRoutes);

// Used to authorize WebSocket connections
apiRoutes.route("/authorize").get(authenticateWithRedirect, async (request, response) => {
  const user = request.user as IUser;
  const time = Date.now();

  response.json({
    success: true,
    uuid: user.uuid,
    time: time.toString(),
    token: crypto
      .createHmac("sha256", config.secrets.apiKey + time)
      .update(user.uuid)
      .digest()
      .toString("hex"),
  });
});

apiRoutes
  .route("/export")
  .get(apiAuth, async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    const jobID = (request.query.id as string) || "";
    if (!jobID) {
      response.status(404).send("Invalid download ID");
    }
    const filetype = (request.query.filetype as string) || "";
    if (filetype !== "zip" && filetype !== "csv") {
      response.status(400).send();
      return;
    }

    const file = path.join(os.tmpdir(), `${jobID}.${filetype}`);
    const stream = fs.createReadStream(file);
    stream.on("end", async () => {
      await fs.promises.unlink(file);
    });
    stream.on("error", err => {
      console.error(err);
      response.status(404).send("Invalid download ID");
    });
    response.attachment(`export.${filetype}`);
    stream.pipe(response);
  })
  .post(apiAuth, postParser, async (request, response) => {
    const user = request.user as IUser | undefined;
    const type = (request.body.type as string) || "";
    const filetype = (request.body.filetype as "zip" | "csv") || "";
    if (filetype !== "zip" && filetype !== "csv") {
      response.json({
        error: "Invalid download file type",
      });
      return;
    }

    const jobID = crypto.randomBytes(16).toString("hex");
    let participantIDs: string[] = [];
    if (type === "all") {
      participantIDs = (await Participant.find().sort({ name: 1 })).map(p => p.uuid);
    } else if (type === "visited") {
      if (!user?.company?.verified) {
        response.json({
          error: "Must be authenticated as an employer if downloading visited resumes",
        });
        return;
      }
      participantIDs = (
        await Visit.aggregate([
          { $match: { company: user.company.name } },
          { $sort: { time: -1 } }, // Sort newest first
        ])
      ).map(v => v.participant);
    } else if (type === "selected") {
      participantIDs = JSON.parse(request.body.ids || "[]");
    } else {
      response.json({
        error: "Invalid download request type",
      });
      return;
    }

    const jobName = filetype === "csv" ? "export-csv" : "export";
    await agenda.now(jobName, {
      id: jobID,
      participantIDs,
      requesterUUID: user?.uuid,
      requesterName: user?.name,
    });
    response.json({ success: true, id: jobID });
  });

apiRoutes.route("/search").get(isAnEmployer, async (request, response) => {
  const user = request.user as IUser;
  const query: string = String(request.query.q) || "";
  console.log(query, "/search here");
  const PAGE_SIZE = 20;
  let page = parseInt(String(request.query.page || ""));
  if (Number.isNaN(page) || page < 0) {
    page = 0;
  }
  let filterTags: string[] = [];
  try {
    const json = JSON.parse(String(request.query.filter || ""));
    if (Array.isArray(json)) filterTags = json;
  } catch {}

  const pipeline: any[] = [];
  if (query) {
    pipeline.push({ $match: { $text: { $search: query } } });
    pipeline.push({ $sort: { score: { $meta: "textScore" } } });
  }

  pipeline.push({
    $lookup: {
      from: "visits",
      localField: "uuid",
      foreignField: "participant",
      as: "visitData",
    },
  });
  if (filterTags.length > 0) {
    pipeline.push({ $match: { "visitData.tags": { $elemMatch: { $in: filterTags } } } });
  }
  const total = (await Participant.aggregate(pipeline)).length;
  pipeline.push({ $skip: page * PAGE_SIZE });
  pipeline.push({ $limit: PAGE_SIZE });
  pipeline.push({ $project: { "resume.extractedText": 0 } }); // Not needed so let's reduce response size

  let participants = await Participant.aggregate(pipeline);

  // visitData will be returned from MongoDB as an array containing _all_ visits
  // Make sure that visitData is turned from an array into the single company visit or else null
  participants = participants.map(p => ({
    ...p,
    visitData: p.visitData.filter((v: IVisit) => v.company === user.company?.name)[0] ?? null,
  }));

  response.json({
    success: true,
    page,
    pageSize: PAGE_SIZE,
    total,
    participants,
  });
});

apiRoutes.route("/tags").get(isAnEmployer, async (request, response) => {
  const user = request.user as IUser | undefined;
  if (!user?.company?.verified) {
    response.status(403).send();
    return;
  }

  const tagResults: { tags: string[] }[] = await Visit.aggregate([
    { $match: { company: user.company.name } },
    { $unwind: "$tags" },
    { $group: { _id: "tags", tags: { $addToSet: "$tags" } } },
  ]);
  let tags = tagResults[0]?.tags ?? [];
  tags = tags.sort();
  response.json({
    success: true,
    tags,
  });
});

apiRoutes.route("/adminInfo").get(isAdmin, async (request, response) => {
  response.json({
    adminDomains: config.server.adminDomains,
    adminEmails: config.server.admins,
    currentAdmins: await User.find({ admin: true }).sort("name.last"),
  });
});
