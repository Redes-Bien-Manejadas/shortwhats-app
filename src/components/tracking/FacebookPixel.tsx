'use client';

import { useEffect } from 'react';
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

  // No renderizar si no hay pixel ID
  if (!pixelId) return null;

  useEffect(() => {
    // Verificar si fbq ya está disponible
    if (typeof window !== 'undefined' && window.fbq) {
      // Disparar ViewContent si está habilitado y se solicita
      if (onPageView && viewContentEvent) {
        window.fbq('track', 'ViewContent');
        console.log('🎯 Facebook Pixel: ViewContent event fired');
      }

      // Disparar Lead si está habilitado y se solicita
      if (onLead && leadEvent) {
        window.fbq('track', 'Lead');
        console.log('🎯 Facebook Pixel: Lead event fired');
      }

      // Disparar evento personalizado si se especifica
      if (customEventName && customEvents.includes(customEventName)) {
        window.fbq('trackCustom', customEventName);
        console.log(`🎯 Facebook Pixel: Custom event ${customEventName} fired`);
      }
    }
  }, [onPageView, onLead, customEventName, viewContentEvent, leadEvent, customEvents]);

  return (
    <>
      <Script
        id="facebook-pixel"
        strategy="afterInteractive"
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
