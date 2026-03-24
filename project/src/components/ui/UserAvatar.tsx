import React, { useState } from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface UserAvatarProps {
  src?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  size?: AvatarSize;
  className?: string;
}

const sizeMap: Record<AvatarSize, { container: string; text: string; icon: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]', icon: 'h-3 w-3' },
  sm: { container: 'w-8 h-8', text: 'text-xs', icon: 'h-4 w-4' },
  md: { container: 'w-10 h-10', text: 'text-sm', icon: 'h-5 w-5' },
  lg: { container: 'w-16 h-16', text: 'text-xl', icon: 'h-8 w-8' },
  xl: { container: 'w-24 h-24', text: 'text-2xl', icon: 'h-10 w-10' },
};

function getInitials(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  if (firstName) {
    return (firstName[0] + (lastName?.[0] || '')).toUpperCase();
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return '?';
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  src,
  firstName,
  lastName,
  email,
  size = 'sm',
  className,
}) => {
  const [imgError, setImgError] = useState(false);
  const s = sizeMap[size];
  const showImage = src && !imgError;

  if (showImage) {
    return (
      <img
        src={src}
        alt={firstName ? `${firstName} ${lastName || ''}`.trim() : email || ''}
        onError={() => setImgError(true)}
        className={cn(s.container, 'rounded-full object-cover', className)}
      />
    );
  }

  const initials = getInitials(firstName, lastName, email);

  if (initials === '?') {
    return (
      <div className={cn(s.container, 'rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center', className)}>
        <User className={cn(s.icon, 'text-gray-400')} />
      </div>
    );
  }

  return (
    <div className={cn(s.container, 'rounded-full bg-green-600 flex items-center justify-center', className)}>
      <span className={cn(s.text, 'font-medium text-white leading-none')}>
        {initials}
      </span>
    </div>
  );
};

export default UserAvatar;
