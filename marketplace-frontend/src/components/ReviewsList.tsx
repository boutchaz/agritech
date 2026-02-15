'use client';

import { StarRating } from './StarRating';
import { Building2 } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comment?: string;
  created_at: string;
  reviewer?: {
    id: string;
    name: string;
    logo_url?: string;
  };
}

interface ReviewsListProps {
  reviews: Review[];
}

export function ReviewsList({ reviews }: ReviewsListProps) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucun avis pour le moment
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div key={review.id} className="bg-white rounded-xl border p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
              {review.reviewer?.logo_url ? (
                <img
                  src={review.reviewer.logo_url}
                  alt={review.reviewer.name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <Building2 className="h-5 w-5 text-emerald-600" />
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <p className="font-medium text-gray-900">
                    {review.reviewer?.name || 'Client anonyme'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(review.created_at).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <StarRating rating={review.rating} readonly size="sm" />
              </div>

              {review.comment && (
                <p className="text-gray-600 text-sm mt-2">{review.comment}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
