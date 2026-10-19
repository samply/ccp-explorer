# CCP Explorer

Production: https://data.dktk.dkfz.de/  
Test: https://demo.lens.samply.de/

## Environment variables

| Variable             | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| `PUBLIC_ENVIRONMENT` | Can be either `production` or `test` (default: `production`) |
| `PUBLIC_SPOT_URL`    | Overwrites the Spot URL (optional)                           |

## Languages

The explorer is available in German and English. Users switch via the DE/EN toggle in the header, the choice is stored in local storage and in the `lang` URL parameter (e.g. `?lang=en`).

The catalogue and options in `src/config` are maintained in German. `src/config/translations-en.json` maps German texts to English and is applied when English is selected. When adding or changing German texts in the catalogue or options, add the English translation there as well, otherwise the German text is shown. Texts in `App.svelte` are translated inline with `t({ de: ..., en: ... })`.
