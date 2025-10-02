import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
export function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow">
        <div className="bg-gray-50 dark:bg-gray-900/50 py-20">
          <div className="container mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl">
              Syarat & Ketentuan
            </h1>
            <p className="mx-auto mt-4 text-lg text-muted-foreground">
              Terakhir diperbarui: 1 Agustus 2024
            </p>
          </div>
        </div>
        <div className="container mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none dark:prose-invert">
            <h2>1. Penerimaan Ketentuan</h2>
            <p>
              Dengan mengakses dan menggunakan platform AmalKita ("Platform"), Anda setuju untuk terikat oleh Syarat dan Ketentuan ini. Jika Anda tidak setuju dengan bagian mana pun dari ketentuan ini, Anda tidak boleh menggunakan Platform.
            </p>
            <h2>2. Peran AmalKita</h2>
            <p>
              AmalKita adalah platform yang memfasilitasi pertemuan antara donatur ("Donatur") dan penyelenggara kampanye ("Penyelenggara"). Kami tidak bertanggung jawab atas pelaksanaan atau hasil dari kampanye yang didanai. Kami melakukan verifikasi awal, namun keberhasilan dan pertanggungjawaban kampanye sepenuhnya berada di tangan Penyelenggara.
            </p>
            <h2>3. Kewajiban Donatur</h2>
            <p>
              Sebagai Donatur, Anda setuju untuk memberikan informasi yang akurat saat melakukan donasi. Donasi yang telah dilakukan bersifat final dan tidak dapat dikembalikan, kecuali dalam kasus-kasus tertentu yang ditentukan oleh kebijakan AmalKita.
            </p>
            <h2>4. Penggunaan Dana</h2>
            <p>
              Penyelenggara kampanye berkomitmen untuk menggunakan dana yang terkumpul sesuai dengan tujuan yang dijelaskan dalam deskripsi kampanye. AmalKita berhak untuk melakukan audit dan meminta laporan penggunaan dana.
            </p>
            <h2>5. Perubahan Ketentuan</h2>
            <p>
              Kami dapat merevisi Syarat dan Ketentuan ini dari waktu ke waktu. Versi terbaru akan selalu diposting di halaman ini. Dengan terus menggunakan Platform setelah perubahan tersebut, Anda setuju untuk terikat oleh ketentuan yang telah direvisi.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}