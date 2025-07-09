// Note: The JSON schema file options.schema.json is automatically generated
// from the type definitions in this file. After making changes to this file run
// `npm run schemagen` to update the JSON schema.

import { type LensOptions } from "@samply/lens";

export type Options = LensOptions & {
    projectmanagerOptions?: ProjectManagerOptions;
};

type ProjectManagerOptions = {
    newProjectUrl: string;
    editProjectUrl: string;
    /** Mapping from site name to collection name */
    siteMappings: Record<string, string>;
};
