import { useMemo, type ReactNode } from "react";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { useTheme } from "@/context/ThemeContext";
import { createAppMuiTheme } from "@/lib/mui-theme";

// Puente entre el ThemeContext propio de la app (claro/oscuro — el mismo
// que usa <ThemeToggle />) y el ThemeProvider de Material UI: así un
// componente de MUI que agregues cambia de claro a oscuro junto con el
// resto de la interfaz, en vez de tener su propio interruptor aparte.
// Debe montarse DENTRO del <ThemeProvider> propio (ver __root.tsx), porque
// depende de useTheme().
export function MuiThemeBridge({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const muiTheme = useMemo(() => createAppMuiTheme(theme), [theme]);
  return <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>;
}
