<script>
  // Using hot module replacement (HMR) with custom elements (aka web
  // components) does not work because a custom element cannot be updated once
  // registered, see https://github.com/WICG/webcomponents/issues/820.
  // Therefore we do a full page reload instead of HMR.
  if (import.meta.hot) {
    import.meta.hot.on("vite:beforeUpdate", () => {
      window.location.reload();
    });
  }

  // Import Lens CSS and JS bundles
  import "@samply/lens/style.css";
  import "@samply/lens";

  import App from "../App.svelte";
</script>

<App />
