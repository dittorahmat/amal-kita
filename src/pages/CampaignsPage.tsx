import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CampaignCard } from '@/components/shared/CampaignCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { Campaign } from '@shared/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
const categories = ['Semua', 'Pendidikan', 'Kemanusiaan', 'Kesehatan', 'Infrastruktur', 'Lainnya'];
export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('terbaru');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('kategori') || 'Semua';
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const data = await api<Campaign[]>('/api/campaigns');
        setCampaigns(data);
      } catch (error) {
        console.error("Failed to fetch campaigns:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, []);
  const filteredCampaigns = useMemo(() => {
    const filtered = campaigns.filter(campaign => {
      const matchesCategory = activeCategory === 'Semua' || campaign.category === activeCategory;
      const matchesSearch = campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            campaign.organizer.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    switch (sortOption) {
      case 'mendesak':
        return filtered.sort((a, b) => (a.daysRemaining || Infinity) - (b.daysRemaining || Infinity));
      case 'populer':
        return filtered.sort((a, b) => (b.donorCount || 0) - (a.donorCount || 0));
      case 'terbaru':
      default:
        return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  }, [campaigns, activeCategory, searchTerm, sortOption]);
  const handleCategoryChange = (category: string) => {
    setSearchParams(category === 'Semua' ? {} : { kategori: category });
  };
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow">
        <section className="bg-gray-50 dark:bg-gray-900/50 py-12 md:py-20">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-center font-display text-4xl font-bold md:text-5xl">
              Semua Kampanye Kebaikan
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-muted-foreground">
              Temukan dan dukung kampanye yang menggerakkan hati Anda. Setiap donasi membawa perubahan.
            </p>
          </div>
        </section>
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="Cari kampanye..." 
                  className="pl-10" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium hidden sm:block">Urutkan:</span>
                <Select value={sortOption} onValueChange={setSortOption}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Pilih urutan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="terbaru">Terbaru</SelectItem>
                    <SelectItem value="mendesak">Paling Mendesak</SelectItem>
                    <SelectItem value="populer">Paling Populer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mb-10">
              <Tabs value={activeCategory} onValueChange={handleCategoryChange}>
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
                  {categories.map(cat => (
                    <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 md:gap-8">
              {loading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="flex flex-col space-y-3">
                      <Skeleton className="h-[192px] w-full rounded-xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                      </div>
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))
                : filteredCampaigns.map((campaign) => (
                    <CampaignCard key={campaign.id} campaign={campaign} />
                  ))}
            </div>
            {!loading && filteredCampaigns.length === 0 && (
              <div className="text-center col-span-full py-16">
                <p className="text-xl font-semibold">Kampanye tidak ditemukan</p>
                <p className="text-muted-foreground mt-2">Coba ubah kata kunci pencarian atau filter kategori Anda.</p>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}