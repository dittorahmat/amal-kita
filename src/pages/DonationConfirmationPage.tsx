import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowLeft, CreditCard, QrCode, Copy, Info, DollarSign } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { Campaign } from '@shared/types';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRupiah } from '@/lib/utils';
import { Toaster, toast } from 'sonner';

// Indonesian bank information
const bankAccounts = [
  {
    id: 1,
    name: 'BCA',
    fullName: 'Bank Central Asia',
    number: '8765432109',
    holder: 'Yayasan Amal Kita',
    logo: 'https://zonalogo.com/wp-content/uploads/2024/06/Logo-Bank-Central-Asia-BCA-HD-PNG-SVG-WebP.webp'
  },
  {
    id: 2,
    name: 'Mandiri',
    fullName: 'Bank Mandiri',
    number: '1234567890',
    holder: 'Yayasan Amal Kita',
    logo: 'https://images.seeklogo.com/logo-png/1/1/bank-mandiri-logo-png_seeklogo-16290.png'
  },
  {
    id: 3,
    name: 'BSI',
    fullName: 'Bank Syariah Indonesia',
    number: '7654321098',
    holder: 'Yayasan Amal Kita',
    logo: 'https://iconlogovector.com/uploads/images/2023/11/lg-65571292f0011-bsi.png'
  }
];

export function DonationConfirmationPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [searchParams] = useSearchParams();
  const amount = Number(searchParams.get('amount')) || 0;
  const name = searchParams.get('name') || 'Hamba Allah';
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

  const handleCopyAccount = (accountNumber: string) => {
    navigator.clipboard.writeText(accountNumber);
    toast.success('Nomor rekening disalin!');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900/50">
      <Header />
      <main className="flex-grow py-12 md:py-16">
        <div className="container mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">
              Konfirmasi Donasi
            </h1>
            <p className="mt-2 text-muted-foreground">
              Silakan transfer donasi Anda ke rekening berikut
            </p>
          </div>

          <Card className="w-full shadow-xl rounded-2xl mb-8">
            <CardHeader className="items-center text-center space-y-4 pt-8">
              <div className="bg-blue-100 p-4 rounded-full">
                <Info className="h-12 w-12 text-blue-600" />
              </div>
              <CardTitle className="font-display text-2xl md:text-3xl">Lanjutkan Donasi</CardTitle>
              <p className="text-muted-foreground text-lg">
                Donasi akan diproses setelah transfer berhasil ke rekening berikut.
              </p>
            </CardHeader>
            <CardContent className="p-6 md:p-8">
              <div className="space-y-4 rounded-lg border bg-background p-6 mb-8">
                <h3 className="font-semibold text-center text-lg">Ringkasan Donasi</h3>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Jumlah Donasi</span>
                  <span className="font-bold text-lg text-brand-primary">{formatRupiah(amount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Nama Donatur</span>
                  <span className="font-semibold">{name}</span>
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

              <div className="space-y-6">
                <h3 className="font-semibold text-xl">Transfer ke Rekening</h3>
                
                <div className="space-y-4">
                  {bankAccounts.map((account) => (
                    <div key={account.id} className="border rounded-lg p-4 bg-card">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <img 
                            src={account.logo} 
                            alt={account.name} 
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div>
                            <h4 className="font-semibold">{account.name}</h4>
                            <p className="text-xs text-muted-foreground">{account.fullName}</p>
                            <p className="text-2xl font-bold text-brand-primary mt-1">{account.number}</p>
                            <p className="text-sm text-muted-foreground">{account.holder}</p>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCopyAccount(account.number)}
                        >
                          {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          <span className="ml-2">
                            {copied ? 'Tersalin' : 'Salin'}
                          </span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8">
                  <h3 className="font-semibold text-xl mb-4">Atau gunakan QRIS</h3>
                  <div className="flex flex-col items-center">
                    <div className="border rounded-xl p-4 bg-white shadow-sm">
                      {/* QRIS Code */}
                      <div className="bg-white p-4 rounded-lg">
                        <img 
                          src="https://gopay.co.id/api/_ipx/f_webp&w_660&q_90/https://d2v6npc8wmnkqk.cloudfront.net/storage/26035/conversions/Tipe-QRIS-statis-small-large.jpg" 
                          alt="QRIS Code" 
                          className="w-48 h-48 mx-auto object-contain"
                        />
                      </div>
                      <p className="mt-4 text-center text-sm text-muted-foreground">
                        Scan QRIS untuk donasi instan
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button asChild size="lg" variant="outline" className="flex-1 rounded-full">
                  <Link to={`/kampanye/${campaignId}`}>
                    <ArrowLeft className="mr-2 h-5 w-5" /> Kembali
                  </Link>
                </Button>
                <Button asChild size="lg" className="flex-1 rounded-full bg-green-600 hover:bg-green-700">
                  <Link to={`/donasi-berhasil/${campaignId}?amount=${amount}&name=${encodeURIComponent(name)}`}>
                    <CreditCard className="mr-2 h-5 w-5" /> Donasi Selesai
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
      <Toaster richColors closeButton />
    </div>
  );
}