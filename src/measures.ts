import type { MeasureItem } from "@samply/lens";

const dktkPatientsMeasure: MeasureItem = {
  key: "patients",
  measure: {
    code: {
      text: "patients",
    },
    population: [
      {
        code: {
          coding: [
            {
              system:
                "http://terminology.hl7.org/CodeSystem/measure-population",
              code: "initial-population",
            },
          ],
        },
        criteria: {
          language: "text/cql-identifier",
          expression: "InInitialPopulation",
        },
      },
    ],
    stratifier: [
      {
        code: {
          text: "gender",
        },
        criteria: {
          language: "text/cql",
          expression: "Gender",
        },
      },
      {
        code: {
          text: "75186-7",
        },
        criteria: {
          language: "text/cql",
          expression: "Deceased",
        },
      },
      {
        code: {
          text: "age_at_diagnosis",
        },
        criteria: {
          language: "text/cql",
          expression: "AgeClass",
        },
      },
    ],
  },
  cql: `

DKTK_STRAT_GENDER_STRATIFIER

DKTK_STRAT_PRIMARY_DIAGNOSIS_NO_SORT_STRATIFIER
DKTK_STRAT_AGE_CLASS_STRATIFIER

DKTK_STRAT_DECEASED_STRATIFIER
`,
};

const dktkDiagnosisMeasure: MeasureItem = {
  key: "diagnosis",
  measure: {
    code: {
      text: "diagnosis",
    },
    extension: [
      {
        url: "http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis",
        valueCode: "Condition",
      },
    ],
    population: [
      {
        code: {
          coding: [
            {
              system:
                "http://terminology.hl7.org/CodeSystem/measure-population",
              code: "initial-population",
            },
          ],
        },
        criteria: {
          language: "text/cql-identifier",
          expression: "Diagnosis",
        },
      },
    ],
    stratifier: [
      {
        code: {
          text: "diagnosis",
        },
        criteria: {
          language: "text/cql-identifier",
          expression: "DiagnosisCode",
        },
      },
    ],
  },
  cql: `
DKTK_STRAT_DIAGNOSIS_STRATIFIER
`,
};

const dktkSpecificSpecimenMeasure: MeasureItem = {
  key: "specimen",
  measure: {
    code: {
      text: "specimen",
    },
    extension: [
      {
        url: "http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis",
        valueCode: "Specimen",
      },
    ],
    population: [
      {
        code: {
          coding: [
            {
              system:
                "http://terminology.hl7.org/CodeSystem/measure-population",
              code: "initial-population",
            },
          ],
        },
        criteria: {
          language: "text/cql-identifier",
          expression: "Specimen",
        },
      },
    ],
    stratifier: [
      {
        code: {
          text: "sample_kind",
        },
        criteria: {
          language: "text/cql",
          expression: "SampleType",
        },
      },
    ],
  },
  cql: `
DKTK_REPLACE_SPECIMEN_STRATIFIER`,
};

const dktkProceduresMeasure: MeasureItem = {
  key: "procedures",
  measure: {
    code: {
      text: "procedures",
    },
    extension: [
      {
        url: "http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis",
        valueCode: "Procedure",
      },
    ],
    population: [
      {
        code: {
          coding: [
            {
              system:
                "http://terminology.hl7.org/CodeSystem/measure-population",
              code: "initial-population",
            },
          ],
        },
        criteria: {
          language: "text/cql-identifier",
          expression: "Procedure",
        },
      },
    ],
    stratifier: [
      {
        code: {
          text: "therapy_of_tumor",
        },
        criteria: {
          language: "text/cql",
          expression: "ProcedureType",
        },
      },
    ],
  },
  cql: `
DKTK_STRAT_PROCEDURE_STRATIFIER
`,
};

const dktkMedicationStatementsMeasure: MeasureItem = {
  key: "medicationStatements",
  measure: {
    code: {
      text: "medicationStatements",
    },
    extension: [
      {
        url: "http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis",
        valueCode: "MedicationStatement",
      },
    ],
    population: [
      {
        code: {
          coding: [
            {
              system:
                "http://terminology.hl7.org/CodeSystem/measure-population",
              code: "initial-population",
            },
          ],
        },
        criteria: {
          language: "text/cql-identifier",
          expression: "MedicationStatement",
        },
      },
    ],
    stratifier: [
      {
        code: {
          text: "medicationStatements",
        },
        criteria: {
          language: "text/cql",
          expression: "ProcedureType",
        },
      },
    ],
  },
  cql: `
DKTK_STRAT_MEDICATION_STRATIFIER
`,
};

const dktkHistologyMeasure: MeasureItem = {
  key: "Histo",
  measure: {
    code: {
      text: "Histo",
    },
    extension: [
      {
        url: "http://hl7.org/fhir/us/cqfmeasures/StructureDefinition/cqfm-populationBasis",
        valueCode: "Observation",
      },
    ],
    population: [
      {
        code: {
          coding: [
            {
              system:
                "http://terminology.hl7.org/CodeSystem/measure-population",
              code: "initial-population",
            },
          ],
        },
        criteria: {
          language: "text/cql-identifier",
          expression: "Histo",
        },
      },
    ],
    stratifier: [
      {
        code: {
          text: "Histologies",
        },
        criteria: {
          language: "text/cql-identifier",
          expression: "Histology",
        },
      },
    ],
  },
  cql: `
  DKTK_REPLACE_HISTOLOGY_STRATIFIER
`,
};

export const measures: MeasureItem[] = [
  dktkPatientsMeasure,
  dktkDiagnosisMeasure,
  dktkSpecificSpecimenMeasure,
  dktkProceduresMeasure,
  dktkMedicationStatementsMeasure,
  dktkHistologyMeasure,
];
