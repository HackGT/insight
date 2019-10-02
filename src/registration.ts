import fetch from "node-fetch";
import { config } from "./common";

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
