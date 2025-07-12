import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { LogOut, MessageCircle, User, BarChart3, Menu, X, FileText, Bell } from 'lucide-react';
import { User as UserType } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Link } from 'react-router-dom';

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
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const [showNewMessageNotification, setShowNewMessageNotification] = useState(false);
  const [rapports, setRapports] = useState<any[]>([]);
  const [showRapports, setShowRapports] = useState(false);
  const [lastSeenRapportDate, setLastSeenRapportDate] = useState<string | null>(null);
  const [newRapportCount, setNewRapportCount] = useState(0);

  // Récupérer le nombre de messages non lus
  const fetchUnreadCount = async () => {
    if (!currentUser) return;

    try {
      // Charger les messages depuis Firestore
      const messagesSnapshot = await getDocs(collection(db, 'messages'));
      const allMessages = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filtrer les messages non lus destinés à l'utilisateur courant
      const unreadMessages = allMessages.filter(
        msg =>
          msg.status === 'non-lu' &&
          (
            msg.recipientId === currentUser.id ||
            msg.recipientId === 'ALL_USERS' ||
            msg.recipientId === 'SHOP_USERS_' + currentUser.shopId
          )
      );

      const newCount = unreadMessages.length;

      // Détecter si il y a de nouveaux messages
      if (newCount > previousUnreadCount && previousUnreadCount > 0) {
        setShowNewMessageNotification(true);
        setTimeout(() => setShowNewMessageNotification(false), 5000);
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
          audio.play();
        } catch (e) {}
      }

      setPreviousUnreadCount(newCount);
      setUnreadCount(newCount);
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre de messages non lus:', error);
    }
  };

  // Récupérer les 5 derniers rapports de caisse
  const fetchRapports = async () => {
    const q = query(collection(db, 'rapports_caisse'), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setRapports(data.slice(0, 5));
    // Badge nouveaux rapports
    if (data.length > 0) {
      const latestDate = data[0].date;
      if (lastSeenRapportDate && latestDate > lastSeenRapportDate) {
        const newCount = data.filter(r => r.date > lastSeenRapportDate).length;
        setNewRapportCount(newCount);
      } else if (!lastSeenRapportDate) {
        setNewRapportCount(data.length);
      } else {
        setNewRapportCount(0);
      }
    }
  };

  // Exposer la fonction de mise à jour au parent
  useImperativeHandle(ref, () => ({
    updateNotifications: fetchUnreadCount
  }));

  // Charger le nombre de messages non lus au montage et toutes les 10 secondes
  useEffect(() => {
    if (currentUser) {
      fetchUnreadCount();
      
      // Actualiser toutes les 10 secondes pour une meilleure réactivité
      const interval = setInterval(fetchUnreadCount, 10000);
      
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchRapports();
    // Optionnel : actualiser toutes les 60s
    const interval = setInterval(fetchRapports, 60000);
    return () => clearInterval(interval);
  }, [lastSeenRapportDate]);

  // Réinitialiser le compteur quand on clique sur messages
  const handleMessagesClick = () => {
    setUnreadCount(0);
    onMessagesClick();
  };

  const handleRapportsClick = () => {
    setShowRapports(!showRapports);
    if (rapports.length > 0) {
      setLastSeenRapportDate(rapports[0].date);
      setNewRapportCount(0);
    }
  };

  return (
    <header className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo et titre */}
          <div className="flex items-center space-x-4">
            {/* Bouton menu mobile */}
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 text-gray-600 hover:text-blue-700 transition-colors rounded-full bg-blue-50 shadow-sm"
            >
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div className="flex-shrink-0 flex items-center space-x-3">
              {/* Logo image */}
              <img 
                src="/Ararat Projet Digital Services Logo - Vibrant Colors.png" 
                alt="Shop Ararat Logo" 
                className="w-12 h-12 rounded-lg object-cover shadow-md border-2 border-blue-100"
              />
              {/* Titre - caché sur très petit écran */}
              <h1 className="text-xl sm:text-2xl font-extrabold text-blue-900 hidden xs:block tracking-tight drop-shadow-sm">
                <span className="hidden sm:inline">Shop Ararat Projet</span>
                <span className="sm:hidden">Shop Ararat</span>
              </h1>
            </div>
            {/* Bouton Dashboard - caché sur mobile */}
            <button
              onClick={onDashboardClick}
              className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-semibold"
            >
              <BarChart3 size={18} className="sm:w-[20px] sm:h-[20px]" />
              <span className="font-medium hidden md:inline">Tableau de Bord</span>
              <span className="font-medium md:hidden">Dashboard</span>
            </button>
          </div>
          {/* Actions utilisateur */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMessagesClick}
              className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 shadow-sm transition-colors"
              title="Messages"
            >
              <MessageCircle size={20} />
            </button>
            <button
              className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 shadow-sm transition-colors"
              title="Notifications"
            >
              <Bell size={20} />
            </button>
            <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-lg shadow-sm">
              <User size={16} />
              <span className="font-semibold text-blue-900">{user.prenom} {user.nom}</span>
            </div>
            {/* Avatar utilisateur sur mobile */}
            <div className="sm:hidden flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow">
                <span className="text-xs font-bold text-white">
                  {user.prenom.charAt(0)}{user.nom.charAt(0)}
                </span>
              </div>
            </div>
            {/* Bouton déconnexion */}
            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-full bg-red-50 hover:bg-red-100 shadow-sm"
              title="Déconnexion"
            >
              <LogOut size={20} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
});