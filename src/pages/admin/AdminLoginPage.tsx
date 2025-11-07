import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Navigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Toaster, toast } from 'sonner';

// Wrapper component to handle authentication check
export function AdminLoginPage() {
  const isAuthenticated = localStorage.getItem('admin-authenticated') === 'true';
  
  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }
  
  return <AdminLoginContent />;
}

function AdminLoginContent() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const loginSchema = z.object({
    email: z.string().email('Email tidak valid'),
    password: z.string().min(1, 'Password wajib diisi'),
  });

  type LoginFormValues = z.infer<typeof loginSchema>;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    // Mock authentication - in real implementation, you would call an API
    // For this mock, we'll just accept any credentials
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Store mock authentication state
      localStorage.setItem('admin-authenticated', 'true');
      
      toast.success('Login berhasil! Selamat datang di dashboard admin.');
      
      // Redirect to admin dashboard
      navigate('/admin');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login gagal. Silakan coba lagi.');
    }
  };

  const handleDemoLogin = () => {
    // Fill in demo credentials and submit
    form.setValue('email', 'admin@example.com');
    form.setValue('password', 'password123');
    onSubmit({ email: 'admin@example.com', password: 'password123' });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-grow py-12 md:py-16">
        <div className="container mx-auto max-w-md px-4 sm:px-6 lg:px-8">
          <Card className="shadow-xl">
            <CardHeader className="items-center space-y-4">
              <div className="rounded-full bg-brand-accent/10 p-4">
                <Lock className="h-10 w-10 text-brand-accent" />
              </div>
              <CardTitle className="font-display text-2xl">Login Admin</CardTitle>
              <CardDescription>
                Masuk untuk mengelola kampanye donasi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <FormControl>
                            <Input 
                              className="pl-10" 
                              placeholder="admin@amalkita.org" 
                              type="email"
                              {...field} 
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              className="pr-10" 
                              placeholder="••••••••" 
                              type={showPassword ? "text" : "password"}
                              {...field} 
                            />
                          </FormControl>
                          <button
                            type="button"
                            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="pt-4">
                    <Button type="submit" className="w-full rounded-full bg-brand-accent py-6 text-lg font-bold text-white shadow-md hover:bg-brand-accent/90 hover:shadow-lg">
                      Masuk
                    </Button>
                  </div>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Atau</span>
                    </div>
                  </div>

                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full rounded-full py-6 text-lg font-bold shadow-md"
                    onClick={handleDemoLogin}
                  >
                    Gunakan Demo Login
                  </Button>
                </form>
              </Form>

              <div className="mt-8 rounded-lg border bg-muted p-4 text-sm">
                <p className="font-medium mb-2">Catatan:</p>
                <p className="mb-1">• Ini adalah mock login - semua email dan password akan diterima</p>
                <p>• Data login disimpan di localStorage browser</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
      <Toaster richColors closeButton />
    </div>
  );
}