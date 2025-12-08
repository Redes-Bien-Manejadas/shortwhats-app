'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createLink, updateLink, uploadFile } from '@/lib/api';
import { LinkData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import { X, Image as ImageIcon, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface LinkDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  linkData: LinkData | null;
  onSaveChanges: (link: LinkData) => void;
  existingLinks: LinkData[];
}

const initialFormState: LinkData = {
  id: '',
  slug: '',
  phoneNumber: '',
  message: '',
  type: 'redirect',
  clicks: 0,
  tags: [],
  createdAt: '',
  microlandingConfig: {
    showLogo: true,
    showImage: true,
    showHeaderText: true,
    showSubheaderText: true,
    showFooterText: true,
    logoUrl: '',
    imageUrl: '',
    logoSize: 'large',
    logoGlassmorphism: false,
    logoGlassOpacity: 20,
    logoVerticalPosition: 0,
    headerText: 'Activos en este momento',
    subheaderText: 'Reclama tu Bono del 100%',
    title: 'Contáctanos',
    description: 'Escríbenos apretando el botón de abajo',
    descriptionBold: false,
    descriptionUnderline: false,
    footerText: 'Solo para mayores de 18 años',
    footerTextSize: 18,
    buttonText: 'WHATSAPP OFICIAL',
    buttonIcon: 'whatsapp',
    buttonBorderRadius: 25,
    colors: {
      primary: '#4CAF50',
      background: '#0A1628',
      text: '#FFFFFF',
      buttonBackground: '#25D366',
      buttonText: '#FFFFFF',
    },
  },
  facebookPixel: {
    pixelId: '',
    viewContentEvent: true,
    leadEvent: true,
    customEvents: [],
  },
};

export function LinkDialog({ isOpen, setIsOpen, linkData, onSaveChanges, existingLinks }: LinkDialogProps) {
  const [formData, setFormData] = useState<LinkData>(initialFormState);
  const [tagInput, setTagInput] = useState('');
  const [customEventInput, setCustomEventInput] = useState('');
  const [activeTab, setActiveTab] = useState('redirect');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState<'logo' | 'image' | null>(null);
  const [slugError, setSlugError] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (linkData) {
      setFormData(linkData);
      setActiveTab(linkData.type);
    } else {
      setFormData(initialFormState);
      setActiveTab('redirect');
    }
  }, [linkData, isOpen]);

  // Update formData.type when activeTab changes (only for redirect/microlanding tabs)
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'redirect' || tab === 'microlanding') {
      setFormData(prev => ({ ...prev, type: tab as 'redirect' | 'microlanding' }));
    }
  };

  const handleChange = (field: keyof LinkData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Validar slug solo cuando se está creando (no editando)
    if (field === 'slug' && !linkData) {
      const slugExists = existingLinks.some(
        (link) => link.slug.toLowerCase() === value.toLowerCase()
      );
      if (slugExists) {
        setSlugError('Este nombre visible ya existe. Por favor elige otro.');
      } else {
        setSlugError('');
      }
    }
  };

  const handleMicrolandingChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      microlandingConfig: { ...prev.microlandingConfig, [field]: value },
    }));
  };

  const handleColorChange = (field: string, value: string) => {
    setFormData(prev => ({
        ...prev,
        microlandingConfig: {
            ...prev.microlandingConfig,
            colors: {
                ...prev.microlandingConfig.colors,
                [field]: value
            }
        }
    }))
  }

  const handleFacebookPixelChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      facebookPixel: { ...prev.facebookPixel, [field]: value },
    }));
  };

  const handleCustomEventAdd = (event: string) => {
    if (event.trim() && !formData.facebookPixel.customEvents.includes(event.trim())) {
      handleFacebookPixelChange('customEvents', [...formData.facebookPixel.customEvents, event.trim()]);
    }
  };

  const handleCustomEventRemove = (eventToRemove: string) => {
    handleFacebookPixelChange('customEvents', formData.facebookPixel.customEvents.filter(event => event !== eventToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim() !== '') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (!formData.tags.includes(newTag)) {
        handleChange('tags', [...formData.tags, newTag]);
      }
      setTagInput('');
    }
  };

  const handleCustomEventKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customEventInput.trim() !== '') {
      e.preventDefault();
      handleCustomEventAdd(customEventInput);
      setCustomEventInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    handleChange('tags', formData.tags.filter((tag) => tag !== tagToRemove));
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'image') => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploading(type);
      const result = await uploadFile(file);
      setIsUploading(null);
      
      if(result.success && result.file?.path) {
          const field = type === 'logo' ? 'logoUrl' : 'imageUrl';
          handleMicrolandingChange(field, result.file.path);
          toast({ title: 'Éxito', description: `${type === 'logo' ? 'El logo' : 'La imagen'} se ha subido correctamente.` });
      } else {
          toast({ variant: 'destructive', title: 'Error', description: `Error al subir ${type === 'logo' ? 'el logo' : 'la imagen'}.` });
      }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    if(!formData.slug || !formData.phoneNumber) {
      toast({ variant: 'destructive', title: 'Error', description: 'El slug y el número de teléfono son obligatorios.' });
      setIsSaving(false);
      return;
    }

    // Validación adicional: no permitir crear si el slug ya existe
    if (!linkData && slugError) {
      toast({ variant: 'destructive', title: 'Error', description: slugError });
      setIsSaving(false);
      return;
    }

    let result;
    let finalData = { ...formData };

    if (linkData) { // Editing
      result = await updateLink(linkData.slug, finalData);
    } else { // Creating
      finalData = { ...finalData, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      result = await createLink(finalData);
    }

    setIsSaving(false);

    if (result.success) {
      toast({
        title: '¡Éxito!',
        description: `El link ha sido ${linkData ? 'actualizado' : 'creado'}.`,
      });
      onSaveChanges(finalData);
      setIsOpen(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Error al ${linkData ? 'actualizar' : 'crear'} el link. ${result.message || ''}`,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{linkData ? 'Editar Link' : 'Crear Nuevo Link'}</DialogTitle>
          <DialogDescription>
            {linkData ? 'Actualiza los detalles de tu link.' : 'Completa el formulario para crear un nuevo link de WhatsApp.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 pt-4">
            {/* Switch para tipo de link */}
            <div className="flex items-center space-x-2">
              <Switch
                id="link-type"
                checked={formData.type === 'microlanding'}
                onCheckedChange={(checked) => {
                  const newType = checked ? 'microlanding' : 'redirect';
                  handleChange('type', newType);
                  setActiveTab(newType);
                }}
              />
              <Label htmlFor="link-type">
                {formData.type === 'microlanding' ? 'Microlanding Activado' : 'Redirección Directa'}
              </Label>
            </div>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="redirect">Redirección</TabsTrigger>
                <TabsTrigger value="microlanding">Microlanding</TabsTrigger>
                <TabsTrigger value="facebook">Facebook Pixel</TabsTrigger>
              </TabsList>

              <TabsContent value="redirect" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="slug">Nombre Visible</Label>
                    <Input 
                      id="slug" 
                      value={formData.slug} 
                      onChange={(e) => handleChange('slug', e.target.value)} 
                      required 
                      className={slugError ? 'border-red-500' : ''}
                    />
                    {slugError && (
                      <p className="text-sm text-red-500">{slugError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Número de Teléfono</Label>
                    <Input id="phoneNumber" value={formData.phoneNumber} onChange={(e) => handleChange('phoneNumber', e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Mensaje Predefinido</Label>
                  <Textarea id="message" value={formData.message} onChange={(e) => handleChange('message', e.target.value)} />
                </div>
              </TabsContent>

              <TabsContent value="microlanding" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="slug-ml">Nombre Visible</Label>
                    <Input 
                      id="slug-ml" 
                      value={formData.slug} 
                      onChange={(e) => handleChange('slug', e.target.value)} 
                      required 
                      className={slugError ? 'border-red-500' : ''}
                    />
                    {slugError && (
                      <p className="text-sm text-red-500">{slugError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber-ml">Número de Teléfono</Label>
                    <Input id="phoneNumber-ml" value={formData.phoneNumber} onChange={(e) => handleChange('phoneNumber', e.target.value)} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message-ml">Mensaje Predefinido</Label>
                  <Textarea id="message-ml" value={formData.message} onChange={(e) => handleChange('message', e.target.value)} />
                </div>

                {/* Configuración de Microlanding */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold">Configuración de Microlanding</h3>
                  
                  {/* 1. Logo de la Empresa */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showLogo" className="font-medium">1. Logo de la Empresa</Label>
                      <Switch
                        id="showLogo"
                        checked={formData.microlandingConfig.showLogo}
                        onCheckedChange={(checked) => handleMicrolandingChange('showLogo', checked)}
                      />
                    </div>
                    {formData.microlandingConfig.showLogo && (
                      <div className="space-y-3 mt-2">
                        <div className="space-y-2">
                          <Label htmlFor="logoUrl">URL del Logo (PNG, SVG, etc.)</Label>
                          <Input
                            id="logoUrl"
                            type="url"
                            placeholder="https://ejemplo.com/logo.png"
                            value={formData.microlandingConfig.logoUrl}
                            onChange={(e) => handleMicrolandingChange('logoUrl', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="logoSize">Tamaño del Logo</Label>
                          <select
                            id="logoSize"
                            className="w-full h-10 px-3 border rounded-md"
                            value={formData.microlandingConfig.logoSize}
                            onChange={(e) => handleMicrolandingChange('logoSize', e.target.value)}
                          >
                            <option value="small">Pequeño (150px)</option>
                            <option value="medium">Mediano (220px)</option>
                            <option value="large">Grande (280px)</option>
                            <option value="xlarge">Extra Grande (350px)</option>
                            <option value="xxlarge">XXL (450px)</option>
                            <option value="xxxlarge">XXXL (550px)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="logoVerticalPosition">
                            Posición Vertical del Logo: {formData.microlandingConfig.logoVerticalPosition}px
                          </Label>
                          <input
                            id="logoVerticalPosition"
                            type="range"
                            min="-100"
                            max="100"
                            value={formData.microlandingConfig.logoVerticalPosition}
                            onChange={(e) => handleMicrolandingChange('logoVerticalPosition', parseInt(e.target.value))}
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground">
                            Mueve el logo hacia arriba (negativo) o abajo (positivo)
                          </p>
                        </div>

                        <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="logoGlassmorphism" className="text-sm">Efecto Glassmorfismo</Label>
                            <Switch
                              id="logoGlassmorphism"
                              checked={formData.microlandingConfig.logoGlassmorphism}
                              onCheckedChange={(checked) => handleMicrolandingChange('logoGlassmorphism', checked)}
                            />
                          </div>
                          {formData.microlandingConfig.logoGlassmorphism && (
                            <div className="space-y-2 mt-2">
                              <Label htmlFor="logoGlassOpacity" className="text-sm">
                                Opacidad del Vidrio: {formData.microlandingConfig.logoGlassOpacity}%
                              </Label>
                              <input
                                id="logoGlassOpacity"
                                type="range"
                                min="5"
                                max="50"
                                value={formData.microlandingConfig.logoGlassOpacity}
                                onChange={(e) => handleMicrolandingChange('logoGlassOpacity', parseInt(e.target.value))}
                                className="w-full"
                              />
                              <p className="text-xs text-muted-foreground">
                                Ajusta la transparencia del recuadro con efecto vidrio
                              </p>
                            </div>
                          )}
                        </div>

                        {formData.microlandingConfig.logoUrl && (
                          <div className="mt-2 p-3 bg-muted/30 rounded-lg">
                            <Label className="text-xs text-muted-foreground mb-2 block">Vista Previa:</Label>
                            <Image
                              src={formData.microlandingConfig.logoUrl}
                              alt="Logo preview"
                              width={80}
                              height={80}
                              className="rounded-lg object-contain mx-auto"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. Imagen Principal/Portada */}
                  <div className="space-y-2 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showImage" className="font-medium">2. Imagen Principal / Portada</Label>
                      <Switch
                        id="showImage"
                        checked={formData.microlandingConfig.showImage}
                        onCheckedChange={(checked) => handleMicrolandingChange('showImage', checked)}
                      />
                    </div>
                    {formData.microlandingConfig.showImage && (
                      <div className="space-y-2 mt-2">
                        <Label htmlFor="imageUrl">URL de la Imagen (PNG, JPG, SVG, etc.)</Label>
                        <Input
                          id="imageUrl"
                          type="url"
                          placeholder="https://ejemplo.com/imagen.jpg"
                          value={formData.microlandingConfig.imageUrl}
                          onChange={(e) => handleMicrolandingChange('imageUrl', e.target.value)}
                        />
                        {formData.microlandingConfig.imageUrl && (
                          <div className="mt-2">
                            <Image
                              src={formData.microlandingConfig.imageUrl}
                              alt="Image preview"
                              width={100}
                              height={60}
                              className="rounded-lg object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3. Texto Superior (Header) */}
                  <div className="space-y-2 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showHeaderText" className="font-medium">3. Texto Superior</Label>
                      <Switch
                        id="showHeaderText"
                        checked={formData.microlandingConfig.showHeaderText}
                        onCheckedChange={(checked) => handleMicrolandingChange('showHeaderText', checked)}
                      />
                    </div>
                    {formData.microlandingConfig.showHeaderText && (
                      <Input 
                        placeholder="Ej: Activos en este momento"
                        value={formData.microlandingConfig.headerText} 
                        onChange={(e) => handleMicrolandingChange('headerText', e.target.value)} 
                      />
                    )}
                  </div>

                  {/* 4. Texto Destacado (Subheader) */}
                  <div className="space-y-2 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showSubheaderText" className="font-medium">4. Texto Destacado / Oferta</Label>
                      <Switch
                        id="showSubheaderText"
                        checked={formData.microlandingConfig.showSubheaderText}
                        onCheckedChange={(checked) => handleMicrolandingChange('showSubheaderText', checked)}
                      />
                    </div>
                    {formData.microlandingConfig.showSubheaderText && (
                      <Input 
                        placeholder="Ej: Reclama tu Bono del 100%"
                        value={formData.microlandingConfig.subheaderText} 
                        onChange={(e) => handleMicrolandingChange('subheaderText', e.target.value)} 
                      />
                    )}
                  </div>

                  {/* 5. Descripción */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <Label htmlFor="description" className="font-medium">5. Descripción / Llamado a la Acción</Label>
                    <Textarea 
                      id="description" 
                      placeholder="Ej: Escríbenos apretando el botón de abajo"
                      value={formData.microlandingConfig.description} 
                      onChange={(e) => handleMicrolandingChange('description', e.target.value)} 
                    />
                    
                    <div className="flex items-center gap-4 pt-2">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="descriptionBold"
                          checked={formData.microlandingConfig.descriptionBold}
                          onCheckedChange={(checked) => handleMicrolandingChange('descriptionBold', checked)}
                        />
                        <Label htmlFor="descriptionBold" className="text-sm font-bold cursor-pointer">
                          Negrita
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="descriptionUnderline"
                          checked={formData.microlandingConfig.descriptionUnderline}
                          onCheckedChange={(checked) => handleMicrolandingChange('descriptionUnderline', checked)}
                        />
                        <Label htmlFor="descriptionUnderline" className="text-sm underline cursor-pointer">
                          Subrayado
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* 6. Configuración del Botón */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <Label className="font-medium">6. Botón de WhatsApp</Label>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="buttonText">Texto del Botón</Label>
                        <Input 
                          id="buttonText" 
                          placeholder="Ej: WHATSAPP OFICIAL"
                          value={formData.microlandingConfig.buttonText} 
                          onChange={(e) => handleMicrolandingChange('buttonText', e.target.value)} 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="buttonIcon">Icono del Botón</Label>
                        <select
                          id="buttonIcon"
                          className="w-full h-10 px-3 border rounded-md"
                          value={formData.microlandingConfig.buttonIcon}
                          onChange={(e) => handleMicrolandingChange('buttonIcon', e.target.value)}
                        >
                          <option value="whatsapp">WhatsApp</option>
                          <option value="phone">Teléfono</option>
                          <option value="message">Mensaje</option>
                          <option value="none">Sin icono</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="buttonBorderRadius">Borde Redondeado (px): {formData.microlandingConfig.buttonBorderRadius}</Label>
                      <input
                        id="buttonBorderRadius"
                        type="range"
                        min="0"
                        max="50"
                        value={formData.microlandingConfig.buttonBorderRadius}
                        onChange={(e) => handleMicrolandingChange('buttonBorderRadius', parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="buttonBackground">Color de Fondo</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="buttonBackground"
                            type="color"
                            value={formData.microlandingConfig.colors.buttonBackground}
                            onChange={(e) => handleColorChange('buttonBackground', e.target.value)}
                            className="w-12 h-8 p-1 border rounded"
                          />
                          <Input
                            value={formData.microlandingConfig.colors.buttonBackground}
                            onChange={(e) => handleColorChange('buttonBackground', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="buttonTextColor">Color de Texto</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="buttonTextColor"
                            type="color"
                            value={formData.microlandingConfig.colors.buttonText}
                            onChange={(e) => handleColorChange('buttonText', e.target.value)}
                            className="w-12 h-8 p-1 border rounded"
                          />
                          <Input
                            value={formData.microlandingConfig.colors.buttonText}
                            onChange={(e) => handleColorChange('buttonText', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 7. Texto Inferior (Footer) */}
                  <div className="space-y-3 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="showFooterText" className="font-medium">7. Texto Inferior / Disclaimer</Label>
                      <Switch
                        id="showFooterText"
                        checked={formData.microlandingConfig.showFooterText}
                        onCheckedChange={(checked) => handleMicrolandingChange('showFooterText', checked)}
                      />
                    </div>
                    {formData.microlandingConfig.showFooterText && (
                      <div className="space-y-3">
                        <Input 
                          placeholder="Ej: Solo para mayores de 18 años"
                          value={formData.microlandingConfig.footerText} 
                          onChange={(e) => handleMicrolandingChange('footerText', e.target.value)} 
                        />
                        
                        <div className="space-y-2">
                          <Label htmlFor="footerTextSize">
                            Tamaño del Texto: {formData.microlandingConfig.footerTextSize}px
                          </Label>
                          <input
                            id="footerTextSize"
                            type="range"
                            min="12"
                            max="32"
                            value={formData.microlandingConfig.footerTextSize}
                            onChange={(e) => handleMicrolandingChange('footerTextSize', parseInt(e.target.value))}
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground">
                            Ajusta el tamaño del texto del disclaimer
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Configuración de colores generales */}
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Colores Generales</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="backgroundColor">Color de Fondo</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="backgroundColor"
                            type="color"
                            value={formData.microlandingConfig.colors.background}
                            onChange={(e) => handleColorChange('background', e.target.value)}
                            className="w-12 h-8 p-1 border rounded"
                          />
                          <Input
                            value={formData.microlandingConfig.colors.background}
                            onChange={(e) => handleColorChange('background', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="textColor">Color de Texto</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="textColor"
                            type="color"
                            value={formData.microlandingConfig.colors.text}
                            onChange={(e) => handleColorChange('text', e.target.value)}
                            className="w-12 h-8 p-1 border rounded"
                          />
                          <Input
                            value={formData.microlandingConfig.colors.text}
                            onChange={(e) => handleColorChange('text', e.target.value)}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="facebook" className="space-y-4">
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold">Configuración de Facebook Pixel</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="pixelId">ID del Pixel de Facebook</Label>
                    <Input 
                      id="pixelId" 
                      placeholder="Ej: 123456789012345"
                      value={formData.facebookPixel.pixelId} 
                      onChange={(e) => handleFacebookPixelChange('pixelId', e.target.value)} 
                    />
                    <p className="text-sm text-muted-foreground">
                      Encuentra tu Pixel ID en el Administrador de Eventos de Facebook
                    </p>
                  </div>

                  {/* Eventos estándar ocultos - configurados por defecto */}
                  <div className="hidden">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="viewContent"
                        checked={formData.facebookPixel.viewContentEvent}
                        onCheckedChange={(checked) => handleFacebookPixelChange('viewContentEvent', checked)}
                      />
                      <Label htmlFor="viewContent">ViewContent - Se dispara al cargar la página</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="lead"
                        checked={formData.facebookPixel.leadEvent}
                        onCheckedChange={(checked) => handleFacebookPixelChange('leadEvent', checked)}
                      />
                      <Label htmlFor="lead">Lead - Se dispara al hacer clic en WhatsApp</Label>
                    </div>
                  </div>

                  {/* Eventos personalizados ocultos */}
                  <div className="hidden">
                    <h4 className="font-medium">Eventos Personalizados</h4>
                    <div className="space-y-2">
                      <Label htmlFor="customEvents">Agregar Evento Personalizado</Label>
                      <Input
                        id="customEvents"
                        placeholder="Ej: ContactButtonClick, WhatsAppRedirect"
                        value={customEventInput}
                        onChange={(e) => setCustomEventInput(e.target.value)}
                        onKeyDown={handleCustomEventKeyDown}
                      />
                      <p className="text-sm text-muted-foreground">
                        Presiona Enter para agregar. Usa nombres descriptivos sin espacios.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.facebookPixel.customEvents.map((event) => (
                        <Badge key={event} variant="outline" className="flex items-center gap-1">
                          {event}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => handleCustomEventRemove(event)} />
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Información sobre píxeles oculta */}
                  <div className="hidden bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h5 className="font-medium text-blue-900 mb-2">ℹ️ Información sobre los Píxeles</h5>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>ViewContent:</strong> Se ejecuta cuando alguien visita tu link</li>
                      <li>• <strong>Lead:</strong> Se ejecuta cuando hacen clic para ir a WhatsApp</li>
                      <li>• <strong>Eventos personalizados:</strong> Para métricas específicas de tu negocio</li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Tags (común para ambos tipos) */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="Presiona Enter para agregar un tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(tag)} />
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={isSaving || isUploading !== null || (!linkData && !!slugError)}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {linkData ? 'Guardar Cambios' : 'Crear Link'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
