import { CssBaseline, ThemeProvider } from "@mui/material";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { FrontendRuntimeProvider } from "./FrontendRuntimeProvider.js";
import { theme } from "./theme.js";
const root = document.querySelector("#root");
if (!root) throw new Error("React root was not found");

createRoot(root).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <FrontendRuntimeProvider>
      <App />
    </FrontendRuntimeProvider>
  </ThemeProvider>,
);
