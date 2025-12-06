'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, ArrowUpDown, ArrowUp, ArrowDown, Copy, Trash, Edit, ExternalLink, Link as LinkIcon, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteLink } from '@/lib/api';
import { LinkData } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LinkDataTableProps {
  links: LinkData[];
  onEdit: (link: LinkData) => void;
  onDelete: (id: string) => void;
  requestSort: (key: keyof LinkData) => void;
  sortConfig: { key: keyof LinkData; direction: string } | null;
}

export function LinkDataTable({ links, onEdit, onDelete, requestSort, sortConfig }: LinkDataTableProps) {
  const { toast } = useToast();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [linkToDelete, setLinkToDelete] = useState<LinkData | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: '¡Copiado al portapapeles!', description: text });
  };
  
  const handleDeleteClick = (link: LinkData) => {
    setLinkToDelete(link);
    setIsAlertOpen(true);
  }

  const confirmDelete = async () => {
    if (!linkToDelete) return;

    const result = await deleteLink(linkToDelete.slug);
    if (result.success) {
      toast({ title: 'Éxito', description: `El link /${linkToDelete.slug} ha sido eliminado.` });
      onDelete(linkToDelete.id!);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el link.' });
    }
    setIsAlertOpen(false);
    setLinkToDelete(null);
  };

  return (
    <>
      <div className="rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button onClick={() => requestSort('slug')} className="flex items-center">
                Nombre Visible
                  {sortConfig?.key === 'slug' && (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
                </button>
              </TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>
                <button onClick={() => requestSort('clicks')} className="flex items-center">
                  Clics
                  {sortConfig?.key === 'clicks' && (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
                </button>
              </TableHead>
              <TableHead className="hidden">Etiquetas</TableHead>
              <TableHead>
                <button onClick={() => requestSort('createdAt')} className="flex items-center">
                  Generado
                  {sortConfig?.key === 'createdAt' && (sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
                </button>
              </TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {links.length > 0 ? (
              links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell className="font-medium">
                    <a
                      href={`/${link.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline flex items-center"
                    >
                      /{link.slug}
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                  </TableCell>
                  <TableCell>
                    <Badge variant={link.type === 'microlanding' ? 'default' : 'secondary'}>
                      {link.type === 'microlanding' ? <LinkIcon className="mr-1 h-3 w-3"/> : <Smartphone className="mr-1 h-3 w-3"/>}
                      {link.type === 'microlanding' ? 'Microlanding' : 'Redirección'}
                    </Badge>
                  </TableCell>
                  <TableCell>{link.clicks ?? 0}</TableCell>
                  <TableCell className="hidden max-w-[200px] truncate">
                    <div className="flex flex-wrap gap-1">
                      {link.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                      {link.tags.length > 3 && <Badge variant="outline">...</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(link.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onEdit(link)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyToClipboard(`${window.location.origin}/${link.slug}`)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar URL
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(link)}>
                          <Trash className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No hay links para mostrar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el link <span className='font-bold'>/{linkToDelete?.slug}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
