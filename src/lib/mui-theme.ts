import { createTheme, type Theme } from "@mui/material/styles";

// Tema de Material UI alineado con los tokens de diseño que ya usa el resto
// de la app (ver src/styles.css): mismo azul de marca, mismo radio de
// esquina (--radius) y misma tipografía (Inter) — así un componente de MUI
// que agregues se ve parte del mismo sistema, no una librería "pegada"
// encima de Tailwind/shadcn. No incluye <CssBaseline /> a propósito: ese
// reset global de MUI podría pisar estilos que Tailwind ya controla en toda
// la app. Este theme solo afecta a los componentes de MUI que uses.
export function createAppMuiTheme(mode: "light" | "dark"): Theme {
  const isDark = mode === "dark";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? "#3B82F6" : "#2563EB",
        contrastText: "#FFFFFF",
      },
      success: { main: isDark ? "#22C55E" : "#16A34A" },
      warning: { main: isDark ? "#F59E0B" : "#D97706" },
      error: { main: isDark ? "#EF4444" : "#DC2626" },
      info: { main: isDark ? "#38BDF8" : "#0284C7" },
      background: {
        default: isDark ? "#0F172A" : "#F8FAFC",
        paper: isDark ? "#111827" : "#FFFFFF",
      },
      text: {
        primary: isDark ? "#E2E8F0" : "#0F172A",
        secondary: isDark ? "#94A3B8" : "#64748B",
      },
      divider: isDark ? "#1E293B" : "#E2E8F0",
    },
    shape: {
      borderRadius: 8, // = --radius: 0.5rem — el mismo radio que ya usan las cards/inputs de shadcn
    },
    typography: {
      fontFamily: '"Inter", system-ui, sans-serif',
    },
    components: {
      // MUI pone los botones en MAYÚSCULAS y con sombra por defecto — no
      // encaja con el resto de la interfaz (todo en minúsculas/normal y
      // con sombras suaves). Se desactiva para que un <Button> de MUI se
      // vea coherente con los botones de shadcn que ya existen.
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { textTransform: "none", fontWeight: 600 } },
      },
      MuiPaper: {
        // Sin el overlay tonal que MUI aplica por "elevación" en modo oscuro
        // (aclara el fondo con cada nivel) — aquí el fondo oscuro ya está
        // definido explícitamente arriba (background.paper).
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiLinearProgress: {
        // Barras de progreso en forma de píldora (igual que las barras de
        // uso ya existentes en Tailwind) y el mismo color de "riel" que
        // --border en ambos temas, para que no se note que es un componente
        // de MUI en medio del resto de la interfaz.
        styleOverrides: {
          root: { borderRadius: 999, backgroundColor: isDark ? "#1E293B" : "#E2E8F0" },
          bar: { borderRadius: 999 },
        },
      },
    },
  });
}
