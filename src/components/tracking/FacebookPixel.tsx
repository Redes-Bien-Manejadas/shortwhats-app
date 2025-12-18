'use client';

import { useCallback, useEffect, useRef } from 'react';
import Script from 'next/script';
import { FacebookPixelConfig } from '@/lib/types';

interface FacebookPixelProps {
  config: FacebookPixelConfig;
  onPageView?: boolean;
  onLead?: boolean;
  customEventName?: string;
}

declare global {
  interface Window {
    fbq: any;
  }
}

export function FacebookPixel({ config, onPageView = false, onLead = false, customEventName }: FacebookPixelProps) {
  const { pixelId, viewContentEvent, leadEvent, customEvents } = config;
  const viewContentFired = useRef(false);
  const leadFired = useRef(false);
  const customEventFired = useRef<string | null>(null);

  // Function to fire ViewContent event
  const fireViewContent = useCallback(() => {
    if (typeof window === 'undefined' || !window.fbq) return;
    if (viewContentFired.current) return;
    if (!onPageView || !viewContentEvent) return;

    viewContentFired.current = true;
    window.fbq('track', 'ViewContent');
    console.log('🎯 Facebook Pixel: ViewContent event fired');
  }, [onPageView, viewContentEvent]);

  // Function to fire Lead event (only after validation)
  const fireLead = useCallback(() => {
    if (typeof window === 'undefined' || !window.fbq) return;
    if (leadFired.current) return;
    if (!onLead || !leadEvent) return;

    leadFired.current = true;
    window.fbq('track', 'Lead');
    console.log('🎯 Facebook Pixel: Lead event fired (after validation)');
  }, [onLead, leadEvent]);

  // Function to fire custom event
  const fireCustomEvent = useCallback(() => {
    if (typeof window === 'undefined' || !window.fbq) return;
    if (!customEventName || customEventFired.current === customEventName) return;
    if (!customEvents.includes(customEventName)) return;

    customEventFired.current = customEventName;
    window.fbq('trackCustom', customEventName);
    console.log(`🎯 Facebook Pixel: Custom event ${customEventName} fired`);
  }, [customEventName, customEvents]);

  // Fire ViewContent on mount if fbq is ready
  useEffect(() => {
    if (typeof window !== 'undefined' && window.fbq) {
      fireViewContent();
    }
  }, [fireViewContent]);

  // Fire Lead when onLead becomes true (after API validation)
  useEffect(() => {
    if (onLead && typeof window !== 'undefined' && window.fbq) {
      fireLead();
    }
  }, [onLead, fireLead]);

  // Fire custom event when specified
  useEffect(() => {
    if (customEventName && typeof window !== 'undefined' && window.fbq) {
      fireCustomEvent();
    }
  }, [customEventName, fireCustomEvent]);

  // No renderizar si no hay pixel ID
  if (!pixelId) return null;

  return (
    <>
      <Script
        id="facebook-pixel"
        strategy="afterInteractive"
        onLoad={() => {
          fireViewContent();
          fireLead();
          fireCustomEvent();
        }}
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
            console.log('🎯 Facebook Pixel initialized with ID: ${pixelId}');
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

// Hook para disparar eventos desde componentes
export function useFacebookPixel(config: FacebookPixelConfig) {
  const trackEvent = (eventName: 'ViewContent' | 'Lead' | string, isCustom = false) => {
    if (!config.pixelId || typeof window === 'undefined' || !window.fbq) return;

    if (isCustom) {
      if (config.customEvents.includes(eventName)) {
        window.fbq('trackCustom', eventName);
        console.log(`🎯 Facebook Pixel: Custom event ${eventName} fired`);
      }
    } else {
      if (eventName === 'ViewContent' && config.viewContentEvent) {
        window.fbq('track', 'ViewContent');
        console.log('🎯 Facebook Pixel: ViewContent event fired');
      } else if (eventName === 'Lead' && config.leadEvent) {
        window.fbq('track', 'Lead');
        console.log('🎯 Facebook Pixel: Lead event fired');
      }
    }
  };

  return { trackEvent };
}
