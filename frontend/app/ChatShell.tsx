'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CopilotSidebar, type RenderMessageProps } from '@copilotkit/react-ui';

type UIResource = {
  uri: string;
  mimeType: string;
  text?: string;
  blob?: string;
};

type MCPApp = {
  name: string;
  title: string;
  resourceUri: string;
};

type ParsedToolPayload = {
  app?: MCPApp;
  apps?: MCPApp[];
  resources?: UIResource[];
  uiResource?: UIResource;
  uiResources?: UIResource[];
};

type CartItem = {
  productId: string;
  name: string;
  priceUsd: number;
  quantity: number;
};

const CART_STORAGE_KEY = 'slopyfy-cart';

type ToolAction = {
  toolName: string;
  params?: {
    productId?: string;
    name?: string;
    priceUsd?: number;
  };
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

function readCart(): CartItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeCart(items: CartItem[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

function addToCart(item: Omit<CartItem, 'quantity'>) {
  const cart = readCart();
  const existing = cart.find((entry) => entry.productId === item.productId);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...item, quantity: 1 });
  }

  writeCart(cart);

  const totalItems = cart.reduce((sum, entry) => sum + entry.quantity, 0);
  return {
    quantity: existing?.quantity ?? 1,
    totalItems,
  };
}

function getAppsFromPayload(payload: ParsedToolPayload | null, resources: UIResource[] = []) {
  if (payload?.apps?.length) {
    return payload.apps;
  }

  if (payload?.app) {
    return [payload.app];
  }

  if (resources.length) {
    return resources.map((resource) => ({
      name: 'legacy-ui-resource',
      title: resource.uri,
      resourceUri: resource.uri,
    }));
  }

  return [];
}

function extractResourceFromReadResult(raw: unknown): UIResource | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const payload = raw as {
    contents?: unknown[];
  };

  if (!Array.isArray(payload.contents) || !payload.contents.length) {
    return null;
  }

  const item = payload.contents[0] as
    | {
        uri?: string;
        mimeType?: string;
        text?: string;
        blob?: string;
      }
    | undefined;

  if (!item?.uri || !item?.mimeType) {
    return null;
  }

  return {
    uri: item.uri,
    mimeType: item.mimeType,
    text: item.text,
    blob: item.blob,
  };
}

function extractPayloadFromToolCallResult(raw: unknown): ParsedToolPayload | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const directPayload = raw as {
    result?: unknown;
    structuredContent?: unknown;
    structured_content?: unknown;
    content?: Array<{ type?: string; text?: string }>;
  };

  const payload =
    directPayload.result && typeof directPayload.result === 'object'
      ? (directPayload.result as typeof directPayload)
      : directPayload;

  const structured = payload.structuredContent ?? payload.structured_content;

  if (structured && typeof structured === 'object') {
    return structured as ParsedToolPayload;
  }

  const textItem = payload.content?.find((item) => item?.type === 'text' && typeof item.text === 'string');
  if (!textItem?.text) {
    return null;
  }

  return parseToolPayload(textItem.text);
}

async function readAppResource(resourceUri: string) {
  const response = await fetch('/api/mcp-apps/resources/read', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uri: resourceUri }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.detail ?? 'Unable to read app resource');
  }

  const resource = extractResourceFromReadResult(payload);
  if (!resource) {
    throw new Error('No UI resource returned for app');
  }

  return resource;
}

async function callHostTool(action: ToolAction) {
  const response = await fetch('/api/mcp-apps/tools/call', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: action.toolName,
      arguments: action.params ?? {},
    }),
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.detail ?? 'Unable to complete tool call');
  }

  return payload;
}

