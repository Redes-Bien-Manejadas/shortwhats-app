'use client';

import React from 'react';
import type { LinkData } from '@/lib/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { FacebookPixel, useFacebookPixel } from '@/components/tracking/FacebookPixel';
import { Phone, MessageCircle } from 'lucide-react';

// Iconos del botón - Ahora con PNG para WhatsApp y tamaños responsivos
const getButtonIcon = (iconType: string, size: string = 'default') => {
  const ButtonIcons = {
    whatsapp: (
      <Image
        src="https://upload.wikimedia.org/wikipedia/commons/5/5e/WhatsApp_icon.png"
        alt="WhatsApp"
        width={size === 'large' ? 36 : 24}
        height={size === 'large' ? 36 : 24}
        className="mr-2 md:mr-3 flex-shrink-0"
      />
    ),
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
    trackEvent('Lead');
    facebookPixel.customEvents.forEach(eventName => {
      trackEvent(eventName, true);
    });
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
                  />
                </div>
              ) : (
                <Image
                  src={microlandingConfig.logoUrl}
                  alt="Logo"
                  width={logoWidth}
                  height={logoWidth / 2}
                  className="object-contain max-w-full h-auto"
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
