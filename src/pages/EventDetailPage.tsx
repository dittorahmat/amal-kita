import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import type { Event } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Tag, Clock, User, Mail, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatRupiah } from '@/lib/utils';

export function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Fetch event on component mount
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        if (!id) {
          setError('Event ID is missing');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/events/${id}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch event: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();

        if (result.success && result.data) {
          setEvent(result.data);
        } else {
          setError('Event not found');
        }
      } catch (err) {
        console.error('Error loading event:', err);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Memuat detail acara...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {error || 'Acara Tidak Ditemukan'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Acara yang Anda cari mungkin telah dihapus atau tidak tersedia.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      const response = await fetch(`/api/events/${event.id}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          phone,
        }),
      });
      
      const result = await response.json();

      if (response.ok) {
        // Redirect to success page with event ID and user name
        navigate(`/event/${event.id}/success?name=${encodeURIComponent(name)}`);
      } else {
        // Even if there's an error, if it's about email already registered, still redirect with name
        if (result.error && result.error.includes('Email already registered')) {
          navigate(`/event/${event.id}/success?name=${encodeURIComponent(name)}`);
        } else {
          setSubmitError(result.error || 'Gagal mendaftar ke acara. Silakan coba lagi.');
        }
      }
    } catch (error) {
      setSubmitError('Terjadi kesalahan saat mendaftar. Silakan coba lagi.');
      console.error('Registration error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate days until event
  const eventDate = new Date(event.date);
  const today = new Date();
  const daysUntilEvent = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-grow py-8">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-4xl mx-auto"
            >
        {/* Event Header */}
        <div className="mb-8">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-64 md:h-80 object-cover rounded-2xl shadow-md"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>{new Date(event.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>{event.time}</span>
                </div>
                {event.location && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`px-3 py-1 rounded-full ${
                event.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' :
                event.status === 'inactive' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100' :
                event.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
              }`}>
                {event.status === 'active' ? 'Aktif' : 
                 event.status === 'inactive' ? 'Tidak Aktif' : 
                 event.status === 'cancelled' ? 'Dibatalkan' : 'Selesai'}
              </Badge>
              {event.price > 0 ? (
                <Badge className="px-3 py-1 bg-brand-primary text-white rounded-full">
                  {formatRupiah(event.price)}
                </Badge>
              ) : (
                <Badge className="px-3 py-1 bg-green-500 text-white rounded-full">
                  Gratis
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Deskripsi Acara</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {event.description}
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Tanggal & Waktu
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    {new Date(event.date).toLocaleDateString('id-ID', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 mt-1">
                    Pukul {event.time} WIB
                  </p>
                  <p className={`mt-2 text-sm ${
                    daysUntilEvent > 0 ? 'text-green-600' : 
                    daysUntilEvent === 0 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {daysUntilEvent > 0 ? `Masih ${daysUntilEvent} hari lagi` : 
                     daysUntilEvent === 0 ? 'Hari ini' : `${Math.abs(daysUntilEvent)} hari yang lalu`}
                  </p>
                </CardContent>
              </Card>

              {event.location && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Lokasi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 dark:text-gray-300">{event.location}</p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Peserta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">
                    {event.capacity !== null 
                      ? `${event.registeredCount} dari ${event.capacity} tempat terisi` 
                      : `${event.registeredCount} peserta terdaftar`}
                  </p>
                  {event.capacity !== null && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div 
                          className="bg-blue-600 h-2.5 rounded-full" 
                          style={{ width: `${Math.min(100, (event.registeredCount / event.capacity) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className={`font-medium ${
                    event.status === 'active' ? 'text-green-600' :
                    event.status === 'inactive' ? 'text-yellow-600' :
                    event.status === 'cancelled' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {event.status === 'active' ? 'Acara Aktif' : 
                     event.status === 'inactive' ? 'Tidak Aktif' : 
                     event.status === 'cancelled' ? 'Dibatalkan' : 'Selesai'}
                  </p>
                  {event.status === 'active' && event.capacity !== null && event.registeredCount >= event.capacity && (
                    <p className="text-red-600 text-sm mt-2">Kuota penuh</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Registration Form */}
          <div>
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Daftar ke Acara</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama Lengkap</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="name"
                        placeholder="Nama lengkap Anda"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Alamat email Anda"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Nomor Telepon</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="phone"
                        placeholder="Nomor telepon Anda"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {submitError && (
                    <div className="text-red-500 text-sm">{submitError}</div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting || (event.capacity !== null && event.registeredCount >= event.capacity)}
                  >
                    {isSubmitting ? 'Memproses...' :
                     event.capacity !== null && event.registeredCount >= event.capacity ? 'Kuota Penuh' :
                     `Daftar Sekarang - ${event.price > 0 ? formatRupiah(event.price) : 'Gratis'}`}
                  </Button>

                  {event.price > 0 && (
                    <p className="text-xs text-gray-500 text-center">
                      Pembayaran akan dilakukan saat registrasi offline
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
    <Footer />
  </main>
</div>
</>
);
}