"use client";

import { useEffect, useRef } from "react";
import type { TurnstileAction } from "@/lib/auth/turnstile-actions";

type TurnstileWidgetId = string;

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      action: TurnstileAction;
      appearance?: "always" | "execute" | "interaction-only";
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
    },
  ) => TurnstileWidgetId;
  reset: (widgetId: TurnstileWidgetId) => void;
  remove: (id: TurnstileWidgetId) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Explicit Turnstile widget. `siteKey` is passed from the server so the public
 * key is the Worker runtime value, not whatever was inlined when the client
 * bundle was built.
 * Each protected surface keeps its own widget id and calls `reset` after a
 * same-page attempt so the single-use token is not submitted twice.
 */
export function TurnstileWidget({
  siteKey,
  action,
  onToken,
  resetKey = 0,
}: {
  siteKey: string;
  action: TurnstileAction;
  onToken: (token: string) => void;
  resetKey?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<TurnstileWidgetId | null>(null);
  const renderedAction = useRef<TurnstileAction | null>(null);
  const renderedSiteKey = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let cancelled = false;

    function renderWidget() {
      if (cancelled || !ref.current || !window.turnstile) return;
      if (
        widgetId.current &&
        renderedAction.current === action &&
        renderedSiteKey.current === siteKey
      ) {
        window.turnstile.reset(widgetId.current);
        return;
      }
      if (widgetId.current) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
        renderedAction.current = null;
        renderedSiteKey.current = null;
      }
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        action,
        appearance: "always",
        theme: "auto",
        callback: (token) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(""),
        "error-callback": () => onTokenRef.current(""),
      });
      renderedAction.current = action;
      renderedSiteKey.current = siteKey;
    }

    let script: HTMLScriptElement | null = null;
    const existing = document.querySelector<HTMLScriptElement>("script[data-diras-turnstile]");
    if (window.turnstile) {
      renderWidget();
    } else if (existing) {
      script = existing;
      existing.addEventListener("load", renderWidget);
    } else {
      script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.dirasTurnstile = "1";
      script.addEventListener("load", renderWidget);
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      script?.removeEventListener("load", renderWidget);
    };
  }, [siteKey, action, resetKey]);

  useEffect(() => {
    return () => {
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
        renderedAction.current = null;
        renderedSiteKey.current = null;
      }
    };
  }, []);

  if (!siteKey) return null;
  return <div className="turnstile-slot" ref={ref} data-turnstile-action={action} />;
}
