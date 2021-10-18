import * as path from "path";

import { JobHandler } from ".";
import { S3_ENGINE } from "../common";
import { Participant } from "../schema";

export const parseResumeJobHandler: JobHandler = async job => {
  const { uuid } = job.attrs.data;
  const participant = await Participant.findOne({ uuid });
  if (!participant) {
    job.fail(`Participant does not exist`);
    await job.save();
    return;
  }
  if (!participant.resume || !participant.resume.path) {
    job.fail(`No resume defined`);
    await job.save();
    return;
  }
  let textResult;
  try {
    textResult = await S3_ENGINE.getText(path.basename(participant.resume.path));
  } catch (err) {
    console.log("Error: Cannot parse resume", err);
  }

  if (textResult === null) {
    job.fail(`Unsupported format: ${participant.resume.path}`);
    await job.save();
    return;
  }
  participant.resume.extractedText = textResult;
  await participant.save();
};
