'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Loader2 } from 'lucide-react';
import { LinkData } from '@/lib/types';
import { LinkDataTable } from './LinkDataTable';
import { LinkDialog } from './LinkDialog';
import { getAllLinks } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface DashboardClientProps {
  initialLinks?: LinkData[];
}

export function DashboardClient({ initialLinks = [] }: DashboardClientProps) {
  const [links, setLinks] = useState<LinkData[]>(initialLinks);
  const [isLoading, setIsLoading] = useState(initialLinks.length === 0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof LinkData; direction: 'ascending' | 'descending' } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<LinkData | null>(null);
  const { toast } = useToast();

  // Function to refresh links data
  const refreshLinks = async () => {
    try {
      const fetchedLinks = await getAllLinks();
      setLinks(fetchedLinks);
    } catch (error) {
      console.error('Error fetching links:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los links. Intenta recargar la página.',
      });
    }
  };

  // Load links on component mount (only if no initial data)
  useEffect(() => {
    // If we already have initial links, don't fetch again
    if (initialLinks.length > 0) {
      console.log('📋 DashboardClient: Using initial links from server:', initialLinks.length, 'items');
      return;
    }

    const fetchLinks = async () => {
      try {
        console.log('🚀 DashboardClient: No initial data, starting client-side fetch...');
        setIsLoading(true);
        const fetchedLinks = await getAllLinks();
        console.log('✅ DashboardClient: Successfully fetched links:', fetchedLinks);
        setLinks(fetchedLinks);
      } catch (error) {
        console.error('❌ DashboardClient: Error fetching links:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: `No se pudieron cargar los links: ${(error as Error).message}`,
        });
      } finally {
        setIsLoading(false);
        console.log('🏁 DashboardClient: Finished loading process');
      }
    };

    fetchLinks();
  }, [initialLinks.length, toast]);

  const sortedAndFilteredLinks = useMemo(() => {
    let sortableLinks = [...links];

    if (sortConfig !== null) {
      sortableLinks.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    if (!searchTerm) return sortableLinks;

    return sortableLinks.filter((link) => {
      const term = searchTerm.toLowerCase();
      return (
        link.slug.toLowerCase().includes(term) ||
        (link.phoneNumber && link.phoneNumber.toLowerCase().includes(term)) ||
        (link.message && link.message.toLowerCase().includes(term))
      );
    });
  }, [links, searchTerm, sortConfig]);

  const handleOpenDialog = (link: LinkData | null = null) => {
    setEditingLink(link);
    setIsDialogOpen(true);
  };

  const handleSaveChanges = async (updatedLink: LinkData) => {
    // Refresh data from server to ensure we have the latest
    await refreshLinks();
  };

  const handleDelete = async (id: string) => {
    // Refresh data from server to ensure we have the latest
    await refreshLinks();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const requestSort = (key: keyof LinkData) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-muted-foreground">Cargando links...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tus Links</h2>
          <p className="text-muted-foreground">
            Aquí tienes una lista de tus links para seguimiento y gestión.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Activar WhatsApp
          </Button>
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por Nombre Visible, teléfono, mensaje..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
        />
      </div>

      <LinkDataTable
        links={sortedAndFilteredLinks}
        onDelete={handleDelete}
        onEdit={handleOpenDialog}
        requestSort={requestSort}
        sortConfig={sortConfig}
      />

      {isDialogOpen && (
        <LinkDialog
          isOpen={isDialogOpen}
          setIsOpen={setIsDialogOpen}
          linkData={editingLink}
          onSaveChanges={handleSaveChanges}
          existingLinks={links}
        />
      )}
    </>
  );
}
