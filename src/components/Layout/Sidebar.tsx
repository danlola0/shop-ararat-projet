import React from 'react';
import { Home, FileText, BarChart3, Users, Settings, TrendingUp, X, Building } from 'lucide-react';
import { User } from '../../types';

interface SidebarProps {
  user: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  user, 
  activeTab, 
  onTabChange, 
  isOpen = true,
  onClose 
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: TrendingUp, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { id: 'forms', label: 'Formulaires', icon: FileText, color: 'text-green-600', bgColor: 'bg-green-50' },
    ...(user.role === 'admin' ? [
      { id: 'admin', label: 'Administration', icon: BarChart3, color: 'text-purple-600', bgColor: 'bg-purple-50' },
      { id: 'shops', label: 'Shops', icon: Building, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
      { id: 'users', label: 'Utilisateurs', icon: Users, color: 'text-orange-600', bgColor: 'bg-orange-50' },
      { id: 'settings', label: 'Paramètres', icon: Settings, color: 'text-gray-600', bgColor: 'bg-gray-50' }
    ] : [])
  ];

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    // Fermer la sidebar sur mobile après sélection
    if (window.innerWidth < 1024 && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay pour mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50
        bg-white border-r border-gray-200 shadow-sm
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        w-64 lg:w-64 min-h-screen
      `}>
        {/* Header de la sidebar */}
        <div className="p-4 lg:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Home size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Shop Ararat Projet</h2>
                <p className="text-sm text-gray-600">{user.shopName}</p>
              </div>
            </div>
            {/* Bouton fermer sur mobile */}
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="mt-6 flex-1 overflow-y-auto">
          <div className="px-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                    isActive
                      ? `${item.bgColor} ${item.color} shadow-md border-2 border-current`
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-2 border-transparent'
                  }`}
                >
                  <div className={`p-2 rounded-lg mr-3 ${isActive ? 'bg-white shadow-sm' : 'group-hover:bg-white'}`}>
                    <Icon size={18} className={isActive ? item.color : 'text-gray-500'} />
                  </div>
                  <span className="font-semibold">{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-2 h-2 bg-current rounded-full"></div>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Accès rapide au Dashboard - caché sur mobile */}
        {activeTab !== 'dashboard' && (
          <div className="px-4 mt-6 hidden lg:block">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Accès Rapide</h3>
              <button
                onClick={() => handleTabChange('dashboard')}
                className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <TrendingUp size={16} />
                <span>Voir le Dashboard</span>
              </button>
            </div>
          </div>
        )}

        {/* User Info - adapté pour mobile */}
        <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
              <span className="text-sm font-bold text-white">
                {user.prenom.charAt(0)}{user.nom.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {user.prenom} {user.nom}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {user.poste} • {user.role}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};