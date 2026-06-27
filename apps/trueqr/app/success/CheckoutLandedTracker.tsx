'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, props?: Record<string, unknown>) => void;
    };
  }
}

/**
 * Fires the canonical funnel-tail event for the /pricing → checkout flow
 * on /success page load. Includes source attribution (Stripe session id,
 * referrer, UTM params) so the conversion can be traced back to the
 * originating pricing-page click in PostHog.
 */
export default function CheckoutLandedTracker() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const props: Record<string, unknown> = {
        path: '/success',
        stripe_session_id: params.get('session_id') || null,
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
        utm_source: params.get('utm_source'),
        utm_medium: params.get('utm_medium'),
        utm_campaign: params.get('utm_campaign'),
        source: 'stripe_checkout_redirect',
      };
      window.posthog?.capture('checkout_success_page_view', props);
      // Funnel-tail alias: matches the pricing_to_checkout_click event name
      // so the two-step funnel is queryable as a clean pair in PostHog.
      window.posthog?.capture('pricing_to_checkout_completed', props);
    } catch {
      // analytics must never break the flow
    }
  }, []);

  return null;
}
