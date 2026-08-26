#!/usr/bin/env python3
"""
Rebuild the gene criteria list of the catalogue from the gene names that are
actually present in the bridgeheads.

Requires a headlights stack in bridgehead mode (spot on http://localhost:8055):

    docker compose -f ccp-explorer/compose.bridgehead.yaml up --pull always
    python3 scripts/generate-gene-criteria.py --write
    npx prettier --write src/config/catalogue-test.json

The script sends the empty query to spot and takes the union of the gene names all
sites report. Each name becomes one criterion, so every criterion in the catalogue
is guaranteed to return hits. The list is overwritten completely - names that
disappeared from the data also disappear from the catalogue.

Slow sites are the main risk: there is no way to know how many sites will answer,
and a run that misses a large site would throw away most of the catalogue. The
script therefore waits for the sites listed in --require-sites, refuses to write a
list that no longer covers what the catalogue already has (--min-coverage,
--allow-shrink) and prints what every site contributed, so a bad run is easy to
spot.

Names that differ only in case, whitespace, hyphens or underscores are the same
gene written differently by different sites ("BRCA 1" vs "BRCA1"). They are merged
into a single criterion that carries the other spellings in an invisible
`subgroup`, which lens expands into an OR over all spellings when it builds the
query. So the user sees one entry and finds the data of every site.

Some sites report a gene as "KRAS||c.35G>A||p.G12D||Exon 2" instead of putting the
variant into the DNA change and amino acid change fields. Those names are dropped:
focus matches a gene name against the part before the separator as well, so the
plain gene finds those records. Where such a name is the only occurrence of its
gene, the plain gene name is added so that nothing becomes unfindable.

Descriptions come from the HGNC (genenames.org) complete set. Names that HGNC does
not know keep an empty description.

Only gene names are generated. The other molecular marker criteria list,
observationMolecularMarkerEnsemblID, cannot be built this way: the sites report no
stratifier for transcript IDs, and querying them returns no hits at all.
"""
import argparse, base64, collections, csv, json, os, re, select, sys, time, urllib.request, uuid

HGNC_URL = "https://storage.googleapis.com/public-download-files/hgnc/tsv/tsv/hgnc_complete_set.txt"
CATALOGUE = "src/config/catalogue-test.json"
# The catalogue item to fill and the stratifier the sites report its values under
CATEGORY_KEY = "observationMolecularMarkerName"
STRATIFIER = "MolecularMarkers"
# Focus reports markers without a name under this stratum
NO_VALUE = "null"
# What some sites put between the gene and the variant, e.g. "KRAS||c.35G>A"
SEPARATOR = "|"


