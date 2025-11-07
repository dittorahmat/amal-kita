import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatRupiah } from '@/lib/utils';
import { api } from '@/lib/api-client';
import type { Campaign } from '@shared/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Eye, Edit, Trash2, LogOut } from 'lucide-react';
import { Toaster, toast } from 'sonner';

// Wrapper component to handle authentication
export function AdminDashboardPage() {
  const isAuthenticated = localStorage.getItem('admin-authenticated') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <AdminDashboardContent />;
}

function AdminDashboardContent() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const data = await api<Campaign[]>('/api/campaigns');
        setCampaigns(data);
      } catch (error) {
        console.error('Failed to fetch campaigns:', error);
        toast.error('Gagal memuat daftar kampanye');
      } finally {
        setLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  const deleteCampaign = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus kampanye ini? Data yang dihapus tidak dapat dipulihkan.')) {
      return;
    }

    try {
      await api(`/api/campaigns/${id}`, { method: 'DELETE' });
      setCampaigns(campaigns.filter(campaign => campaign.id !== id));
      toast.success('Kampanye berhasil dihapus!');
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      toast.error('Gagal menghapus kampanye. Silakan coba lagi.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin-authenticated');
    toast.success('Anda telah keluar dari akun admin.');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow py-12 md:py-16">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="font-display text-3xl font-bold text-gray-800 dark:text-gray-100">
                Dashboard Admin
              </h1>
              <p className="mt-2 text-muted-foreground">
                Kelola kampanye donasi dan donor
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLogout}
              className="flex items-center"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Keluar
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl">Total Kampanye</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-brand-primary">
                  {loading ? <Skeleton className="h-10 w-20" /> : campaigns.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl">Total Donasi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-brand-primary">
                  {loading ? <Skeleton className="h-10 w-24" /> : 
                    formatRupiah(campaigns.reduce((sum, camp) => sum + camp.currentAmount, 0))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl">Total Donatur</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-brand-primary">
                  {loading ? <Skeleton className="h-10 w-20" /> : 
                    campaigns.reduce((sum, camp) => sum + camp.donorCount, 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-xl">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="font-display text-2xl">Daftar Kampanye</CardTitle>
                  <CardDescription>
                    Kelola kampanye donasi yang sedang berjalan
                  </CardDescription>
                </div>
                <Button asChild size="sm" className="bg-brand-accent hover:bg-brand-accent/90">
                  <Link to="/admin/campaigns/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Buat Kampanye Baru
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="h-2 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nama Kampanye</TableHead>
                      <TableHead>Kategori</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Terkumpul</TableHead>
                      <TableHead>Donatur</TableHead>
                      <TableHead>Sisa Hari</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.length > 0 ? (
                      campaigns.map((campaign) => {
                        const progress = (campaign.currentAmount / campaign.targetAmount) * 100;
                        return (
                          <TableRow key={campaign.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-3">
                                <img 
                                  src={campaign.imageUrl} 
                                  alt={campaign.title} 
                                  className="w-10 h-10 rounded-md object-cover"
                                />
                                <span className="max-w-xs truncate">{campaign.title}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{campaign.category}</Badge>
                            </TableCell>
                            <TableCell>{formatRupiah(campaign.targetAmount)}</TableCell>
                            <TableCell>{formatRupiah(campaign.currentAmount)}</TableCell>
                            <TableCell>{campaign.donorCount}</TableCell>
                            <TableCell>{campaign.daysRemaining} hari</TableCell>
                            <TableCell>
                              <Badge variant={progress >= 100 ? "default" : "secondary"}>
                                {progress >= 100 ? "Selesai" : "Aktif"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" size="sm" asChild>
                                  <Link to={`/kampanye/${campaign.id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                  <Link to={`/admin/campaigns/create?id=${campaign.id}`}>
                                    <Edit className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => deleteCampaign(campaign.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Belum ada kampanye. Mulai buat kampanye pertama Anda!
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <p>Menampilkan {campaigns.length} kampanye</p>
            </CardFooter>
          </Card>
        </div>
      </main>
      <Footer />
      <Toaster richColors closeButton />
    </div>
  );
}