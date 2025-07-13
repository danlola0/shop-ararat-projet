import React, { useState, useRef, useEffect } from 'react';
import { Header, HeaderRef } from './components/Layout/Header';
import { Sidebar } from './components/Layout/Sidebar';
import { Dashboard } from './components/Dashboard/Dashboard';
import { FormsPage } from './components/Forms/FormsPage';
import { AdminPage } from './components/Admin/AdminPage';
import { ShopsPage } from './components/Shops/ShopsPage';
import { UsersPage } from './components/Users/UsersPage';
import { SettingsPage } from './components/Settings/SettingsPage';
import { MessagingPage } from './components/Messaging/MessagingPage';
import { AuthPage } from './components/Auth/AuthPage';
import { SplashScreen } from './components/SplashScreen';
import { useAuth } from './hooks/useAuth';
import SynthesePage from './components/Shops/SynthesePage';
import RapportsDonneesPage from './components/Shops/RapportsDonneesPage';
// import PwaInstallBanner from './components/PwaInstallBanner'; // PWA temporairement désactivé
// import TauxPage from './components/Taux/TauxPage'; // Suppression de l'import

function App() {
  const [activeTab, setActiveTab] = useState('forms');
  const [showMessaging, setShowMessaging] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  
  const { currentUser, loading, logout } = useAuth();
  
  // Référence pour mettre à jour les notifications
  const updateNotificationsRef = useRef<HeaderRef | null>(null);

  // Diagnostic pour identifier les problèmes sur mobile
  useEffect(() => {
    const runDiagnostic = () => {
      console.log('=== DIAGNOSTIC MOBILE ===');
      console.log('User Agent:', navigator.userAgent);
      console.log('Viewport:', window.innerWidth, 'x', window.innerHeight);
      console.log('Screen:', screen.width, 'x', screen.height);
      console.log('Device Pixel Ratio:', window.devicePixelRatio);
      console.log('Cookies enabled:', navigator.cookieEnabled);
      console.log('Local Storage:', typeof localStorage !== 'undefined');
      console.log('Session Storage:', typeof sessionStorage !== 'undefined');
      console.log('IndexedDB:', typeof indexedDB !== 'undefined');
      console.log('Service Worker:', 'serviceWorker' in navigator);
      console.log('Fetch API:', typeof fetch !== 'undefined');
      console.log('Promise:', typeof Promise !== 'undefined');
      console.log('URL:', window.location.href);
      console.log('Protocol:', window.location.protocol);
      console.log('Hostname:', window.location.hostname);
      console.log('Port:', window.location.port);
      
      // Test de performance
      const startTime = performance.now();
      console.log('Performance API available:', typeof performance !== 'undefined');
      
      // Test de rendu
      const testElement = document.createElement('div');
      testElement.style.position = 'absolute';
      testElement.style.left = '-9999px';
      testElement.textContent = 'Test de rendu';
      document.body.appendChild(testElement);
      const computedStyle = window.getComputedStyle(testElement);
      console.log('CSS computed styles working:', computedStyle.position === 'absolute');
      document.body.removeChild(testElement);
      
      console.log('Diagnostic completed in:', performance.now() - startTime, 'ms');
      console.log('=== FIN DIAGNOSTIC ===');
    };

    // Exécuter le diagnostic après un délai
    const timer = setTimeout(runDiagnostic, 2000);
    
    // Afficher le diagnostic sur mobile si problème détecté
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      const errorTimer = setTimeout(() => {
        setShowDiagnostic(true);
      }, 10000); // Afficher après 10 secondes si problème
      
      return () => {
        clearTimeout(timer);
        clearTimeout(errorTimer);
      };
    }
    
    return () => clearTimeout(timer);
  }, []);

  // Forcer la redirection vers 'forms' pour les users
  useEffect(() => {
    if (currentUser && currentUser.role === 'user' && activeTab !== 'forms') {
      setActiveTab('forms');
    }
  }, [currentUser, activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={currentUser!} />;
      case 'synthese':
        return <SynthesePage />;
      case 'rapports-donnees':
        return <RapportsDonneesPage />;
      case 'forms':
        return <FormsPage />;
      case 'admin':
        return <AdminPage user={currentUser!} />;
      case 'shops':
        return <ShopsPage user={currentUser!} />;
      case 'users':
        return <UsersPage user={currentUser!} />;
      case 'settings':
        return <SettingsPage user={currentUser!} />;
      // case 'taux':
      //   return <TauxPage user={currentUser!} />;
      default:
        return <FormsPage />;
    }
  };

  // Fonction pour mettre à jour les notifications
  const updateNotifications = () => {
    if (updateNotificationsRef.current) {
      updateNotificationsRef.current.updateNotifications();
    }
  };

  // Afficher la splash screen au démarrage
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Afficher un loader pendant le chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Afficher la page d'authentification si l'utilisateur n'est pas connecté
  if (!currentUser) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={currentUser} 
        onLogout={logout} 
        onMessagesClick={() => setShowMessaging(true)}
        onDashboardClick={() => setActiveTab('dashboard')}
        onMenuToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
        ref={updateNotificationsRef}
      />
      
      <div className="flex">
        <Sidebar 
          user={currentUser} 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        
        <main className="flex-1 min-h-screen w-full lg:ml-0">
          {renderContent()}
        </main>
      </div>

      {showMessaging && (
        <MessagingPage 
          user={currentUser} 
          onClose={() => setShowMessaging(false)}
          onMessageRead={updateNotifications}
        />
      )}
      
      {/* Diagnostic modal pour mobile */}
      {showDiagnostic && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Diagnostic Mobile</h3>
            <div className="text-sm space-y-2 mb-4">
              <p><strong>Navigateur:</strong> {navigator.userAgent.split(' ').slice(-2).join(' ')}</p>
              <p><strong>Écran:</strong> {screen.width} x {screen.height}</p>
              <p><strong>Viewport:</strong> {window.innerWidth} x {window.innerHeight}</p>
              <p><strong>URL:</strong> {window.location.href}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDiagnostic(false)}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded"
              >
                Fermer
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded"
              >
                Recharger
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* <PwaInstallBanner /> PWA temporairement désactivé */}
    </div>
  );
}

export default App;