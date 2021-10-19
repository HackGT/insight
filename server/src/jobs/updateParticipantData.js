"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateParticipantDataJobHandler = void 0;
const _1 = require(".");
const common_1 = require("../common");
const registration_1 = require("../registration");
const schema_1 = require("../schema");
const updateParticipantDataJobHandler = async (job) => {
    const start = Date.now();
    const participants = await (0, registration_1.getAllParticipants)();
    const time = Date.now() - start;
    job.attrs.data = job.attrs.data || {};
    job.attrs.data.registration = {
        elapsedMs: time,
        count: participants.length,
    };
    await job.save();
    console.log(`Updating ${participants.length} participant(s)`);
    for (const participant of participants) {
        let existingParticipant = await schema_1.Participant.findOne({ uuid: participant.uuid });
        if (existingParticipant && existingParticipant.flagForUpdate) {
            existingParticipant = await schema_1.Participant.findOneAndUpdate({ _id: existingParticipant._id }, {
                ...participant,
                _id: existingParticipant._id,
            }, {
                $new: true,
            });
            console.log("helloo");
            console.log(`Updated ${existingParticipant === null || existingParticipant === void 0 ? void 0 : existingParticipant.name}, ${existingParticipant === null || existingParticipant === void 0 ? void 0 : existingParticipant.resume}, ${{
                ...participant,
            }}`);
            if ((existingParticipant === null || existingParticipant === void 0 ? void 0 : existingParticipant.name) === "Rohan Agarwal") {
                console.log(participant);
                console.log(`${existingParticipant === null || existingParticipant === void 0 ? void 0 : existingParticipant.resume} ew`);
            }
            await _1.agenda.now("parse-resume", { uuid: participant.uuid, type: "Flagged for update" });
        }
        else if (!existingParticipant) {
            await (0, schema_1.createNew)(schema_1.Participant, participant).save();
            await _1.agenda.now("parse-resume", { uuid: participant.uuid, type: "New participant" });
        }
        await (0, common_1.wait)(100);
        await job.touch();
    }
};
exports.updateParticipantDataJobHandler = updateParticipantDataJobHandler;

//# sourceMappingURL=updateParticipantData.js.map
