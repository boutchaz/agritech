import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavBarProps {
  title: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  onBackClick?: () => void;
  className?: string;
}

export const MobileNavBar: React.FC<MobileNavBarProps> = ({
  title,
  showBackButton = true,
  showHomeButton = true,
  onBackClick,
  className,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      window.history.back();
    }
  };

  const handleHome = () => {
    navigate({ to: "/" });
  };

  return (
    <div
      className={cn(
        "lg:hidden flex items-center gap-2 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700",
        // Add left padding to make room for hamburger menu button (16px margin + 40px button + 8px gap = 64px)
        "pl-16 pr-3",
        className,
      )}
    >
      {showBackButton && (
        <button
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      )}
      <h1 className="text-base font-semibold text-gray-900 dark:text-white flex-1 truncate">
        {title}
      </h1>
      {showHomeButton && (
        <button
          onClick={handleHome}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          aria-label="Go to home"
        >
          <Home className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      )}
    </div>
  );
};
