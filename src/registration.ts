import fetch from "node-fetch";
import { config } from "./common";
import { IVisit, User } from "./schema";

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

export interface IParticipant {
	resumePath: string | null;
	resumeSize: number | null;
}
export async function participantData(uuid: string): Promise<IParticipant | null> {
	interface QueryResponse {
		user: {
			applied: boolean;
			confirmed: boolean;
			application: {
				data: {
					file: {
						path: string;
						size: number;
					} | null;
				}[];
			};
		};
	}
	let data: QueryResponse = await query(`
		query ($uuid: ID) {
			user(id: $uuid) {
				applied,
				confirmed,
				application {
					data {
						file {
							path,
							size
						}
					}
				}
			}
		}
	`, { uuid });

	if (!data.user || !data.user.confirmed) {
		return null;
	}
	let fileField = data.user.application.data.find(d => d.file !== null);
	return {
		resumePath: fileField ? fileField.file!.path : null,
		resumeSize: fileField ? fileField.file!.size : null
	};
}

export async function createVisit(uuid: string): Promise<Partial<IVisit> | null> {
	interface FormData {
		type: string;
		data: {
			name: string;
			value: string | null;
			values: (string | null)[] | null;
			file: {
				path: string;
				size: number;
			} | null;
		}[];
	}
	interface QueryResponse {
		user: {
			id: string;
			name: string;
			email: string;
			application: FormData | null;
			confirmation: FormData | null;
			team: string | null;
		};
	}

	let data: QueryResponse = await query(`
		query ($uuid: ID) {
			user(id: $uuid) {
				id,
				name,
				email,
				application {
					type,
					data {
						name,
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
						value,
						values,
						file {
							path,
							size
						}
					}
				}
				team {
					id
				}
			}
		}
	`, { uuid });

	if (!data.user) return null;
	let user = data.user;

	let visit: Partial<IVisit> = {
		uuid: user.id,
		name: user.name,
		email: user.email
	};
	// Check if user has logged into Insight and updated their resume
	let insightUser = await User.findOne({ uuid: user.id });
	if (insightUser && insightUser.resume && insightUser.resume.path) {
		visit.resume = {
			path: insightUser.resume.path,
			size: insightUser.resume.size
		};
	}
	// TODO: need registration GraphQL API for listing teams

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
		visit.major = getQuestionAnswer(user.application, "major");
		visit.githubUsername = getQuestionAnswer(user.application, "github");
		visit.website = getQuestionAnswer(user.application, "website");
		visit.lookingFor = {
			timeframe: getQuestionAnswers(user.application, "employment"),
			comments: getQuestionAnswer(user.application, "employment-2")
		};

		let resume = user.application.data.find(q => q.name === "resume");
		if (!visit.resume && resume && resume.file) {
			visit.resume = {
				path: resume.file.path,
				size: resume.file.size
			};
		}
		if (user.confirmation) {
			visit.interestingDetails = {
				favoriteLanguages: getQuestionAnswers(user.confirmation, "languages"),
				proudOf: getQuestionAnswer(user.confirmation, "fun"),
				funFact: getQuestionAnswer(user.confirmation, "fun-2")
			};
		}
	}

	return visit;
}
