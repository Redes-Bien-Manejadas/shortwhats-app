'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Waves, Home, Link2, Settings, LogOut, PlusCircle, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';
import { SettingsDialog } from '@/components/dashboard/SettingsDialog';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, logout, isLoading } = useAuth();
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-card lg:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-[60px] items-center border-b px-6">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
              <img src="/logowhatsapp.png" alt="WhatsApp Hardiness Logo" className="h-6 w-6" />
              <span className="">WhatsApp Hardiness</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start px-4 text-sm font-medium">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-primary transition-all hover:text-primary"
              >
                <LinkIcon className="h-4 w-4" />
                WhatsApp Activados
              </Link>
            </nav>
          </div>
        </div>
      </div>
      <div className="flex flex-col">
        <header className="flex h-14 items-center gap-4 border-b bg-card px-6 lg:h-[60px]">
          <div className="w-full flex-1">
            {/* Can add mobile nav toggle here */}
          </div>
          <Button onClick={() => setIsSettingsOpen(true)} variant="ghost" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
          <Button onClick={logout} variant="outline" size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
      
      {/* Modal de configuración */}
      <SettingsDialog isOpen={isSettingsOpen} setIsOpen={setIsSettingsOpen} />
    </div>
  );
}
