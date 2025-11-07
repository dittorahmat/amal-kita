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
import { Loader2, Plus, Image as ImageIcon, Check, ArrowLeft, Edit3 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Toaster } from 'sonner';
import type { Campaign } from '@shared/types';

// Wrapper component to handle authentication check
export function CampaignCreationPage() {
  const isAuthenticated = localStorage.getItem('admin-authenticated') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <CampaignCreationContent />;
}

function CampaignCreationContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [campaignData, setCampaignData] = useState<Campaign | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Get campaign ID from query parameter
  const campaignId = searchParams.get('id');

  const campaignSchema = z.object({
    title: z.string().min(1, 'Judul wajib diisi').max(200, 'Judul terlalu panjang'),
    description: z.string().min(1, 'Deskripsi wajib diisi').max(500, 'Deskripsi terlalu panjang'),
    organizer: z.string().min(1, 'Penyelenggara wajib diisi').max(100, 'Nama penyelenggara terlalu panjang'),
    imageUrl: z.string().url('URL gambar tidak valid').optional().or(z.string().min(1, 'URL gambar wajib diisi')),
    targetAmount: z.string().min(1, 'Target donasi wajib diisi').transform(Number).refine(val => val > 0, {
      message: 'Target donasi harus lebih dari 0'
    }),
    category: z.enum(['Pendidikan', 'Kemanusiaan', 'Kesehatan', 'Infrastruktur', 'Lainnya'], {
      errorMap: () => ({ message: 'Kategori tidak valid' })
    }),
    story: z.string().min(1, 'Cerita kampanye wajib diisi'),
    daysRemaining: z.string().min(1, 'Sisa hari wajib diisi').transform(Number).refine(val => val > 0, {
      message: 'Sisa hari harus lebih dari 0'
    }),
  });

  type CampaignFormData = z.infer<typeof campaignSchema>;

  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: '',
      description: '',
      organizer: '',
      imageUrl: '',
      targetAmount: 0,
      category: 'Lainnya',
      story: '',
      daysRemaining: 30,
    },
  });

  // Load campaign data if editing
  useEffect(() => {
    if (campaignId) {
      setIsEditMode(true);
      const fetchCampaign = async () => {
        try {
          const data = await api<Campaign>(`/api/campaigns/${campaignId}`);
          setCampaignData(data);
          
          // Set form values
          form.setValue('title', data.title);
          form.setValue('description', data.description);
          form.setValue('organizer', data.organizer);
          form.setValue('imageUrl', data.imageUrl);
          form.setValue('targetAmount', data.targetAmount.toString());
          form.setValue('category', data.category);
          form.setValue('story', data.story);
          form.setValue('daysRemaining', data.daysRemaining.toString());
          
          // Set image preview
          setImagePreview(data.imageUrl);
        } catch (error) {
          console.error('Failed to fetch campaign:', error);
          toast.error('Gagal memuat data kampanye');
          navigate('/admin');
        }
      };
      
      fetchCampaign();
    }
  }, [campaignId, form, navigate]);

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

  const onSubmit = async (data: CampaignFormData) => {
    setLoading(true);
    try {
      if (isEditMode && campaignId) {
        // Update existing campaign
        await api(`/api/campaigns/${campaignId}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...data,
            targetAmount: Number(data.targetAmount),
            daysRemaining: Number(data.daysRemaining),
            imageUrl: data.imageUrl || campaignData?.imageUrl || 'https://placehold.co/600x400?text=No+Image',
          }),
        });

        toast.success('Kampanye berhasil diperbarui!');
        navigate('/admin');
      } else {
        // Create new campaign
        // Check if we have a file to upload
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        const file = fileInput?.files?.[0];

        if (file) {
          // If we have a file, we'll use multipart form data
          const formData = new FormData();
          
          // Add all form fields
          formData.append('title', data.title);
          formData.append('description', data.description);
          formData.append('organizer', data.organizer);
          formData.append('targetAmount', String(Number(data.targetAmount)));
          formData.append('category', data.category);
          formData.append('story', data.story);
          formData.append('daysRemaining', String(Number(data.daysRemaining)));
          formData.append('image', file);

          // Submit using fetch directly for multipart form data with relative path
          const response = await fetch('/api/campaigns', {
            method: 'POST',
            body: formData,
            // Don't set Content-Type header for multipart form data - let the browser set it with the boundary
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create campaign');
          }

          const result = await response.json();
          if (result.success) {
            toast.success('Kampanye berhasil dibuat!');
            navigate('/admin');
          } else {
            throw new Error(result.error || 'Failed to create campaign');
          }
        } else {
          // If no file, we'll submit as JSON
          await api('/api/campaigns', {
            method: 'POST',
            body: JSON.stringify({
              ...data,
              targetAmount: Number(data.targetAmount),
              daysRemaining: Number(data.daysRemaining),
              imageUrl: data.imageUrl || 'https://placehold.co/600x400?text=No+Image',
            }),
          });

          toast.success('Kampanye berhasil dibuat!');
          navigate('/admin'); // Navigate to admin dashboard after creation
        }
      }
    } catch (error) {
      console.error('Failed to save campaign:', error);
      toast.error(`Gagal ${isEditMode ? 'memperbarui' : 'membuat'} kampanye. Silakan coba lagi.`);
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
              {isEditMode ? 'Edit Kampanye' : 'Buat Kampanye Baru'}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {isEditMode 
                ? 'Perbarui informasi kampanye donasi yang dipilih' 
                : 'Tambahkan kampanye donasi baru untuk membantu masyarakat'}
            </p>
          </div>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="font-display text-2xl">
                {isEditMode ? 'Formulir Edit Kampanye' : 'Formulir Kampanye'}
              </CardTitle>
              <CardDescription>
                {isEditMode 
                  ? 'Perbarui informasi kampanye donasi dengan detail yang akurat' 
                  : 'Lengkapi informasi kampanye donasi dengan detail yang akurat'}
              </CardDescription>
            </CardHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <CardContent className="space-y-6">
                  {/* Campaign Title */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Judul Kampanye *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Contoh: Bantu Pendidikan Anak Yatim" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Campaign Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deskripsi Singkat *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Berikan deskripsi singkat tentang kampanye ini" 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Organizer */}
                  <FormField
                    control={form.control}
                    name="organizer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Penyelenggara *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Contoh: Yayasan Amal Kita" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Image */}
                  <div className="space-y-2">
                    <Label>Gambar Kampanye *</Label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1">
                        <FormField
                          control={form.control}
                          name="imageUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  placeholder="URL gambar kampanye (misalnya: https://example.com/image.jpg)"
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
                            alt="Preview gambar kampanye" 
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

                  {/* Target Amount */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="targetAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Donasi (Rp) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Contoh: 10000000"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Days Remaining */}
                    <FormField
                      control={form.control}
                      name="daysRemaining"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lama Kampanye (Hari) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Contoh: 30"
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Category */}
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategori *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih kategori kampanye" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Pendidikan">Pendidikan</SelectItem>
                            <SelectItem value="Kemanusiaan">Kemanusiaan</SelectItem>
                            <SelectItem value="Kesehatan">Kesehatan</SelectItem>
                            <SelectItem value="Infrastruktur">Infrastruktur</SelectItem>
                            <SelectItem value="Lainnya">Lainnya</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Story */}
                  <FormField
                    control={form.control}
                    name="story"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cerita Kampanye *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Ceritakan secara detail tentang kampanye ini, mengapa penting, dan bagaimana dana akan digunakan" 
                            rows={6}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                    className="rounded-full bg-brand-accent py-6 text-lg font-bold text-white shadow-md hover:bg-brand-accent/90 hover:shadow-lg"
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
                        {isEditMode ? 'Perbarui Kampanye' : 'Buat Kampanye'}
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