// Stands in for vite-plugin-pwa's virtual module during the build-time prerender,
// which runs outside the PWA plugin. The prerender never renders UpdatePrompt, so
// this only has to satisfy the import.
export const useRegisterSW = () => ({
  offlineReady: [false, () => {}],
  needRefresh: [false, () => {}],
  updateServiceWorker: () => Promise.resolve()
});
