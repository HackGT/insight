import { agenda, JobHandler } from ".";
import { wait } from "../common";
import { getAllParticipants } from "../registration";
import { Participant, createNew } from "../schema";

export const updateParticipantDataJobHandler: JobHandler = async job => {
  const start = Date.now();
  const participants = await getAllParticipants();
  const time = Date.now() - start;
  job.attrs.data = job.attrs.data || {};
  job.attrs.data.registration = {
    elapsedMs: time,
    count: participants.length,
  };
  await job.save();

  for (const participant of participants) {
    const existingParticipant = await Participant.findOne({ uuid: participant.uuid });
    if (existingParticipant && existingParticipant.flagForUpdate) {
      // Update all fields but preserve the document's ID
      await Participant.updateOne(
        { _id: existingParticipant._id },
        {
          ...participant,
          _id: existingParticipant._id,
        }
      );

      await agenda.now("parse-resume", { uuid: participant.uuid, type: "Flagged for update" });
    } else if (!existingParticipant) {
      await createNew(Participant, participant).save();
      await agenda.now("parse-resume", { uuid: participant.uuid, type: "New participant" });
    }

    await wait(100);
    await job.touch();
  }
};
