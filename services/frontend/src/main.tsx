import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

import { config } from "./lib/config";

// console.log("🚀 [Startup] VITE_BASE_URL:", import.meta.env.BASE_URL);
// console.log("🚀 [Startup] API_BASE_URL:", config.apiBaseUrl);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App></App>
  </StrictMode>,
);
