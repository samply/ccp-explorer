set -e # Return non-zero exit status if one of the validations fails
npx ajv validate -c ajv-formats -s node_modules/@samply/lens/schema/catalogue.schema.json -d static/catalogues/catalogue-dktk.json
npx ajv validate -c ajv-formats -s node_modules/@samply/lens/schema/catalogue.schema.json -d static/catalogues/catalogue-dktk-staging.json
npx ajv validate -c ajv-formats -s node_modules/@samply/lens/schema/catalogue.schema.json -d static/catalogues/catalogue-dktk-with-mol-markers.json
