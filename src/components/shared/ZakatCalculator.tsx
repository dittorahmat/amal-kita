import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Info, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatRupiah } from '@/lib/utils';
// Asumsi harga emas 1 gram = Rp 1.300.000 (nilai ini bisa di-fetch dari API di masa depan)
const GOLD_PRICE_PER_GRAM = 1300000;
const NISAB_IN_GRAMS = 85;
const NISAB_THRESHOLD = NISAB_IN_GRAMS * GOLD_PRICE_PER_GRAM;
export function ZakatCalculator() {
  const [income, setIncome] = useState(0);
  const [savings, setSavings] = useState(0);
  const [goldValue, setGoldValue] = useState(0);
  const [totalWealth, setTotalWealth] = useState(0);
  const [zakatAmount, setZakatAmount] = useState(0);
  const [isEligible, setIsEligible] = useState(false);
  useEffect(() => {
    const total = (income * 12) + savings + goldValue;
    setTotalWealth(total);
    if (total >= NISAB_THRESHOLD) {
      setIsEligible(true);
      setZakatAmount(total * 0.025);
    } else {
      setIsEligible(false);
      setZakatAmount(0);
    }
  }, [income, savings, goldValue]);
  const handleReset = () => {
    setIncome(0);
    setSavings(0);
    setGoldValue(0);
  };
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<number>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
    setter(value);
  };
  const formatInputValue = (value: number) => {
    return value === 0 ? '' : new Intl.NumberFormat('id-ID').format(value);
  };
  return (
    <Card className="w-full max-w-lg shadow-lg rounded-2xl">
      <CardHeader>
        <CardTitle>Kalkulator Zakat</CardTitle>
        <CardDescription>Hitung kewajiban Zakat Mal Anda.</CardDescription>
        <div className="pt-2 text-sm text-muted-foreground flex items-center gap-2">
          <Info size={16} className="text-brand-primary" />
          <span>Nisab saat ini: <strong>{formatRupiah(NISAB_THRESHOLD)}</strong></span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="income">Penghasilan per Bulan (setelah kebutuhan pokok)</Label>
          <Input id="income" type="text" placeholder="Contoh: 10.000.000" value={formatInputValue(income)} onChange={handleInputChange(setIncome)} />
        </div>
        <div>
          <Label htmlFor="savings">Tabungan & Deposito (tersimpan 1 tahun)</Label>
          <Input id="savings" type="text" placeholder="Contoh: 50.000.000" value={formatInputValue(savings)} onChange={handleInputChange(setSavings)} />
        </div>
        <div>
          <Label htmlFor="gold">Emas, Perak, & Logam Mulia (tersimpan 1 tahun)</Label>
          <Input id="gold" type="text" placeholder="Contoh: 25.000.000" value={formatInputValue(goldValue)} onChange={handleInputChange(setGoldValue)} />
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="flex flex-col items-start gap-4 p-6">
        <div className="w-full">
          <p className="text-sm text-muted-foreground">Total Harta (dihitung setahun):</p>
          <p className="text-2xl font-bold">{formatRupiah(totalWealth)}</p>
        </div>
        {isEligible ? (
          <Alert className="w-full border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/30">
            <AlertTitle className="font-bold text-green-800 dark:text-green-300">Anda Wajib Membayar Zakat</AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-400">
              Jumlah zakat yang harus Anda keluarkan adalah:
              <p className="text-2xl font-bold text-green-600 dark:text-green-300 mt-1">{formatRupiah(zakatAmount)}</p>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="w-full border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/30">
            <AlertTitle className="font-bold text-amber-800 dark:text-amber-300">Anda Belum Wajib Zakat</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              Total harta Anda belum mencapai nisab. Namun, Anda tetap bisa bersedekah.
            </AlertDescription>
          </Alert>
        )}
        <Button variant="outline" onClick={handleReset} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          Hitung Ulang
        </Button>
      </CardFooter>
    </Card>
  );
}