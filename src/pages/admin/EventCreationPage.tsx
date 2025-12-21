import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Image as ImageIcon, Check, ArrowLeft, Edit3, Calendar, MapPin, Users } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import type { Event } from '@shared/types';

// Wrapper component to handle authentication check
export function EventCreationPage() {
  const isAuthenticated = localStorage.getItem('admin-authenticated') === 'true';

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return <EventCreationContent />;
}

function EventCreationContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [eventData, setEventData] = useState<Event | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Get event ID from query parameter
  const eventId = searchParams.get('id');

  const eventSchema = z.object({
    title: z.string().min(1, 'Judul acara wajib diisi').max(200, 'Judul acara terlalu panjang'),
    description: z.string().min(1, 'Deskripsi acara wajib diisi').max(1000, 'Deskripsi acara terlalu panjang'),
    date: z.string().min(1, 'Tanggal wajib diisi'),
    time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format waktu harus HH:MM'),
    location: z.string().optional(),
    imageUrl: z.string().url('URL gambar tidak valid').optional().or(z.string().min(1, 'URL gambar wajib diisi')),
    capacity: z.string().optional().transform(val => val === '' || val === null ? null : Number(val)).refine(
      val => val === null || val > 0,
      { message: 'Kapasitas harus lebih dari 0 atau kosongkan untuk tak terbatas' }
    ),
    price: z.string().min(0, 'Harga wajib diisi').transform(Number).refine(val => val >= 0, {
      message: 'Harga tidak boleh negatif'
    }),
    status: z.enum(['active', 'inactive', 'cancelled', 'completed'], {
      errorMap: () => ({ message: 'Status tidak valid' })
    }),
    campaignId: z.string().optional(),
  });

  type EventFormData = z.infer<typeof eventSchema>;

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      imageUrl: '',
      capacity: '',
      price: 0,
      status: 'active',
      campaignId: '',
    },
  });

  // Load event data if editing
  useEffect(() => {
    if (eventId) {
      setIsEditMode(true);
      const fetchEvent = async () => {
        try {
          const data = await api<Event>(`/api/events/${eventId}`);
          setEventData(data);

          // Set form values
          form.setValue('title', data.title);
          form.setValue('description', data.description);
          // Convert ISO date to 'YYYY-MM-DD' format for date input
          const dateInputValue = data.date.split('T')[0];
          form.setValue('date', dateInputValue);
          form.setValue('time', data.time);
          form.setValue('location', data.location || '');
          form.setValue('imageUrl', data.imageUrl);
          form.setValue('capacity', data.capacity === null ? '' : String(data.capacity));
          form.setValue('price', String(data.price));
          form.setValue('status', data.status);
          form.setValue('campaignId', data.campaignId || '');

          // Set image preview
          setImagePreview(data.imageUrl);
        } catch (error) {
          console.error('Failed to fetch event:', error);
          toast.error('Gagal memuat data acara');
          navigate('/admin');
        }
      };

      fetchEvent();
    }
  }, [eventId, form, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      form.setValue('imageUrl', previewUrl);
    }
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    if (url) {
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  const onSubmit = async (data: EventFormData) => {
    setLoading(true);
    try {
      if (isEditMode && eventId) {
        // Update existing event
        // Convert date to ISO format for API
        const isoDate = new Date(`${data.date}T00:00:00`).toISOString();

        await api(`/api/events/${eventId}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...data,
            date: isoDate,
            capacity: data.capacity === '' ? null : Number(data.capacity),
            price: Number(data.price),
          }),
        });

        toast.success('Acara berhasil diperbarui!');
        navigate('/admin');
      } else {
        // Create new event
        // Convert date to ISO format for API
        const isoDate = new Date(`${data.date}T00:00:00`).toISOString();

        // Check if we have a file to upload
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = fileInput?.files?.[0];

        if (file) {
          // If we have a file, we'll use multipart form data
          const formData = new FormData();

          // Add all form fields
          formData.append('title', data.title);
          formData.append('description', data.description);
          formData.append('date', isoDate); // Use ISO date
          formData.append('time', data.time);
          formData.append('location', data.location || '');
          formData.append('capacity', data.capacity === '' ? 'null' : String(data.capacity));
          formData.append('price', String(Number(data.price)));
          formData.append('status', data.status);
          formData.append('campaignId', data.campaignId || '');
          formData.append('image', file);

          // Submit using fetch directly for multipart form data with relative path
          const response = await fetch('/api/events', {
            method: 'POST',
            body: formData,
            // Don't set Content-Type header for multipart form data - let the browser set it with the boundary
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create event');
          }

          const result = await response.json();
          if (result.success) {
            toast.success('Acara berhasil dibuat!');
            navigate('/admin');
          } else {
            throw new Error(result.error || 'Failed to create event');
          }
        } else {
          // If no file, we'll submit as JSON
          await api('/api/events', {
            method: 'POST',
            body: JSON.stringify({
              ...data,
              date: isoDate, // Use ISO date
              capacity: data.capacity === '' ? null : Number(data.capacity),
              price: Number(data.price),
              imageUrl: data.imageUrl || 'https://placehold.co/600x400?text=No+Image',
            }),
          });

          toast.success('Acara berhasil dibuat!');
          navigate('/admin'); // Navigate to admin dashboard after creation
        }
      }
    } catch (error) {
      console.error('Failed to save event:', error);
      toast.error(`Gagal ${isEditMode ? 'memperbarui' : 'membuat'} acara. Silakan coba lagi.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow py-12 md:py-16">
        <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl font-bold text-gray-800 dark:text-gray-100">
              {isEditMode ? 'Edit Acara' : 'Buat Acara Baru'}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {isEditMode
                ? 'Perbarui informasi acara yang dipilih'
                : 'Tambahkan acara baru untuk meningkatkan partisipasi masyarakat'}
            </p>
          </div>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                {isEditMode ? 'Formulir Edit Acara' : 'Formulir Acara'}
              </CardTitle>
              <CardDescription>
                {isEditMode
                  ? 'Perbarui informasi acara dengan detail yang akurat'
                  : 'Lengkapi informasi acara dengan detail yang akurat'}
              </CardDescription>
            </CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <CardContent className="space-y-6">
                  {/* Event Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Acara *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Contoh: Workshop Pengelolaan Zakat"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Event Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deskripsi Acara *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Berikan deskripsi lengkap tentang acara ini"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date and Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tanggal Acara *</FormLabel>
                          <FormControl>
                            <Input
                              type="date"
                              value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(e.target.value)}
                              className="flex items-center"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Waktu Acara *</FormLabel>
                          <FormControl>
                            <Input
                              type="time"
                              value={field.value}
                              onChange={field.onChange}
                              className="flex items-center"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Location */}
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lokasi Acara</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Contoh: Masjid Agung Jakarta"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Image */}
                  <div className="space-y-2">
                    <Label>Gambar Acara *</Label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <FormField
                          control={form.control}
                          name="imageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  placeholder="URL gambar acara (misalnya: https://example.com/image.jpg)"
                                  value={field.value || ''}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleImageUrlChange(e);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex flex-col items-center">
                        <Label className="mb-1 text-sm font-medium">atau upload</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="max-w-[200px]"
                        />
                      </div>
                    </div>

                    {/* Image Preview */}
                    {imagePreview && (
                      <div className="mt-4 flex justify-center">
                        <div className="relative border rounded-lg overflow-hidden max-w-md w-full">
                          <img
                            src={imagePreview}
                            alt="Preview gambar acara"
                            className="w-full h-48 object-cover"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                            <div className="text-white text-center">
                              <ImageIcon className="h-8 w-8 mx-auto mb-1" />
                              <p className="text-sm">Preview Gambar</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Capacity and Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kapasitas (kosongkan untuk tak terbatas)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                type="number"
                                placeholder="Contoh: 100"
                                value={field.value || ''}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="pl-10"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Harga (Rp)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Contoh: 50000"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Status and Campaign association */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih status acara" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="active">Aktif</SelectItem>
                              <SelectItem value="inactive">Tidak Aktif</SelectItem>
                              <SelectItem value="cancelled">Dibatalkan</SelectItem>
                              <SelectItem value="completed">Selesai</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="campaignId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID Kampanye (opsional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Contoh: camp_123456"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col sm:flex-row gap-4 justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => navigate('/admin')}
                  >
                    <ArrowLeft className="mr-2 h-5 w-5" /> Kembali
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    className="rounded-full bg-blue-600 py-6 text-lg font-bold text-white shadow-md hover:bg-blue-700 hover:shadow-lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        {isEditMode ? 'Memperbarui...' : 'Menyimpan...'}
                      </>
                    ) : (
                      <>
                        {isEditMode ? <Edit3 className="mr-2 h-5 w-5" /> : <Plus className="mr-2 h-5 w-5" />}
                        {isEditMode ? 'Perbarui Acara' : 'Buat Acara'}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </div>
      </main>
      <Footer />
      <Toaster richColors closeButton />
    </div>
  );
}