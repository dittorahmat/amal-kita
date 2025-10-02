import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Linkedin, Twitter } from 'lucide-react';
const teamMembers = [
  {
    name: 'Ahmad Zaky',
    role: 'Founder & CEO',
    imageUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974&auto=format&fit=crop',
    bio: 'Ahmad adalah seorang visioner dengan hasrat untuk teknologi dan filantropi. Ia memimpin AmalKita dengan dedikasi untuk menciptakan dampak sosial yang positif.',
  },
  {
    name: 'Fatimah Al-Fihri',
    role: 'Head of Programs',
    imageUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1961&auto=format&fit=crop',
    bio: 'Fatimah bertanggung jawab atas verifikasi dan kurasi setiap kampanye. Latar belakangnya di bidang sosial memastikan setiap donasi tersalurkan secara efektif.',
  },
  {
    name: 'Umar Abdullah',
    role: 'Chief Technology Officer',
    imageUrl: 'https://images.unsplash.com/photo-1624298357597-fd92dfbec01d?q=80&w=1974&auto=format&fit=crop',
    bio: 'Umar adalah arsitek di balik platform AmalKita. Keahliannya dalam rekayasa perangkat lunak memastikan platform ini aman, andal, dan mudah digunakan.',
  },
];
export function TeamPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow">
        <section className="bg-gray-50 dark:bg-gray-900/50 py-20 md:py-28">
          <div className="container mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl md:text-6xl">
              Tim di Balik <span className="text-brand-primary">AmalKita</span>
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg text-muted-foreground md:text-xl">
              Kami adalah sekelompok individu yang bersemangat, disatukan oleh tujuan bersama untuk memanfaatkan teknologi demi kebaikan umat.
            </p>
          </div>
        </section>
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
              {teamMembers.map((member) => (
                <div key={member.name} className="flex flex-col items-center text-center">
                  <Avatar className="h-40 w-40 border-4 border-white shadow-lg">
                    <AvatarImage src={member.imageUrl} alt={member.name} />
                    <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <h3 className="mt-6 text-2xl font-bold">{member.name}</h3>
                  <p className="text-md font-semibold text-brand-primary">{member.role}</p>
                  <p className="mt-2 text-muted-foreground">{member.bio}</p>
                  <div className="mt-4 flex space-x-4">
                    <a href="#" className="text-muted-foreground hover:text-foreground"><Twitter size={20} /></a>
                    <a href="#" className="text-muted-foreground hover:text-foreground"><Linkedin size={20} /></a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}