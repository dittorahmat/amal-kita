import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { CampaignCard } from '@/components/shared/CampaignCard';
import { EventCard } from '@/components/shared/EventCard';
import { ArrowRight, HeartHandshake, ShieldCheck, TrendingUp, Calendar } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { Campaign, Event } from '@shared/types';
import { Skeleton } from '@/components/ui/skeleton';
export function HomePage() {
  const [featuredCampaigns, setFeaturedCampaigns] = useState<Campaign[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoadingCampaigns(true);
        const data = await api<Campaign[]>('/api/campaigns');
        setFeaturedCampaigns(data.slice(0, 3));
      } catch (error) {
        console.error("Failed to fetch campaigns:", error);
      } finally {
        setLoadingCampaigns(false);
      }
    };

    const fetchEvents = async () => {
      try {
        setLoadingEvents(true);
        const data = await api<Event[]>('/api/events');
        // Check if data is valid before processing
        if (data && Array.isArray(data)) {
          // Filter to only active events and sort by date (closest first)
          const activeEvents = data
            .filter(event => event.status === 'active')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 3);
          setFeaturedEvents(activeEvents);
        } else {
          setFeaturedEvents([]);
        }
      } catch (error) {
        console.error("Failed to fetch events:", error);
        setFeaturedEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchCampaigns();
    fetchEvents();
  }, []);
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative bg-gray-50 dark:bg-gray-900/50">
          <div className="container mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
            <div className="text-center">
              <h1 className="font-display text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl md:text-6xl">
                <span className="block">Satu Kebaikan,</span>
                <span className="block text-brand-primary">Sejuta Harapan</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
                Salurkan donasi, zakat, dan sedekah Anda melalui platform yang amanah dan transparan untuk membantu mereka yang membutuhkan.
              </p>
              <div className="mt-10 flex justify-center gap-4">
                <Button asChild size="lg" className="rounded-full bg-brand-accent px-8 py-6 text-lg font-semibold text-white shadow-md transition-all hover:bg-brand-accent/90 hover:shadow-lg active:scale-95">
                  <Link to="/kampanye">Mulai Donasi</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full px-8 py-6 text-lg font-semibold">
                  <Link to="/zakat">Hitung Zakat</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        {/* Featured Campaigns Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold md:text-4xl">Kampanye Pilihan</h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Bantu program mendesak yang membutuhkan uluran tangan Anda segera.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 md:gap-8">
              {loadingCampaigns
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex flex-col space-y-3">
                      <Skeleton className="h-[192px] w-full rounded-xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                      </div>
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))
                : featuredCampaigns.map((campaign) => (
                    <CampaignCard key={campaign.id} campaign={campaign} />
                  ))}
            </div>
            <div className="mt-12 text-center">
              <Button asChild variant="link" className="text-lg text-brand-primary">
                <Link to="/kampanye">
                  Lihat Semua Kampanye <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Featured Events Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold md:text-4xl">Acara Terbaru</h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Ikuti acara-acara menarik yang sesuai dengan minat dan nilai Anda.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 md:gap-8">
              {loadingEvents
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex flex-col space-y-3">
                      <Skeleton className="h-[192px] w-full rounded-xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                      </div>
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))
                : featuredEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
            </div>
            <div className="mt-12 text-center">
              <Button asChild variant="link" className="text-lg text-brand-primary">
                <Link to="/event">
                  Lihat Semua Acara <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="bg-gray-50 dark:bg-gray-900/50 py-16 md:py-24">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold md:text-4xl">Mengapa Berdonasi di AmalKita?</h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Kami berkomitmen untuk memberikan pengalaman berdonasi yang terbaik.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 text-center md:grid-cols-3">
              <div className="flex flex-col items-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-accent/20 text-brand-accent">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold">Aman & Terpercaya</h3>
                <p className="mt-2 text-muted-foreground">Setiap kampanye telah melalui proses verifikasi yang ketat untuk memastikan donasi Anda sampai kepada yang berhak.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-primary/20 text-brand-primary">
                  <HeartHandshake className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold">Mudah & Cepat</h3>
                <p className="mt-2 text-muted-foreground">Proses donasi yang simpel dan didukung berbagai metode pembayaran untuk kemudahan Anda dalam berbuat baik.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <TrendingUp className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold">Transparan & Real-time</h3>
                <p className="mt-2 text-muted-foreground">Pantau perkembangan setiap kampanye dan lihat dampak dari kebaikan yang Anda salurkan secara langsung.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}