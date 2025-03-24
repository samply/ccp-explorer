<script lang="ts">
  import "./app.css";

  import type {
    MeasureGroup,
    MeasureItem,
    LensDataPasser,
    Catalogue,
  } from "@samply/lens";
  import { setOptions, setCatalogue, setMeasures } from "@samply/lens";

  import {
    dktkDiagnosisMeasure,
    dktkMedicationStatementsMeasure,
    dktkPatientsMeasure,
    dktkProceduresMeasure,
    dktkSpecificSpecimenMeasure,
    dktkHistologyMeasure,
  } from "./measures";
  import { env } from "$env/dynamic/public";
  import { onMount } from "svelte";

  async function fetchOptions() {
    const optionsUrl =
      env.PUBLIC_ENVIRONMENT === "staging"
        ? "options-ccp-demo.json"
        : "options-ccp-prod.json";
    // TODO: add type here once Lens exports it
    const options = await fetch(optionsUrl).then((response) => response.json());

    if (env.PUBLIC_BACKEND_URL) {
      options.backends.spots[0].url = env.PUBLIC_BACKEND_URL;
    }

    setOptions(options);
  }

  async function fetchCatalogue() {
    const catalogueUrl = "catalogues/catalogue-dktk.json";
    const catalogue: Catalogue = await fetch(catalogueUrl).then((response) =>
      response.json(),
    );
    setCatalogue(catalogue);
  }

  const measures: MeasureGroup[] = [
    {
      name: "DKTK",
      measures: [
        dktkPatientsMeasure as MeasureItem,
        dktkDiagnosisMeasure as MeasureItem,
        dktkSpecificSpecimenMeasure as MeasureItem,
        dktkProceduresMeasure as MeasureItem,
        dktkMedicationStatementsMeasure as MeasureItem,
        dktkHistologyMeasure as MeasureItem,
      ],
    },
  ];

  onMount(() => {
    fetchOptions();
    fetchCatalogue();
    setMeasures(measures);
  });

  const saveAndOpenLink = () => {
    const url = window.location.href;
    const query = btoa(JSON.stringify(dataPasser.getQueryAPI()));
    const htmlContent = `<html><head><meta http-equiv="refresh" content="0;url=${url}?query=${query}"></head><body></body></html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ccp-explorer-query-${new Date()}.html`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /**
   * TODO: add catalogueText option to config file
   */
  const catalogueText = {
    group: "Group",
    collapseButtonTitle: "Collapse Tree",
    expandButtonTitle: "Expand Tree",
    numberInput: {
      labelFrom: "von",
      labelTo: "bis",
    },
  };

  let catalogueopen: boolean = false;

  const genderHeaders: Map<string, string> = new Map<string, string>()
    .set("male", "männlich")
    .set("female", "weiblich")
    .set("other", "divers")
    .set("unknown", "unbekannt");

  const barChartBackgroundColors: string[] = ["#4dc9f6", "#3da4c7"];

  const vitalStateHeaders: Map<string, string> = new Map<string, string>()
    .set("lebend", "alive")
    .set("verstorben", "deceased")
    .set("unbekannt", "unknown");

  const therapyHeaders: Map<string, string> = new Map<string, string>().set(
    "medicationStatements",
    "Sys. T",
  );

  let dataPasser: LensDataPasser;
</script>

<header>
  <div class="header-wrapper">
    <div class="logo">
      <img src="../dktk.svg" alt="Logo des DKTK" />
    </div>
    <h1>CCP Explorer</h1>
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
      <button class="bookmark" on:click={saveAndOpenLink}
        ><img
          src="bookmark.png"
          alt="save query"
          class="bookmark-icon"
        /></button
      >
      <lens-search-bar noMatchesFoundMessage="keine Ergebnisse gefunden"
      ></lens-search-bar>
      <lens-info-button
        noQueryMessage="Leere Suchanfrage: Sucht nach allen Ergebnissen."
        showQuery={true}
      ></lens-info-button>
      <lens-search-button title="Suchen"></lens-search-button>
    </div>
  </div>
  <div class="grid">
    <div class="catalogue-wrapper">
      <div class="catalogue">
        <h2>Suchkriterien</h2>
        <lens-info-button
          message={[
            `Bei Patienten mit mehreren onkologischen Diagnosen, können sich ausgewählte Suchkriterien nicht nur auf eine Erkrankung beziehen, sondern auch auf Weitere.`,
            `Innerhalb einer Kategorie werden verschiedene Ausprägungen mit einer „Oder-Verknüpfung“ gesucht; bei der Suche über mehrere Kategorien mit einer „Und-Verknüpfung“.`,
          ]}
        ></lens-info-button>
        <lens-catalogue
          texts={catalogueText}
          toggle={{ collapsable: false, open: catalogueopen }}
        ></lens-catalogue>
      </div>
    </div>
    <div class="charts">
      <div class="chart-wrapper result-summary">
        <lens-result-summary></lens-result-summary>
        {#if env.PUBLIC_ENVIRONMENT === "staging"}
          <lens-negotiate-button
            type="ProjectManager"
            title="Daten und Proben Anfragen"
          ></lens-negotiate-button>
        {/if}
        <lens-search-modified-display
          >Diagramme repräsentieren nicht mehr die aktuelle Suche!</lens-search-modified-display
        >
      </div>
      <div class="chart-wrapper">
        <lens-chart
          title="Patienten pro Standort"
          catalogueGroupCode="patients"
          perSite={true}
          displayLegends={true}
          chartType="pie"
        ></lens-chart>
      </div>
      <div class="chart-wrapper result-table">
        <lens-result-table pageSize="10">
          <div slot="above-pagination" class="result-table-hint-text">
            * Die Anzahl der möglichen vorhandenen FFPE-Proben aus der
            Pathologie beruht auf der Menge der gezählten Histologien.
          </div>
        </lens-result-table>
      </div>
      <div class="chart-wrapper">
        <lens-chart
          title="Geschlecht"
          catalogueGroupCode="gender"
          chartType="pie"
          displayLegends={true}
          headers={genderHeaders}
        ></lens-chart>
      </div>
      <div class="chart-wrapper chart-diagnosis">
        <lens-chart
          title="Diagnose"
          catalogueGroupCode="diagnosis"
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
          catalogueGroupCode="age_at_diagnosis"
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
          catalogueGroupCode="75186-7"
          chartType="pie"
          displayLegends={true}
          headers={vitalStateHeaders}
        ></lens-chart>
      </div>
      <div class="chart-wrapper">
        <lens-chart
          title="Therapieart"
          catalogueGroupCode="therapy_of_tumor"
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
          catalogueGroupCode="medicationStatements"
          chartType="bar"
          xAxisTitle="Art der Therapie"
          yAxisTitle="Anzahl der Therapieeinträge"
          backgroundColor={barChartBackgroundColors}
        ></lens-chart>
      </div>
      <div class="chart-wrapper">
        <lens-chart
          title="Proben"
          catalogueGroupCode="sample_kind"
          chartType="bar"
          xAxisTitle="Probentypen"
          yAxisTitle="Probenanzahl"
          filterRegex="^(?!(tissue-other|buffy-coat|peripheral-blood-cells|dried-whole-blood|swab|ascites|stool-faeces|saliva|liquid-other|derivative-other))"
          backgroundColor={barChartBackgroundColors}
        >
        </lens-chart>
      </div>
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
    href="https://dktk.dkfz.de/forschung/Plattformen-und-Technologie-Netzwerke/klinische-plattformen/ccp-faq"
    class="faq"
    target="_blank">FAQ</a
  >
  <a class="ccp" href="https://dktk.dkfz.de/ccp" target="_blank">
    Clinical Communication Platform (CCP)
  </a>
  <a class="email" href="mailto:CCP@dkfz.de">Kontakt</a>
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

<!-- Toasts use `position: fixed` and thus are removed from the normal document flow -->
<error-toasts></error-toasts>

<lens-data-passer bind:this={dataPasser}></lens-data-passer>
