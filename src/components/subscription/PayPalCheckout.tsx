"use client";

import React from 'react';
import { preconnect } from 'react-dom';
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { Loader2 } from 'lucide-react';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'AR7DFDs4W3LqJNeFTELaFs06b8vuc3tcE6FZSmloQgAmtM05ZaR2_cRJosyOFGWF5ZEsXRAGNQVlFkDn';
const PAYPAL_PLAN_ID = process.env.NEXT_PUBLIC_PAYPAL_PLAN_ID || 'P-2P321243C53094157NLCL5WI';

// Same options everywhere (page + modal) so the SDK script is loaded once and shared.
const PAYPAL_OPTIONS = {
  clientId: PAYPAL_CLIENT_ID,
  components: 'buttons',
  intent: 'subscription',
  vault: true,
};

/**
 * Starts loading the PayPal SDK as soon as it is rendered. Wrap the whole
 * checkout area with it when the page/modal opens — the SDK used to start
 * downloading only after "Get Premium" was pressed, so the buttons came late.
 */
export function PayPalPreload({ enabled = true, children }: { enabled?: boolean; children: React.ReactNode }) {
  if (!enabled) return <>{children}</>;
  preconnect('https://www.paypal.com');
  preconnect('https://www.paypalobjects.com');
  return <PayPalScriptProvider options={PAYPAL_OPTIONS}>{children}</PayPalScriptProvider>;
}

interface PayPalSubscribeButtonProps {
  color?: 'gold' | 'blue' | 'silver' | 'white' | 'black';
  height?: number;
  onApproved: (subscriptionId: string) => Promise<void> | void;
  onError: (message: string) => void;
}

/** The PayPal subscribe button, with a placeholder of the same height while the SDK loads. */
export function PayPalSubscribeButton({ color = 'gold', height = 48, onApproved, onError }: PayPalSubscribeButtonProps) {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();

  if (isRejected) {
    return (
      <p className="paypal-load-error">
        PayPal could not load. Check your connection or turn off the ad blocker, then reload the page.
        <style jsx>{`
          .paypal-load-error {
            margin: 0;
            padding: 12px 14px;
            border-radius: 12px;
            background: rgba(239, 68, 68, 0.12);
            color: #fca5a5;
            font-size: 13px;
            line-height: 1.45;
            text-align: center;
          }
        `}</style>
      </p>
    );
  }

  return (
    <div className="paypal-btn-wrap" style={{ minHeight: height }}>
      {isPending && (
        <div className="paypal-btn-skeleton" style={{ height }} aria-live="polite">
          <Loader2 size={18} className="paypal-spin" />
          <span>Loading secure checkout…</span>
        </div>
      )}
      <PayPalButtons
        style={{ shape: 'pill', color, layout: 'vertical', label: 'subscribe', height }}
        createSubscription={(_data, actions) => actions.subscription.create({ plan_id: PAYPAL_PLAN_ID })}
        onApprove={async (data) => {
          if (data.subscriptionID) {
            await onApproved(data.subscriptionID);
          } else {
            onError('Subscription approved, but no subscription ID returned.');
          }
        }}
        onError={(err) => {
          console.error('[PAYPAL-ERROR]', err);
          onError('Payment processing failed. Please try again.');
        }}
      />
      <style jsx>{`
        .paypal-btn-wrap {
          width: 100%;
        }
        .paypal-btn-skeleton {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: #aaaaaa;
          font-size: 14px;
          font-weight: 600;
        }
        .paypal-btn-skeleton :global(.paypal-spin) {
          animation: paypalSpin 0.9s linear infinite;
        }
        @keyframes paypalSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
