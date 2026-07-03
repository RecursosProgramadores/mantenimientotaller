import { QueryClient } from "@tanstack/react-query";
import { createRouter, createHashHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const hashHistory = createHashHistory();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    history: hashHistory,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
