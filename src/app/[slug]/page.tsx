import { getLinkBySlug, incrementClicks } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { MicrolandingPage } from '@/components/microlanding/MicrolandingPage';

type Props = {
  params: Promise<{ slug: string }>;
};

// Revalidate every 60 seconds for ISR (Incremental Static Regeneration)
export const revalidate = 60;

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const link = await getLinkBySlug(slug);
  
  if (!link) return { title: 'Not Found' };
  
  return {
    title: link.microlandingConfig?.title || 'Contáctanos',
    description: link.microlandingConfig?.description || 'Escríbenos por WhatsApp',
  };
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }
  
  // Direct DB call (faster than going through API route)
  const link = await getLinkBySlug(slug);

  if (!link) {
    notFound();
  }

  // Increment clicks in background (non-blocking)
  incrementClicks(slug).catch(console.error);

  if (link.type === 'redirect') {
    redirect(`/redirect/${slug}`);
  }

  return <MicrolandingPage linkData={link} />;
}
