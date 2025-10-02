export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
export interface Donor {
  id: string;
  name: string;
  amount: number;
  message?: string;
  timestamp: number;
}
export interface Donation {
  id: string;
  campaignId: string;
  donor: Omit<Donor, 'id'>;
  timestamp: number;
}
export interface Campaign {
  id: string;
  title: string;
  description: string;
  organizer: string;
  imageUrl: string;
  targetAmount: number;
  currentAmount: number;
  donorCount: number;
  daysRemaining: number;
  createdAt: number;
  category: 'Pendidikan' | 'Kemanusiaan' | 'Kesehatan' | 'Infrastruktur' | 'Lainnya';
  story: string;
  donors: Donor[];
}