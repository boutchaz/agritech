import React from 'react';

interface CommentDisplayProps {
  comment: string;
}

/**
 * Renders a comment with @mentions highlighted.
 * Mention format: @[Name](userId)
 */
export default function CommentDisplay({ comment }: CommentDisplayProps) {
  const mentionRegex = /@\[([^\]]+)\]\([^)]+\)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = mentionRegex.exec(comment)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {comment.slice(lastIndex, match.index)}
        </span>
      );
    }

    // Add the mention as a highlighted badge
    const displayName = match[1];
    const matchPos = match.index;
    parts.push(
      <span
        key={`mention-${matchPos}`}
        className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
      >
        @{displayName}
      </span>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < comment.length) {
    parts.push(
      <span key={`text-${lastIndex}`}>
        {comment.slice(lastIndex)}
      </span>
    );
  }

  // If no mentions found, just render plain text
  if (parts.length === 0) {
    return <span className="whitespace-pre-wrap">{comment}</span>;
  }

  return <span className="whitespace-pre-wrap">{parts}</span>;
}
