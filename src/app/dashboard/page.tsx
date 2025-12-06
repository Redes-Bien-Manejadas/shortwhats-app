import { getAllLinks } from '@/lib/api';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { LinkData } from '@/lib/types';

export default async function DashboardPage() {
  // Try to get initial data from server, but don't fail if it doesn't work
  let initialLinks: LinkData[] = [];
  
  try {
    console.log('🚀 DashboardPage: Attempting server-side data fetch...');
    initialLinks = await getAllLinks();
    console.log('✅ DashboardPage: Server-side fetch successful, got', initialLinks.length, 'links');
  } catch (error) {
    console.warn('⚠️ DashboardPage: Server-side fetch failed, will use client-side:', error);
    // Client will handle the data fetching
  }

  return <DashboardClient initialLinks={initialLinks} />;
}
