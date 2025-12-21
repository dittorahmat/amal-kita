import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Mail, Phone } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { Event, EventParticipant } from '@shared/types';
import { Skeleton } from '@/components/ui/skeleton';

export function EventParticipantsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<EventParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/events/${eventId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch event: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        
        if (result.success && result.data) {
          setEvent(result.data);
          setParticipants(result.data.participants || []);
        } else {
          throw new Error('Event data not found');
        }
      } catch (err) {
        console.error('Error loading event:', err);
        setError('Gagal memuat data event');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const exportParticipants = () => {
    if (!event || !participants.length) return;
    
    // Create CSV content
    const headers = ['No', 'Nama', 'Email', 'Telepon', 'Tanggal Registrasi', 'Status'];
    const rows = participants.map((participant, index) => [
      index + 1,
      participant.name,
      participant.email,
      participant.phone,
      new Date(participant.registrationDate).toLocaleString('id-ID'),
      participant.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `peserta-${event.title.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900/50">
        <Header />
        <main className="flex-grow py-8">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-12 w-full mb-4" />
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4 p-3 border rounded">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900/50">
        <Header />
        <main className="flex-grow py-8 flex items-center justify-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="text-red-600">Error</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{error}</p>
                <Button onClick={() => navigate(-1)} className="mt-4">Kembali</Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900/50">
        <Header />
        <main className="flex-grow py-8 flex items-center justify-center">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Event Tidak Ditemukan</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Event dengan ID tersebut tidak ditemukan.</p>
                <Button onClick={() => navigate(-1)} className="mt-4">Kembali</Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900/50">
      <Header />
      <main className="flex-grow py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <Card className="shadow-xl">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => navigate(-1)}
                    className="mb-2 sm:mb-0"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Kembali
                  </Button>
                  <CardTitle className="text-2xl mt-2 sm:mt-0">
                    Daftar Peserta - {event.title}
                  </CardTitle>
                  <p className="text-muted-foreground mt-1">
                    Total Peserta: {event.registeredCount} | Tanggal Acara: {new Date(event.date).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={exportParticipants} disabled={participants.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to={`/event/${event.id}`}>Lihat di Frontend</Link>
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {participants.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>Nama</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telepon</TableHead>
                        <TableHead>Tanggal Registrasi</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {participants.map((participant, index) => (
                        <TableRow key={participant.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell className="font-medium">{participant.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                              {participant.email}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                              {participant.phone}
                            </div>
                          </TableCell>
                          <TableCell>
                            {new Date(participant.registrationDate).toLocaleString('id-ID')}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                participant.status === 'registered' ? 'default' :
                                participant.status === 'confirmed' ? 'secondary' :
                                'destructive'
                              }
                            >
                              {participant.status === 'registered' ? 'Terdaftar' :
                               participant.status === 'confirmed' ? 'Dikonfirmasi' :
                               'Dibatalkan'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`mailto:${participant.email}`}>
                                  Email
                                </Link>
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                <Link to={`tel:${participant.phone}`}>
                                  Telp
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Belum ada peserta yang mendaftar ke acara ini.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}