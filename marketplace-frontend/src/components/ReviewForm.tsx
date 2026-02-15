'use client';

import { useState } from 'react';
import { StarRating } from './StarRating';
import { Loader2 } from 'lucide-react';

interface ReviewFormProps {
  sellerName: string;
  onSubmit: (data: { rating: number; comment: string }) => Promise<void>;
  isSubmitting?: boolean;
}

export function ReviewForm({ sellerName, onSubmit, isSubmitting }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Veuillez sélectionner une note');
      return;
    }

    try {
      await onSubmit({ rating, comment });
      setRating(0);
      setComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border">
      <h3 className="text-lg font-semibold mb-4">Évaluez {sellerName}</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Votre note *
        </label>
        <StarRating rating={rating} onRate={setRating} size="lg" />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Votre avis (optionnel)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Partagez votre expérience avec ce vendeur..."
          rows={4}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {error && (
        <p className="text-red-500 text-sm mb-4">{error}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || rating === 0}
        className="w-full py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Envoi...
          </>
        ) : (
          'Soumettre mon avis'
        )}
      </button>
    </form>
  );
}
