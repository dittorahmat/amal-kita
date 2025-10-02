import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { Campaign } from '@shared/types';
import { motion } from 'framer-motion';
import { formatRupiah } from '@/lib/utils';
import { Badge } from '../ui/badge';
interface CampaignCardProps {
  campaign: Campaign;
}
export function CampaignCard({ campaign }: CampaignCardProps) {
  const progress = (campaign.currentAmount / campaign.targetAmount) * 100;
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Link to={`/kampanye/${campaign.id}`} className="block">
        <Card className="overflow-hidden rounded-2xl shadow-sm transition-shadow duration-300 hover:shadow-xl">
          <CardHeader className="p-0">
            <div className="relative">
              <img
                src={campaign.imageUrl}
                alt={campaign.title}
                className="h-48 w-full object-cover"
              />
              <Badge className="absolute left-3 top-3 bg-brand-primary text-white">{campaign.category}</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <h3 className="mb-2 line-clamp-2 h-14 font-bold text-lg text-gray-800 dark:text-gray-100">
              {campaign.title}
            </h3>
            <p className="text-sm text-muted-foreground">{campaign.organizer}</p>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-3 p-4 pt-0">
            <div className="w-full">
              <Progress value={progress} className="h-2" />
              <div className="mt-2 flex justify-between text-sm">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Terkumpul
                  <p className="font-bold text-brand-primary">
                    {formatRupiah(campaign.currentAmount)}
                  </p>
                </span>
                <span className="text-right font-semibold text-gray-700 dark:text-gray-300">
                  Sisa Hari
                  <p className="font-bold text-gray-900 dark:text-gray-50">{campaign.daysRemaining}</p>
                </span>
              </div>
            </div>
          </CardFooter>
        </Card>
      </Link>
    </motion.div>
  );
}