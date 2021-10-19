"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Participant = exports.Scanner = exports.Company = exports.Visit = exports.User = exports.createNew = void 0;
const common_1 = require("./common");
function createNew(model, doc) {
    return new model(doc);
}
exports.createNew = createNew;
exports.User = common_1.mongoose.model("User", new common_1.mongoose.Schema({
    uuid: {
        type: String,
        required: true,
        index: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        index: true,
        unique: true,
    },
    name: {
        first: String,
        preferred: String,
        last: String,
    },
    token: String,
    admin: Boolean,
    type: String,
    company: {
        name: String,
        verified: Boolean,
        scannerIDs: [String],
    },
}).index({
    email: "text",
    name: "text",
}));
exports.Visit = common_1.mongoose.model("Visit", new common_1.mongoose.Schema({
    participant: {
        type: String,
        index: true,
    },
    company: {
        type: String,
        index: true,
    },
    tags: [String],
    notes: [String],
    time: Date,
    scannerID: String,
    employees: [
        {
            uuid: String,
            name: String,
            email: String,
        },
    ],
}));
exports.Company = common_1.mongoose.model("Company", new common_1.mongoose.Schema({
    name: {
        type: String,
        index: true,
    },
    visits: [common_1.mongoose.Types.ObjectId],
}));
exports.Scanner = common_1.mongoose.model("Scanner", new common_1.mongoose.Schema({
    id: {
        type: String,
        index: true,
    },
    turnedOn: Date,
    lastContact: Date,
    batteryVoltage: Number,
    batteryPercentage: Number,
}));
exports.Participant = common_1.mongoose.model("Participant", new common_1.mongoose.Schema({
    uuid: {
        type: String,
        index: true,
    },
    name: String,
    email: String,
    university: String,
    year: String,
    major: String,
    github: String,
    timezone: String,
    gdpr: String,
    resume: {
        path: String,
        size: Number,
        extractedText: String,
    },
    teammates: [String],
    flagForUpdate: Boolean,
}).index({
    "name": "text",
    "university": "text",
    "major": "text",
    "year": "text",
    "timezone": "text",
    "resume.extractedText": "text",
}, {
    weights: {
        "name": 1,
        "university": 2,
        "major": 2,
        "year": 2,
        "timezone": 2,
        "resume.extractedText": 10,
    },
    name: "ParticipantSearchIndex",
}));

//# sourceMappingURL=schema.js.map
