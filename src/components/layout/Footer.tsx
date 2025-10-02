import { HandHeart, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';
export function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <HandHeart className="h-8 w-8 text-brand-primary" />
              <span className="font-display text-2xl font-bold text-gray-900 dark:text-gray-50">
                AmalKita
              </span>
            </Link>
            <p className="text-base text-muted-foreground">
              Platform crowdfunding syariah untuk kebaikan umat.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-muted-foreground hover:text-foreground"><Facebook size={20} /></a>
              <a href="#" className="text-muted-foreground hover:text-foreground"><Twitter size={20} /></a>
              <a href="#" className="text-muted-foreground hover:text-foreground"><Instagram size={20} /></a>
              <a href="#" className="text-muted-foreground hover:text-foreground"><Youtube size={20} /></a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 md:col-span-3 md:grid-cols-3">
            <div>
              <h3 className="font-semibold text-foreground">Tentang Kami</h3>
              <ul className="mt-4 space-y-2">
                <li><Link to="/tentang-kami" className="text-muted-foreground hover:text-foreground">Visi & Misi</Link></li>
                <li><Link to="/tim" className="text-muted-foreground hover:text-foreground">Tim Kami</Link></li>
                <li><Link to="/kontak" className="text-muted-foreground hover:text-foreground">Kontak</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Program</h3>
              <ul className="mt-4 space-y-2">
                <li><Link to="/kampanye?kategori=Pendidikan" className="text-muted-foreground hover:text-foreground">Pendidikan</Link></li>
                <li><Link to="/kampanye?kategori=Kesehatan" className="text-muted-foreground hover:text-foreground">Kesehatan</Link></li>
                <li><Link to="/kampanye?kategori=Kemanusiaan" className="text-muted-foreground hover:text-foreground">Kemanusiaan</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Legal</h3>
              <ul className="mt-4 space-y-2">
                <li><Link to="/syarat-ketentuan" className="text-muted-foreground hover:text-foreground">Syarat & Ketentuan</Link></li>
                <li><Link to="/kebijakan-privasi" className="text-muted-foreground hover:text-foreground">Kebijakan Privasi</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} AmalKita. Built with ❤️ at Cloudflare.</p>
        </div>
      </div>
    </footer>
  );
}