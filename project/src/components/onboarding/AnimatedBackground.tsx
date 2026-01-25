import React, { useEffect, useState } from 'react';

interface FloatingElement {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  type: 'leaf' | 'seed' | 'sparkle';
}

const FloatingIcon: React.FC<{ type: FloatingElement['type']; className?: string; size?: number }> = ({ type, className, size = 24 }) => {
  const svgStyle = { width: size, height: size };
  if (type === 'leaf') {
    return (
      <svg className={className} style={svgStyle} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
      </svg>
    );
  }
  if (type === 'seed') {
    return (
      <svg className={className} style={svgStyle} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12C4,14.09 4.8,16 6.11,17.41L9.88,9.88L17.41,6.11C16,4.8 14.09,4 12,4M12,20A8,8 0 0,0 20,12C20,9.91 19.2,8 17.89,6.59L14.12,14.12L6.59,17.89C8,19.2 9.91,20 12,20Z" />
      </svg>
    );
  }
  // sparkle
  return (
    <svg className={className} style={svgStyle} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12,2L14.39,8.25L21,9.24L16.5,13.47L17.77,20L12,16.77L6.23,20L7.5,13.47L3,9.24L9.61,8.25L12,2Z" />
    </svg>
  );
};

export const AnimatedBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [elements, setElements] = useState<FloatingElement[]>([]);

  useEffect(() => {
    // Generate random floating elements
    const types: FloatingElement['type'][] = ['leaf', 'seed', 'sparkle'];
    const newElements: FloatingElement[] = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 16 + 8,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * 10,
      type: types[Math.floor(Math.random() * types.length)],
    }));
    setElements(newElements);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-green-50 to-sky-50"
        style={{
          backgroundSize: '400% 400%',
          animation: 'gradientShift 15s ease infinite',
        }}
      />

      {/* Floating elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {elements.map((el) => (
          <div
            key={el.id}
            className="absolute opacity-20"
            style={{
              left: `${el.x}%`,
              top: `${el.y}%`,
              animation: `float ${el.duration}s ease-in-out infinite`,
              animationDelay: `${el.delay}s`,
            }}
          >
            <FloatingIcon
              type={el.type}
              className="text-emerald-600"
              size={el.size}
            />
          </div>
        ))}
      </div>

      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(16, 185, 129) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg); 
            opacity: 0.15;
          }
          25% {
            transform: translateY(-20px) rotate(5deg);
            opacity: 0.25;
          }
          50% { 
            transform: translateY(-10px) rotate(-3deg); 
            opacity: 0.2;
          }
          75% {
            transform: translateY(-25px) rotate(3deg);
            opacity: 0.15;
          }
        }
      `}</style>
    </div>
  );
};

export default AnimatedBackground;
