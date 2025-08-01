if [ "$1" = "--check" ]; then
    set -e # Fail immediately if one of the comparisons fails
    npx ts-json-schema-generator --path src/lib/options.ts --type Options | cmp - schema/options.schema.json
else
    npx ts-json-schema-generator --path src/lib/options.ts --type Options > schema/options.schema.json
fi
