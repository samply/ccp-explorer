/**
 * UI mockups for extending the molecular search (stakeholder discussion).
 *
 * Activated with PUBLIC_MOCKUP=A|B or the URL parameter ?mockup=A|B.
 * Two options remain after the meetings on 2026-11-16 (Tasks.txt, #Task2):
 *   A – gene, variant type (SNV/Indel, CNV), variant status, details for point
 *       mutations/indels and for copy-number changes (AMP/HOMDEL only),
 *       tumor-wide markers.
 *   B – as A, plus the functional class (cBioPortal mutation types) and all
 *       copy-number levels (AMP, GAIN, HETLOSS, HOMDEL, LOH).
 *   C – as A, plus "Überexpression (MTB-bewertet)" as a third variant type
 *       (source: pMtbs.pMtbBiomarker.expression = exp_high, i.e. curated by
 *       the MTB, not a systematic z-score screen; added 2026-11-17).
 * Fusions/structural variants and the cBioPortal button are not part of the
 * mockups any more (the latter is provided by the separate request tool).
 * The earlier options A–F are documented in
 * PODEST-MolMarker-docs/explorer-erweiterung-optionen-mockups.md.
 *
 * In mockup mode the "Molekulare Daten" group of the test catalogue is
 * replaced by the variant of the chosen option, and Spot is NOT queried:
 * every site result is synthetic (see mockSiteResults). Nothing here is real
 * data. The "untersucht" reference counts (REF_*) are real aggregate counts
 * from the MASTER cBioPortal (study pancan_master, 2026-11-13).
 *
 * Every text is written in German (the catalogue language) and registered
 * with its English translation via `bi(de, en)`; language.ts uses
 * `translateMockupText` as a fallback dictionary.
 */
import type {
  AstElement,
  Catalogue,
  Category,
  Criteria,
  LensResult,
} from "@samply/lens";

// ---------------------------------------------------------------------------
// Translations
// ---------------------------------------------------------------------------

const MOCK_EN: Record<string, string> = {};

/** Returns the German text and registers its English translation. */
const bi = (de: string, en: string): string => {
  MOCK_EN[de] = en;
  return de;
};

