import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { DossierGenerator } from './DossierGenerator';
import "./styles.css";
import "./cartography.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {location.pathname === '/generator' ? <DossierGenerator /> : <App />}
  </React.StrictMode>,
);
