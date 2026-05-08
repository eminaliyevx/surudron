import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app";
import "./styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DroneProvider } from "./context";

// Localization imports
import translationAz from "./locales/az/translation.json";
import translationEn from "./locales/en/translation.json";
import translationTr from "./locales/tr/translation.json";

i18n.use(initReactI18next).init({
  resources: {
    az: { translation: translationAz },
    tr: { translation: translationTr },
    en: { translation: translationEn },
  },
  lng: "az",
  fallbackLng: "az",
  interpolation: { escapeValue: false },
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <DroneProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Sonner position="top-right" />
          <App />
        </TooltipProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </DroneProvider>
  </React.StrictMode>
);
