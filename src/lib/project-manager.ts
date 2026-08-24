import {
  getAst,
  getQueryStore,
  getSelectedSites,
  getHumanReadableQuery,
  getOptions,
} from "@samply/lens";
import { v4 as uuidv4 } from "uuid";

type PmBody = {
  query: string;
  "explorer-ids": string;
  "query-format": string;
  "human-readable": string;
  "project-code": string;
  "explorer-url": string;
  "query-details": string;
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
  const selectedSites = getSelectedSites();

  const collectionIds = Object.entries(options.siteMappings)
    .filter(([siteId]) => selectedSites.includes(siteId))
    .map(([, siteInfo]) =>
      typeof siteInfo === "object" ? siteInfo.collectionId : undefined,
    )
    .filter((collectionId) => collectionId !== undefined);

  const response: ProjectManagerResponse = await sendRequestToProjectManager(
    options.projectManagerOptions.editProjectUrl,
    options.projectManagerOptions.newProjectUrl,
    humanReadable,
    collectionIds,
    selectedSites,
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
 * @param selectedSites the Lens site IDs selected for negotiation
 * @returns a promise containing the response from the project manager. The response contains the redirect uri
 */
async function sendRequestToProjectManager(
  editProjectUrl: string,
  newProjectUrl: string,
  humanReadable: string,
  collectionIds: string[],
  selectedSites: string[],
): Promise<ProjectManagerResponse> {
  /**
   * get temporary token from oauth2
   */
  let temporaryToken: string | null;

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
  const urlParams: URLSearchParams = new URLSearchParams(
    window.location.search,
  );

  const projectCode: string | null = urlParams.get("project-code");
  const returnURL = buildExplorerUrl(
    negotiationPartners,
    selectedSites,
    projectCode,
  );
  const negotiateUrl = projectCode ? editProjectUrl : newProjectUrl;
  const method = projectCode ? "PUT" : "POST";

  let response!: ProjectManagerResponse;

  /**
   * send request to project manager
   * Explorer IDS = Options Struktur = lens-<standortname>
   */

  const pmRequestUrl = `${negotiateUrl}`;

  try {
    response = await fetch(pmRequestUrl, {
      method: method,
      headers: {
        returnAccept: "application/json; charset=utf-8",
        "Content-Type": "application/json",
        Authorization: temporaryToken ? temporaryToken : "",
      },
      body: buildPMBody(
        humanReadable,
        negotiationPartners,
        returnURL,
        projectCode ?? "",
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
    "explorer-url": addQueryToExplorerUrl(
      returnURL,
      base64Encode(JSON.stringify(getQueryStore())),
    ),
    "query-details": base64Encode(JSON.stringify(getQueryStore())),
  };
  return JSON.stringify(body);
}

/**
 * Build the URL used to return from the project manager. Lens restores selected
 * bridgeheads from the base64-encoded `datarequests` URL parameter.
 */
function buildExplorerUrl(
  negotiationPartners: string,
  selectedSites: string[],
  projectCode: string | null,
): string {
  const url = new URL(window.location.pathname, window.location.origin);

  // Keep the collection IDs for consumers of the existing project-manager URL.
  url.searchParams.set("collections", negotiationPartners);
  url.searchParams.set(
    "datarequests",
    btoa(
      String.fromCharCode(
        ...new TextEncoder().encode(JSON.stringify(selectedSites)),
      ),
    ),
  );

  if (projectCode) {
    url.searchParams.set("project-code", projectCode);
  }

  return url.toString();
}

function addQueryToExplorerUrl(returnURL: string, query: string): string {
  const url = new URL(returnURL);
  url.searchParams.set("query", query);
  return url.toString();
}
