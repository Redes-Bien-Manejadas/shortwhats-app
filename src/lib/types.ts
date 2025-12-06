export interface MicrolandingConfig {
  // Elementos activables
  showLogo: boolean;
  showImage: boolean;
  showHeaderText: boolean;
  showSubheaderText: boolean;
  showFooterText: boolean;
  
  // URLs de medios
  logoUrl: string;
  imageUrl: string;
  
  // Configuración del logo
  logoSize: 'small' | 'medium' | 'large' | 'xlarge' | 'xxlarge' | 'xxxlarge';
  logoGlassmorphism: boolean;
  logoGlassOpacity: number; // 0-100
  logoVerticalPosition: number; // en px, para mover verticalmente
  
  // Textos personalizables
  headerText: string;        // Ej: "Activos en este momento"
  subheaderText: string;     // Ej: "Reclama tu Bono del X %"
  title: string;             // Título principal (se mantiene para compatibilidad)
  description: string;       // Descripción (se mantiene para compatibilidad)
  descriptionBold: boolean;  // Negrita en descripción
  descriptionUnderline: boolean; // Subrayado en descripción
  footerText: string;        // Ej: "Solo para mayores de 18 años"
  footerTextSize: number;    // Tamaño del texto footer en px
  
  // Configuración del botón
  buttonText: string;
  buttonIcon: 'whatsapp' | 'phone' | 'message' | 'none';
  buttonBorderRadius: number; // en px
  
  // Colores
  colors: {
    primary: string;
    background: string;
    text: string;
    buttonBackground: string;
    buttonText: string;
  };
}

export interface FacebookPixelConfig {
  pixelId: string;
  viewContentEvent: boolean;
  leadEvent: boolean;
  customEvents: string[];
}

export interface LinkData {
  id: string;
  slug: string;
  phoneNumber: string;
  message: string;
  type: 'redirect' | 'microlanding';
  clicks: number;
  tags: string[];
  microlandingConfig: MicrolandingConfig;
  facebookPixel: FacebookPixelConfig;
  createdAt: string;
}

export interface ApiAllResponse {
  success: boolean;
  data: LinkData[];
}

export interface ApiWebResponse {
  success: boolean;
  data: LinkData;
}
