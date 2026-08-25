#!/usr/bin/env python3
"""
Overwrite the `observationMolecularMarkerName` criteria of the catalogue with the
gene list from genenames.org (HGNC).

    python3 scripts/generate-gene-criteria.py
    npx prettier --write src/config/catalogue-test.json

Every approved HGNC entry becomes one criterion: the approved symbol as key and
name, the approved name as description. Nothing else is kept - spellings that are
not HGNC symbols disappear from the catalogue and the sites have to fix their data.
"""
import csv, io, json, sys, urllib.request

HGNC_URL = "https://storage.googleapis.com/public-download-files/hgnc/tsv/tsv/hgnc_complete_set.txt"
CATALOGUE = "src/config/catalogue-test.json"
CATEGORY = "observationMolecularMarkerName"
# Set to a set of HGNC locus groups to restrict the list, e.g. {"protein-coding gene"}
LOCUS_GROUPS = None


def find_category(node):
    """Find the gene category in the catalogue tree."""
    if isinstance(node, list):
        for child in node:
            if found := find_category(child):
                return found
    elif isinstance(node, dict):
        if node.get("key") == CATEGORY:
            return node
        for key in ("childCategories", "criteria"):
            if isinstance(node.get(key), list):
                if found := find_category(node[key]):
                    return found
    return None


print(f"downloading {HGNC_URL}")
with urllib.request.urlopen(HGNC_URL) as response:
    genes = list(csv.DictReader(io.TextIOWrapper(response, "utf-8"), delimiter="\t"))

criteria = [
    {"key": gene["symbol"], "name": gene["symbol"], "description": gene["name"]}
    for gene in sorted(genes, key=lambda gene: gene["symbol"])
    if LOCUS_GROUPS is None or gene["locus_group"] in LOCUS_GROUPS
]

catalogue = json.load(open(CATALOGUE))
category = find_category(catalogue)
if category is None:
    sys.exit(f"{CATEGORY} not found in {CATALOGUE}")
category["criteria"] = criteria

with open(CATALOGUE, "w") as file:
    json.dump(catalogue, file, indent=4, ensure_ascii=False)
    file.write("\n")
print(f"wrote {len(criteria)} criteria to {CATALOGUE}")
