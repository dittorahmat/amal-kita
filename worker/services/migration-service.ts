/**
 * Migration service to move test data from mock file to database
 */
import { CampaignEntity } from '../entities';
import type { Env } from '../core-utils';
import type { Campaign } from '@shared/types';

// This is the mock data that we'll migrate
const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 'bantu-sekolah-pedalaman',
    title: 'Bantu Renovasi Sekolah di Pedalaman Papua',
    description: 'Salurkan bantuan untuk merenovasi gedung sekolah yang hampir rubuh di desa terpencil.',
    organizer: 'Yayasan Pendidikan Nusantara',
    imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070&auto=format&fit=crop',
    targetAmount: 150000000,
    currentAmount: 85500000,
    donorCount: 1234,
    daysRemaining: 25,
    category: 'Pendidikan',
    story: 'Sekolah Dasar di Desa Ciptagelar, pedalaman Papua, berada dalam kondisi yang sangat memprihatinkan. Atap bocor, dinding rapuh, dan fasilitas yang tidak memadai mengancam keselitan dan semangat belajar anak-anak. Dana ini akan digunakan untuk merenovasi total gedung sekolah, membeli perabotan baru, dan menyediakan buku-buku layak baca.',
    createdAt: Date.now() - 5 * 86400000, // 5 days ago
    donors: [
      { id: 'd1', name: 'Hamba Allah', amount: 200000, message: 'Semoga berkah.', timestamp: Date.now() - 86400000 },
      { id: 'd2', name: 'Ahmad S.', amount: 150000, timestamp: Date.now() - 172800000 },
      { id: 'd3', name: 'Fatimah', amount: 500000, message: 'Untuk anak-anak Indonesia.', timestamp: Date.now() - 259200000 },
    ],
  },
  {
    id: 'air-bersih-ntt',
    title: 'Air Bersih untuk Warga Desa di NTT',
    description: 'Bantu warga mendapatkan akses air bersih dengan membangun sumur bor dan instalasi pipa.',
    organizer: 'Rumah Zakat',
    imageUrl: 'https://images.unsplash.com/photo-1558236242-95835e07a384?q=80&w=2070&auto=format&fit=crop',
    targetAmount: 80000000,
    currentAmount: 75200000,
    donorCount: 987,
    daysRemaining: 10,
    category: 'Kemanusiaan',
    story: 'Kekeringan panjang membuat warga Desa Oebelo di Nusa Tenggara Timur kesulitan mendapatkan air bersih. Mereka harus berjalan berkilo-kilometer setiap hari untuk mendapatkan air. Donasi Anda akan sangat berarti untuk membangun sumur bor yang akan menjadi sumber kehidupan bagi ratusan keluarga di desa ini.',
    createdAt: Date.now() - 10 * 86400000, // 10 days ago
    donors: [
      { id: 'd4', name: 'Hamba Allah', amount: 100000, timestamp: Date.now() - 86400000 },
      { id: 'd5', name: 'Siti Aisyah', amount: 250000, message: 'Semoga bermanfaat.', timestamp: Date.now() - 172800000 },
    ],
  },
  {
    id: 'beasiswa-yatim-dhuafa',
    title: 'Beasiswa Pendidikan untuk Anak Yatim & Dhuafa',
    description: 'Pastikan mereka tetap bisa sekolah dan meraih cita-cita. Donasi Anda adalah harapan mereka.',
    organizer: 'Rumah Yatim',
    imageUrl: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=2070&auto=format&fit=crop',
    targetAmount: 250000000,
    currentAmount: 112500000,
    donorCount: 2540,
    daysRemaining: 45,
    category: 'Pendidikan',
    story: 'Banyak anak yatim dan dhuafa yang cerdas terpaksa putus sekolah karena keterbatasan biaya. Program ini bertujuan untuk memberikan beasiswa penuh yang mencakup biaya sekolah, seragam, buku, dan uang saku. Mari bersama kita wujudkan mimpi mereka dan putus rantai kemiskinan melalui pendidikan.',
    createdAt: Date.now() - 15 * 86400000, // 15 days ago
    donors: [],
  },
  {
    id: 'bantuan-medis-gaza',
    title: 'Bantuan Medis Darurat untuk Korban di Gaza',
    description: 'Kirimkan bantuan obat-obatan dan peralatan medis untuk rumah sakit yang membutuhkan.',
    organizer: 'Medical Emergency Rescue Committee',
    imageUrl: 'https://images.unsplash.com/photo-1608326223655-82a17a3f7a24?q=80&w=1926&auto=format&fit=crop',
    targetAmount: 500000000,
    currentAmount: 450750000,
    donorCount: 8750,
    daysRemaining: 7,
    category: 'Kesehatan',
    story: 'Situasi di Gaza sangat kritis. Rumah sakit kekurangan pasokan medis dasar untuk merawat korban yang terus berjatuhan. Donasi Anda akan disalurkan dalam bentuk obat-obatan, alat infus, perban, dan peralatan medis vital lainnya untuk menyelamatkan nyawa saudara-saudara kita di sana.',
    createdAt: Date.now() - 2 * 86400000, // 2 days ago
    donors: [],
  },
  {
    id: 'bangun-masjid- pelosok',
    title: 'Pembangunan Masjid di Desa Pelosok',
    description: 'Wujudkan impian warga memiliki masjid yang layak untuk beribadah dan kegiatan keagamaan.',
    organizer: 'Dewan Dakwah Islamiyah',
    imageUrl: 'https://images.unsplash.com/photo-1585429424122-8758763292f3?q=80&w=1935&auto=format&fit=crop',
    targetAmount: 300000000,
    currentAmount: 95000000,
    donorCount: 750,
    daysRemaining: 90,
    category: 'Infrastruktur',
    story: 'Warga Muslim di Desa Sukamaju telah lama merindukan sebuah masjid. Saat ini, mereka beribadah di sebuah mushola kecil yang terbuat dari bambu. Mari bantu mereka membangun masjid permanen yang tidak hanya menjadi tempat shalat, tetapi juga pusat pendidikan Al-Quran dan kegiatan sosial masyarakat.',
    createdAt: Date.now() - 30 * 86400000, // 30 days ago
    donors: [],
  },
  {
    id: 'modal-usaha-umkm',
    title: 'Bantuan Modal Usaha untuk Janda Dhuafa',
    description: 'Berdayakan para ibu tunggal dengan memberikan modal usaha agar mandiri secara ekonomi.',
    organizer: 'Dompet Dhuafa',
    imageUrl: 'https://images.unsplash.com/photo-1610613487955-338b4d41a2c6?q=80&w=2070&auto=format&fit=crop',
    targetAmount: 100000000,
    currentAmount: 25000000,
    donorCount: 320,
    daysRemaining: 60,
    category: 'Lainnya',
    story: 'Banyak janda dhuafa yang berjuang keras untuk menafkahi keluarga. Program ini memberikan bantuan modal usaha bergulir serta pendampingan bisnis untuk membantu mereka memulai usaha kecil seperti warung, menjahit, atau membuat kue. Dengan kemandirian ekonomi, mereka dapat meningkatkan taraf hidup keluarganya.',
    createdAt: Date.now() - 20 * 86400000, // 20 days ago
    donors: [],
  },
];

export class MigrationService {
  static async migrateTestData(env: Env): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Starting test data migration...');
      
      // Check if campaigns already exist to avoid duplicate migration
      const existingCampaigns = await CampaignEntity.list(env);
      if (existingCampaigns.items.length > 0) {
        console.log(`Found ${existingCampaigns.items.length} existing campaigns. Skipping migration.`);
        return { 
          success: true, 
          message: `Migration skipped - ${existingCampaigns.items.length} campaigns already exist in database` 
        };
      }
      
      // Migrate the mock campaigns to the database
      await CampaignEntity.migrateCampaigns(env, MOCK_CAMPAIGNS);
      
      console.log('Test data migration completed successfully');
      return { 
        success: true, 
        message: `Successfully migrated ${MOCK_CAMPAIGNS.length} campaigns to the database` 
      };
    } catch (error) {
      console.error('Error during migration:', error);
      return { 
        success: false, 
        message: `Migration failed: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }
}