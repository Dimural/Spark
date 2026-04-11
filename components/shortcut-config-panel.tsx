"use client";

import { useState } from "react";

type Props = {
  ingestUrl: string;
  userId: string;
  apiKey: string;
};

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may not be available in non-secure contexts
    }
  }

  return (
    <div className="shortcut-config-row">
      <span className="shortcut-config-row__label">{label}</span>
      <code className="shortcut-config-row__value">{value}</code>
      <button
        type="button"
        className="shortcut-copy-btn"
        onClick={handleCopy}
        aria-label={`Copy ${label}`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function ShortcutConfigPanel({ ingestUrl, userId, apiKey }: Props) {
  return (
    <div className="shortcut-config">
      <CopyRow label="POST URL" value={ingestUrl} />
      <CopyRow label="User ID" value={userId} />
      <CopyRow label="API Key" value={apiKey} />
    </div>
  );
}
