import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { initSentry } from "./lib/sentry";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  // Browser-only: initializes Sentry with router tracing. No-ops during SSR
  // and when VITE_SENTRY_DSN is unset.
  initSentry(router);

  return router;
};
