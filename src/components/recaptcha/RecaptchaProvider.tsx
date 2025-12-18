'use client';

import Script from 'next/script';
import { createContext, useContext, useCallback, useState } from 'react';

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

interface RecaptchaContextType {
    isReady: boolean;
    executeRecaptcha: (action: string) => Promise<string | null>;
}

const RecaptchaContext = createContext<RecaptchaContextType>({
    isReady: false,
    executeRecaptcha: async () => null,
});

export function useRecaptcha() {
    return useContext(RecaptchaContext);
}

declare global {
    interface Window {
        grecaptcha: {
            ready: (callback: () => void) => void;
            execute: (siteKey: string, options: { action: string }) => Promise<string>;
        };
    }
}

interface RecaptchaProviderProps {
    children: React.ReactNode;
}

export function RecaptchaProvider({ children }: RecaptchaProviderProps) {
    const [isReady, setIsReady] = useState(false);

    const handleScriptLoad = useCallback(() => {
        if (typeof window !== 'undefined' && window.grecaptcha) {
            window.grecaptcha.ready(() => {
                setIsReady(true);
                console.log('🔒 reCAPTCHA v3 ready');
            });
        }
    }, []);

    const executeRecaptcha = useCallback(async (action: string): Promise<string | null> => {
        if (!RECAPTCHA_SITE_KEY) {
            console.warn('⚠️ NEXT_PUBLIC_RECAPTCHA_SITE_KEY not configured');
            return null;
        }

        if (typeof window === 'undefined' || !window.grecaptcha) {
            console.warn('⚠️ reCAPTCHA not loaded yet');
            return null;
        }

        try {
            const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
            console.log(`🔒 reCAPTCHA token generated for action: ${action}`);
            return token;
        } catch (error) {
            console.error('Error executing reCAPTCHA:', error);
            return null;
        }
    }, []);

    // Don't render script if no site key
    if (!RECAPTCHA_SITE_KEY) {
        return (
            <RecaptchaContext.Provider value={{ isReady: true, executeRecaptcha }}>
                {children}
            </RecaptchaContext.Provider>
        );
    }

    return (
        <RecaptchaContext.Provider value={{ isReady, executeRecaptcha }}>
            <Script
                src={`https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`}
                strategy="afterInteractive"
                onLoad={handleScriptLoad}
            />
            {children}
        </RecaptchaContext.Provider>
    );
}
