const CMS_ENDPOINT = "https://cms.hack.gt/admin/api";
const HACKATHON = "HackGT 7";

type GenericObject = { [key: string]: string | number | boolean };
function serializeQueryString(data: GenericObject): string {
	return Object.keys(data).map(key => {
		return encodeURIComponent(key) + "=" + encodeURIComponent(data[key]);
	}).join("&");
}

interface APIResponse {
	success?: boolean;
	error?: string;
	[other: string]: unknown;
}

interface sponsorResponse {
	name: string,
	about?: string,
	website?: string,
	logo?: File,
	eventInformation?: string,
	challengeInformation?: string,
	recruiting?: string,
	additionalInfo?: string,
	blueJeansLink?: string,
	moderatorLink?: string
  }

  interface CMSResponse {
	allSponsors: [sponsorResponse]
  }

async function sendRequest(method: "POST" | "DELETE" | "PUT" | "PATCH", url: string, data?: GenericObject, reload = true): Promise<APIResponse> {
	let options: RequestInit = {
		method,
		credentials: "include"
	};
	if (data) {
		options = {
			...options,
			headers: {
				"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
			},
			body: serializeQueryString(data)
		};
	}

	let response: APIResponse = await fetch(url, options).then(response => response.json());
	if (!response.success) {
		alert(response.error);
	}
	else if (reload) {
		window.location.reload();
	}
	return response;
}

type Dataset = { [key: string]: string | undefined };
function setUpHandlers(classname: string, handler: (dataset: Dataset) => Promise<void>) {
	let buttons = document.getElementsByClassName(classname) as HTMLCollectionOf<HTMLButtonElement>;
	for (let i = 0; i < buttons.length; i++) {
		buttons[i].addEventListener("click", asyncHandler(async button => {
			await handler(button?.dataset as Dataset);
		}));
	}
}
async function handler(id: string, handler: (dataset: Dataset) => Promise<void>) {
	let company = document.getElementById(id);
	await handler(company?.dataset as Dataset);
}
function asyncHandler(action: (button?: HTMLButtonElement) => Promise<void>): (e: MouseEvent) => Promise<void> {
	return async (e: MouseEvent) => {
		const button = e.currentTarget as HTMLButtonElement | undefined;
		if (!button) return;
		button.classList.add("is-loading");
		try {
			await action(button);
		}
		finally {
			button.classList.remove("is-loading");
		}
	};
}

function forEachInNodeList<E extends Node> (collection: NodeListOf<E>, func: (element: E) => void) {
	for (let i = 0; i < collection.length; i++) {
		func(collection[i]);
	}
}

async function fetchCms(query:string) : Promise<CMSResponse> {
    const response = await fetch(CMS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query }),
    });
    const jsonResponse = await response.json();
    return jsonResponse.data;
}

async function fetchSpecificSponsor(company:string) : Promise<sponsorResponse>  {
    const query = `
    {
      allSponsors (where: { name: "${company}", hackathon: {name: "${HACKATHON}"} }) 
      {
        name
        about
        website
        eventInformation
        challengeInformation
        recruiting
        additionalInfo
        blueJeansLink
        moderatorLink
      }
    }`;
    const data = await fetchCms(query);
    return data.allSponsors[0];
}

async function fetchSponsors() : Promise<[sponsorResponse]>  {
    const query = `
    {
      allSponsors
      {
        name
      }
    }`;

    const data = await fetchCms(query);
    return data.allSponsors;
}
