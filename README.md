# AmalKita: Platform Crowdfunding Syariah

AmalKita adalah sebuah platform crowdfunding syariah modern yang dirancang untuk memfasilitasi dan menyalurkan donasi, zakat, infak, dan sedekah bagi komunitas Muslim di Indonesia. Aplikasi ini bertujuan untuk menghubungkan para donatur dengan berbagai kampanye sosial, kemanusiaan, dan keagamaan yang terverifikasi, dengan mengedepankan prinsip transparansi, kemudahan, dan kepercayaan.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dittorahmat/amal-kita)

## ✨ Fitur Utama

- **Platform Terpadu:** Fasilitasi donasi untuk Zakat, Infak, Sedekah, dan kampanye sosial lainnya dalam satu tempat.
- **Transparansi Real-Time:** Lihat progres penggalangan dana secara langsung untuk setiap kampanye.
- **Antarmuka Modern:** Desain yang bersih, modern, dan intuitif untuk pengalaman pengguna yang menyenangkan.
- **Terverifikasi & Terpercaya:** Menghubungkan donatur dengan kampanye-kampanye yang telah terverifikasi.
- **Fokus Komunitas:** Dibuat khusus untuk komunitas Muslim di Indonesia dengan lokalisasi bahasa dan mata uang Rupiah.
- **Desain Responsif:** Pengalaman pengguna yang mulus di semua perangkat, dari desktop hingga mobile.
- **Manajemen Kampanye & Acara:** Pembuatan, pengeditan, dan pengelolaan kampanye donasi dan acara dengan dukungan upload gambar.
- **Upload Gambar Cerdas:** Dukungan upload gambar dengan penyimpanan utama di R2 dan fallback ke Cloudinary.
- **Integrasi ERP:** Integrasi otomatis dengan sistem Odoo untuk pembuatan invoice donasi.
- **Manajemen Admin:** Dashboard admin komprehensif untuk pengelolaan kampanye dan acara.

## 🚀 Tumpukan Teknologi

- **Frontend:** React, Vite, React Router, TypeScript
- **Backend:** Cloudflare Workers, Hono
- **Penyimpanan:** Cloudflare Durable Objects, R2 untuk penyimpanan gambar (utama), Cloudinary sebagai fallback
- **UI & Styling:** Tailwind CSS, Shadcn/UI, Framer Motion
- **Ikon:** Lucide React
- **Manajemen State:** Zustand
- **Validasi:** Zod
- **Integrasi ERP:** Odoo XML-RPC API

## 🛠️ Memulai

Untuk menjalankan proyek ini secara lokal, ikuti langkah-langkah berikut.

### Prasyarat

- [Bun](https://bun.sh/) terinstal di mesin Anda.
- Akun Cloudflare dan [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) terinstal dan terkonfigurasi.

### Instalasi

1.  **Kloning repositori:**
    ```bash
    git clone <URL_REPOSITORI_ANDA>
    cd amalkita_crowdfunding
    ```

2.  **Instal dependensi:**
    Proyek ini menggunakan `bun` sebagai package manager.
    ```bash
    bun install
    ```

## 💻 Pengembangan

Untuk memulai server pengembangan lokal, yang akan menjalankan frontend Vite dan backend Worker secara bersamaan:

```bash
bun run dev
```

Aplikasi akan tersedia di `http://localhost:3000` (atau port lain yang tersedia).

### Struktur Proyek

-   `src/`: Berisi semua kode sumber frontend React, termasuk halaman, komponen, dan hooks.
-   `worker/`: Berisi kode backend Cloudflare Worker yang dibangun dengan Hono, termasuk rute API dan logika Durable Object.
-   `shared/`: Berisi tipe TypeScript yang dibagikan antara frontend dan backend untuk memastikan konsistensi data.

## ☁️ Deployment

Proyek ini dirancang untuk di-deploy dengan mudah ke platform Cloudflare.

1.  **Build proyek:**
    Perintah ini akan membangun aplikasi frontend dan mempersiapkan worker untuk produksi.
    ```bash
    bun run build
    ```

2.  **Deploy ke Cloudflare:**
    Gunakan Wrangler CLI untuk mempublikasikan aplikasi Anda.
    ```bash
    bun run deploy
    ```

Atau, deploy langsung dari repositori GitHub Anda dengan satu klik.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dittorahmat/amal-kita)