/** Translates a mockup text (German <-> English); undefined if unknown. */
export function translateMockupText(
  text: string,
  target: "de" | "en",
): string | undefined {
  if (target === "en") return MOCK_EN[text];
  for (const [de, en] of Object.entries(MOCK_EN)) if (en === text) return de;
  return undefined;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export type MockupOption = "A" | "B" | "C";
export const MOCKUP_OPTIONS: MockupOption[] = ["A", "B", "C"];

export const MOCKUP_TITLES: Record<MockupOption, string> = {
  A: bi(
    "A – Basis (Mutation, Amplifikation, tiefe Deletion)",
    "A – Basic (mutation, amplification, deep deletion)",
  ),
  B: bi(
    "B – Erweitert (+ funktionelle Klasse, alle Kopienzahlstufen)",
    "B – Extended (+ functional class, all copy-number levels)",
  ),
  C: bi("C – Basis + Überexpression", "C – Basic + overexpression"),
};

/** Mockup option from the URL (?mockup=) or the PUBLIC_MOCKUP env variable. */
export function getMockupOption(
  envValue: string | undefined,
): MockupOption | null {
  const fromUrl = new URLSearchParams(window.location.search).get("mockup");
  const value = (fromUrl ?? envValue ?? "").toUpperCase();
  if (fromUrl !== null && value === "OFF") return null;
  return (MOCKUP_OPTIONS as string[]).includes(value)
    ? (value as MockupOption)
    : null;
}

/**
 * Switch to another option. Drops the current query, because the keys
 * differ; keeps the language parameter.
 */
export function switchMockup(option: MockupOption | "off") {
  const params = new URLSearchParams({ mockup: option });
  const lang = new URLSearchParams(window.location.search).get("lang");
  if (lang) params.set("lang", lang);
  window.location.search = params.toString();
}

/** Texts of the mockup banner and charts (used in App.svelte). */
export const MOCK_TEXTS = {
  banner: bi("MOCKUP – erfundene Zahlen", "MOCKUP – made-up numbers"),
  option: bi("Option:", "Option:"),
  chartDataTypes: bi(
    "Verfügbare Datenarten (untersucht)",
    "Available data types (profiled)",
  ),
  chartDataTypesX: bi("Datenart", "Data type"),
  chartPatients: bi("Anzahl der Patienten", "Number of patients"),
  chartVariantType: bi("Variantenart", "Variant type"),
  chartOmics: bi("Omics-Analysen", "Omics analyses"),
  chartCnvLevel: bi("Kopienzahländerung (CNV)", "Copy-number change (CNV)"),
  chartFunction: bi("Funktionelle Klasse", "Functional class"),
  chartTmb: bi("Mutationslast (TMB)", "Tumor mutational burden (TMB)"),
  chartMsi: bi(
    "Mikrosatelliteninstabilität (MSI)",
    "Microsatellite instability (MSI)",
  ),
  chartHrd: bi(
    "Homologe Rekombinationsdefizienz (HRD)",
    "Homologous recombination deficiency (HRD)",
  ),
};

/** Option B adds the functional class and all copy-number levels. */
export const isExtended = (option: MockupOption) => option === "B";

/** Option C adds the MTB-assessed overexpression as a variant type. */
export const hasExpression = (option: MockupOption) => option === "C";

// ---------------------------------------------------------------------------
// Catalogue building blocks
// ---------------------------------------------------------------------------

const PLANNED = bi(
  "Mockup: Daten werden noch nicht geliefert (ETL geplant).",
  "Mockup: data is not delivered yet (ETL planned).",
);

const findCategory = (
  categories: Category[],
  key: string,
): Category | undefined => {
  for (const cat of categories) {
    if (cat.key === key) return cat;
    if (cat.fieldType === "group") {
      const hit = findCategory(cat.childCategories, key);
      if (hit) return hit;
    }
  }
  return undefined;
};

const group = (
  key: string,
  name: string,
  childCategories: Category[],
  infoButtonText?: string[],
): Category => ({
  fieldType: "group",
  key,
  name,
  childCategories,
  ...(infoButtonText ? { infoButtonText } : {}),
});

const select = (
  key: string,
  name: string,
  criteria: Criteria[],
  infoButtonText?: string[],
): Category => ({
  fieldType: "single-select",
  key,
  name,
  type: "EQUALS",
  criteria,
  ...(infoButtonText ? { infoButtonText } : {}),
});

const numberRange = (
  key: string,
  name: string,
  min: number,
  max: number,
  unitText: string,
  infoButtonText?: string[],
): Category => ({
  fieldType: "number",
  key,
  name,
  type: "BETWEEN",
  min,
  max,
  unitText,
  ...(infoButtonText ? { infoButtonText } : {}),
});

const c = (key: string, name: string, description?: string): Criteria => ({
  key,
  name,
  ...(description ? { description } : {}),
});

// ---------------------------------------------------------------------------
// "Untersucht" hint: real aggregate counts from the MASTER cBioPortal
// (pancan_master, 7.207 samples, 2026-11-13). Shown so that "0 hits" is not
// read as "does not occur".
// ---------------------------------------------------------------------------

const PROFILED_INFO = bi(
  "Untersucht: Mutationen 6.332, Kopienzahl (CNV) 6.385, RNA 5.369 von 7.207 Proben. Treffer zählen nur unter den untersuchten Proben. Referenz MASTER-cBioPortal (pancan_master, Stand 2026-11-13).",
  "Profiled: mutations 6,332, copy number (CNV) 6,385, RNA 5,369 of 7,207 samples. Hits are counted among profiled samples only. Reference MASTER cBioPortal (pancan_master, as of 2026-11-13).",
);

// ---------------------------------------------------------------------------
// Value sets
// ---------------------------------------------------------------------------

/** Variant type = data type in which a change of the gene is searched. */
const VARIANT_TYPES: Criteria[] = [
  c(
    "snv",
    bi("Punktmutation/Indel (SNV/Indel)", "Point mutation/indel (SNV/indel)"),
  ),
  c("cnv", bi("Kopienzahländerung (CNV)", "Copy-number change (CNV)")),
];

/**
 * Option C: overexpression as assessed by the MTB (pMtbBiomarker.expression =
 * exp_high). There is deliberately no "normal" value: a gene without an MTB
 * entry is "not assessed as relevant", not "normally expressed".
 */
const VARIANT_EXP = c(
  "exp",
  bi("Überexpression (RNA-Seq)", "Overexpression (RNA-Seq)"),
  bi(
    "Vom molekularen Tumorboard als relevant bewertete Überexpression des Gens (RNA-Seq).",
    "Overexpression of the gene assessed as relevant by the molecular tumor board (RNA-seq).",
  ),
);
const VARIANT_TYPES_EXP: Criteria[] = [...VARIANT_TYPES, VARIANT_EXP];

/**
 * Copy-number levels as in cBioPortal (GISTIC levels -2..+2), with the
 * cBioPortal/OQL abbreviation in brackets. Option A offers only the two
 * extreme forms, option B all levels plus LOH.
 */
const CNV_AMP = c(
  "AMP",
  bi(
    "Amplifikation – hoher Zugewinn (AMP)",
    "Amplification – high-level gain (AMP)",
  ),
);
const CNV_GAIN = c(
  "GAIN",
  bi("Zugewinn – einfach (GAIN)", "Gain – low-level (GAIN)"),
);
const CNV_HETLOSS = c(
  "HETLOSS",
  bi(
    "Verlust – einfach, heterozygot (HETLOSS)",
    "Loss – shallow, heterozygous (HETLOSS)",
  ),
);
const CNV_HOMDEL = c(
  "HOMDEL",
  bi(
    "Tiefe Deletion – homozygot (HOMDEL)",
    "Deep deletion – homozygous (HOMDEL)",
  ),
);
const CNV_LOH = c(
  "LOH",
  bi("Verlust der Heterozygotie (LOH)", "Loss of heterozygosity (LOH)"),
);
const CNV_LEVELS_BASIC = [CNV_AMP, CNV_HOMDEL];
const CNV_LEVELS_ALL = [CNV_AMP, CNV_GAIN, CNV_HETLOSS, CNV_HOMDEL, CNV_LOH];

/** Functional class: mutation types as in the cBioPortal OncoPrint. */
const VARIANT_FUNCTION: Criteria[] = [
  c(
    "missense",
    bi("Missense (Missense)", "Missense"),
    bi("Eine Aminosäure wird ausgetauscht.", "One amino acid is exchanged."),
  ),
  c(
    "truncating",
    bi("Trunkierend (Truncating)", "Truncating"),
    bi(
      "Verkürztes Protein: Nonsense, Leserasterverschiebung, Stopp-/Start-Verlust.",
      "Shortened protein: nonsense, frameshift, stop/start loss.",
    ),
  ),
  c(
    "inframe",
    bi("Im Leseraster (Inframe)", "In-frame (Inframe)"),
    bi(
      "Wenige Aminosäuren fehlen oder kommen hinzu, das Leseraster bleibt erhalten.",
      "A few amino acids are missing or added; the reading frame is kept.",
    ),
  ),
  c(
    "splice",
    bi("Spleißstelle (Splice)", "Splice site (Splice)"),
    bi(
      "Variante an einer Spleißstelle (Exon-Intron-Grenze).",
      "Variant at a splice site (exon-intron boundary).",
    ),
  ),
];

// ---------------------------------------------------------------------------
// Catalogue items
// ---------------------------------------------------------------------------

const tumorWideMarkers = (): Category =>
  group(
    "mock_tumor_wide",
    bi("Tumorweite Marker", "Tumor-wide markers"),
    [
      select(
        "mock_tmb_status",
        MOCK_TEXTS.chartTmb,
        [
          c("high", bi("TMB hoch (≥ 10 Mut/Mb)", "TMB high (≥ 10 mut/Mb)")),
          c("low", bi("TMB niedrig (< 10 Mut/Mb)", "TMB low (< 10 mut/Mb)")),
          c("not_determined", bi("nicht bestimmt", "not determined")),
        ],
        [
          bi(
            "Tumor Mutational Burden: Anzahl somatischer Mutationen pro Megabase.",
            "Tumor mutational burden: number of somatic mutations per megabase.",
          ),
          bi(
            "Schwelle 10 Mut/Mb (FDA-Kriterium für Pembrolizumab) – noch festzulegen.",
            "Threshold 10 mut/Mb (FDA criterion for pembrolizumab) – to be decided.",
          ),
          PLANNED,
        ],
      ),
      select(
        "mock_msi_status",
        MOCK_TEXTS.chartMsi,
        [
          c("high", bi("MSI hoch", "MSI high")),
          c("low", bi("MSI niedrig / stabil", "MSI low / stable")),
          c("not_determined", bi("nicht bestimmt", "not determined")),
        ],
        [
          bi(
            "Kuratierte Einstufung (MSIsensor).",
            "Curated classification (MSIsensor).",
          ),
          bi(
            "Schwelle noch offen; im MASTER-cBioPortal gibt es kein MSI-Attribut.",
            "Threshold still open; the MASTER cBioPortal has no MSI attribute.",
          ),
          PLANNED,
        ],
      ),
      select(
        "mock_hrd_status",
        MOCK_TEXTS.chartHrd,
        [
          c("high", bi("HRD hoch", "HRD high")),
          c("intermediate", bi("HRD intermediär", "HRD intermediate")),
          c("low", bi("HRD niedrig", "HRD low")),
          c("not_determined", bi("nicht bestimmt", "not determined")),
        ],
        [
          bi(
            "Kuratierte Einstufung aus HRD-Score (LOH, TAI, LST).",
            "Curated classification from the HRD score (LOH, TAI, LST).",
          ),
          bi(
            "Einstufung noch offen: Der HRD-Wert im MASTER-cBioPortal ist vermutlich nur der LOH-Anteil.",
            "Classification still open: the HRD value in the MASTER cBioPortal is probably only the LOH part.",
          ),
          PLANNED,
        ],
      ),
      group(
        "mock_tumor_wide_details",
        bi("Details: Wertebereiche", "Details: value ranges"),
        [
          numberRange(
            "mock_tmb_value",
            bi("TMB-Wert", "TMB value"),
            0,
            500,
            "Mut/Mb",
            [
              bi(
                "Freier Wertebereich statt Kategorie.",
                "Free value range instead of a category.",
              ),
              PLANNED,
            ],
          ),
          numberRange(
            "mock_msi_value",
            bi("MSI-Score", "MSI score"),
            0,
            40,
            "%",
            [bi("MSIsensor-Score.", "MSIsensor score."), PLANNED],
          ),
          numberRange(
            "mock_hrd_value",
            bi("HRD-Score", "HRD score"),
            0,
            60,
            "",
            [
              bi("Summe aus LOH, TAI und LST.", "Sum of LOH, TAI and LST."),
              PLANNED,
            ],
          ),
        ],
      ),
    ],
    [
      bi(
        "Merkmale, die den ganzen Tumor beschreiben (nicht ein einzelnes Gen).",
        "Features that describe the whole tumor (not a single gene).",
      ),
      bi(
        "Nur verfügbar für Fälle mit Genom- oder Exomsequenzierung (WGS/WES).",
        "Only available for cases with genome or exome sequencing (WGS/WES).",
      ),
    ],
  );

function molecularGroup(option: MockupOption, base: Category[]): Category {
  const get = (key: string) => {
    const cat = findCategory(base, key);
    if (!cat) throw new Error(`Mockup: catalogue item ${key} not found`);
    return cat;
  };
  const extended = isExtended(option);
  const expression = hasExpression(option);

  const gene: Category = {
    ...get("observationMolecularMarkerName"),
    name: bi("Gen", "Gene"),
    infoButtonText: [
      bi(
        "Gen als HGNC-Symbol, z. B. TP53 oder ERBB2.",
        "Gene as HGNC symbol, e.g. TP53 or ERBB2.",
      ),
      bi(
        "Gilt für alle Variantenarten: ohne Auswahl einer Variantenart zählen Punktmutationen/Indels sowie Amplifikationen und tiefe Deletionen des Gens.",
        "Applies to all variant types: without a variant type, point mutations/indels as well as amplifications and deep deletions of the gene are counted.",
      ),
      PROFILED_INFO,
    ],
  };

  const expressionInfo = expression
    ? [
        bi(
          "Überexpression= vom molekularen Tumorboard als relevant eingestufte Überexpression (RNA-Seq), z. B. PRAME oder andere Zielantigene. Typische Frage: Wie viele Fälle kämen für eine Studie mit einer gegen dieses Antigen gerichteten Therapie infrage?",
          "Overexpression= overexpression (RNA-seq) classified as relevant by the molecular tumor board, e.g. PRAME or other target antigens. Typical question: how many cases would qualify for a study of a therapy directed against this antigen?",
        ),
        bi(
          "Keine systematische Messung aller Gene: Fehlt ein Gen, heißt das „nicht als relevant bewertet“, nicht „normal exprimiert“. Deshalb gibt es keinen Wert „normal“ und keinen Z-Score.",
          "Not a systematic measurement of all genes: a missing gene means “not assessed as relevant”, not “normally expressed”. Hence there is no “normal” value and no z-score.",
        ),
        bi(
          "Zählt nur, wenn ausdrücklich gewählt (wie in cBioPortal ist Expression standardmäßig aus). Nur für Fälle mit RNA-Sequenzierung (ca. 75 %). Unterexpression erst nach Zählung der Werte exp_low. " +
            PLANNED,
          "Counts only when selected explicitly (as in cBioPortal, expression is off by default). Only for cases with RNA sequencing (approx. 75 %). Underexpression only after counting the exp_low values. " +
            MOCK_EN[PLANNED],
        ),
      ]
    : [];

  const variantType = select(
    "mock_variant_type",
    MOCK_TEXTS.chartVariantType,
    expression ? VARIANT_TYPES_EXP : VARIANT_TYPES,
    [
      bi(
        "In welcher Datenart eine Veränderung des gewählten Gens gesucht wird (wie die Profilauswahl in cBioPortal). Mehrfachauswahl wird ODER-verknüpft; ohne Auswahl zählen beide.",
        "In which data type a change of the selected gene is searched (like the profile selection in cBioPortal). Multiple values are combined with OR; without a selection both count.",
      ),
      bi(
        "Punktmutation/Indel = nicht-synonyme SNVs und kleine Insertionen/Deletionen. Kopienzahländerung = ohne Details nur Amplifikation (AMP) und tiefe Deletion (HOMDEL).",
        "Point mutation/indel = non-synonymous SNVs and small insertions/deletions. Copy-number change = without details only amplification (AMP) and deep deletion (HOMDEL).",
      ),
      bi(
        "Fusionen und Strukturvarianten sind bewusst nicht enthalten.",
        "Fusions and structural variants are deliberately not included.",
      ),
      bi(
        "Nur Punktmutationen/Indels werden heute geliefert. Mockup: Kopienzahl wird noch nicht geliefert (ETL geplant).",
        "Only point mutations/indels are delivered today. Mockup: copy number is not delivered yet (ETL planned).",
      ),
      ...expressionInfo,
      PROFILED_INFO,
    ],
  );

  /**
   * Variant status (formerly "Variantenbefund"). S, N and U are merged into
   * one value: for the feasibility check they all mean "no clear result".
   * Real implementation: the query (or the ETL) has to map "SNU" to S|N|U.
   */
  const variantStatus: Category = {
    ...get("observationMolecularMarkerVariantCode"),
    name: bi("Variantenstatus", "Variant status"),
    criteria: [
      c("M", bi("Mutation/positiv", "Mutation/positive")),
      c("W", bi("Wildtyp/negativ", "Wild type/negative")),
      c("P", bi("Polymorphismus", "Polymorphism")),
      c(
        "SNU",
        bi(
          "Sonstiges / nicht bestimmbar / unbekannt",
          "Other / cannot be assessed / unknown",
        ),
        bi(
          "Kein eindeutiges Ergebnis: sonstiges Ergebnis, Bestimmung nicht möglich oder keine Angabe.",
          "No clear result: other result, assessment not possible or not specified.",
        ),
      ),
    ],
    infoButtonText: [
      bi(
        "Ob im gewählten Gen eine Variante vorliegt (Mutation/positiv, Wildtyp/negativ, Polymorphismus).",
        "Whether a variant is present in the selected gene (mutation/positive, wild type/negative, polymorphism).",
      ),
      bi(
        "„Sonstiges / nicht bestimmbar / unbekannt“ fasst drei Werte zusammen: S = sonstiges Ergebnis, N = nicht bestimmbar (Bestimmung fehlgeschlagen), U = unbekannt (keine Angabe).",
        "“Other / cannot be assessed / unknown” combines three values: S = other result, N = cannot be assessed (assessment failed), U = unknown (not specified).",
      ),
      bi(
        "Bisher „Variantenbefund“; endgültige Bezeichnung nach oBDS (ggf. „Ausprägung“).",
        "Formerly “variant finding”; final name according to oBDS (possibly “Ausprägung”).",
      ),
      bi("Nur somatische Varianten.", "Somatic variants only."),
    ],
  } as Category;

  const omics: Category = {
    ...get("analysis_method"),
    name: MOCK_TEXTS.chartOmics,
    infoButtonText: [
      bi(
        "Welche Analysen (Datenebenen, engl. Data Layer) im Rahmen des MASTER-Projekts für eine Patientin/einen Patienten durchgeführt wurden, z. B. Genom- oder RNA-Sequenzierung.",
        "Which analyses (data layers) were performed for a patient within the MASTER project, e.g. genome or RNA sequencing.",
      ),
      bi(
        "Sie können die Suche auf Patient*innen einschränken, bei denen eine bestimmte Analyse durchgeführt wurde.",
        "You can restrict the search to patients for whom a certain analysis was performed.",
      ),
    ],
  };

  const snvDetails = group(
    "mock_snv_details",
    bi(
      "Details: Punktmutation/Indel (SNV/Indel)",
      "Details: point mutation/indel (SNV/indel)",
    ),
    [
      ...(extended
        ? [
            select(
              "mock_variant_function",
              MOCK_TEXTS.chartFunction,
              VARIANT_FUNCTION,
              [
                bi(
                  "Auswirkung der Variante auf das Protein, gruppiert wie die Mutationstypen in cBioPortal (OQL: MISSENSE, TRUNC, INFRAME, SPLICE).",
                  "Effect of the variant on the protein, grouped like the mutation types in cBioPortal (OQL: MISSENSE, TRUNC, INFRAME, SPLICE).",
                ),
                bi(
                  "Abgeleitet aus der ANNOVAR-Klasse (VariantenTypCS) der MASTER-Daten. " +
                    PLANNED,
                  "Derived from the ANNOVAR class (VariantenTypCS) of the MASTER data. " +
                    MOCK_EN[PLANNED],
                ),
              ],
            ),
          ]
        : []),
      get("observationMolecularMarkerEnsemblID"),
      get("observationMolecularMarkerDNAchange"),
      get("observationMolecularMarkerAminoacidchange"),
    ],
    [
      bi(
        "Nur für Punktmutationen und kleine Insertionen/Deletionen (SNV/Indel).",
        "Only for point mutations and small insertions/deletions (SNV/indel).",
      ),
      bi(
        "Für die Machbarkeitsprüfung meist nicht nötig; die Detailanalyse erfolgt nach Antrag.",
        "Usually not needed for the feasibility check; the detailed analysis follows the request.",
      ),
    ],
  );

  // One level only: the former inner select "Art der Kopienzahländerung" was
  // redundant, so the values sit directly under the "Details: CNV" heading.
  const cnvScope = [
    bi(
      "Nur für Kopienzahländerungen (CNV) des gewählten Gens.",
      "Only for copy-number changes (CNV) of the selected gene.",
    ),
    PROFILED_INFO,
  ];
  const cnvDetails = select(
    "mock_cnv_level",
    bi(
      "Details: Kopienzahländerung (CNV)",
      "Details: copy-number change (CNV)",
    ),
    extended ? CNV_LEVELS_ALL : CNV_LEVELS_BASIC,
    [
      ...cnvScope,
      ...(extended
        ? [
            bi(
              "Alle Stufen wie in cBioPortal: Amplifikation (+2), Zugewinn (+1), einfacher Verlust (−1), tiefe Deletion (−2), dazu LOH.",
              "All levels as in cBioPortal: amplification (+2), gain (+1), shallow loss (−1), deep deletion (−2), plus LOH.",
            ),
            bi(
              "Achtung: Zugewinn, einfacher Verlust und LOH kommen bei einem großen Teil der Tumoren vor (z. B. MYC-Zugewinn 36 %, MYC-Amplifikation 8 %) und trennen Kohorten kaum.",
              "Note: gain, shallow loss and LOH occur in a large share of tumors (e.g. MYC gain 36 %, MYC amplification 8 %) and hardly separate cohorts.",
            ),
            bi(
              "MASTER-Typen: Zugewinn = DUP, Verlust = DEL, tiefe Deletion = HDEL, LOH = LOH/TCNneutral;LOH. Amplifikation = DUP mit hoher Kopienzahl (Schwelle noch festzulegen). " +
                PLANNED,
              "MASTER types: gain = DUP, loss = DEL, deep deletion = HDEL, LOH = LOH/TCNneutral;LOH. Amplification = DUP with high copy number (threshold to be decided). " +
                MOCK_EN[PLANNED],
            ),
          ]
        : [
            bi(
              "Nur die beiden Extremformen: Amplifikation (cBioPortal „AMP“, +2) und tiefe/homozygote Deletion (cBioPortal „HOMDEL“, −2).",
              "Only the two extreme forms: amplification (cBioPortal “AMP”, +2) and deep/homozygous deletion (cBioPortal “HOMDEL”, −2).",
            ),
            bi(
              "Einfacher Zugewinn, einfacher Verlust und LOH sind nicht wählbar: sie kommen bei einem großen Teil der Tumoren vor (z. B. MYC-Zugewinn 36 %, MYC-Amplifikation 8 %).",
              "Simple gain, shallow loss and LOH cannot be selected: they occur in a large share of tumors (e.g. MYC gain 36 %, MYC amplification 8 %).",
            ),
            bi(
              "Einstufung wie beim cBioPortal-Import (Regel noch zu klären). " +
                PLANNED,
              "Classification as in the cBioPortal import (rule to be clarified). " +
                MOCK_EN[PLANNED],
            ),
          ]),
    ],
  );

  return group(
    "MolecularMarker1",
    bi("Molekulare Informationen", "Molecular information"),
    [
      omics,
      gene,
      variantType,
      variantStatus,
      snvDetails,
      cnvDetails,
      tumorWideMarkers(),
    ],
    [
      bi(
        "Mockup. Alle Zahlen in dieser Ansicht sind erfunden.",
        "Mockup. All numbers in this view are made up.",
      ),
      MOCKUP_TITLES[option],
    ],
  );
}

export function buildMockupCatalogue(
  option: MockupOption,
  base: Catalogue,
): Catalogue {
  return base.map((cat) =>
    cat.key === "MolecularMarker1" ? molecularGroup(option, base) : cat,
  );
}

// ---------------------------------------------------------------------------
// Synthetic site results
// ---------------------------------------------------------------------------

/** Sites shown in mockup mode. Only "master" delivers molecular data. */
const MOCK_SITES: { site: string; patients: number; molecular: boolean }[] = [
  { site: "master", patients: 8200, molecular: true },
  { site: "dresden", patients: 41000, molecular: false },
  { site: "frankfurt", patients: 36000, molecular: false },
  { site: "muenchen-tum", patients: 52000, molecular: false },
  { site: "essen", patients: 29000, molecular: false },
];

/** Criteria keys a site without MASTER data cannot answer (it reports 0). */
const isMolecularKey = (key: string) =>
  key.startsWith("mock_") ||
  key.startsWith("observationMolecularMarker") ||
  key === "analysis_method";

function collectKeys(node: AstElement, keys: string[] = []): string[] {
  if ("children" in node)
    node.children.forEach((child) => collectKeys(child, keys));
  else keys.push(node.key);
  return keys;
}

/** Deterministic pseudo-random numbers so the same query gives the same counts. */
function rng(seedText: string) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++)
    h = Math.imul(h ^ seedText.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const round10 = (n: number) => Math.max(0, Math.round(n / 10) * 10);

function spread(
  total: number,
  weights: Record<string, number>,
  rand: () => number,
): Record<string, number> {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  const out: Record<string, number> = {};
  for (const [k, w] of Object.entries(weights)) {
    const v = Math.round((total * w * (0.85 + 0.3 * rand())) / sum);
    if (v > 0) out[k] = v;
  }
  return out;
}

/** Like spread(), but keeps every key (at least 1) when total > 0. */
function spreadAll(
  total: number,
  weights: Record<string, number>,
  rand: () => number,
): Record<string, number> {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0);
  const out: Record<string, number> = {};
  if (total <= 0) return out;
  for (const [k, w] of Object.entries(weights))
    out[k] = Math.max(1, Math.round((total * w * (0.85 + 0.3 * rand())) / sum));
  return out;
}