# --------------------------------------------------------------------------- #
# Query the bridgeheads
# --------------------------------------------------------------------------- #
def fetch_gene_names(spot_url, idle_seconds, required_sites, timeout_seconds):
    """Send the empty query to spot and return {site: {gene name: count}}."""
    inner = base64.b64encode(
        json.dumps({"ast": {"operand": "OR", "children": []}, "id": str(uuid.uuid4())}).encode()
    ).decode()
    query = base64.b64encode(json.dumps({"lang": "ast", "payload": inner}).encode()).decode()
    task = str(uuid.uuid4())

    request = urllib.request.Request(
        f"{spot_url}/beam",
        data=json.dumps({"id": task, "query": query}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    urllib.request.urlopen(request)
    print(f"sent empty query as task {task}, waiting for results", file=sys.stderr)

    stream = urllib.request.urlopen(f"{spot_url}/beam/{task}")
    results = {}
    try:
        read_results(stream, results, idle_seconds, required_sites, timeout_seconds)
    except Exception as error:
        # Keep what we have, a run can take minutes
        print(f"  stopped reading results: {error!r}", file=sys.stderr)
    return results


def read_results(stream, results, idle_seconds, required_sites, timeout_seconds):
    """Read the SSE stream into `results` until the sites stop answering.

    There is no way to know how many sites will answer, so we stop once no new
    result has arrived for `idle_seconds`. Sites with a lot of data can take
    minutes for the empty query, so we keep waiting while a site in
    `required_sites` is still missing, bounded by `timeout_seconds`.
    """
    buffer = b""
    give_up = time.monotonic() + timeout_seconds
    deadline = time.monotonic() + idle_seconds
    while time.monotonic() < min(deadline, give_up) or (required_sites - results.keys()):
        if time.monotonic() > give_up:
            print(f"  timeout after {timeout_seconds:.0f}s", file=sys.stderr)
            return
        if not select.select([stream], [], [], 1.0)[0]:
            continue
        chunk = stream.read1(1 << 18)
        if not chunk:
            return  # server closed the stream
        buffer += chunk
        while b"\n" in buffer:
            line, buffer = buffer.split(b"\n", 1)
            if not line.startswith(b"data: "):
                continue
            message = json.loads(line[len("data: "):])
            if not isinstance(message, dict) or "from" not in message:
                # Spot also sends plain messages, e.g. "Task expired"
                print(f"  spot: {message}", file=sys.stderr)
                continue
            site = message["from"].split(".")[1]
            if message["status"] == "succeeded":
                names = decode_result(message["body"])
                if names is None:
                    print(f"  {site} sent an unexpected result, ignored: "
                          f"{message['body'][:120]}", file=sys.stderr)
                    continue
                results[site] = names
                deadline = time.monotonic() + idle_seconds  # a result resets the wait
                print(f"  {site}", file=sys.stderr)
            elif message["status"] in ("tempfailed", "permafailed"):
                print(f"  {site} failed: {message['status']}", file=sys.stderr)


def decode_result(body):
    """Gene names and counts of one site result, or None if the body is not a result.

    Focus reports either {"stratifiers": ..., "totals": ...} or, in older versions,
    a FHIR MeasureReport.
    """
    try:
        result = json.loads(base64.b64decode(body))
    except Exception:
        return None
    if not isinstance(result, dict):
        return None
    if "stratifiers" in result:
        return result["stratifiers"].get(STRATIFIER, {})
    if result.get("resourceType") == "MeasureReport":
        for group in result.get("group", []):
            for stratifier in group.get("stratifier", []):
                if stratifier["code"][0]["text"] != STRATIFIER:
                    continue
                return {stratum["value"]["text"]: stratum["population"][0]["count"]
                        for stratum in stratifier.get("stratum", [])}
        return {}
    return None


def merge_sites(results):
    """Union of the gene names all sites reported, with counts."""
    names = collections.Counter()
    for site in results.values():
        for name, count in site.items():
            if name != NO_VALUE:
                names[name] += count
    return names


def drop_variant_notation(names):
    """Remove "GENE||c.35G>A||..." names, keeping their gene searchable.

    Focus queries a gene name as an exact match or as the part before the
    separator, so the plain gene name finds those records as well.
    """
    plain = collections.Counter()
    variants = collections.Counter()
    for name, count in names.items():
        if SEPARATOR in name:
            variants[name.split(SEPARATOR)[0].strip()] += count
        else:
            plain[name] += count
    added = [gene for gene in variants if gene not in plain]
    for gene in added:
        plain[gene] = variants[gene]
    print(f"dropped {len(names) - len(plain)} names in variant notation, "
          f"added {len(added)} gene names that only occurred in it: {sorted(added)}")
    return plain


# --------------------------------------------------------------------------- #
# Descriptions from genenames.org
# --------------------------------------------------------------------------- #
def normalize(value):
    """Spelling-insensitive form used to match and to group gene names."""
    return re.sub(r"[\s\-_]", "", value).upper()


class Hgnc:
    """Symbol -> approved gene name, tolerant of spelling and of renamed genes."""

    def __init__(self, path):
        rows = list(csv.DictReader(open(path), delimiter="\t"))
        approved, former, alias = {}, collections.defaultdict(set), collections.defaultdict(set)
        for row in rows:
            approved[row["symbol"]] = row["name"]
            for symbol in filter(None, row["prev_symbol"].split("|")):
                former[symbol].add(row["name"])
            for symbol in filter(None, row["alias_symbol"].split("|")):
                alias[symbol].add(row["name"])
        # Former and alias symbols are only usable when they identify one gene
        self.indexes = [approved] + [
            {symbol: next(iter(names)) for symbol, names in mapping.items()
             if len(names) == 1 and symbol not in approved}
            for mapping in (former, alias)
        ]
        # The same indexes keyed by normalized symbol, collisions dropped
        self.normalized = []
        for index in self.indexes:
            by_normalized = collections.defaultdict(set)
            for symbol, name in index.items():
                by_normalized[normalize(symbol)].add(name)
            self.normalized.append(
                {key: next(iter(names)) for key, names in by_normalized.items() if len(names) == 1}
            )

    def name(self, symbol):
        for index, by_normalized in zip(self.indexes, self.normalized):
            if symbol in index:
                return index[symbol]
            if normalize(symbol) in by_normalized:
                return by_normalized[normalize(symbol)]
        return None

    def describe(self, value):
        """HGNC name for a gene name from the data, or "" if HGNC does not know it.

        Some sites report a gene as "APC||c.4711G>A||p.D1571N||Exon 16", so the
        leading symbol is tried as well.
        """
        for candidate in dict.fromkeys([value, value.split("||")[0].strip()]):
            name = self.name(candidate)
            if name:
                return name
        return ""

    def is_symbol(self, value):
        return value in self.indexes[0]


def download_hgnc(path):
    if os.path.exists(path):
        print(f"using {path}", file=sys.stderr)
        return
    print(f"downloading {HGNC_URL}", file=sys.stderr)
    urllib.request.urlretrieve(HGNC_URL, path)


# --------------------------------------------------------------------------- #
# Build the criteria
# --------------------------------------------------------------------------- #
def build_criteria(names, hgnc):
    """Turn {gene name: count} from the data into a criteria list."""
    groups = collections.defaultdict(list)
    for name in names:
        groups[normalize(name)].append(name)

    criteria = []
    for spellings in groups.values():
        # The approved HGNC symbol wins, then the spelling with the least
        # separator noise, then the most common one. Ties are arbitrary but the
        # choice only affects the label - every spelling is queried anyway.
        canonical = sorted(
            spellings, key=lambda name: (not hgnc.is_symbol(name), len(name), -names[name], name)
        )[0]
        criterion = {
            "key": canonical,
            "name": canonical,
            "description": hgnc.describe(canonical),
        }
        if len(spellings) > 1:
            # A criterion with a subgroup is replaced by its leaves when the query
            # is built, so the canonical spelling has to be a leaf as well.
            # visible: false keeps the leaves out of the autocomplete list.
            criterion["subgroup"] = [
                {"key": spelling, "name": spelling, "visible": False}
                for spelling in [canonical] + sorted(set(spellings) - {canonical})
            ]
        criteria.append(criterion)
    return sorted(criteria, key=lambda criterion: (criterion["key"].upper(), criterion["key"]))


def existing_values(criteria):
    """Every string the current criteria list can query, including subgroup leaves."""
    values = set()
    for criterion in criteria:
        values.add(criterion["key"])
        values |= existing_values(criterion.get("subgroup", []))
    return values


def find_category(node, key):
    if isinstance(node, list):
        for child in node:
            found = find_category(child, key)
            if found:
                return found
    elif isinstance(node, dict):
        if node.get("key") == key:
            return node
        for field in ("childCategories", "criteria"):
            if isinstance(node.get(field), list):
                found = find_category(node[field], key)
                if found:
                    return found
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--spot-url", default="http://localhost:8055")
    parser.add_argument("--idle", type=float, default=15.0,
                        help="stop waiting when no site answered for this many seconds (default: 15)")
    parser.add_argument("--require-sites", default="master",
                        help="comma separated sites that must answer, ignoring --idle. Sites with a lot "
                             "of data take minutes for the empty query, and leaving one out would drop "
                             "its genes from the catalogue (default: master)")
    parser.add_argument("--timeout", type=float, default=600.0,
                        help="stop waiting after this many seconds no matter what (default: 600)")
    parser.add_argument("--min-coverage", type=float, default=0.9,
                        help="fail if the new list covers less than this fraction of the gene names the "
                             "catalogue already has (default: 0.9)")
    parser.add_argument("--allow-shrink", action="store_true",
                        help="write the new list even if it covers less than --min-coverage")
    parser.add_argument("--cache", default="gene-names.json",
                        help="where the gene names of every site are stored")
    parser.add_argument("--offline", action="store_true", help="reuse the cached gene names")
    parser.add_argument("--hgnc", default="hgnc_complete_set.txt",
                        help="HGNC complete set, downloaded if missing")
    parser.add_argument("--catalogue", default=CATALOGUE)
    parser.add_argument("--write", action="store_true", help="update the catalogue in place")
    args = parser.parse_args()

    if args.offline:
        results = json.load(open(args.cache))
        print(f"reusing {args.cache}", file=sys.stderr)
    else:
        required = {site for site in args.require_sites.split(",") if site}
        results = fetch_gene_names(args.spot_url.rstrip("/"), args.idle, required, args.timeout)
        json.dump(results, open(args.cache, "w"))
        missing = required - results.keys()
        if missing:
            sys.exit(f"required sites did not answer: {', '.join(sorted(missing))}")
    print(f"{len(results)} sites answered: {', '.join(sorted(results))}")
    for site in sorted(results, key=lambda site: -len(results[site])):
        print(f"    {site:24} {len(results[site]):6} gene names")

    download_hgnc(args.hgnc)
    hgnc = Hgnc(args.hgnc)
    catalogue = json.load(open(args.catalogue))
    category = find_category(catalogue, CATEGORY_KEY)
    if category is None:
        sys.exit(f"{CATEGORY_KEY} not found in {args.catalogue}")

    names = drop_variant_notation(merge_sites(results))
    known = {name for name in existing_values(category["criteria"])
             if SEPARATOR not in name}
    coverage = len(known & set(names)) / len(known) if known else 1.0
    print(f"the data covers {len(known & set(names))}/{len(known)} ({coverage:.1%}) "
          f"of the gene names the catalogue already has")
    if coverage < args.min_coverage and not args.allow_shrink:
        sys.exit(f"refusing to write, coverage below {args.min_coverage:.0%}. Sites are probably "
                 f"missing - rerun, raise --idle, or pass --allow-shrink if the data really did shrink.")

    criteria = build_criteria(names, hgnc)
    merged = [criterion for criterion in criteria if "subgroup" in criterion]
    described = sum(1 for criterion in criteria if criterion["description"])
    print(f"{len(names)} gene names in the data -> {len(criteria)} criteria "
          f"({len(merged)} merged from several spellings, {described} with an HGNC description)")
    for criterion in merged:
        print(f"    {criterion['key']} <- "
              f"{', '.join(leaf['key'] for leaf in criterion['subgroup'][1:])}")
    category["criteria"] = criteria

    if args.write:
        with open(args.catalogue, "w") as file:
            json.dump(catalogue, file, indent=4, ensure_ascii=False)
            file.write("\n")
        print(f"wrote {args.catalogue}")
    else:
        print("dry run, pass --write to update the catalogue")


if __name__ == "__main__":
    main()
