import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { EventCard } from '@/components/shared/EventCard';
import type { Event } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function EventListPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch events on component mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();

        setEvents(result.data || []);
        setLoading(false);
      } catch (err) {
        console.error('Error loading events:', err);
        setError('Failed to load events');
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Filter events based on search term, status, and date
  useEffect(() => {
    let result = events;

    // Apply search filter
    if (searchTerm) {
      result = result.filter(event =>
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.location && event.location.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(event => event.status === statusFilter);
    }

    // Apply date filter
    if (dateFilter === 'upcoming') {
      const today = new Date();
      result = result.filter(event => new Date(event.date) >= today);
    } else if (dateFilter === 'past') {
      const today = new Date();
      result = result.filter(event => new Date(event.date) < today);
    }

    setFilteredEvents(result);
  }, [events, searchTerm, statusFilter, dateFilter]);

  // Group events by status for the filter badges
  const statusCounts = {
    active: events.filter(e => e.status === 'active').length,
    inactive: events.filter(e => e.status === 'inactive').length,
    completed: events.filter(e => e.status === 'completed').length,
    cancelled: events.filter(e => e.status === 'cancelled').length,
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Memuat acara...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <Calendar className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Gagal Memuat Acara</h3>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-grow py-8">
          <div className="container mx-auto px-4">
            <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Acara Terbaru</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Temukan dan daftar ke acara-acara menarik yang sesuai dengan minat Anda.
          Dari acara amal hingga kegiatan edukasi, semua ada di sini.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-1/3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Cari acara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
              size="sm"
            >
              Semua
            </Button>
            <Button
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('active')}
              size="sm"
            >
              Aktif <Badge variant="secondary" className="ml-2">{statusCounts.active}</Badge>
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('completed')}
              size="sm"
            >
              Selesai <Badge variant="secondary" className="ml-2">{statusCounts.completed}</Badge>
            </Button>
            <Button
              variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('cancelled')}
              size="sm"
            >
              Dibatalkan <Badge variant="secondary" className="ml-2">{statusCounts.cancelled}</Badge>
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant={dateFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setDateFilter('all')}
            size="sm"
          >
            Semua Tanggal
          </Button>
          <Button
            variant={dateFilter === 'upcoming' ? 'default' : 'outline'}
            onClick={() => setDateFilter('upcoming')}
            size="sm"
          >
            Akan Datang
          </Button>
          <Button
            variant={dateFilter === 'past' ? 'default' : 'outline'}
            onClick={() => setDateFilter('past')}
            size="sm"
          >
            Sudah Lewat
          </Button>
        </div>
      </div>

      {/* Events Grid */}
      {filteredEvents.length > 0 ? (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          layout
        >
          <AnimatePresence>
            {filteredEvents.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <EventCard event={event} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            <Calendar className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Tidak Ada Acara</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
              ? 'Tidak ada acara yang sesuai dengan filter Anda.'
              : 'Belum ada acara yang tersedia saat ini.'}
          </p>
        </div>
      )}
    </div>
  </main>
  <Footer />
</div>
</>
);
}