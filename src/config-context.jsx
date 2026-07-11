import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import defaultConfig from "../config/default.json";

const ConfigContext = createContext(null);

export function mergeConfig(incoming) {
  if (!incoming || typeof incoming !== "object") return defaultConfig;
  return {
    ...defaultConfig,
    ...incoming,
    identity: { ...defaultConfig.identity, ...incoming.identity },
    theme: { ...defaultConfig.theme, ...incoming.theme },
    effects: { ...defaultConfig.effects, ...incoming.effects },
    layout: { ...defaultConfig.layout, ...incoming.layout },
    activity: { ...defaultConfig.activity, ...incoming.activity },
    metrics: Array.isArray(incoming.metrics) ? incoming.metrics : defaultConfig.metrics,
    capabilities: Array.isArray(incoming.capabilities) ? incoming.capabilities : defaultConfig.capabilities,
    projects: Array.isArray(incoming.projects) ? incoming.projects : defaultConfig.projects,
    links: Array.isArray(incoming.links) ? incoming.links : defaultConfig.links,
    ticker: Array.isArray(incoming.ticker) ? incoming.ticker : defaultConfig.ticker,
  };
}

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(defaultConfig);
  const [connection, setConnection] = useState("connecting");

  const applyConfig = useCallback((incoming) => {
    const next = mergeConfig(incoming);
    setConfig((current) => {
      const nextRevision = Number(next.revision) || 0;
      const currentRevision = Number(current.revision) || 0;
      return nextRevision < currentRevision ? current : next;
    });
  }, []);

  useEffect(() => {
    let active = true;
    const embeddedPreview = new URLSearchParams(window.location.search).has("embedded");
    fetch("/api/config", { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error("config unavailable");
        return response.json();
      })
      .then((data) => active && applyConfig(data))
      .catch(() => active && setConnection("offline"));

    let events;
    if (embeddedPreview) {
      setConnection("preview");
    } else {
      events = new EventSource("/api/events");
      events.addEventListener("open", () => active && setConnection("live"));
      events.addEventListener("config", (event) => {
        try {
          const next = JSON.parse(event.data);
          if (active) {
            applyConfig(next);
            setConnection("live");
          }
        } catch {
          // A malformed event is ignored; the next server event will self-heal.
        }
      });
      events.onerror = () => active && setConnection("reconnecting");
    }

    const onPreviewMessage = (event) => {
      if (event.origin !== window.location.origin || event.data?.type !== "nexus:preview") return;
      if (active) applyConfig(event.data.config);
    };
    window.addEventListener("message", onPreviewMessage);

    return () => {
      active = false;
      events?.close();
      window.removeEventListener("message", onPreviewMessage);
    };
  }, [applyConfig]);

  const value = useMemo(() => ({ config, setConfig: applyConfig, connection, mergeConfig }), [applyConfig, config, connection]);
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useSiteConfig() {
  return useContext(ConfigContext);
}