function ProductCardFrame({
  uiResource,
  onToolAction,
}: {
  uiResource: UIResource;
  onToolAction: (action: ToolAction) => Promise<string | null>;
}) {
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

    const handleMessage = async (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) {
        return;
      }

      const data = event.data as { type?: string; payload?: ToolAction['params'] & { toolName?: string } } | null;
      const payload = data?.payload as
        | {
            toolName?: string;
            params?: ToolAction['params'];
          }
        | undefined;

      if (!data || typeof data !== 'object') {
        return;
      }

      if (data.type === 'tool') {
        const toolName = typeof payload?.toolName === 'string' ? payload.toolName : '';
        if (!toolName) {
          return;
        }

        const status = await onToolAction({
          toolName,
          params: {
            productId:
              typeof payload?.params?.productId === 'string' ? payload.params.productId : undefined,
            name: typeof payload?.params?.name === 'string' ? payload.params.name : undefined,
            priceUsd:
              typeof payload?.params?.priceUsd === 'number' ? payload.params.priceUsd : undefined,
          },
        });

        if (status) {
          setLastAction(status);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [html, onToolAction]);

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

function AppRenderer({ app }: { app: MCPApp }) {
  const [resource, setResource] = useState<UIResource | null>(null);
  const [childApps, setChildApps] = useState<MCPApp[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    readAppResource(app.resourceUri)
      .then((nextResource) => {
        if (cancelled) {
          return;
        }

        setResource(nextResource);
        setError(null);
      })
      .catch((nextError) => {
        if (cancelled) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : 'Unable to load app resource');
      });

    return () => {
      cancelled = true;
    };
  }, [app.resourceUri]);

  const handleToolAction = async (action: ToolAction) => {
    if (
      action.toolName === 'add_to_cart' &&
      action.params?.productId &&
      action.params?.name &&
      typeof action.params.priceUsd === 'number'
    ) {
      const result = addToCart({
        productId: action.params.productId,
        name: action.params.name,
        priceUsd: action.params.priceUsd,
      });

      return `Added to cart (${result.quantity} of this item, ${result.totalItems} total item${result.totalItems === 1 ? '' : 's'})`;
    }

    const result = await callHostTool(action);
    const payload = extractPayloadFromToolCallResult(result);
    const nextApps = getAppsFromPayload(payload);

    if (nextApps.length) {
      setChildApps(nextApps);
      return `Opened ${nextApps[0]?.title ?? action.toolName}`;
    }

    return `${action.toolName} completed`;
  };

  if (error) {
    return (
      <div
        style={{
          margin: '8px 0 14px',
          padding: '12px 14px',
          border: '1px solid #e7e5e4',
          borderRadius: 14,
          background: '#fafaf9',
          color: '#57534e',
          fontSize: 13,
        }}
      >
        {error}
      </div>
    );
  }

  if (!resource) {
    return (
      <div
        style={{
          margin: '8px 0 14px',
          padding: '12px 14px',
          border: '1px solid #e7e5e4',
          borderRadius: 14,
          background: '#fafaf9',
          color: '#57534e',
          fontSize: 13,
        }}
      >
        Loading {app.title}...
      </div>
    );
  }

  return (
    <div>
      <ProductCardFrame uiResource={resource} onToolAction={handleToolAction} />
      {childApps.map((childApp) => (
        <AppRenderer key={`${app.resourceUri}:${childApp.resourceUri}`} app={childApp} />
      ))}
    </div>
  );
}

function ProductCardResultMessage({ message }: RenderMessageProps) {
  const payload = useMemo(
    () => parseToolPayload(typeof message.content === 'string' ? message.content : undefined),
    [message.content],
  );

  const resources = useMemo(() => {
    if (payload?.resources?.length) {
      return payload.resources.filter((item) => item.mimeType === 'text/html');
    }

    if (payload?.uiResources?.length) {
      return payload.uiResources.filter((item) => item.mimeType === 'text/html');
    }

    if (payload?.uiResource?.mimeType === 'text/html') {
      return [payload.uiResource];
    }

    return [];
  }, [payload]);

  const apps = useMemo(() => getAppsFromPayload(payload, resources), [payload, resources]);

  if (!apps.length) {
    return null;
  }

  return (
    <div>
      {apps.map((app) => (
        <AppRenderer key={app.resourceUri} app={app} />
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
