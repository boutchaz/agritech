import React, { useState, useEffect, useRef } from 'react';

type Direction = 'forward' | 'backward';

interface StepTransitionProps {
  children: React.ReactNode;
  stepKey: string | number;
  direction?: Direction;
}

export const StepTransition: React.FC<StepTransitionProps> = ({
  children,
  stepKey,
  direction = 'forward',
}) => {
  const [displayChildren, setDisplayChildren] = useState(children);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationClass, setAnimationClass] = useState('');
  const previousKeyRef = useRef(stepKey);

  useEffect(() => {
    if (stepKey !== previousKeyRef.current) {
      // Start exit animation
      setIsAnimating(true);
      setAnimationClass(direction === 'forward' ? 'exit-left' : 'exit-right');

      // After exit animation, swap content and start enter animation
      const exitTimer = setTimeout(() => {
        setDisplayChildren(children);
        setAnimationClass(direction === 'forward' ? 'enter-right' : 'enter-left');
        
        // After enter animation completes
        const enterTimer = setTimeout(() => {
          setIsAnimating(false);
          setAnimationClass('');
        }, 400);

        return () => clearTimeout(enterTimer);
      }, 300);

      previousKeyRef.current = stepKey;
      return () => clearTimeout(exitTimer);
    } else {
      setDisplayChildren(children);
    }
  }, [stepKey, children, direction]);

  return (
    <div className="relative overflow-hidden">
      <div
        className={`
          transition-all duration-300 ease-out
          ${animationClass === 'exit-left' ? 'opacity-0 -translate-x-8' : ''}
          ${animationClass === 'exit-right' ? 'opacity-0 translate-x-8' : ''}
          ${animationClass === 'enter-right' ? 'animate-slide-in-right' : ''}
          ${animationClass === 'enter-left' ? 'animate-slide-in-left' : ''}
          ${!isAnimating && !animationClass ? 'opacity-100 translate-x-0' : ''}
        `}
      >
        {displayChildren}
      </div>

      <style>{`
        @keyframes slideInRight {
          0% {
            opacity: 0;
            transform: translateX(30px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideInLeft {
          0% {
            opacity: 0;
            transform: translateX(-30px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-slide-in-right {
          animation: slideInRight 0.4s ease-out forwards;
        }
        
        .animate-slide-in-left {
          animation: slideInLeft 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default StepTransition;
