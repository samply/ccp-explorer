set -e # Return non-zero exit status if one of the validations fails
npx ajv validate -c ajv-formats -s node_modules/@samply/lens/schema/options.schema.json -d static/options-ccp-prod.json
npx ajv validate -c ajv-formats -s node_modules/@samply/lens/schema/options.schema.json -d static/options-ccp-demo.json
npx ajv validate -c ajv-formats -s node_modules/@samply/lens/schema/options.schema.json -d static/options-ccp-dev.json
npx ajv validate -c ajv-formats -s node_modules/@samply/lens/schema/catalogue.schema.json -d static/catalogues/catalogue-dktk.json
npx ajv validate -c ajv-formats -s node_modules/@samply/lens/schema/catalogue.schema.json -d static/catalogues/catalogue-dktk-staging.json