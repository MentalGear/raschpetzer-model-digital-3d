// Minimal Vite config — this is a zero-build static site (plain index.html +
// vendored scripts + generated data bundle). Vite is used only as a dev server.
export default {
  root: '.',
  server: { port: 5173, open: true },
  preview: { port: 5173 }
};
