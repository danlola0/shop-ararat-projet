import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Afficher la splash screen pendant 3 secondes
    const timer = setTimeout(() => {
      setFadeOut(true);
      
      // Attendre la fin de l'animation de fade-out avant de fermer
      setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 500);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
      fadeOut ? 'opacity-0' : 'opacity-100'
    }`}>
      {/* Fond avec gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900"></div>
      
      {/* Contenu principal */}
      <div className="relative z-10 text-center">
        {/* Logo animé */}
        <div className="mb-8">
          <img 
            src="/Ararat Projet Digital Services Logo - Vibrant Colors.png" 
            alt="Ararat Projet" 
            className="w-32 h-32 sm:w-40 sm:h-40 mx-auto rounded-full object-cover shadow-2xl border-4 border-white/20 animate-pulse"
            style={{ animation: 'pulseLogo 2s infinite' }}
          />
        </div>
        
        {/* Texte de bienvenue avec effet glow */}
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2 drop-shadow-lg" style={{ textShadow: '0 0 16px #60a5fa, 0 0 32px #818cf8' }}>
            Bienvenue sur
          </h1>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-blue-300 mb-4 drop-shadow-lg" style={{ textShadow: '0 0 24px #818cf8, 0 0 48px #a5b4fc' }}>
            Ararat Projet
          </h2>
          <p className="text-lg sm:text-xl text-blue-100 max-w-md mx-auto animate-fadein">
            Gestion intelligente de vos boutiques
          </p>
        </div>
        
        {/* Loader circulaire SVG animé */}
        <div className="mt-8 flex justify-center">
          <svg className="animate-spin-slow" width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#fff" strokeWidth="4" opacity="0.2" />
            <circle cx="24" cy="24" r="20" fill="none" stroke="#60a5fa" strokeWidth="4" strokeDasharray="100" strokeDashoffset="60" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      
      {/* Effet de particules amélioré */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(24)].map((_, i) => {
          const size = Math.random() * 2 + 1.5;
          const color = [
            'bg-white/30',
            'bg-blue-200/30',
            'bg-purple-200/30',
            'bg-blue-400/20',
            'bg-indigo-200/30'
          ][Math.floor(Math.random() * 5)];
          return (
            <div
              key={i}
              className={`absolute rounded-full animate-pulse ${color}`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${size * 6}px`,
                height: `${size * 6}px`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
                filter: 'blur(0.5px)'
              }}
            />
          );
        })}
      </div>
      {/* Animation CSS personnalisée */}
      <style>{`
        @keyframes pulseLogo {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); box-shadow: 0 0 32px #60a5fa44, 0 0 64px #818cf844; }
        }
        .animate-spin-slow {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
        .animate-fadein {
          animation: fadein 1.2s;
        }
        @keyframes fadein {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}; 