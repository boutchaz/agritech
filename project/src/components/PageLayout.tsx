import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
}

export function PageLayout({
  children,
  className = '',
  header,
}: PageLayoutProps) {
  return (
    <div className={className}>
      {header}
      {children}
    </div>
  );
}

export default PageLayout;
