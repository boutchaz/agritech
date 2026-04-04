import UserAvatar from '@/components/ui/UserAvatar';

interface UserMessageProps {
  content: string;
  timestamp: Date;
  avatarUrl?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  image?: string;
}

export function UserMessage({ content, timestamp, avatarUrl, firstName, lastName, email, image }: UserMessageProps) {
  return (
    <div className="flex gap-3 justify-end">
      <div className="max-w-[80%] rounded-lg px-4 py-2 bg-primary text-primary-foreground">
        {image && (
          <img
            src={image}
            alt="Uploaded crop"
            className="max-h-32 w-auto rounded-md mb-2 ml-auto"
          />
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
        <span className="text-xs opacity-70 mt-1 block">
          {timestamp.toLocaleTimeString()}
        </span>
      </div>
      <UserAvatar
        src={avatarUrl}
        firstName={firstName}
        lastName={lastName}
        email={email}
        size="sm"
      />
    </div>
  );
}
