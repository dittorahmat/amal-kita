import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ZakatCalculator } from '@/components/shared/ZakatCalculator';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
export function ZakatPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow">
        <section className="bg-gray-50 dark:bg-gray-900/50 py-16 md:py-24">
          <div className="container mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl md:text-6xl">
              Tunaikan <span className="text-brand-primary">Zakat</span>, Sucikan Harta
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg text-muted-foreground md:text-xl">
              Zakat adalah kewajiban bagi setiap Muslim yang mampu untuk membersihkan harta dan membantu sesama. Hitung dan tunaikan zakat Anda dengan mudah melalui AmalKita.
            </p>
          </div>
        </section>
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
              <div className="flex flex-col justify-center">
                <h2 className="font-display text-3xl font-bold md:text-4xl">Kalkulator Zakat Mal</h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Gunakan kalkulator di samping untuk menghitung Zakat Mal Anda dengan mudah. Cukup masukkan nilai harta yang Anda miliki selama satu tahun (haul).
                </p>
                <div className="mt-8 space-y-4 rounded-lg border bg-card p-6">
                  <h3 className="font-semibold text-xl">Apa itu Zakat Mal?</h3>
                  <p className="text-muted-foreground">
                    Zakat Mal adalah zakat atas harta yang dimiliki oleh seorang Muslim. Harta tersebut wajib dikeluarkan zakatnya jika telah mencapai batas minimum (nisab) dan telah dimiliki selama satu tahun (haul). Besarnya zakat adalah 2.5% dari total harta.
                  </p>
                </div>
              </div>
              <div>
                <ZakatCalculator />
              </div>
            </div>
          </div>
        </section>
        <section className="bg-gray-50 dark:bg-gray-900/50 py-16 md:py-24">
          <div className="container mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Siap Menunaikan Zakat?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Zakat Anda akan kami salurkan kepada mereka yang berhak menerima (asnaf) melalui program-program pemberdayaan yang terverifikasi dan berdampak.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="rounded-full bg-brand-accent px-8 py-6 text-lg font-semibold text-white shadow-md transition-all hover:bg-brand-accent/90 hover:shadow-lg active:scale-95">
                <Link to="/kampanye?kategori=Zakat">
                  Salurkan Zakat Sekarang <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}