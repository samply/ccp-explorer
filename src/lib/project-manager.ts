import {
  getAst,
  getQueryStore,
  getSelectedSites,
  getHumanReadableQuery,
  getOptions,
  type QueryItem,
} from "@samply/lens";
import { v4 as uuidv4 } from "uuid";

type PmBody = {
  query: string;
  "explorer-ids": string;
  "query-format": string;
  "human-readable": string;
  "project-code": string;
  "explorer-url": string;
  "query-store"?: QueryItem[][];
};

type ProjectManagerResponse = Response & {
  redirect_uri?: string;
};

type ProjectManagerOptions = {
  newProjectUrl: string;
  editProjectUrl: string;
};

function isProjectManagerOptions(obj: unknown): obj is ProjectManagerOptions {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "newProjectUrl" in obj &&
    "editProjectUrl" in obj &&
    typeof obj.newProjectUrl === "string" &&
    typeof obj.editProjectUrl === "string"
  );
}

export const negotiate = async (): Promise<void> => {
  const options = getOptions();
  if (
    !options ||
    !isProjectManagerOptions(options.projectManagerOptions) ||
    !options.siteMappings
  ) {
    console.error("Projectmanager options not set");
    return;
  }

  const humanReadable: string = getHumanReadableQuery();

  const collectionIds = Object.entries(options.siteMappings)
    .filter(([siteId]) => getSelectedSites().includes(siteId))
    .map(([, siteInfo]) =>
      typeof siteInfo === "object" ? siteInfo.collectionId : undefined,
    )
    .filter((collectionId) => collectionId !== undefined);

  const response: ProjectManagerResponse = await sendRequestToProjectManager(
    options.projectManagerOptions.editProjectUrl,
    options.projectManagerOptions.newProjectUrl,
    humanReadable,
    collectionIds,
  );

  if (!response.redirect_uri) {
    console.error("Projectmanager response does not contain redirect uri");
    return;
  }

  window.location.href = response.redirect_uri;
};

/**
 * handle redirect to project manager url
 */
//     // project manager

/**
 * @param currentProjectmanagerOptions the current project manager options
 * @param humanReadable a human readable query string to view in the negotiator project
 * @param collectionIds the collection ids of the selected sites to send to the project manager
 * @returns a promise containing the response from the project manager. The response contains the redirect uri
 */
async function sendRequestToProjectManager(
  editProjectUrl: string,
  newProjectUrl: string,
  humanReadable: string,
  collectionIds: string[],
): Promise<ProjectManagerResponse> {
  /**
   * get temporary token from oauth2
   */
  let temporaryToken: string | null = "";

  try {
    const res = await fetch(`/oauth2/auth`, {
      method: "GET",
      credentials: "include",
    });

    temporaryToken = res.headers.get("Authorization");
  } catch (error) {
    console.log("error", error);
    return new Response() as Response & { redirect_uri: string };
  }

  /**
   * build query params
   */
  // const queryParam: string =
  //     queryBase64String != "" ? `&query=${queryBase64String}` : "";

  const negotiationPartners = collectionIds.join(",");
  const returnURL: string = `${window.location.protocol}//${window.location.host}/?collections=${negotiationPartners}`;
  const urlParams: URLSearchParams = new URLSearchParams(
    window.location.search,
  );

  const projectCode: string | null = urlParams.get("project-code");
  const negotiateUrl = projectCode ? editProjectUrl : newProjectUrl;

  let response!: ProjectManagerResponse;

  /**
   * send request to project manager
   * Explorer IDS = Options Struktur = lens-<standortname>
   */

  const pmRequestUrl = `${negotiateUrl}`;

  try {
    response = await fetch(pmRequestUrl, {
      method: "POST",
      headers: {
        returnAccept: "application/json; charset=utf-8",
        "Content-Type": "application/json",
        Authorization: temporaryToken ? temporaryToken : "",
      },
      body: buildPMBody(
        humanReadable,
        negotiationPartners,
        returnURL,
        projectCode ? projectCode : "",
      ),
    }).then((response) => response.json());

    return response;
  } catch (error) {
    console.log("error", error);
    return new Response() as ProjectManagerResponse;
  }
}

/**
 * @param humanReadable the human readable string of the query
 * @param negotiationPartners all the selected sites in a string with , seperated
 * @param returnURL the url to return to lens
 * @param projectCode if the project already exists
 * @returns a base64 encoded CQL query
 */
function buildPMBody(
  humanReadable: string,
  negotiationPartners: string,
  returnURL: string,
  projectCode: string,
): string {
  /** Helper function to base64 encode a UTF-8 string */
  const base64Encode = (utf8String: string) =>
    btoa(String.fromCharCode(...new TextEncoder().encode(utf8String)));

  const body: PmBody = {
    query: base64Encode(
      JSON.stringify({
        lang: "ast",
        payload: base64Encode(JSON.stringify({ ast: getAst(), id: uuidv4() })),
      }),
    ),
    "explorer-ids": negotiationPartners,
    "query-format": "AST_DATA",
    "human-readable": humanReadable,
    "project-code": projectCode,
    "explorer-url":
      returnURL +
      projectCode +
      "&query=" +
      base64Encode(JSON.stringify(getQueryStore())),
    "query-store": getQueryStore(),
  };
  return JSON.stringify(body);
}
