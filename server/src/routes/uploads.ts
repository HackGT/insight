import * as crypto from "crypto";
import * as path from "path";
import * as fs from "fs";
import express from "express";

import { config, S3_ENGINE } from "../common";
import { authenticateWithRedirect, uploadHandler } from "../middleware";
import { IUser, Participant, User } from "../schema";
import { agenda } from "../jobs";

function publicLink(file: string): string {
  file = path.basename(file);
  const time = Date.now();
  const key = crypto
    .createHmac("sha256", config.secrets.apiKey + time)
    .update(file)
    .digest()
    .toString("hex");
  return `${file}?key=${key}&time=${time}`;
}

export const uploadsRoutes = express.Router();

uploadsRoutes.route("/:file").get(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  const user = request.user as IUser | undefined;

  const key = (request.query.key as string) || "";
  const time = parseInt((request.query.time as string) || "");
  const correctHash = crypto
    .createHmac("sha256", config.secrets.apiKey + time)
    .update(request.params.file)
    .digest()
    .toString("hex");

  // Access:
  // - All employers can GET all resumes
  // - Participants can GET their own resume
  if (!user && key !== correctHash) {
    response.status(401).send();
    return;
  }
  if (user && user.type !== "employer" && !user.admin) {
    const participant = await Participant.findOne({ uuid: user.uuid });
    if (
      !participant ||
      !participant.resume?.path ||
      path.basename(participant.resume.path) !== request.params.file
    ) {
      response.status(403).send();
      return;
    }
  }

  if (request.query.public === "true") {
    response.json({
      success: true,
      link: publicLink(request.params.file),
    });
    return;
  }
  console.log(`${request.params.file} requested`);
  try {
    const stream = await S3_ENGINE.readFile(request.params.file);
    console.log(stream);
    if (request.query.download === "true") {
      response.attachment(request.params.file);
    }
    stream.pipe(response);
  } catch {
    response.status(404).send("The requested file could not be found");
  }
});

uploadsRoutes
  .route("/")
  .post(authenticateWithRedirect, uploadHandler.single("resume"), async (request, response) => {
    const user = await User.findOne({ uuid: (request.user as IUser).uuid });
    const participant = await Participant.findOne({ uuid: user ? user.uuid : "" });
    const resume = request.file;

    if (!resume) {
      response.status(400).send({ error: true, message: "No resume sent" });
      return;
    }

    // Access:
    // - Only participants can update their resumes
    // - Participants can only update their own resume
    if (!user || !participant || user.type !== "participant") {
      if (resume) {
        await fs.promises.unlink(resume.path);
      }
      response.status(403).send();
      return;
    }

    if (participant.resume?.path) {
      try {
        await S3_ENGINE.deleteFile(participant.resume.path);
      } catch (err) {
        console.error("Could not delete existing resume from S3:", err);
      }
    }

    try {
      await S3_ENGINE.saveFile(resume.path, resume.filename);
    } catch (err) {
      console.error("Could not delete existing resume from S3:", err);
      response.status(403).send();
      return;
    }

    await fs.promises.unlink(resume.path);
    participant.resume = {
      path: `uploads/${resume.filename}`,
      size: resume.size,
    };
    await participant.save();
    await agenda.now("parse-resume", { uuid: participant.uuid });

    response.status(201).send();
  });
