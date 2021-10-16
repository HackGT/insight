import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as json2csv from "json2csv";

import { JobHandler } from ".";
import { webSocketServer } from "../app";
import { IParticipant, IVisit, Participant } from "../schema";

export const exportCsvJobHandler: JobHandler = async job => {
  const startTime = Date.now();
  const { requesterUUID } = job.attrs.data;
  const { participantIDs } = job.attrs.data;
  const participants: (IParticipant & { visitData?: IVisit })[] = await Participant.aggregate([
    { $match: { $and: [{ uuid: { $in: participantIDs } }, { gdpr: { $ne: null } }] } },
    { $sort: { name: 1 } }, // Sort newest first
    {
      $lookup: {
        from: "visits",
        localField: "uuid",
        foreignField: "participant",
        as: "visitData",
      },
    },
    { $unwind: { path: "$visitData", preserveNullAndEmptyArrays: true } }, // Turns array of 1 document into just that document
  ]);

  const exportFile = path.join(os.tmpdir(), `${job.attrs.data.id}.csv`);
  const output = fs.createWriteStream(exportFile);

  interface IRow {
    Name: string;
    Email: string;
    Major?: string;
    School?: string;
    Github?: string;
  }
  const fields: (keyof IRow)[] = ["Name", "Email", "Major", "School", "Github"];
  const data: IRow[] = [];

  for (const [i, participant] of participants.entries()) {
    if (requesterUUID) {
      const percentage = Math.round((i / participants.length) * 100);
      webSocketServer.exportUpdate(requesterUUID, percentage);
    }
    data.push({
      Name: participant.name,
      Email: participant.email,
      Major: participant.major || "Unknown",
      School: participant.university,
      Github: participant.github,
    });
  }

  const csv = await json2csv.parseAsync(data, { fields });
  output.write(csv);
  output.close();

  job.attrs.data.elapsedTime = `${((Date.now() - startTime) / 1000).toFixed(1)} seconds`;
  job.attrs.data.total = participants.length;
  job.attrs.data.exportFile = exportFile;
  await job.save();
  if (requesterUUID) {
    webSocketServer.exportComplete(requesterUUID, job.attrs.data.id, "csv");
  }
};
