import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HandHeart, Target, Gem } from 'lucide-react';
export function AboutPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow">
        <section className="relative bg-gray-50 dark:bg-gray-900/50 py-20 md:py-28">
          <div className="container mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl md:text-6xl">
              Tentang <span className="text-brand-primary">AmalKita</span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg text-muted-foreground md:text-xl">
              Menghubungkan kebaikan, memberdayakan umat. Kami adalah jembatan digital bagi para dermawan untuk menyalurkan bantuan kepada mereka yang paling membutuhkan dengan cara yang amanah, transparan, dan mudah.
            </p>
          </div>
        </section>
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:gap-16">
              <div className="flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=2070&auto=format&fit=crop"
                  alt="Tim AmalKita"
                  className="rounded-2xl shadow-xl aspect-square object-cover"
                />
              </div>
              <div className="flex flex-col justify-center">
                <div className="space-y-8">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-primary text-white">
                        <HandHeart className="h-6 w-6" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Visi Kami</h3>
                      <p className="mt-2 text-lg text-muted-foreground">
                        Menjadi platform crowdfunding syariah terdepan dan terpercaya di Indonesia yang memberdayakan potensi filantropi Islam untuk menciptakan perubahan sosial yang berkelanjutan.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-6">
                    <div className="flex-shrink-0">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-primary text-white">
                        <Target className="h-6 w-6" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold">Misi Kami</h3>
                      <ul className="mt-2 list-disc space-y-2 pl-5 text-lg text-muted-foreground">
                        <li>Menyediakan platform yang mudah diakses, aman, dan transparan.</li>
                        <li>Menghadirkan kampanye-kampanye sosial yang terverifikasi dan berdampak.</li>
                        <li>Mengedukasi masyarakat tentang pentingnya zakat, infak, dan sedekah.</li>
                        <li>Membangun ekosistem kebaikan yang menghubungkan donatur, amil, dan penerima manfaat.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="bg-gray-50 dark:bg-gray-900/50 py-16 md:py-24">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold md:text-4xl">Nilai-Nilai Kami</h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Prinsip yang menjadi landasan kami dalam setiap langkah.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 text-center md:grid-cols-3">
              <div className="flex flex-col items-center p-6">
                <Gem className="h-10 w-10 text-brand-accent" />
                <h3 className="mt-4 text-xl font-bold">Amanah</h3>
                <p className="mt-2 text-muted-foreground">Menjaga setiap kepercayaan yang diberikan dengan penuh tanggung jawab.</p>
              </div>
              <div className="flex flex-col items-center p-6">
                <Gem className="h-10 w-10 text-brand-accent" />
                <h3 className="mt-4 text-xl font-bold">Transparan</h3>
                <p className="mt-2 text-muted-foreground">Memberikan laporan yang jelas dan terbuka mengenai penyaluran dana.</p>
              </div>
              <div className="flex flex-col items-center p-6">
                <Gem className="h-10 w-10 text-brand-accent" />
                <h3 className="mt-4 text-xl font-bold">Inovatif</h3>
                <p className="mt-2 text-muted-foreground">Terus berinovasi menggunakan teknologi untuk memaksimalkan dampak kebaikan.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}