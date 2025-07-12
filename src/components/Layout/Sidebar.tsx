import React from 'react';
import { Home, FileText, BarChart3, Users, Settings, TrendingUp, X, Building, DollarSign } from 'lucide-react';
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
    ...(user.role && user.role.toLowerCase() === 'admin'
      ? [
          { id: 'dashboard', label: 'Tableau de Bord', icon: TrendingUp, color: 'text-blue-600', bgColor: 'bg-blue-50' },
          { id: 'synthese', label: 'Synthèse', icon: BarChart3, color: 'text-cyan-700', bgColor: 'bg-cyan-100' },
          { id: 'forms', label: 'Formulaires', icon: FileText, color: 'text-green-600', bgColor: 'bg-green-50' },
          { id: 'shops', label: 'Shops', icon: Building, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
          { id: 'users', label: 'Utilisateurs', icon: Users, color: 'text-orange-600', bgColor: 'bg-orange-50' },
          // Onglet 'Taux' supprimé
          { id: 'settings', label: 'Paramètres', icon: Settings, color: 'text-gray-600', bgColor: 'bg-gray-50' }
        ]
      : [
          { id: 'forms', label: 'Formulaires', icon: FileText, color: 'text-green-600', bgColor: 'bg-green-50' }
        ]),
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
        bg-white border-r border-gray-200 shadow-lg
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        w-64 lg:w-64 min-h-screen flex flex-col
      `}>
        {/* Header de la sidebar */}
        <div className="p-6 border-b border-gray-200 flex items-center gap-3 bg-gradient-to-r from-blue-50 to-white">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center shadow">
            <Home size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-blue-900 leading-tight">Shop Ararat Projet</h2>
            <p className="text-xs text-blue-700 mt-1">{user.shopName}</p>
          </div>
        </div>
        {/* Navigation */}
        <nav className="flex-1 py-6 space-y-1 bg-white">
          {menuItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`
                flex items-center gap-3 w-full px-5 py-3 rounded-lg transition-colors font-medium
                ${activeTab === item.id
                  ? 'bg-blue-100 text-blue-800 shadow border-l-4 border-blue-600'
                  : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}
              `}
            >
              <item.icon size={20} className={activeTab === item.id ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'} />
              <span className="text-base">{item.label}</span>
            </button>
          ))}
        </nav>
        {/* Footer utilisateur */}
        <div className="p-5 border-t border-gray-100 bg-blue-50 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow">
            {user.prenom?.charAt(0)}{user.nom?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 truncate">{user.prenom} {user.nom}</div>
            <div className="text-xs text-blue-700 truncate">{user.shopName} • {user.role}</div>
          </div>
        </div>
      </div>
    </>
  );
};