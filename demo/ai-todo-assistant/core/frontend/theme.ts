import { createTheme } from "@mui/material";

export const visualTokens = {
  ink: "#171923",
  navigationMuted: "#aeb2bd",
  purple: "#5546ff",
  purpleTint: "#eeecff",
  green: "#168260",
  greenTint: "#e4f6ef",
  orangeTint: "#fff0e6",
  sportTint: "#e5f7f0",
  shoppingTint: "#f9eafa",
} as const;

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: visualTokens.purple, light: visualTokens.purpleTint, dark: "#3326ce" },
    secondary: { main: "#d9ff57", dark: "#a9d21b", contrastText: "#111827" },
    background: { default: "#f6f4ee", paper: "#ffffff" },
    text: { primary: visualTokens.ink, secondary: "#69707d" },
    divider: "rgba(23, 25, 35, 0.10)",
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { WebkitFontSmoothing: "antialiased" },
        "::selection": { background: "#d9ff57", color: visualTokens.ink },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: "none",
          fontWeight: 750,
          boxShadow: "none",
          paddingInline: 14,
        },
        sizeSmall: { minHeight: 30, paddingInline: 10, fontSize: "0.78rem" },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 700 },
        sizeSmall: { height: 26, fontSize: "0.75rem" },
      },
    },
    MuiTextField: { defaultProps: { variant: "outlined" } },
  },
});
