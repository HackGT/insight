const CMS_ENDPOINT = "https://cms.hack.gt/admin/api";
const HACKATHON = "HackGT 8";

type GenericObject = { [key: string]: string | number | boolean };
function serializeQueryString(data: GenericObject): string {
  return Object.keys(data)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
    .join("&");
}

interface APIResponse {
  success?: boolean;
  error?: string;
  [other: string]: unknown;
}

interface sponsorResponse {
  name: string;
  about?: string;
  website?: string;
  logo?: File;
  eventInformation?: string;
  challengeInformation?: string;
  recruiting?: string;
  additionalInfo?: string;
  blueJeansLink?: string;
  moderatorLink?: string;
}

interface CMSResponse {
  allSponsors: [sponsorResponse];
}

async function sendRequest(
  method: "POST" | "DELETE" | "PUT" | "PATCH",
  url: string,
  data?: GenericObject,
  reload = true
): Promise<APIResponse> {
  let options: RequestInit = {
    method,
    credentials: "include",
  };
  if (data) {
    options = {
      ...options,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: serializeQueryString(data),
    };
  }

  const response: APIResponse = await fetch(url, options).then(res => res.json());

  if (!response.success) {
    alert(response.error);
  } else if (reload) {
    window.location.reload();
  }
  return response;
}

async function fetchCms(query: string): Promise<CMSResponse> {
  const response = await fetch(CMS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const jsonResponse = await response.json();
  return jsonResponse.data;
}

export async function fetchSpecificSponsor(company: string): Promise<sponsorResponse> {
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

export async function fetchSponsors(): Promise<[sponsorResponse]> {
  const query = `
    {
      allSponsors
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
  return data.allSponsors;
}
