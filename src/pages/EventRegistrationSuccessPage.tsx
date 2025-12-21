import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowLeft, Share2, Calendar } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { Event } from '@shared/types';
import { Skeleton } from '@/components/ui/skeleton';

export function EventRegistrationSuccessPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const name = searchParams.get('name') || 'Hamba Allah';
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      try {
        setLoading(true);
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch event: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        setEvent(result.data);
      } catch (error) {
        console.error("Failed to fetch event details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900/50">
      <Header />
      <main className="flex-grow flex items-center justify-center py-12 md:py-24">
        <div className="container mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <Card className="w-full shadow-xl rounded-2xl animate-scale-in">
            <CardHeader className="items-center text-center space-y-4 pt-8">
              <CheckCircle className="h-20 w-20 text-green-500" />
              <CardTitle className="font-display text-3xl md:text-4xl">Pendaftaran Berhasil!</CardTitle>
              <p className="text-muted-foreground text-lg">
                Terima kasih, {name}. Pendaftaran Anda telah kami terima.
              </p>
            </CardHeader>
            <CardContent className="p-6 md:p-8">
              <div className="space-y-4 rounded-lg border bg-background p-6">
                <h3 className="font-semibold text-center">Detail Pendaftaran</h3>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Nama</span>
                  <span className="font-bold text-lg">{name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Acara</span>
                  {loading ? (
                    <Skeleton className="h-5 w-48" />
                  ) : (
                    <span className="font-semibold text-right">{event?.title}</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tanggal</span>
                  {loading ? (
                    <Skeleton className="h-5 w-32" />
                  ) : (
                    <span className="font-semibold">
                      {event ? new Date(event.date).toLocaleDateString('id-ID', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      }) : '-'}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-semibold text-green-600">Terdaftar</span>
                </div>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="flex-1 rounded-full">
                  <Link to="/event">
                    <ArrowLeft className="mr-2 h-5 w-5" /> Lihat Acara Lain
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="flex-1 rounded-full">
                  <Link to={`/event/${eventId}`}>
                    <Calendar className="mr-2 h-5 w-5" /> Lihat Detail Acara
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}