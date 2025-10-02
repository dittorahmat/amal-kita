import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Target, Users, Heart } from 'lucide-react';
import { api } from '@/lib/api-client';
import { formatRupiah } from '@/lib/utils';
import type { Campaign } from '@shared/types';
import { Skeleton } from '@/components/ui/skeleton';
import { DonationModal } from '@/components/shared/DonationModal';
import { Toaster, toast } from 'sonner';
export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const fetchCampaign = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await api<Campaign>(`/api/campaigns/${id}`);
      setCampaign(data);
    } catch (error) {
      console.error("Failed to fetch campaign details:", error);
      toast.error("Gagal memuat detail kampanye.");
      setCampaign(null);
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);
  const handleDonationSuccess = () => {
    setIsDonationModalOpen(false);
    // No longer need to refetch here, navigation is handled by the modal
  };
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="container mx-auto max-w-5xl flex-grow px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            <div>
              <Skeleton className="aspect-video w-full rounded-2xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-12 w-full rounded-full" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }
  if (!campaign) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-grow flex-col items-center justify-center text-center">
          <h2 className="text-2xl font-bold">Kampanye tidak ditemukan</h2>
          <p className="mt-2 text-muted-foreground">Kampanye yang Anda cari mungkin sudah berakhir atau tidak ada.</p>
        </main>
        <Footer />
      </div>
    );
  }
  const progress = (campaign.currentAmount / campaign.targetAmount) * 100;
  return (
    <>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-grow py-12 md:py-16">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5 lg:gap-12">
              {/* Left Column */}
              <div className="lg:col-span-3">
                <img src={campaign.imageUrl} alt={campaign.title} className="mb-6 w-full rounded-2xl object-cover shadow-lg" />
                <h2 className="mb-4 text-2xl font-bold text-gray-800 dark:text-gray-100">Cerita Penggalangan Dana</h2>
                <div className="prose prose-lg max-w-none text-muted-foreground dark:prose-invert">
                  <p>{campaign.story}</p>
                </div>
              </div>
              {/* Right Column */}
              <div className="lg:col-span-2">
                <div className="sticky top-28 space-y-6 rounded-2xl border bg-card p-6 shadow-sm">
                  <Badge className="bg-brand-primary text-white">{campaign.category}</Badge>
                  <h1 className="font-display text-3xl font-bold">{campaign.title}</h1>
                  <p className="text-base text-muted-foreground">Diselenggarakan oleh <span className="font-semibold text-foreground">{campaign.organizer}</span></p>
                  <Progress value={progress} className="h-3" />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-brand-primary">{formatRupiah(campaign.currentAmount)}</span>
                      <span className="text-sm text-muted-foreground">terkumpul dari {formatRupiah(campaign.targetAmount)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <Users className="mx-auto mb-1 h-6 w-6 text-muted-foreground" />
                        <p className="text-lg font-bold">{campaign.donorCount}</p>
                        <p className="text-xs text-muted-foreground">Donatur</p>
                      </div>
                      <div>
                        <Target className="mx-auto mb-1 h-6 w-6 text-muted-foreground" />
                        <p className="text-lg font-bold">{Math.round(progress)}%</p>
                        <p className="text-xs text-muted-foreground">Tercapai</p>
                      </div>
                      <div>
                        <Clock className="mx-auto mb-1 h-6 w-6 text-muted-foreground" />
                        <p className="text-lg font-bold">{campaign.daysRemaining}</p>
                        <p className="text-xs text-muted-foreground">Hari Lagi</p>
                      </div>
                    </div>
                  </div>
                  <Button onClick={() => setIsDonationModalOpen(true)} size="lg" className="w-full rounded-full bg-brand-accent py-6 text-lg font-bold text-white shadow-md transition-all hover:bg-brand-accent/90 hover:shadow-lg active:scale-95">
                    <Heart className="mr-2 h-5 w-5" /> Donasi Sekarang
                  </Button>
                  <Separator />
                  <h3 className="font-bold">Donatur Terbaru</h3>
                  <div className="max-h-60 space-y-4 overflow-y-auto">
                    {campaign.donors.length > 0 ? campaign.donors.map(donor => (
                      <div key={donor.id} className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={`https://api.dicebear.com/8.x/initials/svg?seed=${donor.name}`} />
                          <AvatarFallback>{donor.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{donor.name}</p>
                          <p className="text-sm text-muted-foreground">Donasi sebesar <span className="font-bold text-brand-primary">{formatRupiah(donor.amount)}</span></p>
                        </div>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">Jadilah donatur pertama!</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
      <DonationModal
        campaignId={campaign.id}
        campaignTitle={campaign.title}
        open={isDonationModalOpen}
        onOpenChange={setIsDonationModalOpen}
        onSuccess={handleDonationSuccess}
      />
      <Toaster richColors closeButton />
    </>
  );
}