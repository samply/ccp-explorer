<script lang="ts">
  import "./app.css";
  import type {
    Catalogue,
    LensOptions,
    LensResult,
    SpotResult,
  } from "@samply/lens";
  import {
    setOptions,
    setCatalogue,
    clearSiteResults,
    markSiteClaimed,
    setSiteResult,
    querySpot,
    getAst,
    removeFailedSite,
  } from "@samply/lens";
  import { negotiate } from "./lib/project-manager";
  import {
    language,
    languageToggleEnabled,
    setLanguage,
    t,
    translateCatalogue,
    translateOptions,
  } from "./lib/language";
  import { onMount } from "svelte";
  import { SvelteMap } from "svelte/reactivity";
  import { env } from "$env/dynamic/public";
  import catalogueProd from "./config/catalogue.json";
  import catalogueTest from "./config/catalogue-test.json";
  import optionsProd from "./config/options.json";
  import optionsTest from "./config/options-test.json";
  import { v4 as uuidv4 } from "uuid";

  /**
   * Focus reports the analysis method combinations (e.g. wes+rnaseq) as
   * separate stratifiers. Merge them into the analysis_method stratifier so
   * they are shown in the same chart as the single analysis methods.
   */
  function mergeAnalysisMethodCombinations(siteResult: LensResult) {
    const stratifiers = siteResult.stratifiers;
    for (const key of [
      "analysis_method_wes_rnaseq",
      "analysis_method_wgs_rnaseq",
    ]) {
      if (stratifiers[key] === undefined) continue;
      stratifiers.analysis_method = {
        ...stratifiers.analysis_method,
        ...stratifiers[key],
      };
      delete stratifiers[key];
    }
  }

  let abortController = new AbortController();
  function sendQuery() {
    abortController.abort();
    abortController = new AbortController();
    clearSiteResults();

    /** Helper function to base64 encode a UTF-8 string */
    const base64Encode = (utf8String: string) =>
      btoa(String.fromCharCode(...new TextEncoder().encode(utf8String)));

    const query = base64Encode(
      JSON.stringify({
        lang: "ast",
        payload: base64Encode(JSON.stringify({ ast: getAst(), id: uuidv4() })),
      }),
    );
    querySpot(query, abortController.signal, (result: SpotResult) => {
      const site = result.from.split(".")[1];
      if (result.status === "claimed") {
        markSiteClaimed(site);
      } else if (result.status === "succeeded") {
        const siteResult = JSON.parse(atob(result.body));
        console.log(siteResult);
        mergeAnalysisMethodCombinations(siteResult);
        setSiteResult(site, siteResult);
      } else {
        removeFailedSite(site);
        console.error(
          `Site ${site} failed with status ${result.status}:`,
          result.body,
        );
      }
    });
  }

  document.documentElement.lang = language;

  window.addEventListener("lens-search-triggered", () => {
    sendQuery();
  });

  window.addEventListener("lens-negotiate-triggered", () => {
    negotiate();
  });

  onMount(() => {
    // Set the options based on the environment
    let options: LensOptions = optionsProd as LensOptions;
    if (env.PUBLIC_ENVIRONMENT === "test") {
      options = optionsTest as LensOptions;
    }
    if (env.PUBLIC_SPOT_URL) {
      options.spotUrl = env.PUBLIC_SPOT_URL;
    }
    setOptions(translateOptions(options));

    // Set the catalogue based on the environment
    let catalogue = catalogueProd as Catalogue;
    if (env.PUBLIC_ENVIRONMENT === "test") {
      catalogue = catalogueTest as Catalogue;
    }
    setCatalogue(translateCatalogue(catalogue));

    // Wait for the search bar to initialize (load query from URL) before sending the initial query.
    // Using setTimeout to ensure the custom element's onMount has completed.
    setTimeout(() => sendQuery(), 0);
  });

  const saveQuery = () => {
    // The query is already stored in the URL, so we can create a simple HTML file that redirects to the current URL.
    const url = window.location.href;
    const htmlContent = `<html><head><meta http-equiv="refresh" content="0;url=${url}"></head><body></body></html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const currentDate = new Date();

    const formattedDate = currentDate.toLocaleDateString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    a.download = `biodatahub-explorer-query-${formattedDate}.html`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  let catalogueopen: boolean = false;

  const projectManagerButtonTitle = new URLSearchParams(
    window.location.search,
  ).has("project-code")
    ? t({
        de: "Daten- und Probenanfrage bearbeiten",
        en: "Edit data and sample request",
      })
    : t({ de: "Daten und Proben anfragen", en: "Request data and samples" });

  const genderHeaders: Map<string, string> = new SvelteMap<string, string>()
    .set("male", t({ de: "männlich", en: "male" }))
    .set("female", t({ de: "weiblich", en: "female" }))
    .set("other", t({ de: "divers", en: "diverse" }))
    .set("unknown", t({ de: "unbekannt", en: "unknown" }));

  const barChartBackgroundColors: string[] = ["#4dc9f6", "#3da4c7"];

  const therapyHeaders: Map<string, string> = new SvelteMap<
    string,
    string
  >().set("medicationStatements", "Sys. T");
</script>

<header>
  <div class="header-wrapper">
    <div class="logo">
      <img
        src="../dktk.svg"
        alt={t({ de: "Logo des DKTK", en: "DKTK logo" })}
      />
    </div>
    <h1 class="header-h1">DKTK BioDataHub Explorer</h1>
    <div class="logo logo-dkfz">
      {#if languageToggleEnabled}
        <div class="language-toggle">
          <button
            class:active={language === "de"}
            aria-pressed={language === "de"}
            on:click={() => setLanguage("de")}>DE</button
          >
          <button
            class:active={language === "en"}
            aria-pressed={language === "en"}
            on:click={() => setLanguage("en")}>EN</button
          >
        </div>
      {/if}
      <img
        src="../Deutsches_Krebsforschungszentrum_Logo.svg"
        alt={t({ de: "Logo des DKFZ", en: "DKFZ logo" })}
      />
    </div>
  </div>
</header>
<main class={env.PUBLIC_ENVIRONMENT === "test" ? "env-test" : "env-prod"}>
  <div class="search">
    <div class="search-wrapper">
      <lens-search-bar
        noMatchesFoundMessage={t({
          de: "keine Ergebnisse gefunden",
          en: "no results found",
        })}
      ></lens-search-bar>
      <lens-query-explain-button
        noQueryMessage={t({
          de: "Leere Suchanfrage: Sucht nach allen Ergebnissen.",
          en: "Empty query: searches for all results.",
        })}
      ></lens-query-explain-button>
      <button
        class="save_button"
        on:click={saveQuery}
        title={t({ de: "Suchanfrage speichern", en: "Save query" })}
        ><img
          alt={t({ de: "Suchkriterien Speichern", en: "Save search criteria" })}
          src="save_24.svg"
        />
      </button>
      <lens-search-button title={t({ de: "Suchen", en: "Search" })}
      ></lens-search-button>
    </div>
  </div>
  <div class="grid">
    <div class="catalogue-wrapper">
      <div class="f-info-box">
        {t({ de: "Weiterführende Informationen:", en: "Further information:" })}
        <br />
        {t({ de: "Zur Nutzung", en: "Please note the usage notes" })}
        <img
          src="info-circle-svgrepo-com.svg"
          alt="info-icon"
          width="18px"
          height="18px"
        />
        {t({ de: "und", en: "and" })}
        <a href="https://hub.dkfz.de/s/iP6A7zJzAQya3iC" target="_blank"
          >Known Issues</a
        >{t({ de: " beachten.", en: "." })}
        <a href="https://hub.dkfz.de/s/c7KmaCxSLQicw3Y" target="_blank">
          {t({
            de: "Informationen zu Bioproben/Daten Anfragen",
            en: "Information on biosample/data requests",
          })}</a
        >
      </div>
      <div class="catalogue">
        <div class="catalogue-header">
          <h2>{t({ de: "Suchkriterien", en: "Search criteria" })}</h2>
          <lens-info-button
            message={language === "de"
              ? [
                  `Die Suche erfolgt patienten-orientiert. `,
                  `Bei Patienten mit mehreren onkologischen Diagnosen, können sich ausgewählte Suchkriterien nicht nur auf eine Erkrankung beziehen, sondern auch auf Weitere.`,
                  `Innerhalb einer Kategorie werden verschiedene Ausprägungen mit einer „Oder-Verknüpfung“ gesucht; bei der Suche über mehrere Kategorien mit einer „Und-Verknüpfung“.`,
                ]
              : [
                  `The search is patient-oriented. `,
                  `For patients with multiple oncological diagnoses, selected search criteria may refer not only to one disease but also to others.`,
                  `Within a category, different values are combined with "OR"; across multiple categories, they are combined with "AND".`,
                ]}
            buttonSize={22}
            alignDialogue="bottom-left"
          ></lens-info-button>
        </div>
        <lens-catalogue toggle={{ collapsable: false, open: catalogueopen }}
        ></lens-catalogue>
      </div>
    </div>
    <div class="charts">
      <div class="chart-wrapper result-summary">
        <lens-result-summary></lens-result-summary>
        <lens-negotiate-button
          type="ProjectManager"
          title={projectManagerButtonTitle}
        ></lens-negotiate-button>
        <lens-search-modified-display></lens-search-modified-display>
      </div>
      <div class="chart-wrapper">
        <lens-chart
          title={t({ de: "Patienten pro Standort", en: "Patients per site" })}
          dataKey="patients"
          perSite={true}
          displayLegends={true}
          chartType="pie"
        ></lens-chart>
      </div>
      <div class="chart-wrapper result-table">
        <lens-result-table></lens-result-table>
      </div>
      {#if env.PUBLIC_ENVIRONMENT === "test"}
        <div class="chart-wrapper chart-master">
          <lens-chart
            title={t({ de: "Omics-Daten", en: "Omics data" })}
            dataKey="analysis_method"
            chartType="bar"
            filterRegex="^(?!phosprot$)"
            yAxisTitle={t({
              de: "Tumorproben/Keimbahnkontrollen",
              en: "Tumor samples/germline controls",
            })}
          ></lens-chart>
          <p class="master-hint">
            <img src="master-logo.png" alt="" />
            {t({
              de: "Nur verfügbar für Datensätze aus MASTER.",
              en: "Only available for data sets from MASTER.",
            })}
          </p>
        </div>
      {/if}
      <div class="chart-wrapper">
        <lens-chart
          title={t({ de: "Geschlecht", en: "Gender" })}
          dataKey="gender"
          chartType="pie"
          displayLegends={true}
          headers={genderHeaders}
        ></lens-chart>
      </div>
      <div class="chart-wrapper chart-age-distribution">
        <lens-chart
          title={t({
            de: "Alter bei Erstdiagnose",
            en: "Age at initial diagnosis",
          })}
          dataKey="age_at_diagnosis"
          chartType="bar"
          groupRange={10}
          filterRegex="^(([0-9]?[0-9]$)|(1[0-2]0))"
          xAxisTitle={t({ de: "Alter", en: "Age" })}
          yAxisTitle={t({
            de: "Anzahl der Primärdiagnosen",
            en: "Number of primary diagnoses",
          })}
          backgroundColor={barChartBackgroundColors}
        ></lens-chart>
      </div>
      <div class="chart-wrapper">
        <lens-chart
          title={t({ de: "Vitalstatus", en: "Vital status" })}
          dataKey="75186-7"
          chartType="pie"
          displayLegends={true}
        ></lens-chart>
      </div>
      <div class="chart-wrapper">
        <lens-chart
          title={t({ de: "Therapieart", en: "Type of therapy" })}
          dataKey="therapy_of_tumor"
          chartType="bar"
          headers={therapyHeaders}
          xAxisTitle={t({ de: "Art der Therapie", en: "Type of therapy" })}
          yAxisTitle={t({
            de: "Anzahl der Therapieeinträge",
            en: "Number of therapy entries",
          })}
          backgroundColor={barChartBackgroundColors}
        ></lens-chart>
      </div>
      <div class="chart-wrapper chart-systemische">
        <lens-chart
          title={t({ de: "Systemische Therapien", en: "Systemic therapies" })}
          dataKey="medicationStatements"
          chartType="bar"
          xAxisTitle={t({ de: "Art der Therapie", en: "Type of therapy" })}
          yAxisTitle={t({
            de: "Anzahl der Therapieeinträge",
            en: "Number of therapy entries",
          })}
          backgroundColor={barChartBackgroundColors}
        ></lens-chart>
      </div>
      <div class="chart-wrapper">
        <lens-chart
          title={t({ de: "Proben", en: "Samples" })}
          dataKey="sample_kind"
          chartType="bar"
          xAxisTitle={t({ de: "Probentypen", en: "Sample types" })}
          yAxisTitle={t({ de: "Probenanzahl", en: "Number of samples" })}
          filterRegex="^(?!(tissue-other|buffy-coat|peripheral-blood-cells|dried-whole-blood|swab|ascites|stool-faeces|saliva|liquid-other|derivative-other))"
          backgroundColor={barChartBackgroundColors}
        >
        </lens-chart>
      </div>
      <div class="chart-wrapper chart-diagnosis">
        <lens-chart
          title={t({ de: "Top 20 Diagnosen", en: "Top 20 diagnoses" })}
          dataKey="diagnosis"
          chartType="bar"
          topN={20}
          groupingDivider="."
          groupingLabel=".%"
          filterRegex={"^(C.{2,6}|D[0-4][0-9].{0,4})"}
          xAxisTitle="ICD-10-Codes"
          yAxisTitle={t({
            de: "Anzahl der Diagnosen",
            en: "Number of diagnoses",
          })}
          backgroundColor={barChartBackgroundColors}
        ></lens-chart>
      </div>
      {#if env.PUBLIC_ENVIRONMENT === "test"}
        <div class="chart-wrapper chart-wrapper-mol">
          <lens-chart
            title={t({
              de: "Top 20 veränderte Gene",
              en: "Top 20 altered genes",
            })}
            dataKey="MolecularMarkers"
            chartType="bar"
            topN={20}
            xAxisTitle={t({ de: "Gen", en: "Gene" })}
            yAxisTitle={t({
              de: "Anzahl der Patienten",
              en: "Number of patients",
            })}
            backgroundColor={barChartBackgroundColors}
          >
          </lens-chart>
        </div>
      {/if}
    </div>
  </div>
</main>

<footer>
  <a
    class="known-issues"
    href="https://hub.dkfz.de/s/iP6A7zJzAQya3iC"
    target="_blank"
  >
    Known Issues
  </a>
  <a
    href="https://dktk.dkfz.de/en/research/core-facilities/biodatahub"
    target="_blank"
  >
    BioDataHub (BDH)
  </a>
  <a class="email" href="mailto:biodatahub@dkfz.de"
    >{t({ de: "Kontakt", en: "Contact" })}</a
  >
  <a
    class="user-agreement"
    href="https://hub.dkfz.de/s/MPCg2kK23LH8Yii"
    download="nutzervereinbarung"
    target="_blank">{t({ de: "Nutzungsvereinbarung", en: "User agreement" })}</a
  >
  <a
    class="privacy-policy"
    href="https://hub.dkfz.de/s/5LPccy6fgRSoD65"
    download="datenschutzerklaerung"
    target="_blank">{t({ de: "Datenschutz", en: "Privacy policy" })}</a
  >
  <a
    class="imprint"
    href="https://www.dkfz.de/de/impressum.html"
    target="_blank">{t({ de: "Impressum", en: "Imprint" })}</a
  >
</footer>

<lens-toast></lens-toast>

<style>
  .catalogue-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--gap-s);
  }
  .catalogue-header h2 {
    margin: 0;
  }

  .header-h1 {
    color: #2b63b8;
  }

  .logo-dkfz {
    display: flex;
    align-items: center;
    gap: var(--gap-s);
  }

  .language-toggle {
    display: flex;
    gap: 4px;
  }
  .language-toggle button {
    padding: 4px 8px;
    border: 1px solid #2b63b8;
    border-radius: 4px;
    background: white;
    color: #2b63b8;
    cursor: pointer;
    font-weight: bold;
  }
  .language-toggle button.active {
    background: #2b63b8;
    color: white;
  }
</style>
