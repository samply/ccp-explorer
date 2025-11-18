<script lang="ts">
  import "./app.css";
  import type { Catalogue, SpotResult } from "@samply/lens";
  import {
    setOptions,
    setCatalogue,
    clearSiteResults,
    markSiteClaimed,
    setSiteResult,
    querySpot,
    getAst,
    hideFailedSite,
  } from "@samply/lens";
  import { negotiate } from "./lib/project-manager";
  import { options } from "./lib/env-options";
  import { onMount } from "svelte";
  import { SvelteMap } from "svelte/reactivity";
  import { env } from "$env/dynamic/public";
  import catalogueProd from "./config/catalogue.json";
  import catalogueTest from "./config/catalogue-test.json";

  let abortController = new AbortController();
  window.addEventListener("lens-search-triggered", () => {
    abortController.abort();
    abortController = new AbortController();
    clearSiteResults();

    /** Helper function to base64 encode a UTF-8 string */
    const base64Encode = (utf8String: string) =>
      btoa(String.fromCharCode(...new TextEncoder().encode(utf8String)));

    const query = base64Encode(
      JSON.stringify({
        lang: "ast",
        payload: base64Encode(
          JSON.stringify({ ast: getAst(), id: crypto.randomUUID() }),
        ),
      }),
    );
    querySpot(query, abortController.signal, (result: SpotResult) => {
      const site = result.from.split(".")[1];
      if (result.status === "claimed") {
        markSiteClaimed(site);
      } else if (result.status === "succeeded") {
        const siteResult = JSON.parse(atob(result.body));
        setSiteResult(site, siteResult);
      } else {
        hideFailedSite(site);
        console.error(
          `Site ${site} failed with status ${result.status}:`,
          result.body,
        );
      }
    });
  });

  window.addEventListener("lens-negotiate-triggered", () => {
    negotiate();
  });

  onMount(() => {
    setOptions(structuredClone(options));

    // Set the catalogue based on the environment
    let catalogue = catalogueProd as Catalogue;
    if (env.PUBLIC_ENVIRONMENT === "test") {
      catalogue = catalogueTest as Catalogue;
    }
    setCatalogue(catalogue);
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

  const genderHeaders: Map<string, string> = new SvelteMap<string, string>()
    .set("male", "männlich")
    .set("female", "weiblich")
    .set("other", "divers")
    .set("unknown", "unbekannt");

  const barChartBackgroundColors: string[] = ["#4dc9f6", "#3da4c7"];

  const vitalStateHeaders: Map<string, string> = new SvelteMap<string, string>()
    .set("lebend", "alive")
    .set("verstorben", "deceased")
    .set("unbekannt", "unknown");

  const therapyHeaders: Map<string, string> = new SvelteMap<
    string,
    string
  >().set("medicationStatements", "Sys. T");
</script>

<header>
  <div class="header-wrapper">
    <div class="logo">
      <img src="../dktk.svg" alt="Logo des DKTK" />
    </div>
    <h1 class="header-h1">DKTK BioDataHub Explorer</h1>
    <div class="logo logo-dkfz">
      <img
        src="../Deutsches_Krebsforschungszentrum_Logo.svg"
        alt="Logo des DKTK"
      />
    </div>
  </div>
</header>
<main>
  <div class="search">
    <div class="search-wrapper">
      <lens-search-bar noMatchesFoundMessage="keine Ergebnisse gefunden"
      ></lens-search-bar>
      <lens-query-explain-button
        noQueryMessage="Leere Suchanfrage: Sucht nach allen Ergebnissen."
      ></lens-query-explain-button>
      <button
        class="save_button"
        on:click={saveQuery}
        title="Suchanfrage speichern"
        ><img alt="Suchkriterien Speichern" src="save_24.svg" />
      </button>
      <lens-search-button title="Suchen"></lens-search-button>
    </div>
  </div>
  <div class="grid">
    <div class="catalogue-wrapper">
      <div class="f-info-box">
        Weiterführende Informationen: <br />
        Zur Nutzung
        <img
          src="info-circle-svgrepo-com.svg"
          alt="info-icon"
          width="18px"
          height="18px"
        />
        und
        <a href="https://hub.dkfz.de/s/iP6A7zJzAQya3iC" target="_blank"
          >Known Issues</a
        >
        beachten.
        <a href="https://hub.dkfz.de/s/c7KmaCxSLQicw3Y" target="_blank">
          Informationen zu Bioproben/Daten Anfragen</a
        >
      </div>
      <div class="catalogue">
        <div class="catalogue-header">
          <h2>Suchkriterien</h2>
          <lens-info-button
            message={[
              `Die Suche erfolgt patienten-orientiert. `,
              `Bei Patienten mit mehreren onkologischen Diagnosen, können sich ausgewählte Suchkriterien nicht nur auf eine Erkrankung beziehen, sondern auch auf Weitere.`,
              `Innerhalb einer Kategorie werden verschiedene Ausprägungen mit einer „Oder-Verknüpfung“ gesucht; bei der Suche über mehrere Kategorien mit einer „Und-Verknüpfung“.`,
            ]}
            buttonSize="22px"
            alignDialogue="left"
          ></lens-info-button>
        </div>
        <lens-catalogue toggle={{ collapsable: false, open: catalogueopen }}
        ></lens-catalogue>
      </div>
    </div>
    <div class="charts">
      <div class="chart-wrapper result-summary">
        <lens-result-summary></lens-result-summary>
        {#if options.projectmanagerOptions}
          <lens-negotiate-button
            type="ProjectManager"
            title="Daten und Proben Anfragen"
          ></lens-negotiate-button>
        {/if}
        <lens-search-modified-display></lens-search-modified-display>
      </div>
      <div class="chart-wrapper">
        <lens-chart
          title="Patienten pro Standort"
          dataKey="patients"
          perSite={true}
          displayLegends={true}
          chartType="pie"
        ></lens-chart>
      </div>
      <div class="chart-wrapper result-table">
        <lens-result-table pageSize={14}></lens-result-table>
        <br />
        * In den lokalen Pathologien liegt von jedem Patienten idR zusätzlich mindestens
        eine FFPE-Probe (Formalin-fixierte und Paraffin eingebettet) als Basis der
        Diagnose vor.
      </div>
      <div class="chart-wrapper">
        <lens-chart
          title="Geschlecht"
          dataKey="gender"
          chartType="pie"
          displayLegends={true}
          headers={genderHeaders}
        ></lens-chart>
      </div>
      <div class="chart-wrapper chart-diagnosis">
        <lens-chart
          title="Diagnose"
          dataKey="diagnosis"
          chartType="bar"
          indexAxis="y"
          groupingDivider="."
          groupingLabel=".%"
          filterRegex={"^(C.{2,6}|D[0-4][0-9].{0,4})"}
          xAxisTitle="Anzahl der Diagnosen"
          yAxisTitle="ICD-10-Codes"
          backgroundColor={barChartBackgroundColors}
        ></lens-chart>
      </div>
      <div class="chart-wrapper chart-age-distribution">
        <lens-chart
          title="Alter bei Erstdiagnose"
          dataKey="age_at_diagnosis"
          chartType="bar"
          groupRange={10}
          filterRegex="^(([0-9]?[0-9]$)|(1[0-2]0))"
          xAxisTitle="Alter"
          yAxisTitle="Anzahl der Primärdiagnosen"
          backgroundColor={barChartBackgroundColors}
        ></lens-chart>
      </div>
      <div class="chart-wrapper">
        <lens-chart
          title="Vitalstatus"
          dataKey="75186-7"
          chartType="pie"
          displayLegends={true}
          headers={vitalStateHeaders}
        ></lens-chart>
      </div>
      <div class="chart-wrapper">
        <lens-chart
          title="Therapieart"
          dataKey="therapy_of_tumor"
          chartType="bar"
          headers={therapyHeaders}
          xAxisTitle="Art der Therapie"
          yAxisTitle="Anzahl der Therapieeinträge"
          backgroundColor={barChartBackgroundColors}
        ></lens-chart>
      </div>
      <div class="chart-wrapper">
        <lens-chart
          title="Systemische Therapien"
          dataKey="medicationStatements"
          chartType="bar"
          xAxisTitle="Art der Therapie"
          yAxisTitle="Anzahl der Therapieeinträge"
          backgroundColor={barChartBackgroundColors}
        ></lens-chart>
      </div>
      <div class="chart-wrapper">
        <lens-chart
          title="Proben"
          dataKey="sample_kind"
          chartType="bar"
          xAxisTitle="Probentypen"
          yAxisTitle="Probenanzahl"
          filterRegex="^(?!(tissue-other|buffy-coat|peripheral-blood-cells|dried-whole-blood|swab|ascites|stool-faeces|saliva|liquid-other|derivative-other))"
          backgroundColor={barChartBackgroundColors}
        >
        </lens-chart>
      </div>
      {#if env.PUBLIC_ENVIRONMENT === "test"}
        <div class="chart-wrapper chart-wrapper-mol">
          <lens-chart
            title="MolecularMarkers"
            dataKey="MolecularMarkers"
            chartType="bar"
            xAxisTitle="Marker"
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
  <a href="https://dktk.dkfz.de/ccp" target="_blank">
    BioDataHub (BDH)
  </a>
  <a class="email" href="mailto:biodatahub@dkfz.de">Kontakt</a>
  <a
    class="user-agreement"
    href="https://hub.dkfz.de/s/MPCg2kK23LH8Yii"
    download="nutzervereinbarung"
    target="_blank">Nutzungsvereinbarung</a
  >
  <a
    class="privacy-policy"
    href="https://hub.dkfz.de/s/5LPccy6fgRSoD65"
    download="datenschutzerklaerung"
    target="_blank">Datenschutz</a
  >
  <a
    class="imprint"
    href="https://www.dkfz.de/de/impressum.html"
    target="_blank">Impressum</a
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
</style>
