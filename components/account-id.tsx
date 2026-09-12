"use client";

import { useState } from "react";

export function AccountId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="account-id">
      <span>Account ID</span>
      <code>{id}</code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(id);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Copied" : "Copy for support"}
      </button>
    </div>
  );
}
