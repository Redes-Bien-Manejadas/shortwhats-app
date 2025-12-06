'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { LogIn, Waves } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(username, password);
    if (!success) {
      toast({
        variant: 'destructive',
        title: 'Error de Inicio de Sesión',
        description: 'Usuario o contraseña inválidos.',
      });
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:6rem_4rem]"></div>
      <Card className="w-full max-w-sm shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <img src="/logowhatsapp.png" alt="WhatsApp Hardiness Logo" className="h-10 w-10" />
          </div>
          <CardTitle className="text-2xl font-bold">WhatsApp Hardiness</CardTitle>
          <CardDescription>¡Bienvenido de nuevo! Por favor, inicia sesión en tu cuenta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              <LogIn className="mr-2 h-4 w-4" />
              Iniciar Sesión
            </Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="text-center text-xs text-muted-foreground w-full">
            © {new Date().getFullYear()} Diversión con Seguridad. Todos los derechos reservados.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
