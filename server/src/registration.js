"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isParticipant = exports.getAllParticipants = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const common_1 = require("./common");
if (!common_1.config.secrets.registration.key) {
    throw new Error("Registration admin key not configured");
}
async function query(query, variables) {
    const response = await (0, node_fetch_1.default)(common_1.config.secrets.registration.url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Basic ${Buffer.from(common_1.config.secrets.registration.key, "utf8").toString("base64")}`,
        },
        body: JSON.stringify({
            query,
            variables: variables || {},
        }),
    });
    const json = await response.json();
    if (response.ok) {
        return json.data;
    }
    throw new Error(JSON.stringify(json.errors));
}
async function getAllParticipants() {
    let users = [];
    let page = "";
    while (true) {
        const data = await query(`
			query ($page: ID!) {
				users(n: 50, pagination_token: $page, filter: { accepted: true, confirmed: true }) {
					id,
					name,
					email,
					team {
						id
					},
					application {
						type,
						data {
							name,
							label,
							value,
							values,
							file {
								path,
								size
							}
						}
					},
					confirmation {
						type,
						data {
							name,
							label,
							value,
							values,
							file {
								path,
								size
							}
						}
					},
					pagination_token
				}
			}
		`, { page });
        if (!data || !data.users) {
            return [];
        }
        if (data.users.length === 0) {
            break;
        }
        users = users.concat(data.users);
        page = users[users.length - 1].pagination_token;
        await (0, common_1.wait)(1000);
    }
    return Promise.all(users.map(async (user) => {
        const participant = {
            _id: new common_1.mongoose.Types.ObjectId(),
            uuid: user.id,
            name: user.name,
            email: user.email,
            teammates: [],
            flagForUpdate: false,
        };
        function getQuestionLabel(form, questionName) {
            const question = form.data.find(q => q.name === questionName);
            if (!question)
                return undefined;
            return question.label;
        }
        function getQuestionAnswer(form, questionName) {
            const question = form.data.find(q => q.name === questionName);
            if (!question || !question.value)
                return undefined;
            return question.value;
        }
        function getQuestionAnswers(form, questionName) {
            const question = form.data.find(q => q.name === questionName);
            if (!question || !question.values)
                return [];
            return question.values.filter(v => v !== null);
        }
        if (user.application &&
            (user.application.type === "Participant-Emerging In-Person" ||
                user.application.type === "Participant-Emerging Virtual")) {
            participant.major = getQuestionAnswer(user.application, "major");
            participant.university = getQuestionAnswer(user.application, "university");
            participant.year = getQuestionAnswer(user.application, "year");
            participant.timezone = getQuestionAnswer(user.application, "timezone");
            const resume = user.application.data.find(q => q.name === "resume");
            if (!participant.resume && resume && resume.file) {
                participant.resume = {
                    path: resume.file.path,
                    size: resume.file.size,
                };
            }
            if (user.confirmation) {
                participant.gdpr = getQuestionAnswer(user.confirmation, "gdpr");
                participant.github = getQuestionAnswer(user.confirmation, "github");
            }
        }
        else if (user.application &&
            (user.application.type === "Participant-General In-Person" ||
                user.application.type === "Participant-General Virtual")) {
            participant.major = getQuestionAnswer(user.application, "major");
            participant.university = getQuestionAnswer(user.application, "university");
            participant.year = getQuestionAnswer(user.application, "year");
            participant.timezone = getQuestionAnswer(user.application, "timezone");
            const resume = user.application.data.find(q => q.name === "resume");
            if (!participant.resume && resume && resume.file) {
                participant.resume = {
                    path: resume.file.path,
                    size: resume.file.size,
                };
            }
            if (user.confirmation) {
                participant.gdpr = getQuestionAnswer(user.confirmation, "gdpr");
                participant.github = getQuestionAnswer(user.confirmation, "github");
            }
        }
        else if (user.application && user.application.type === "Staff") {
            participant.major = "N/A";
            participant.university = "Georgia Institute of Technology";
            participant.github = getQuestionAnswer(user.application, "github");
            participant.gdpr = getQuestionAnswer(user.application, "gdpr");
            const resume = user.application.data.find(q => q.name === "resume");
            if (!participant.resume && resume && resume.file) {
                participant.resume = {
                    path: resume.file.path,
                    size: resume.file.size,
                };
            }
        }
        else if (user.application && user.application.type === "Mentor") {
            participant.major = getQuestionAnswer(user.application, "major");
            participant.university = getQuestionAnswer(user.application, "school");
            if (user.confirmation) {
                const resume = user.confirmation.data.find(q => q.name === "resume");
                if (!participant.resume && resume && resume.file) {
                    participant.resume = {
                        path: resume.file.path,
                        size: resume.file.size,
                    };
                }
                participant.gdpr = getQuestionAnswer(user.confirmation, "gdpr");
                participant.github = getQuestionAnswer(user.confirmation, "github");
            }
        }
        else if (user.application && user.application.type === "Partner") {
            const resume = user.application.data.find(q => q.name === "resume");
            if (!participant.resume && resume && resume.file) {
                participant.resume = {
                    path: resume.file.path,
                    size: resume.file.size,
                };
            }
            participant.gdpr = getQuestionAnswer(user.application, "gdpr");
            participant.github = getQuestionAnswer(user.application, "github");
        }
        else if (user.application && user.application.type === "Participant Walk-in") {
            participant.major = getQuestionAnswer(user.application, "major");
            participant.university = getQuestionAnswer(user.application, "university");
            participant.year = getQuestionAnswer(user.application, "year");
            participant.timezone = getQuestionAnswer(user.application, "timezone");
            participant.gdpr = getQuestionAnswer(user.application, "gdpr");
            participant.github = getQuestionAnswer(user.application, "github");
            const resume = user.application.data.find(q => q.name === "resume");
            if (!participant.resume && resume && resume.file) {
                participant.resume = {
                    path: resume.file.path,
                    size: resume.file.size,
                };
            }
        }
        return participant;
    }));
}
exports.getAllParticipants = getAllParticipants;
async function isParticipant(uuid) {
    const data = await query(`
		query ($uuid: ID) {
			user(id: $uuid) {
				applied,
				accepted,
				confirmed,
				application {
					type
				}
			}
		}
	`, { uuid });
    const participantBranches = [
        "Participant-Emerging",
        "Participant-General",
        "Mentor",
        "Volunteer",
        "Staff",
        "Partner",
        "Participant Walk-in",
    ];
    if (!data.user ||
        !data.user.confirmed ||
        !data.user.accepted ||
        !data.user.application ||
        !participantBranches.includes(data.user.application.type)) {
        return false;
    }
    return true;
}
exports.isParticipant = isParticipant;

//# sourceMappingURL=registration.js.map
