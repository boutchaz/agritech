import { User } from 'lucide-react';

interface AuthorProfileProps {
  author: string;
}

export function AuthorProfile({ author }: AuthorProfileProps) {
  // In a real app, you'd fetch author details from an API
  const authorInfo = {
    name: author,
    bio: 'Agricultural technology expert with years of experience in farm management and digital transformation.',
    avatar: null, // Could be fetched from API
  };

  return (
    <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {authorInfo.avatar ? (
            <img
              src={authorInfo.avatar}
              alt={authorInfo.name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <User className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {authorInfo.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {authorInfo.bio}
          </p>
        </div>
      </div>
    </div>
  );
}
