import { createFileRoute, Navigate } from "@tanstack/react-router";

// La raíz del sitio ahora lleva directo al registro público de uso (el
// kiosco para alumnos) en vez de al dashboard — ver conversación: la URL
// con la que entra cualquiera debe ser /registro-uso; el login y el panel
// admin se acceden desde su propia ruta (/login), sin un enlace público
// visible (eso ya se había quitado antes a propósito).
export const Route = createFileRoute("/")({
  component: () => <Navigate to="/registro-uso" replace />,
});
