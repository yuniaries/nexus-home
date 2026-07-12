import React from "react";
import { createRoot } from "react-dom/client";
import { HomePage } from "./pages/HomePage";
import { ConfigPage } from "./pages/ConfigPage";
import { ConfigProvider } from "./config-context";
import "./styles.css";
import "./styles.home.css";

function App() {
  const isConfig = window.location.pathname === "/config" || window.location.pathname.startsWith("/config/") || window.location.pathname === "/recovery-password";
  return isConfig ? <ConfigPage /> : <HomePage />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConfigProvider>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
