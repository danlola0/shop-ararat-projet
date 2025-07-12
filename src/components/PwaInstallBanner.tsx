import React, { useEffect, useState } from 'react';

const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted' || outcome === 'dismissed') {
        setShowBanner(false);
        setDeferredPrompt(null);
      }
    }
  };

  if (!showBanner) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      left: 0,
      right: 0,
      margin: '0 auto',
      maxWidth: 400,
      background: 'white',
      border: '2px solid #1976d2',
      borderRadius: 16,
      boxShadow: '0 4px 16px rgba(25, 118, 210, 0.15)',
      zIndex: 1000,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
    }}>
      <span style={{ color: '#1976d2', fontWeight: 700, fontSize: 18 }}>📲 Installer l'application&nbsp;?</span>
      <span style={{ color: '#333', fontSize: 15, textAlign: 'center' }}>
        Ajoutez Shop Ararat sur votre écran d'accueil pour une expérience optimale sur mobile.
      </span>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={handleInstall}
          style={{
            background: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 15,
          }}
        >
          Installer
        </button>
        <button
          onClick={() => setShowBanner(false)}
          style={{
            background: '#e53935',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 15,
          }}
        >
          Fermer
        </button>
      </div>
    </div>
  );
};

export default PwaInstallBanner; 