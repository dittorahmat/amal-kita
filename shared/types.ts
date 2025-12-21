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
  email?: string;
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

export interface EventParticipant {
  id: string;
  eventId: string;
  name: string;
  email: string;
  phone: string;
  registrationDate: number;
  status: 'registered' | 'confirmed' | 'cancelled';
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string; // ISO string format
  time: string; // HH:MM format
  location?: string; // Optional for online events
  imageUrl: string;
  capacity: number | null; // null for unlimited
  registeredCount: number;
  price: number; // 0 for free events
  status: 'active' | 'inactive' | 'cancelled' | 'completed';
  createdAt: number;
  campaignId?: string; // Optional campaign association
  participants: EventParticipant[];
}