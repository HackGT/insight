import archiver from "archiver";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { JobHandler } from ".";
import { webSocketServer } from "../app";
import { formatSize, S3_ENGINE } from "../common";
import { IParticipant, IVisit, Participant } from "../schema";

export const exportJobHandler: JobHandler = async (job, done) => {
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

  const exportFile = path.join(os.tmpdir(), `${job.attrs.data.id}.zip`);
  const output = fs.createWriteStream(exportFile);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", async () => {
    job.attrs.data.elapsedTime = `${((Date.now() - startTime) / 1000).toFixed(1)} seconds`;
    job.attrs.data.total = participants.length;
    job.attrs.data.size = formatSize(archive.pointer());
    job.attrs.data.exportFile = exportFile;
    await job.save();
    if (requesterUUID) {
      webSocketServer.exportComplete(requesterUUID, job.attrs.data.id, "zip");
    }
    done();
  });
  archive.on("error", err => done(err));
  archive.pipe(output);

  for (const [i, participant] of participants.entries()) {
    if (requesterUUID) {
      const percentage = Math.round((i / participants.length) * 100);
      webSocketServer.exportUpdate(requesterUUID, percentage);
    }

    const folderName = `${participant.name} - ${participant.uuid}`;

    if (participant.resume?.path) {
      try {
        const fileStream = await S3_ENGINE.readFile(path.basename(participant.resume.path));
        archive.append(fileStream, {
          name: path.join(folderName, `resume${path.extname(participant.resume.path)}`),
        });
      } catch {
        console.log("Error: Participant Resume not found");
      }
    }

    const about = `Name: ${participant.name}
Email: ${participant.email}
Major: ${participant.major || "Unknown"}
School: ${participant.university || "Unknown"}
Github: ${participant.github || "None"}
`;
    archive.append(about, { name: path.join(folderName, `${participant.name.trim()}.txt`) });

    if (participant.visitData) {
      const visit = `Time: ${participant.visitData.time.toLocaleString()}

Tags: ${participant.visitData.tags.join(", ")}
Notes: ${participant.visitData.notes.join(", ")}
`;
      archive.append(visit, { name: path.join(folderName, "notes.txt") });
    }
  }
  archive.finalize();
};
