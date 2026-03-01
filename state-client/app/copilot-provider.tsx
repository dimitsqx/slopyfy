"use client";

import { CopilotKit } from "@copilotkit/react-core";
import React, { useState } from "react";
import "@copilotkit/react-ui/styles.css";

export default function CopilotProvider({ children }: { children: React.ReactNode }) {
  const [threadId] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const storageKey = "slopyfy-thread-id";
    let stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      stored =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `thread-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      window.localStorage.setItem(storageKey, stored);
    }
    return stored;
  });

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      agent="strands_agent"
      showDevConsole={false}
      threadId={threadId}
    >
      {children}
    </CopilotKit>
  );
}
