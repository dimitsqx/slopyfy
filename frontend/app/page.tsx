"use client";

import { useRenderToolCall } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";

function extractProductCardsHtml(result: unknown): string | undefined {
  if (!result) return undefined;
  try {
    const data = typeof result === "string" ? JSON.parse(result) : result;
    const content = data?.content ?? data?.result?.content;
    if (Array.isArray(content)) {
      const resourceBlock = content.find(
        (c: { type?: string }) => c?.type === "resource"
      );
      if (resourceBlock?.resource?.text) {
        return resourceBlock.resource.text;
      }
    }
    if (typeof result === "string" && result.trim().startsWith("<")) {
      return result;
    }
    if (data?.resource?.text) {
      return data.resource.text;
    }
  } catch {
    if (typeof result === "string" && result.trim().startsWith("<")) {
      return result;
    }
  }
  return undefined;
}

function ProductCardsInChat() {
  useRenderToolCall({
    name: "show_product_cards",
    render: ({ status, result }) => {
      if (status === "inProgress" || status === "executing") {
        return (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            Loading product cards…
          </div>
        );
      }
      if (status === "complete" && result) {
        const html = extractProductCardsHtml(result);
        if (html) {
          return (
            <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
              <iframe
                title="Product cards"
                srcDoc={html}
                sandbox="allow-same-origin"
                className="w-full min-h-[200px] border-0 block"
                style={{ height: "320px" }}
              />
            </div>
          );
        }
      }
      return <></>;
    },
  });
  return null;
}

const chatLabels = {
  title: "Assistant",
  initial: "How can I help you today?",
  placeholder: "Type a message...",
};

export default function Page() {
  return (
    <main className="h-screen flex flex-col bg-gray-50">
      <ProductCardsInChat />
      <div className="flex-1 flex flex-col min-h-0">
        <CopilotChat
          className="h-full flex flex-col"
          labels={chatLabels}
        />
      </div>
    </main>
  );
}
