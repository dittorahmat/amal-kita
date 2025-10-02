import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Mail, MapPin, Phone } from 'lucide-react';
export function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow">
        <section className="bg-gray-50 dark:bg-gray-900/50 py-20 md:py-28">
          <div className="container mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <h1 className="font-display text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl md:text-6xl">
              Hubungi Kami
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg text-muted-foreground md:text-xl">
              Punya pertanyaan, saran, atau butuh bantuan? Tim kami siap membantu Anda.
            </p>
          </div>
        </section>
        <section className="py-16 md:py-24">
          <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Alamat Kantor</h3>
                    <p className="text-muted-foreground">Jl. Kebaikan No. 123, Jakarta Selatan, Indonesia 12345</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Email</h3>
                    <p className="text-muted-foreground">support@amalkita.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-brand-primary/10 text-brand-primary">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Telepon</h3>
                    <p className="text-muted-foreground">(021) 123-4567</p>
                  </div>
                </div>
              </div>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">Kirim Pesan</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nama Lengkap</Label>
                      <Input id="name" placeholder="Nama Anda" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Alamat Email</Label>
                      <Input id="email" type="email" placeholder="email@anda.com" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="message">Pesan</Label>
                      <Textarea id="message" placeholder="Tuliskan pesan Anda di sini..." rows={5} />
                    </div>
                    <Button type="submit" size="lg" className="w-full bg-brand-accent text-white hover:bg-brand-accent/90">
                      Kirim Pesan
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}