const TOP_GENES: [string, number][] = [
  ["TP53", 38],
  ["KRAS", 14],
  ["CDKN2A", 12],
  ["PIK3CA", 10],
  ["ATRX", 8],
  ["APC", 8],
  ["NF1", 7],
  ["PTEN", 7],
  ["BRAF", 6],
  ["ARID1A", 6],
  ["RB1", 5],
  ["EGFR", 5],
  ["CTNNB1", 4],
  ["SMARCB1", 4],
  ["TERT", 4],
  ["BRCA2", 3],
  ["KMT2D", 3],
  ["IDH1", 3],
  ["NRAS", 3],
  ["FGFR1", 2],
  ["ERBB2", 2],
  ["MDM2", 2],
  ["MYC", 2],
  ["CDK4", 2],
  ["BRCA1", 2],
];

function siteResult(
  siteInfo: (typeof MOCK_SITES)[number],
  keys: string[],
  seed: string,
  extended: boolean,
  expression: boolean,
): LensResult {
  const rand = rng(`${seed}|${siteInfo.site}`);
  const answerable = siteInfo.molecular || !keys.some(isMolecularKey);
  // every criterion narrows the cohort
  let patients = siteInfo.patients;
  for (let i = 0; i < keys.length; i++) patients *= 0.08 + 0.35 * rand();
  patients = answerable ? round10(patients) : 0;
  const specimen = round10(patients * (siteInfo.molecular ? 4.9 : 2.3));

  const stratifiers: Record<string, Record<string, number>> = {
    gender: spread(patients, { female: 49, male: 51 }, rand),
    "75186-7": spread(
      patients,
      { lebend: 40, verstorben: 35, unbekannt: 25 },
      rand,
    ),
    age_at_diagnosis: spread(
      patients,
      {
        "0": 1,
        "10": 3,
        "20": 9,
        "30": 16,
        "40": 20,
        "50": 22,
        "60": 18,
        "70": 9,
        "80": 2,
      },
      rand,
    ),
    diagnosis: spread(
      patients,
      {
        "C71.9": 14,
        "C49.9": 12,
        "C34.1": 10,
        "C25.0": 9,
        "C18.7": 8,
        "C50.9": 8,
        C56: 6,
        C61: 5,
        C64: 4,
        "C16.0": 4,
        "C43.5": 3,
        "C22.0": 3,
      },
      rand,
    ),
    therapy_of_tumor: spread(patients, { OP: 90, ST: 45 }, rand),
    medicationStatements: spread(
      patients,
      { CH: 40, CI: 14, IM: 8, HO: 5, ZS: 6, CZ: 3 },
      rand,
    ),
    sample_kind: spread(
      specimen,
      {
        dna: 38,
        rna: 18,
        "blood-plasma": 10,
        "whole-blood": 12,
        "tissue-frozen": 12,
        "tissue-ffpe": 10,
      },
      rand,
    ),
  };
  const totals: Record<string, number> = { patients, specimen };

  if (siteInfo.molecular && patients > 0) {
    stratifiers.analysis_method = spread(
      patients,
      { wgs: 50, rnaseq: 30, wes: 24, epic: 30, proteome: 15, panel: 1 },
      rand,
    );
    stratifiers.MolecularMarkers = Object.fromEntries(
      TOP_GENES.map(([g, pct]) => [
        g,
        Math.round((patients * pct * (0.7 + 0.6 * rand())) / 100),
      ]),
    );
    stratifiers.mock_variant_type = spread(
      patients,
      expression ? { snv: 92, cnv: 30, exp: 6 } : { snv: 92, cnv: 30 },
      rand,
    );
    stratifiers.mock_cnv_level = spread(
      patients,
      extended
        ? { AMP: 21, GAIN: 70, HETLOSS: 62, HOMDEL: 14, LOH: 45 }
        : { AMP: 21, HOMDEL: 14 },
      rand,
    );
    if (extended)
      stratifiers.mock_variant_function = spread(
        patients,
        { missense: 80, truncating: 55, inframe: 12, splice: 15 },
        rand,
      );
    // shares close to pancan_master (TMB >= 10: 3.4 %, HRD missing: 11 %);
    // every category stays >= 1 so the fixed bar colours keep their meaning
    stratifiers.mock_tmb_status = spreadAll(
      patients,
      { high: 3.4, low: 96.4, not_determined: 0.2 },
      rand,
    );
    stratifiers.mock_msi_status = spreadAll(
      patients,
      { high: 2, low: 88, not_determined: 10 },
      rand,
    );
    stratifiers.mock_hrd_status = spreadAll(
      patients,
      { high: 3, intermediate: 8, low: 78, not_determined: 11 },
      rand,
    );
    // share of patients with data of each type (close to the cBioPortal ratios)
    stratifiers.mock_data_types = Object.fromEntries(
      (
        [
          ["mutation", 0.88],
          ["cnv", 0.89],
          ["rna", 0.74],
        ] as [string, number][]
      ).map(([k, share]) => [
        k,
        Math.round(patients * share * (0.95 + 0.05 * rand())),
      ]),
    );
  } else if (patients > 0) {
    // oBDS sites only know gene + variants for a few genes
    stratifiers.MolecularMarkers = {
      KRAS: Math.round(patients * 0.01),
      BRAF: Math.round(patients * 0.006),
      EGFR: Math.round(patients * 0.004),
    };
    stratifiers.mock_variant_type = { snv: Math.round(patients * 0.02) };
  }
  return { stratifiers, totals };
}

