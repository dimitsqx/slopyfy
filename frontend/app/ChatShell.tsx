'use client';

import { useMemo, useState } from 'react';
import { useCopilotChatInternal } from '@copilotkit/react-core';
import { CopilotSidebar, type RenderMessageProps } from '@copilotkit/react-ui';

type Product = {
  id: string;
  name: string;
  category: 'tops' | 'bottoms' | 'outerwear' | 'accessories' | 'footwear';
  priceUsd: number;
  sizes: string[];
  colors: string[];
  description: string;
  inventory: number;
};

type CartItem = {
  productId: string;
  name: string;
  priceUsd: number;
  quantity: number;
};

type ParsedToolPayload = {
  product?: Product | null;
  products?: Product[];
};

const CART_STORAGE_KEY = 'slopyfy-cart';

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

function ProductCard({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (productId: string) => Promise<void>;
}) {
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleAddToCart = () => {
    const result = addToCart({
      productId: product.id,
      name: product.name,
      priceUsd: product.priceUsd,
    });

    setLastAction(
      `Added to cart (${result.quantity} of this item, ${result.totalItems} total item${result.totalItems === 1 ? '' : 's'})`,
    );
  };

  const handleSelect = async () => {
    setLastAction(`Loading details for ${product.id}...`);

    try {
      await onSelect(product.id);
      setLastAction(`Requested details for ${product.id}`);
    } catch (error) {
      if (error instanceof Error && error.message === 'chat-busy') {
        setLastAction('Chat is busy. Try again in a moment.');
        return;
      }

      setLastAction('Unable to request product details right now.');
    }
  };

  return (
    <div
      style={{
        margin: '8px 0 14px',
        border: '1px solid #d6d3d1',
        borderRadius: 16,
        overflow: 'hidden',
        background: '#fcfcf9',
        boxShadow: '0 8px 24px rgba(15,23,42,0.06)',
      }}
    >
      <div
        style={{
          padding: '14px 16px',
          background: 'linear-gradient(135deg,#f5f5f4,#e7e5e4)',
          borderBottom: '1px solid #e7e5e4',
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#57534e',
          }}
        >
          {product.category}
        </div>
        <h3
          style={{
            margin: '8px 0 4px',
            fontSize: 20,
            lineHeight: 1.2,
            color: '#111827',
          }}
        >
          {product.name}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: '#44403c',
          }}
        >
          {product.description}
        </p>
      </div>
      <div style={{ padding: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#6b7280',
              }}
            >
              Price
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: '#111827',
              }}
            >
              ${product.priceUsd}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#6b7280',
              }}
            >
              Stock
            </div>
            <div
              style={{
                fontSize: 14,
                color: '#1f2937',
              }}
            >
              {product.inventory} left
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#6b7280',
            }}
          >
            Colors
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 6,
              marginTop: 8,
            }}
          >
            {product.colors.map((color) => (
              <span
                key={color}
                style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: 999,
                  background: '#f2f4f5',
                  color: '#334155',
                  fontSize: 12,
                }}
              >
                {color}
              </span>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#6b7280',
            }}
          >
            Sizes
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 14,
              color: '#1f2937',
            }}
          >
            {product.sizes.join(' · ')}
          </div>
        </div>
        <button
          type="button"
          onClick={handleSelect}
          style={{
            marginTop: 16,
            width: '100%',
            border: 0,
            borderRadius: 10,
            padding: '12px 14px',
            background: '#111827',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Select product
        </button>
        <button
          type="button"
          onClick={handleAddToCart}
          style={{
            marginTop: 10,
            width: '100%',
            border: '1px solid #d6d3d1',
            borderRadius: 10,
            padding: '12px 14px',
            background: '#fff',
            color: '#111827',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Add to cart
        </button>
      </div>
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
  const { sendMessage, isLoading } = useCopilotChatInternal();
  const payload = useMemo(
    () => parseToolPayload(typeof message.content === 'string' ? message.content : undefined),
    [message.content],
  );

  const products = useMemo(() => {
    if (payload?.products?.length) {
      return payload.products;
    }

    if (payload?.product) {
      return [payload.product];
    }

    return [];
  }, [payload]);

  if (!products.length) {
    return null;
  }

  const handleSelectProduct = async (productId: string) => {
    if (isLoading) {
      throw new Error('chat-busy');
    }

    await sendMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: `Show me product details for ${productId}. Use product_details.`,
    });
  };

  return (
    <div>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onSelect={handleSelectProduct} />
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
