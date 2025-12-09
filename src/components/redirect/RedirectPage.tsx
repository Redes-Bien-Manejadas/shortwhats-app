'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { FacebookPixel, useFacebookPixel } from '@/components/tracking/FacebookPixel';
import { FacebookPixelConfig } from '@/lib/types';

interface RedirectPageProps {
  targetUrl: string;
  slug: string;
  message?: string;
  facebookPixel?: FacebookPixelConfig;
}

export function RedirectPage({ targetUrl, slug, message, facebookPixel }: RedirectPageProps) {
  const [countdown, setCountdown] = useState(4);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const hasTrackedClick = useRef(false); // Prevent double-counting
  
  // Solo usar el hook si hay configuración de pixel
  const { trackEvent } = facebookPixel ? useFacebookPixel(facebookPixel) : { trackEvent: () => {} };

  const handleRedirect = useCallback(() => {
    // Prevent multiple redirects/tracking
    if (isRedirecting || hasTrackedClick.current) return;
    
    setIsRedirecting(true);
    hasTrackedClick.current = true;
    
    // Disparar evento Lead antes de la redirección
    if (facebookPixel) {
      trackEvent('Lead');
      
      // Disparar eventos personalizados si existen
      facebookPixel.customEvents.forEach(eventName => {
        trackEvent(eventName, true);
      });
    }
    
    // Increment click count (fire and forget)
    fetch(`/api/links/${slug}/clicks`, { method: 'POST' }).catch(() => {});
    
    window.location.href = targetUrl;
  }, [isRedirecting, facebookPixel, trackEvent, slug, targetUrl]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [handleRedirect]);

  return (
    <>
      {/* Facebook Pixel */}
      {facebookPixel && <FacebookPixel config={facebookPixel} onPageView={true} />}
      
      <div className="min-h-screen relative overflow-hidden font-poppins">
        {/* Fondo de imagen */}
        <div className="absolute inset-0">
          <Image
            src="/bg.jpg"
            alt="Background"
            fill
            className="object-cover"
            priority
          />
        </div>

      {/* Contenido principal */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
        <div className="text-center space-y-8 max-w-md mx-auto">
          {/* Loader circular */}
          <div className="relative">
            <div className="w-24 h-24 mx-auto">
              <svg className="w-24 h-24 transform rotate-0" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#E5E7EB"
                  strokeWidth="6"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="#10B981"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: `${2 * Math.PI * 40}`,
                    strokeDashoffset: `${2 * Math.PI * 40 * (countdown / 4)}`,
                    transition: 'stroke-dashoffset 1s linear'
                  }}
                />
              </svg>
            </div>
          </div>

          {/* Título principal */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-green-600">
              Abriendo WhatsApp
            </h1>
          </div>

          {/* Icono de WhatsApp outlined */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center border-0 border-green-500 bg-transparent">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path fill="#00a855" d="M476.9 161.1C435 119.1 379.2 96 319.9 96C197.5 96 97.9 195.6 97.9 318C97.9 357.1 108.1 395.3 127.5 429L96 544L213.7 513.1C246.1 530.8 282.6 540.1 319.8 540.1L319.9 540.1C442.2 540.1 544 440.5 544 318.1C544 258.8 518.8 203.1 476.9 161.1zM319.9 502.7C286.7 502.7 254.2 493.8 225.9 477L219.2 473L149.4 491.3L168 423.2L163.6 416.2C145.1 386.8 135.4 352.9 135.4 318C135.4 216.3 218.2 133.5 320 133.5C369.3 133.5 415.6 152.7 450.4 187.6C485.2 222.5 506.6 268.8 506.5 318.1C506.5 419.9 421.6 502.7 319.9 502.7zM421.1 364.5C415.6 361.7 388.3 348.3 383.2 346.5C378.1 344.6 374.4 343.7 370.7 349.3C367 354.9 356.4 367.3 353.1 371.1C349.9 374.8 346.6 375.3 341.1 372.5C308.5 356.2 287.1 343.4 265.6 306.5C259.9 296.7 271.3 297.4 281.9 276.2C283.7 272.5 282.8 269.3 281.4 266.5C280 263.7 268.9 236.4 264.3 225.3C259.8 214.5 255.2 216 251.8 215.8C248.6 215.6 244.9 215.6 241.2 215.6C237.5 215.6 231.5 217 226.4 222.5C221.3 228.1 207 241.5 207 268.8C207 296.1 226.9 322.5 229.6 326.2C232.4 329.9 268.7 385.9 324.4 410C359.6 425.2 373.4 426.5 391 423.9C401.7 422.3 423.8 410.5 428.4 397.5C433 384.5 433 373.4 431.6 371.1C430.3 368.6 426.6 367.2 421.1 364.5z"/></svg>
            </div>
          </div>

          {/* Mensaje explicativo en 3 líneas */}
          <div className="space-y-6 text-center">
            <div className="text-gray-800 text-lg leading-relaxed">
              <p className="mb-2">En la siguiente pantalla</p>
              <p className="mb-2">
                hacé clic en{' '}
                <span className="border-2 border-black text-black px-1 py-0 rounded font-bold">
                  CONTINUAR
                </span>
              </p>
              <p>para enviarnos tu mensaje</p>
            </div>

            {/* Botón manual outline */}
            <Button
              onClick={handleRedirect}
              disabled={isRedirecting}
              variant="outline"
              className="border-2 border-black text-black hover:bg-black hover:text-white px-8 py-3 text-lg font-bold rounded-lg transition-colors hidden"
            >
              {isRedirecting ? 'Redirigiendo...' : 'CONTINUAR'}
            </Button>
          </div>

          {/* Mensaje personalizado si existe */}
          {message && (
            <div className="mt-6 p-4 bg-white/80 rounded-lg border border-gray-200 hidden">
              <p className="text-sm text-gray-600 italic">
                Mensaje: "{message}"
              </p>
            </div>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
