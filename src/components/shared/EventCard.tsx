import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import type { Event } from '@shared/types';
import { motion } from 'framer-motion';
import { Badge } from '../ui/badge';
import { Calendar, MapPin, Users, Tag } from 'lucide-react';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  // Calculate days until event
  const eventDate = new Date(event.date);
  const today = new Date();
  const daysUntilEvent = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Link to={`/event/${event.id}`} className="block">
        <Card className="overflow-hidden rounded-2xl shadow-sm transition-shadow duration-300 hover:shadow-xl">
          <CardHeader className="p-0">
            <div className="relative">
              <img
                src={event.imageUrl}
                alt={event.title}
                className="h-48 w-full object-cover"
              />
              <Badge className="absolute right-3 top-3 bg-brand-primary text-white">
                {event.price > 0 ? `Rp ${new Intl.NumberFormat('id-ID').format(event.price)}` : 'Gratis'}
              </Badge>
              {event.capacity !== null && (
                <Badge className="absolute left-3 top-3 bg-blue-500 text-white">
                  <Users className="h-3 w-3 mr-1" />
                  {event.registeredCount}/{event.capacity}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <h3 className="mb-2 line-clamp-2 h-14 font-bold text-lg text-gray-800 dark:text-gray-100">
              {event.title}
            </h3>
            
            <div className="flex items-center text-sm text-muted-foreground mb-2">
              <Calendar className="h-4 w-4 mr-1" />
              <span>{new Date(event.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span className="mx-2">•</span>
              <span>{event.time}</span>
            </div>
            
            {event.location && (
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mr-1" />
                <span className="truncate">{event.location}</span>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-3 p-4 pt-0">
            <div className="w-full">
              <div className="mt-2 flex justify-between text-sm">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Status
                  <p className={`font-bold ${
                    event.status === 'active' ? 'text-green-600' : 
                    event.status === 'inactive' ? 'text-yellow-600' : 
                    event.status === 'cancelled' ? 'text-red-600' : 
                    'text-gray-600'
                  }`}>
                    {event.status === 'active' ? 'Aktif' : 
                     event.status === 'inactive' ? 'Tidak Aktif' : 
                     event.status === 'cancelled' ? 'Dibatalkan' : 'Selesai'}
                  </p>
                </span>
                <span className="text-right font-semibold text-gray-700 dark:text-gray-300">
                  {daysUntilEvent > 0 ? `Sisa ${daysUntilEvent} hari` : daysUntilEvent === 0 ? 'Hari ini' : 'Sudah lewat'}
                </span>
              </div>
            </div>
          </CardFooter>
        </Card>
      </Link>
    </motion.div>
  );
}