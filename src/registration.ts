import fetch from "node-fetch";
import { config, mongoose, wait } from "./common";
import { IVisit, User, IParticipant } from "./schema";

if (!config.secrets.registration.key) {
	throw new Error("Registration admin key not configured");
}

async function query<T>(query: string, variables?: { [name: string]: string }): Promise<T> {
	const response = await fetch(config.secrets.registration.url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"Authorization": `Basic ${Buffer.from(config.secrets.registration.key, "utf8").toString("base64")}`
		},
		body: JSON.stringify({
			query,
			variables: variables || {}
		})
	});
	const json = await response.json();
	if (response.ok) {
		return json.data;
	}
	else {
		console.log(response);
		throw new Error(JSON.stringify(json.errors));
	}
}

export async function getAllParticipants(): Promise<IParticipant[]> {
	interface FormData {
		type: string;
		data: {
			name: string;
			label: string;
			value: string | null;
			values: (string | null)[] | null;
			file: {
				path: string;
				size: number;
			} | null;
		}[];
	}
	interface UserData {
		id: string;
		name: string;
		email: string;
		team: string | null;
		application: FormData | null;
		confirmation: FormData | null;
		pagination_token: string;
	}
	let users: UserData[] = [];
	let page = "";
	while (true) {
		let data = await query<{ users: UserData[] }>(`
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
		await wait(1000);
	}

	return Promise.all(users.map(async user => {
		let participant: IParticipant = {
			_id: mongoose.Types.ObjectId(),
			uuid: user.id,
			name: user.name,
			email: user.email,
			teammates: [],
			flagForUpdate: false
		};
		// TODO: need registration GraphQL API for listing teams

		function getQuestionLabel(form: FormData, questionName: string): string | undefined {
			let question = form.data.find(q => q.name === questionName);
			if (!question) return undefined;
			return question.label;
		}
		function getQuestionAnswer(form: FormData, questionName: string): string | undefined {
			let question = form.data.find(q => q.name === questionName);
			if (!question || !question.value) return undefined;
			return question.value;
		}
		function getQuestionAnswers(form: FormData, questionName: string): string[] {
			let question = form.data.find(q => q.name === questionName);
			if (!question || !question.values) return [];
			return question.values.filter(v => v !== null) as string[];
		}

		// This section must be updated to match current registration questions
		// TODO: make configurable in admin panel somehow?
		if (user.application && user.application.type === "Participant") {
			participant.major = getQuestionAnswer(user.application, "major");
			participant.school = getQuestionAnswer(user.application, "school");
			participant.githubUsername = getQuestionAnswer(user.application, "github");
			participant.website = getQuestionAnswer(user.application, "website");
			participant.lookingFor = {
				timeframe: getQuestionAnswers(user.application, "employment"),
				comments: getQuestionAnswer(user.application, "employment-2")
			};

			let resume = user.application.data.find(q => q.name === "resume");
			if (!participant.resume && resume && resume.file) {
				participant.resume = {
					path: resume.file.path,
					size: resume.file.size
				};
			}
			if (user.confirmation) {
				participant.interestingDetails = {
					favoriteLanguages: getQuestionAnswers(user.confirmation, "languages"),
					fun1: {
						question: getQuestionLabel(user.confirmation, "fun") || "Unknown",
						answer: getQuestionAnswer(user.confirmation, "fun"),
					},
					fun2: {
						question: getQuestionLabel(user.confirmation, "fun-2") || "Unknown",
						answer: getQuestionAnswer(user.confirmation, "fun-2"),
					}
				};
			}
		}
		else if (user.application && user.application.type === "Mentor") {
			participant.major = getQuestionAnswer(user.application, "major");
			participant.school = getQuestionAnswer(user.application, "school");
			participant.interestingDetails = {
				favoriteLanguages: getQuestionAnswers(user.application, "tools")
			};
			if (user.confirmation) {
				let resume = user.confirmation.data.find(q => q.name === "resume");
				if (!participant.resume && resume && resume.file) {
					participant.resume = {
						path: resume.file.path,
						size: resume.file.size
					};
				}
				participant.lookingFor = {
					timeframe: getQuestionAnswers(user.confirmation, "employment")
				};
			}
		}
		else if (user.application && user.application.type === "Volunteer") {
			participant.major = getQuestionAnswer(user.application, "major");
			participant.school = getQuestionAnswer(user.application, "school");
			if (user.confirmation) {
				let resume = user.confirmation.data.find(q => q.name === "resume");
				if (!participant.resume && resume && resume.file) {
					participant.resume = {
						path: resume.file.path,
						size: resume.file.size
					};
				}
				participant.lookingFor = {
					timeframe: getQuestionAnswers(user.confirmation, "employment")
				};
			}
		}
		// TODO: add Organizer branch

		return participant;
	}));
}

export async function isParticipant(uuid: string): Promise<boolean> {
	interface QueryResponse {
		user: {
			applied: boolean;
			accepted: boolean;
			confirmed: boolean;
			application: {
				type: string;
			} | null;
		};
	}
	let data: QueryResponse = await query(`
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

	const participantBranches = ["Participant", "Mentor", "Volunteer", "Organizer"];
	if (!data.user || !data.user.confirmed || !data.user.accepted || !data.user.application || !participantBranches.includes(data.user.application.type)) {
		return false;
	}
	return true;
}
