import React, { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  rotation: number;
  scale: number;
  velocityX: number;
  velocityY: number;
  type: 'circle' | 'square' | 'triangle';
}

interface ConfettiEffectProps {
  isActive: boolean;
  duration?: number;
  particleCount?: number;
  colors?: string[];
  onComplete?: () => void;
}

export const ConfettiEffect: React.FC<ConfettiEffectProps> = ({
  isActive,
  duration = 3000,
  particleCount = 100,
  colors = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'],
  onComplete,
}) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!isActive) {
      setParticles([]);
      return;
    }

    // Generate particles
    const types: Particle['type'][] = ['circle', 'square', 'triangle'];
    const newParticles: Particle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 20, // Start from center-ish
      y: 40,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      scale: Math.random() * 0.5 + 0.5,
      velocityX: (Math.random() - 0.5) * 15,
      velocityY: Math.random() * -15 - 5,
      type: types[Math.floor(Math.random() * types.length)],
    }));

    setParticles(newParticles);

    // Clear after duration
    const timer = setTimeout(() => {
      setParticles([]);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [isActive, particleCount, colors, duration, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-confetti"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            '--velocityX': `${particle.velocityX}vw`,
            '--velocityY': `${particle.velocityY}vh`,
            '--rotation': `${particle.rotation}deg`,
            animationDuration: `${duration}ms`,
          } as React.CSSProperties}
        >
          {particle.type === 'circle' && (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: particle.color, transform: `scale(${particle.scale})` }}
            />
          )}
          {particle.type === 'square' && (
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: particle.color, transform: `scale(${particle.scale})` }}
            />
          )}
          {particle.type === 'triangle' && (
            <div
              className="w-0 h-0"
              style={{
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: `10px solid ${particle.color}`,
                transform: `scale(${particle.scale})`,
              }}
            />
          )}
        </div>
      ))}

      <style>{`
        @keyframes confetti {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(var(--velocityX), calc(100vh + var(--velocityY))) rotate(calc(var(--rotation) + 720deg));
            opacity: 0;
          }
        }
        
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
};

// Mini confetti for step completions
export const MiniConfetti: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  return (
    <ConfettiEffect
      isActive={isActive}
      duration={1500}
      particleCount={30}
      colors={['#10B981', '#34D399', '#6EE7B7']}
    />
  );
};

export default ConfettiEffect;
