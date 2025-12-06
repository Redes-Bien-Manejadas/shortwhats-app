'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getAdminCredentials, saveAdminCredentials } from '@/lib/api';
import { Loader2, Eye, EyeOff } from 'lucide-react';

interface SettingsDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function SettingsDialog({ isOpen, setIsOpen }: SettingsDialogProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Cargar credenciales actuales al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadCurrentCredentials();
    }
  }, [isOpen]);

  const loadCurrentCredentials = async () => {
    setIsLoading(true);
    try {
      const credentials = await getAdminCredentials();
      if (credentials) {
        setUsername(credentials.username);
        setPassword(credentials.password);
        toast({
          title: 'Credenciales cargadas',
          description: 'Se cargaron las credenciales configuradas.',
        });
      } else {
        // Credenciales por defecto
        setUsername('admin');
        setPassword('123whats123');
        toast({
          title: 'Credenciales por defecto',
          description: 'No hay credenciales configuradas. Mostrando valores por defecto.',
        });
      }
    } catch (error) {
      console.error('Error al cargar credenciales:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar las credenciales.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Usuario y contraseña son obligatorios.',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'La contraseña debe tener al menos 6 caracteres.',
      });
      return;
    }

    setIsSaving(true);

    try {
      const result = await saveAdminCredentials(username, password);
      
      if (result && result.success) {
        toast({
          title: '¡Éxito!',
          description: 'Las credenciales han sido actualizadas correctamente.',
        });
        setIsOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result?.message || 'No se pudieron guardar las credenciales.',
        });
      }
    } catch (error) {
      console.error('Error al guardar credenciales:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Ocurrió un error al guardar las credenciales.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configuración de Credenciales</DialogTitle>
          <DialogDescription>
            Cambia las credenciales de acceso al panel de administración. Estas se guardarán de forma segura.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="username">Usuario</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  autoComplete="username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  La contraseña debe tener al menos 6 caracteres.
                </p>
              </div>

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3 border border-amber-200 dark:border-amber-800">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  <strong>⚠️ Importante:</strong> Asegúrate de recordar estas credenciales. 
                  Si olvidas la contraseña o el usuario, necesitarás contactar al proveedor para recuperarla.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Credenciales
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
