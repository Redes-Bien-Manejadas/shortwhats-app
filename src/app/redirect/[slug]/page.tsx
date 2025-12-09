import { getLinkBySlug } from '@/lib/db';
import { notFound } from 'next/navigation';
import { RedirectPage } from '@/components/redirect/RedirectPage';

type Props = {
  params: Promise<{ slug: string }>;
};

// Revalidate every 60 seconds
export const revalidate = 60;

export default async function RedirectPageRoute({ params }: Props) {
  const { slug } = await params;

  // Direct DB call (faster than API route)
  const link = await getLinkBySlug(slug);
  
  if (!link) {
    notFound();
  }

  // Construir URL de WhatsApp
  const whatsappUrl = `https://wa.me/${link.phoneNumber}${link.message ? `?text=${encodeURIComponent(link.message)}` : ''}`;

  return (
    <RedirectPage 
      targetUrl={whatsappUrl}
      slug={slug}
      message={link.message}
      facebookPixel={link.facebookPixel}
    />
  );
}
