import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send } from 'lucide-react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { formatRupiah } from '@/lib/utils';
const donationSchema = z.object({
  amount: z.number().min(10000, 'Donasi minimal Rp 10.000'),
  name: z.string().optional(),
  message: z.string().optional(),
  isAnonymous: z.boolean(),
}).refine(data => !data.isAnonymous ? !!data.name && data.name.trim().length > 0 : true, {
  message: 'Nama harus diisi jika tidak berdonasi sebagai anonim',
  path: ['name'],
});
type DonationFormData = z.infer<typeof donationSchema>;
interface DonationModalProps {
  campaignId: string;
  campaignTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}
const presetAmounts = [25000, 50000, 100000, 250000];
export function DonationModal({ campaignId, campaignTitle, open, onOpenChange, onSuccess }: DonationModalProps) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
      isAnonymous: false,
      amount: 0,
    },
  });
  const isAnonymous = watch('isAnonymous');
  const amount = watch('amount');
  const onSubmit = async (data: DonationFormData) => {
    setLoading(true);
    try {
      const donorName = data.isAnonymous ? 'Hamba Allah' : data.name!;
      const payload = {
        amount: data.amount,
        name: donorName,
        message: data.message,
      };
      await api(`/api/campaigns/${campaignId}/donations`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success('Donasi berhasil! Terima kasih atas kebaikan Anda.');
      reset();
      onSuccess();
      const url = `/konfirmasi-donasi/${campaignId}?amount=${data.amount}&name=${encodeURIComponent(donorName)}`;
      navigate(url);
    } catch (error) {
      console.error('Donation failed:', error);
      toast.error('Terjadi kesalahan saat memproses donasi.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Donasi untuk "{campaignTitle}"</DialogTitle>
          <DialogDescription>
            Setiap donasi Anda sangat berarti. Masukkan nominal dan lengkapi data di bawah ini.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          <div>
            <Label htmlFor="amount" className="text-base font-semibold">Jumlah Donasi (Rp)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Contoh: 50000"
              className="mt-2 text-lg"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {presetAmounts.map(preset => (
                <Button
                  key={preset}
                  type="button"
                  variant={amount === preset ? 'default' : 'outline'}
                  onClick={() => setValue('amount', preset, { shouldValidate: true })}
                  className="transition-all"
                >
                  {formatRupiah(preset).replace(',00', '')}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox id="isAnonymous" checked={isAnonymous} onCheckedChange={(checked) => setValue('isAnonymous', !!checked)} />
              <Label htmlFor="isAnonymous" className="font-medium">Donasi sebagai Hamba Allah (Anonim)</Label>
            </div>
          </div>
          {!isAnonymous && (
            <div>
              <Label htmlFor="name" className="font-semibold">Nama Anda</Label>
              <Input id="name" placeholder="Masukkan nama lengkap Anda" className="mt-2" {...register('name')} />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
            </div>
          )}
          <div>
            <Label htmlFor="message" className="font-semibold">Pesan Kebaikan (Opsional)</Label>
            <Textarea id="message" placeholder="Tuliskan doa atau pesan penyemangat..." className="mt-2" {...register('message')} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full rounded-full bg-brand-accent py-6 text-lg font-bold text-white shadow-md transition-all hover:bg-brand-accent/90 hover:shadow-lg active:scale-95">
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Send className="mr-2 h-5 w-5" />
              )}
              Lanjutkan Pembayaran
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}