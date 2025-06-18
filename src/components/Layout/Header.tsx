import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { LogOut, MessageCircle, User, BarChart3, Menu, X } from 'lucide-react';
import { User as UserType } from '../../types';
import { messageService, isGlobalAdmin } from '../../services/firestore';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  user: UserType;
  onLogout: () => void;
  onMessagesClick: () => void;
  onDashboardClick?: () => void;
  onMenuToggle?: () => void;
  isSidebarOpen?: boolean;
}

export interface HeaderRef {
  updateNotifications: () => void;
}

export const Header = forwardRef<HeaderRef, HeaderProps>(({ 
  user, 
  onLogout, 
  onMessagesClick, 
  onDashboardClick,
  onMenuToggle,
  isSidebarOpen = false
}, ref) => {
  const { currentUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Récupérer le nombre de messages non lus
  const fetchUnreadCount = async () => {
    if (!currentUser) return;

    try {
      let messages;
      if (isGlobalAdmin(currentUser)) {
        // Admin global voit tous les messages
        messages = await messageService.getAllForAdmin(currentUser);
      } else {
        // Utilisateur normal voit ses messages
        messages = await messageService.getByUser(currentUser.id);
      }

      // Compter les messages non lus reçus par l'utilisateur
      const unreadMessages = messages.filter(msg => 
        msg.status === 'non-lu' && msg.recipientId === currentUser.id
      );
      
      setUnreadCount(unreadMessages.length);
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre de messages non lus:', error);
    }
  };

  // Exposer la fonction de mise à jour au parent
  useImperativeHandle(ref, () => ({
    updateNotifications: fetchUnreadCount
  }));

  // Charger le nombre de messages non lus au montage et toutes les 30 secondes
  useEffect(() => {
    if (currentUser) {
      fetchUnreadCount();
      
      // Actualiser toutes les 30 secondes
      const interval = setInterval(fetchUnreadCount, 30000);
      
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Réinitialiser le compteur quand on clique sur messages
  const handleMessagesClick = () => {
    setUnreadCount(0);
    onMessagesClick();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo et titre */}
          <div className="flex items-center space-x-4">
            {/* Bouton menu mobile */}
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            <div className="flex-shrink-0 flex items-center space-x-3">
              {/* Logo image */}
              <img 
                src="/images/ararat.jpg" 
                alt="Shop Ararat Logo" 
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover shadow-sm"
              />
              
              {/* Titre - caché sur très petit écran */}
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 hidden xs:block">
                <span className="hidden sm:inline">Shop Ararat Projet</span>
                <span className="sm:hidden">Shop Ararat</span>
              </h1>
            </div>
            
            {/* Bouton Dashboard - caché sur mobile */}
            <button
              onClick={onDashboardClick}
              className="hidden sm:flex items-center space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm"
            >
              <BarChart3 size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="font-medium hidden md:inline">Tableau de Bord</span>
              <span className="font-medium md:hidden">Dashboard</span>
            </button>
          </div>
          
          {/* Actions utilisateur */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Info shop - cachée sur très petit écran */}
            <div className="hidden xs:block text-xs sm:text-sm text-gray-600">
              <span className="hidden sm:inline">Bienvenue dans le shop </span>
              <span className="font-semibold text-blue-600">{user.shopName}</span>
            </div>
            
            {/* Bouton messages avec notification */}
            <button
              onClick={handleMessagesClick}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors relative"
            >
              <MessageCircle size={18} className="sm:w-5 sm:h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            
            {/* Info utilisateur - adaptée pour mobile */}
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
              <User size={16} />
              <span>{user.prenom} {user.nom}</span>
            </div>
            
            {/* Avatar utilisateur sur mobile */}
            <div className="sm:hidden flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {user.prenom.charAt(0)}{user.nom.charAt(0)}
                </span>
              </div>
            </div>
            
            {/* Bouton déconnexion */}
            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            >
              <LogOut size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
        
        {/* Menu mobile déroulant */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <User size={16} />
                <span>{user.prenom} {user.nom}</span>
              </div>
              <div className="text-sm text-gray-600">
                Shop: <span className="font-semibold text-blue-600">{user.shopName}</span>
              </div>
              <button
                onClick={onDashboardClick}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <BarChart3 size={16} />
                <span>Tableau de Bord</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
});