'use client';

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { verifyLogin } from '@/lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (user: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem('whatsgrow_auth');
      if (storedAuth === 'true') {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Could not access localStorage', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      // No redirigir en rutas públicas (slugs y redirecciones)
      const isPublicRoute = pathname.startsWith('/redirect/') || 
                           (pathname !== '/login' && pathname !== '/dashboard' && !pathname.startsWith('/dashboard/'));
      
      if (!isPublicRoute) {
        if (isAuthenticated && pathname === '/login') {
          router.push('/dashboard');
        } else if (!isAuthenticated && pathname.startsWith('/dashboard')) {
          router.push('/login');
        }
      }
    }
  }, [isAuthenticated, isLoading, pathname, router]);


  const login = async (user: string, pass: string): Promise<boolean> => {
    try {
      console.log('🔐 Validando credenciales via API...');
      const result = await verifyLogin(user, pass);
      
      if (result.success) {
        console.log('✅ Login exitoso');
        localStorage.setItem('whatsgrow_auth', 'true');
        setIsAuthenticated(true);
        router.push('/dashboard');
        return true;
      }
      
      console.log('❌ Credenciales inválidas');
      return false;
    } catch (error) {
      console.error('❌ Error en login:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('whatsgrow_auth');
    setIsAuthenticated(false);
    router.push('/login');
  };

  const value = { isAuthenticated, login, logout, isLoading };

  // No mostrar loader en rutas de redirección y slugs públicos
  const isPublicRoute = pathname.startsWith('/redirect/') || 
                       (pathname !== '/login' && pathname !== '/dashboard' && !pathname.startsWith('/dashboard/'));

  if (isLoading && !isPublicRoute) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        </div>
      )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
