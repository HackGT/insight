import express from "express";

import { formatName } from "../../common";
import { authenticateWithRedirect } from "../../middleware";
import { IUser, Participant } from "../../schema";
import { agenda } from "../../jobs";

export const participantRoutes = express.Router();

interface IFormattedParticipant {
  name: string;
  email: string;
  school: string;
  major: string;
  // lookingFor: string;
  // lookingForComments: string;
  // favoriteLanguages: string;
  // fun1: string | undefined;
  // fun1Answer: string;
  // fun2: string | undefined;
  // fun2Answer: string;
  resume: string | undefined;
  resumeText: string;
  resumeFailReason: string | undefined;
}

participantRoutes.route("/").get(authenticateWithRedirect, async (request, response) => {
  const user = request.user as IUser;
  console.log(user);
  const participant = await Participant.findOne({ email: user.email });
  const resumeParseJobsUnsorted = await agenda.jobs({
    "name": "parse-resume",
    "data.uuid": user.uuid,
  });
  const resumeParseJobs = resumeParseJobsUnsorted.sort((a: any, b: any) =>
    a?.attrs.lastFinishedAt > b?.attrs.lastFinishedAt ? -1 : 1
  );
  let invalidResume = false;
  if (resumeParseJobs[0]?.attrs.failReason) {
    invalidResume = true;
  }

  let formattedParticipant: IFormattedParticipant | null = null;

  if (participant) {
    formattedParticipant = {
      name: participant.name,
      email: participant.email,
      school: participant.university ?? "N/A",
      major: participant.major ?? "N/A",
      // lookingFor: participant.lookingFor?.timeframe?.join(", ") ?? "N/A",
      // lookingForComments: participant.lookingFor?.comments ?? "N/A",
      // favoriteLanguages: participant.interestingDetails?.favoriteLanguages?.join(", ") ?? "None",
      // fun1: participant.interestingDetails?.fun1?.question,
      // fun1Answer: participant.interestingDetails?.fun1?.answer ?? "N/A",
      // fun2: participant.interestingDetails?.fun2?.question,
      // fun2Answer: participant.interestingDetails?.fun2?.answer ?? "N/A",
      resume: invalidResume ? undefined : participant.resume?.path,
      resumeText:
        participant.resume?.extractedText?.trim().replace(/(\r?\n){2,}/g, "\n") ??
        "Your resume is currently being parsed. Check back in a few minutes.",
      resumeFailReason: resumeParseJobs[0]?.attrs.failReason,
    };
  }

  response.json(formattedParticipant);
});
