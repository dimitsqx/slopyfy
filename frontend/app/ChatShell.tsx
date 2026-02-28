'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CopilotSidebar, type RenderMessageProps } from '@copilotkit/react-ui';

type UIResource = {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
};

type ParsedToolPayload = {
  uiResource?: UIResource;
  uiResources?: UIResource[];
};

function decodeBase64(value: string) {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.atob(value);
}

function parseToolPayload(raw: string | undefined): ParsedToolPayload | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return parsed as ParsedToolPayload;
  } catch {
    return null;
  }
}

function ProductCardFrame({ uiResource }: { uiResource: UIResource }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [frameHeight, setFrameHeight] = useState(320);
  const html =
    uiResource?.mimeType === 'text/html'
      ? uiResource.text ?? (uiResource.blob ? decodeBase64(uiResource.blob) : '')
      : '';

  useEffect(() => {
    if (!html) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const data = event.data as
        | {
            type?: string;
            payload?: {
              toolName?: string;
              params?: {
                productId?: string;
              };
            };
          }
        | null;

      if (!data || typeof data !== 'object') {
        return;
      }

      if (data.type === 'tool') {
        const toolName =
          typeof data.payload?.toolName === 'string' ? data.payload.toolName : 'unknown_tool';
        const productId =
          typeof data.payload?.params?.productId === 'string' ? data.payload.params.productId : '';
        setLastAction(`UI requested ${toolName}${productId ? ` (${productId})` : ''}`);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [html]);

  useEffect(() => {
    if (!html) {
      return;
    }

    const iframe = iframeRef.current;

    if (!iframe) {
      return;
    }

    let resizeObserver: ResizeObserver | null = null;

    const syncHeight = () => {
      const doc = iframe.contentDocument;

      if (!doc) {
        return;
      }

      const nextHeight = Math.max(
        320,
        doc.documentElement?.scrollHeight ?? 0,
        doc.body?.scrollHeight ?? 0,
      );

      setFrameHeight((currentHeight) => (currentHeight === nextHeight ? currentHeight : nextHeight));
    };

    const handleLoad = () => {
      syncHeight();

      if (typeof ResizeObserver === 'undefined') {
        return;
      }

      const doc = iframe.contentDocument;

      if (!doc?.body) {
        return;
      }

      resizeObserver = new ResizeObserver(syncHeight);
      resizeObserver.observe(doc.body);
      if (doc.documentElement) {
        resizeObserver.observe(doc.documentElement);
      }
    };

    iframe.addEventListener('load', handleLoad);
    handleLoad();

    return () => {
      iframe.removeEventListener('load', handleLoad);
      resizeObserver?.disconnect();
    };
  }, [html]);

  if (!html) {
    return null;
  }

  return (
    <div
      style={{
        margin: '8px 0 14px',
        border: '1px solid #d6d3d1',
        borderRadius: 14,
        overflow: 'hidden',
        background: '#fcfcf9',
      }}
    >
      <iframe
        ref={iframeRef}
        srcDoc={html}
        sandbox="allow-scripts allow-same-origin allow-forms"
        title={uiResource?.uri ?? 'product-card'}
        scrolling="no"
        style={{
          width: '100%',
          height: frameHeight,
          border: 0,
          display: 'block',
          background: '#fcfcf9',
        }}
      />
      {lastAction ? (
        <div
          style={{
            padding: '10px 12px',
            borderTop: '1px solid #e7e5e4',
            fontSize: 12,
            color: '#44403c',
            background: '#f5f5f4',
          }}
        >
          {lastAction}
        </div>
      ) : null}
    </div>
  );
}

function ProductCardResultMessage({ message }: RenderMessageProps) {
  const payload = useMemo(
    () => parseToolPayload(typeof message.content === 'string' ? message.content : undefined),
    [message.content],
  );

  const resources = useMemo(() => {
    if (payload?.uiResources?.length) {
      return payload.uiResources.filter((item) => item.mimeType === 'text/html');
    }

    if (payload?.uiResource?.mimeType === 'text/html') {
      return [payload.uiResource];
    }

    return [];
  }, [payload]);

  if (!resources.length) {
    return null;
  }

  return (
    <div>
      {resources.map((resource) => (
        <ProductCardFrame key={resource.uri} uiResource={resource} />
      ))}
    </div>
  );
}

export default function ChatShell() {
  return (
    <main>
      <h1>Slopyfy</h1>
      <CopilotSidebar
        defaultOpen
        instructions="You are a shopping assistant. When the user asks to show a product card, call sample_product_card. When the user asks to list or browse products, call list_products."
        RenderResultMessage={ProductCardResultMessage}
      />
    </main>
  );
}
