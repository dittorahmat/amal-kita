import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowLeft, Share2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { Campaign } from '@shared/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRupiah } from '@/lib/utils';
export function DonationSuccessPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [searchParams] = useSearchParams();
  const amount = Number(searchParams.get('amount')) || 0;
  const name = searchParams.get('name') || 'Hamba Allah';
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchCampaign = async () => {
      if (!campaignId) return;
      try {
        setLoading(true);
        const data = await api<Campaign>(`/api/campaigns/${campaignId}`);
        setCampaign(data);
      } catch (error) {
        console.error("Failed to fetch campaign details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaign();
  }, [campaignId]);
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900/50">
      <Header />
      <main className="flex-grow flex items-center justify-center py-12 md:py-24">
        <div className="container mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <Card className="w-full shadow-xl rounded-2xl animate-scale-in">
            <CardHeader className="items-center text-center space-y-4 pt-8">
              <CheckCircle className="h-20 w-20 text-green-500" />
              <CardTitle className="font-display text-3xl md:text-4xl">Donasi Berhasil!</CardTitle>
              <p className="text-muted-foreground text-lg">
                Jazakallah Khairan Katsiran, {name}. Semoga Allah membalas kebaikan Anda dengan berlipat ganda.
              </p>
            </CardHeader>
            <CardContent className="p-6 md:p-8">
              <div className="space-y-4 rounded-lg border bg-background p-6">
                <h3 className="font-semibold text-center">Ringkasan Donasi</h3>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Jumlah Donasi</span>
                  <span className="font-bold text-lg text-brand-primary">{formatRupiah(amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Untuk Kampanye</span>
                  {loading ? (
                    <Skeleton className="h-5 w-48" />
                  ) : (
                    <span className="font-semibold text-right">{campaign?.title}</span>
                  )}
                </div>
              </div>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" className="flex-1 rounded-full">
                  <Link to="/kampanye">
                    <ArrowLeft className="mr-2 h-5 w-5" /> Kembali ke Kampanye
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="flex-1 rounded-full" onClick={() => navigator.clipboard.writeText(window.location.href)}>
                  <Share2 className="mr-2 h-5 w-5" /> Ajak Teman Berdonasi
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