/** Replaces the Spot query in mockup mode: one synthetic result per site. */
export function mockSiteResults(
  ast: AstElement,
  option: MockupOption,
): [string, LensResult][] {
  const keys = collectKeys(ast);
  const seed = JSON.stringify(ast);
  return MOCK_SITES.map((s) => [
    s.site,
    siteResult(s, keys, seed, isExtended(option), hasExpression(option)),
  ]);
}

const legend = (criteria: Criteria[]) =>
  Object.fromEntries(criteria.map((x) => [x.key, x.name]));

const STATUS_HINT = bi(
  "Anzahl der Fälle je Einstufung; „nicht bestimmt“ heißt: kein Wert vorhanden, nicht „negativ“. Mockup: erfundene Zahlen, Anteile angelehnt an das MASTER-cBioPortal.",
  "Number of cases per category; “not determined” means no value, not “negative”. Mockup: made-up numbers, shares based on the MASTER cBioPortal.",
);

const MADE_UP_MULTI = bi(
  "Mockup: erfundene Zahlen. Eine Patientin/ein Patient kann mehrere Arten haben.",
  "Mockup: made-up numbers. A patient can have several types.",
);

export const MOCK_CHART_OPTIONS = {
  mock_variant_type: {
    legendMapping: legend(VARIANT_TYPES_EXP),
    hintText: [MADE_UP_MULTI],
  },
  mock_cnv_level: {
    // short labels, the full names do not fit into the pie legend
    legendMapping: {
      AMP: bi("Amplifikation (AMP)", "Amplification (AMP)"),
      GAIN: bi("Zugewinn (GAIN)", "Gain (GAIN)"),
      HETLOSS: bi("Verlust (HETLOSS)", "Loss (HETLOSS)"),
      HOMDEL: bi("Tiefe Deletion (HOMDEL)", "Deep deletion (HOMDEL)"),
      LOH: CNV_LOH.name,
    },
    hintText: [MADE_UP_MULTI],
  },
  mock_variant_function: {
    legendMapping: legend(VARIANT_FUNCTION),
    hintText: [MADE_UP_MULTI],
  },
  mock_tmb_status: {
    legendMapping: {
      high: bi("hoch (≥ 10 Mut/Mb)", "high (≥ 10 mut/Mb)"),
      low: bi("niedrig (< 10 Mut/Mb)", "low (< 10 mut/Mb)"),
      not_determined: bi("nicht bestimmt", "not determined"),
    },
    hintText: [STATUS_HINT],
  },
  mock_msi_status: {
    legendMapping: {
      high: bi("hoch (Schwelle offen)", "high (threshold open)"),
      low: bi("niedrig / stabil", "low / stable"),
      not_determined: bi("nicht bestimmt", "not determined"),
    },
    hintText: [STATUS_HINT],
  },
  mock_hrd_status: {
    legendMapping: {
      high: bi("hoch (Einstufung offen)", "high (classification open)"),
      intermediate: bi("intermediär", "intermediate"),
      low: bi("niedrig", "low"),
      not_determined: bi("nicht bestimmt", "not determined"),
    },
    hintText: [STATUS_HINT],
  },
  mock_data_types: {
    legendMapping: {
      mutation: bi("Mutationen (SNV/Indel)", "Mutations (SNV/indel)"),
      cnv: bi("Kopienzahl (CNV)", "Copy number (CNV)"),
      rna: bi("RNA-Expression", "RNA expression"),
    },
    hintText: [
      bi(
        "Anzahl der Fälle, für die Daten dieser Art vorliegen (untersucht), unabhängig davon, ob eine Veränderung gefunden wurde.",
        "Number of cases with data of this type (profiled), regardless of whether a change was found.",
      ),
      bi(
        "Ein Fall kann mehrere Datenarten haben. Mockup: erfundene Zahlen, Anteile angelehnt an das MASTER-cBioPortal.",
        "A case can have several data types. Mockup: made-up numbers, shares based on the MASTER cBioPortal.",
      ),
    ],
  },
};
