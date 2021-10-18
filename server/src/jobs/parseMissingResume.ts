import { agenda, JobHandler } from ".";
import { Participant } from "../schema";

export const parseMissingResumeJobHandler: JobHandler = async () => {
  const participants = await Participant.find({ "resume.extractedText": { $exists: false } });

  await Promise.all(
    participants.map(participant =>
      agenda.now("parse-resume", { uuid: participant.uuid, type: "Missing extracted text" })
    )
  );
};
