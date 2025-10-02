import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
export function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow">
        <div className="bg-gray-50 dark:bg-gray-900/50 py-20">
          <div className="container mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl">
              Kebijakan Privasi
            </h1>
            <p className="mx-auto mt-4 text-lg text-muted-foreground">
              Terakhir diperbarui: 1 Agustus 2024
            </p>
          </div>
        </div>
        <div className="container mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none dark:prose-invert">
            <h2>1. Informasi yang Kami Kumpulkan</h2>
            <p>
              Kami mengumpulkan informasi yang Anda berikan secara langsung, seperti nama, alamat email, dan detail donasi. Kami juga dapat mengumpulkan informasi teknis secara otomatis, seperti alamat IP dan data browser, untuk meningkatkan layanan kami.
            </p>
            <h2>2. Bagaimana Kami Menggunakan Informasi Anda</h2>
            <p>
              Informasi Anda digunakan untuk memproses donasi, berkomunikasi dengan Anda mengenai transaksi, dan memberikan pembaruan tentang kampanye yang Anda dukung. Kami tidak akan menjual atau menyewakan informasi pribadi Anda kepada pihak ketiga.
            </p>
            <h2>3. Keamanan Data</h2>
            <p>
              Kami menerapkan langkah-langkah keamanan teknis dan organisasi yang wajar untuk melindungi informasi pribadi Anda dari akses, penggunaan, atau pengungkapan yang tidak sah. Namun, tidak ada metode transmisi melalui internet atau penyimpanan elektronik yang 100% aman.
            </p>
            <h2>4. Cookie</h2>
            <p>
              Platform kami menggunakan cookie untuk meningkatkan pengalaman pengguna. Cookie adalah file data kecil yang disimpan di perangkat Anda. Anda dapat menginstruksikan browser Anda untuk menolak semua cookie atau untuk menunjukkan kapan cookie sedang dikirim.
            </p>
            <h2>5. Hak Anda</h2>
            <p>
              Anda memiliki hak untuk mengakses, memperbaiki, atau menghapus informasi pribadi Anda yang kami simpan. Silakan hubungi kami jika Anda ingin menggunakan hak-hak ini.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}