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
  console.log(`Updating ${participants.length} participant(s)`);
  for (const participant of participants) {
    let existingParticipant = await Participant.findOne({ uuid: participant.uuid });
    if (existingParticipant && existingParticipant.flagForUpdate) {
      // Update all fields but preserve the document's ID
      existingParticipant = await Participant.findOneAndUpdate(
        { _id: existingParticipant._id },
        {
          ...participant,
          _id: existingParticipant._id,
        },
        {
          $new: true,
        }
      );
      console.log("helloo");
      console.log(
        `Updated ${existingParticipant?.name}, ${existingParticipant?.resume}, ${{
          ...participant,
        }}`
      );
      if (existingParticipant?.name === "Rohan Agarwal") {
        console.log(participant);
        console.log(`${existingParticipant?.resume} ew`);
      }
      await agenda.now("parse-resume", { uuid: participant.uuid, type: "Flagged for update" });
    } else if (!existingParticipant) {
      await createNew(Participant, participant).save();
      await agenda.now("parse-resume", { uuid: participant.uuid, type: "New participant" });
    }

    await wait(100);
    await job.touch();
  }
};
