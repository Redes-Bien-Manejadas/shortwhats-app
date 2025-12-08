import { getLinkBySlug, updateLink } from '@/lib/api';
import { notFound, redirect } from 'next/navigation';
import { MicrolandingPage } from '@/components/microlanding/MicrolandingPage';

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function SlugPage({ params }: Props) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }
  
  const link = await getLinkBySlug(slug);

  if (!link) {
    notFound();
  }

    // Increment and update click count
  const newClicks = (link.clicks ?? 0) + 1;
  const updatedLink = { ...link, clicks: newClicks };

  // We don't want to wait for this to complete, just fire and forget
  updateLink(slug, updatedLink).catch(console.error);


  if (link.type === 'redirect') {
    // Redirect to intermediate page instead of direct WhatsApp
    redirect(`/redirect/${slug}`);
  }

  return <MicrolandingPage linkData={link} />;
}
