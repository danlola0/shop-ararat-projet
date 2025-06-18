import React, { useState, useEffect } from 'react';
import araratImage from '../../images/ararat.jpg';

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
        {/* Image */}
        <div className="mb-8">
          <img 
            src={araratImage} 
            alt="Ararat Projet" 
            className="w-32 h-32 sm:w-40 sm:h-40 mx-auto rounded-full object-cover shadow-2xl border-4 border-white/20"
          />
        </div>
        
        {/* Texte de bienvenue */}
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
            Bienvenue sur
          </h1>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-blue-300 mb-4">
            Ararat Projet
          </h2>
          <p className="text-lg sm:text-xl text-blue-100 max-w-md mx-auto">
            Gestion intelligente de vos boutiques
          </p>
        </div>
        
        {/* Indicateur de chargement */}
        <div className="mt-8">
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
      
      {/* Effet de particules */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}
      </div>
    </div>
  );
}; 