// Using server-side rendering (SSR) with custom elements (aka web components)
// causes issues because the server does not know that an element is a Svelte
// component and converts all props to strings.
export const ssr = false;