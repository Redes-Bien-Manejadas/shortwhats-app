'use client';

import React from 'react';
import type { LinkData } from '@/lib/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FacebookPixel, useFacebookPixel } from '@/components/tracking/FacebookPixel';
import { Phone, MessageCircle } from 'lucide-react';

// WhatsApp SVG icon (inline to avoid external request)
const WhatsAppIcon = ({ size = 24 }: { size?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className="mr-2 md:mr-3 flex-shrink-0 text-white"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Iconos del botón - Using inline SVG for WhatsApp to avoid external requests
const getButtonIcon = (iconType: string, size: string = 'default') => {
  const iconSize = size === 'large' ? 36 : 24;
  
  const ButtonIcons = {
    whatsapp: <WhatsAppIcon size={iconSize} />,
    phone: <Phone className={`mr-2 md:mr-3 flex-shrink-0 ${size === 'large' ? 'h-9 w-9 md:h-12 md:w-12' : 'h-6 w-6'}`} />,
    message: <MessageCircle className={`mr-2 md:mr-3 flex-shrink-0 ${size === 'large' ? 'h-9 w-9 md:h-12 md:w-12' : 'h-6 w-6'}`} />,
    none: null,
  };
  
  return ButtonIcons[iconType as keyof typeof ButtonIcons] || null;
};

export function MicrolandingPage({ linkData }: { linkData: LinkData }) {
  const { microlandingConfig, phoneNumber, message, facebookPixel } = linkData;
  const { colors } = microlandingConfig;
  const { trackEvent } = useFacebookPixel(facebookPixel);

  // Tamaños del logo
  const logoSizes = {
    small: 150,
    medium: 220,
    large: 280,
    xlarge: 350,
    xxlarge: 450,
    xxxlarge: 550,
  };

  const logoWidth = logoSizes[microlandingConfig.logoSize as keyof typeof logoSizes] || logoSizes.large;

  const buttonStyle: React.CSSProperties = {
    backgroundColor: colors.buttonBackground,
    color: colors.buttonText,
    borderRadius: `${microlandingConfig.buttonBorderRadius}px`,
  };

  // Estilo del contenedor glassmorphism
  const glassContainerStyle: React.CSSProperties = microlandingConfig.logoGlassmorphism ? {
    background: `rgba(255, 255, 255, ${microlandingConfig.logoGlassOpacity / 100})`,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  } : {};

  const handleWhatsAppClick = () => {
    // Track Facebook Pixel events
    trackEvent('Lead');
    facebookPixel.customEvents.forEach(eventName => {
      trackEvent(eventName, true);
    });
    
    // Increment click count (server handles debounce)
    fetch(`/api/links/${linkData.slug}/clicks`, { method: 'POST' }).catch(() => {});
  };

  return (
    <>
      <FacebookPixel config={facebookPixel} onPageView={true} />
      
      <div 
        style={{ backgroundColor: colors.background, color: colors.text }} 
        className="flex min-h-screen flex-col items-center justify-center p-6 transition-colors duration-300"
      >
        <main className="w-full max-w-2xl mx-auto text-center px-4">
          {/* 1. Logo */}
          {microlandingConfig.showLogo && microlandingConfig.logoUrl && (
            <div 
              className="mb-8 flex justify-center" 
              style={{ 
                transform: `translateY(${microlandingConfig.logoVerticalPosition}px)`,
                transition: 'transform 0.3s ease'
              }}
            >
              {microlandingConfig.logoGlassmorphism ? (
                <div 
                  className="p-6 rounded-2xl"
                  style={glassContainerStyle}
                >
                  <Image
                    src={microlandingConfig.logoUrl}
                    alt="Logo"
                    width={logoWidth}
                    height={logoWidth / 2}
                    className="object-contain max-w-full h-auto"
                    priority
                    loading="eager"
                  />
                </div>
              ) : (
                <Image
                  src={microlandingConfig.logoUrl}
                  alt="Logo"
                  width={logoWidth}
                  height={logoWidth / 2}
                  className="object-contain max-w-full h-auto"
                  priority
                  loading="eager"
                />
              )}
            </div>
          )}

          {/* 2. Imagen Principal */}
          {microlandingConfig.showImage && microlandingConfig.imageUrl && (
            <div className="mb-10 w-full relative overflow-hidden rounded-2xl shadow-2xl">
              <Image
                src={microlandingConfig.imageUrl}
                alt="Imagen principal"
                width={900}
                height={400}
                className="object-cover w-full h-auto"
              />
            </div>
          )}

          {/* 3. Texto Superior (Header) */}
          {microlandingConfig.showHeaderText && microlandingConfig.headerText && (
            <div className="mb-4">
              <p 
                className="text-base md:text-lg font-medium tracking-wide uppercase"
                style={{ color: colors.text, opacity: 0.9 }}
              >
                {microlandingConfig.headerText}
              </p>
            </div>
          )}

          {/* 4. Texto Destacado (Subheader) */}
          {microlandingConfig.showSubheaderText && microlandingConfig.subheaderText && (
            <div className="mb-8 flex justify-center">
              <h1 
                className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight uppercase text-center max-h-[400px] md:max-h-none overflow-hidden"
                style={{ color: colors.text }}
              >
                {microlandingConfig.subheaderText}
              </h1>
            </div>
          )}

          {/* 5. Descripción */}
          {microlandingConfig.description && (
            <div className="mb-10">
              <p 
                className="text-lg md:text-xl lg:text-2xl font-medium"
                style={{ 
                  color: colors.text, 
                  opacity: 0.85,
                  fontWeight: microlandingConfig.descriptionBold ? 'bold' : 'medium',
                  textDecoration: microlandingConfig.descriptionUnderline ? 'underline' : 'none'
                }}
              >
                {microlandingConfig.description}
              </p>
            </div>
          )}

          {/* 6. Botón de WhatsApp */}
          <div className="mb-10">
            <Button
              asChild
              size="lg"
              className="w-full max-w-lg mx-auto text-lg md:text-2xl font-bold py-6 px-6 md:py-7 md:px-8 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 flex items-center justify-center"
              style={buttonStyle}
            >
              <Link href={`/redirect/${linkData.slug}`} onClick={handleWhatsAppClick} className="flex items-center justify-center">
                {microlandingConfig.buttonIcon !== 'none' && getButtonIcon(microlandingConfig.buttonIcon, 'large')}
                <span className="inline-block">{microlandingConfig.buttonText}</span>
              </Link>
            </Button>
          </div>
          <br></br>
          {/* 7. Texto Inferior (Footer) */}
          {microlandingConfig.showFooterText && microlandingConfig.footerText && (
            <div className="mt-10" style={{ marginBottom: '15px', marginTop: '45px' }}>
              <p 
                className="font-semibold"
                style={{ 
                  color: colors.text, 
                  opacity: 0.8,
                  fontSize: `${microlandingConfig.footerTextSize}px`
                }}
              >
                {microlandingConfig.footerText}
              </p>
            </div>
          )}
        </main>

        {/* Footer de ShortWhats */}
        <footer className="mt-12 text-center text-xs hidden" style={{ color: colors.text, opacity: 0.4 }}>
          <p>Potenciado por ShortWhats</p>
        </footer>
      </div>
    </>
  );
}
