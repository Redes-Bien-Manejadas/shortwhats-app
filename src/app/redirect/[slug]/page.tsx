import { getLinkBySlug } from '@/lib/api';
import { notFound } from 'next/navigation';
import { RedirectPage } from '@/components/redirect/RedirectPage';

type Props = {
  params: { slug: string };
};

export default async function RedirectPageRoute({ params }: Props) {
  const { slug } = params;

  try {
    const link = await getLinkBySlug(slug);
    
    if (!link) {
      notFound();
    }

    // Construir URL de WhatsApp
    const whatsappUrl = `https://wa.me/${link.phoneNumber}${link.message ? `?text=${encodeURIComponent(link.message)}` : ''}`;

    return (
      <RedirectPage 
        targetUrl={whatsappUrl}
        message={link.message}
        facebookPixel={link.facebookPixel}
      />
    );
  } catch (error) {
    console.error('Error loading link:', error);
    notFound();
  }
}
