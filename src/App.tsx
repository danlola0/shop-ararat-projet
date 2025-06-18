import React, { useState, useRef } from 'react';
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

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMessaging, setShowMessaging] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  
  const { currentUser, loading, logout } = useAuth();
  
  // Référence pour mettre à jour les notifications
  const updateNotificationsRef = useRef<HeaderRef | null>(null);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard user={currentUser!} />;
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
      default:
        return <Dashboard user={currentUser!} />;
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
    </div>
  );
}

export default App;