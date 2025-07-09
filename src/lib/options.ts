// Note: The JSON schema file options.schema.json is automatically generated
// from the type definitions in this file. After making changes to this file run
// `npm run schemagen` to update the JSON schema.

import { type LensOptions } from "@samply/lens";
import { writable } from "svelte/store";

export const optionsStore = writable<Options>();

export type Options = LensOptions & {
    projectmanagerOptions?: ProjectManagerOptions;
};

export type ProjectManagerOptionsSiteMapping = {
    site: string;
    collection: string;
};

export type ProjectManagerOptions = {
    newProjectUrl: string;
    editProjectUrl: string;
    siteMappings: ProjectManagerOptionsSiteMapping[];
};