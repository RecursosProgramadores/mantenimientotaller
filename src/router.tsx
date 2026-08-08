import { QueryClient } from "@tanstack/react-query";
import { createRouter, createBrowserHistory } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  // Antes usaba createHashHistory(), que producía URLs con "#"
  // (ej. /mantenimientotaller/#/maquinas). Con createBrowserHistory() las
  // URLs quedan limpias (/mantenimientotaller/maquinas). Como el sitio se
  // publica en GitHub Pages (que no soporta rutas del lado del servidor),
  // hace falta el 404.html en /public para que entrar directo a una ruta
  // interna o refrescar la página siga funcionando — ver ese archivo.
  const browserHistory = createBrowserHistory();

  const router = createRouter({
    routeTree,
    history: browserHistory,
    basepath: "/mantenimientotaller/",
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
