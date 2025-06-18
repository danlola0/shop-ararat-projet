import React, { useState } from 'react';
import { 
  Settings, 
  User, 
  Shield, 
  Bell, 
  Palette, 
  Database, 
  Globe, 
  Save, 
  X,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Building,
  Calendar,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Info
} from 'lucide-react';
import { User as UserType } from '../../types';

interface SettingsPageProps {
  user?: UserType;
}

interface ProfileSettings {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  poste: string;
}

interface SecuritySettings {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showCurrentPassword: boolean;
  showNewPassword: boolean;
  showConfirmPassword: boolean;
}

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  dailyReports: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto';
  language: 'fr' | 'en';
  compactMode: boolean;
  showAnimations: boolean;
}

interface SystemSettings {
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  dataRetention: '30days' | '90days' | '1year' | 'forever';
  debugMode: boolean;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ user }) => {
  const [activeSection, setActiveSection] = useState('profile');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState('');

  // États des paramètres
  const [profileSettings, setProfileSettings] = useState<ProfileSettings>({
    nom: user?.nom || '',
    prenom: user?.prenom || '',
    email: user?.email || '',
    telephone: user?.telephone || '',
    poste: user?.poste || ''
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    showCurrentPassword: false,
    showNewPassword: false,
    showConfirmPassword: false
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    dailyReports: false,
    weeklyReports: true,
    monthlyReports: true
  });

  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>({
    theme: 'light',
    language: 'fr',
    compactMode: false,
    showAnimations: true
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    autoBackup: true,
    backupFrequency: 'weekly',
    dataRetention: '90days',
    debugMode: false
  });

  // Sections disponibles
  const sections = [
    { id: 'profile', label: 'Profil', icon: User, color: 'text-blue-600', bgColor: 'bg-blue-50' },
    { id: 'security', label: 'Sécurité', icon: Shield, color: 'text-red-600', bgColor: 'bg-red-50' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-green-600', bgColor: 'bg-green-50' },
    { id: 'appearance', label: 'Apparence', icon: Palette, color: 'text-purple-600', bgColor: 'bg-purple-50' },
    { id: 'system', label: 'Système', icon: Settings, color: 'text-gray-600', bgColor: 'bg-gray-50' }
  ];

  // Sauvegarder les paramètres
  const handleSaveSettings = async (section: string) => {
    setIsSubmitting(true);
    try {
      // Simulation de sauvegarde
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let message = '';
      switch (section) {
        case 'profile':
          message = 'Profil mis à jour avec succès !';
          break;
        case 'security':
          message = 'Paramètres de sécurité mis à jour !';
          break;
        case 'notifications':
          message = 'Préférences de notifications sauvegardées !';
          break;
        case 'appearance':
          message = 'Paramètres d\'apparence appliqués !';
          break;
        case 'system':
          message = 'Paramètres système mis à jour !';
          break;
      }
      
      setSuccessMessage(message);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Actions système
  const handleSystemAction = (action: string) => {
    setConfirmAction(action);
    setShowConfirmDialog(true);
  };

  const confirmSystemAction = async () => {
    setIsSubmitting(true);
    try {
      // Simulation de l'action
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let message = '';
      switch (confirmAction) {
        case 'backup':
          message = 'Sauvegarde créée avec succès !';
          break;
        case 'restore':
          message = 'Restauration terminée !';
          break;
        case 'reset':
          message = 'Paramètres réinitialisés !';
          break;
        case 'clear':
          message = 'Cache vidé avec succès !';
          break;
      }
      
      setSuccessMessage(message);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Erreur lors de l\'action:', error);
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  // Rendu des sections
  const renderProfileSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations Personnelles</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
            <input
              type="text"
              value={profileSettings.prenom}
              onChange={(e) => setProfileSettings({...profileSettings, prenom: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
            <input
              type="text"
              value={profileSettings.nom}
              onChange={(e) => setProfileSettings({...profileSettings, nom: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={profileSettings.email}
              onChange={(e) => setProfileSettings({...profileSettings, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
            <input
              type="tel"
              value={profileSettings.telephone}
              onChange={(e) => setProfileSettings({...profileSettings, telephone: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Poste</label>
            <input
              type="text"
              value={profileSettings.poste}
              onChange={(e) => setProfileSettings({...profileSettings, poste: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations du Shop</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Shop</label>
            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
              <Building size={16} className="text-gray-500" />
              <span className="text-gray-900">{user?.shopName}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
            <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md">
              <Shield size={16} className="text-gray-500" />
              <span className="text-gray-900 capitalize">{user?.role}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Changer le Mot de Passe</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe actuel</label>
            <div className="relative">
              <input
                type={securitySettings.showCurrentPassword ? 'text' : 'password'}
                value={securitySettings.currentPassword}
                onChange={(e) => setSecuritySettings({...securitySettings, currentPassword: e.target.value})}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Entrez votre mot de passe actuel"
              />
              <button
                type="button"
                onClick={() => setSecuritySettings({...securitySettings, showCurrentPassword: !securitySettings.showCurrentPassword})}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {securitySettings.showCurrentPassword ? <EyeOff size={16} className="text-gray-500" /> : <Eye size={16} className="text-gray-500" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
            <div className="relative">
              <input
                type={securitySettings.showNewPassword ? 'text' : 'password'}
                value={securitySettings.newPassword}
                onChange={(e) => setSecuritySettings({...securitySettings, newPassword: e.target.value})}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Entrez le nouveau mot de passe"
              />
              <button
                type="button"
                onClick={() => setSecuritySettings({...securitySettings, showNewPassword: !securitySettings.showNewPassword})}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {securitySettings.showNewPassword ? <EyeOff size={16} className="text-gray-500" /> : <Eye size={16} className="text-gray-500" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirmer le nouveau mot de passe</label>
            <div className="relative">
              <input
                type={securitySettings.showConfirmPassword ? 'text' : 'password'}
                value={securitySettings.confirmPassword}
                onChange={(e) => setSecuritySettings({...securitySettings, confirmPassword: e.target.value})}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirmez le nouveau mot de passe"
              />
              <button
                type="button"
                onClick={() => setSecuritySettings({...securitySettings, showConfirmPassword: !securitySettings.showConfirmPassword})}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {securitySettings.showConfirmPassword ? <EyeOff size={16} className="text-gray-500" /> : <Eye size={16} className="text-gray-500" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sécurité du Compte</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertCircle size={20} className="text-yellow-600" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Authentification à deux facteurs</h4>
                <p className="text-sm text-yellow-700">Ajoutez une couche de sécurité supplémentaire</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors text-sm">
              Activer
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Globe size={20} className="text-blue-600" />
              <div>
                <h4 className="text-sm font-medium text-blue-800">Sessions actives</h4>
                <p className="text-sm text-blue-700">Gérez vos connexions actives</p>
              </div>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
              Voir
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderNotificationsSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Préférences de Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Mail size={20} className="text-gray-500" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Notifications par email</h4>
                <p className="text-sm text-gray-600">Recevoir les notifications par email</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.emailNotifications}
                onChange={(e) => setNotificationSettings({...notificationSettings, emailNotifications: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Phone size={20} className="text-gray-500" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Notifications SMS</h4>
                <p className="text-sm text-gray-600">Recevoir les notifications par SMS</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.smsNotifications}
                onChange={(e) => setNotificationSettings({...notificationSettings, smsNotifications: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell size={20} className="text-gray-500" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Notifications push</h4>
                <p className="text-sm text-gray-600">Recevoir les notifications push</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.pushNotifications}
                onChange={(e) => setNotificationSettings({...notificationSettings, pushNotifications: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Rapports Automatiques</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar size={20} className="text-gray-500" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Rapports quotidiens</h4>
                <p className="text-sm text-gray-600">Recevoir un rapport quotidien</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.dailyReports}
                onChange={(e) => setNotificationSettings({...notificationSettings, dailyReports: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar size={20} className="text-gray-500" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Rapports hebdomadaires</h4>
                <p className="text-sm text-gray-600">Recevoir un rapport hebdomadaire</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.weeklyReports}
                onChange={(e) => setNotificationSettings({...notificationSettings, weeklyReports: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar size={20} className="text-gray-500" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Rapports mensuels</h4>
                <p className="text-sm text-gray-600">Recevoir un rapport mensuel</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationSettings.monthlyReports}
                onChange={(e) => setNotificationSettings({...notificationSettings, monthlyReports: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearanceSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Thème et Apparence</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Thème</label>
            <select
              value={appearanceSettings.theme}
              onChange={(e) => setAppearanceSettings({...appearanceSettings, theme: e.target.value as 'light' | 'dark' | 'auto'})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="light">Clair</option>
              <option value="dark">Sombre</option>
              <option value="auto">Automatique</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Langue</label>
            <select
              value={appearanceSettings.language}
              onChange={(e) => setAppearanceSettings({...appearanceSettings, language: e.target.value as 'fr' | 'en'})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Palette size={20} className="text-gray-500" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Mode compact</h4>
                <p className="text-sm text-gray-600">Réduire l'espacement des éléments</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={appearanceSettings.compactMode}
                onChange={(e) => setAppearanceSettings({...appearanceSettings, compactMode: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <RefreshCw size={20} className="text-gray-500" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Animations</h4>
                <p className="text-sm text-gray-600">Afficher les animations</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={appearanceSettings.showAnimations}
                onChange={(e) => setAppearanceSettings({...appearanceSettings, showAnimations: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemSection = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sauvegarde et Données</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Database size={20} className="text-gray-500" />
              <div>
                <h4 className="text-sm font-medium text-gray-900">Sauvegarde automatique</h4>
                <p className="text-sm text-gray-600">Sauvegarder automatiquement les données</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={systemSettings.autoBackup}
                onChange={(e) => setSystemSettings({...systemSettings, autoBackup: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fréquence de sauvegarde</label>
            <select
              value={systemSettings.backupFrequency}
              onChange={(e) => setSystemSettings({...systemSettings, backupFrequency: e.target.value as 'daily' | 'weekly' | 'monthly'})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="daily">Quotidienne</option>
              <option value="weekly">Hebdomadaire</option>
              <option value="monthly">Mensuelle</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rétention des données</label>
            <select
              value={systemSettings.dataRetention}
              onChange={(e) => setSystemSettings({...systemSettings, dataRetention: e.target.value as '30days' | '90days' | '1year' | 'forever'})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="30days">30 jours</option>
              <option value="90days">90 jours</option>
              <option value="1year">1 an</option>
              <option value="forever">Pour toujours</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Système</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => handleSystemAction('backup')}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download size={16} />
            <span>Sauvegarder</span>
          </button>
          <button
            onClick={() => handleSystemAction('restore')}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Upload size={16} />
            <span>Restaurer</span>
          </button>
          <button
            onClick={() => handleSystemAction('clear')}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Trash2 size={16} />
            <span>Vider le cache</span>
          </button>
          <button
            onClick={() => handleSystemAction('reset')}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <RefreshCw size={16} />
            <span>Réinitialiser</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Développement</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Info size={20} className="text-gray-500" />
            <div>
              <h4 className="text-sm font-medium text-gray-900">Mode debug</h4>
              <p className="text-sm text-gray-600">Afficher les informations de débogage</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={systemSettings.debugMode}
              onChange={(e) => setSystemSettings({...systemSettings, debugMode: e.target.checked})}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Utilisateur non défini</p>
          <p className="text-sm text-gray-500 mt-2">Veuillez vous reconnecter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle size={20} className="text-green-600 mr-3" />
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Paramètres
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Gérez vos préférences et paramètres de compte
          </p>
        </div>
      </div>

      {/* Navigation des sections */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-2">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  isActive
                    ? `${section.bgColor} ${section.color} shadow-md`
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={16} />
                <span className="font-medium">{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenu de la section active */}
      <div className="space-y-4">
        {activeSection === 'profile' && renderProfileSection()}
        {activeSection === 'security' && renderSecuritySection()}
        {activeSection === 'notifications' && renderNotificationsSection()}
        {activeSection === 'appearance' && renderAppearanceSection()}
        {activeSection === 'system' && renderSystemSection()}
      </div>

      {/* Bouton de sauvegarde */}
      <div className="flex justify-end">
        <button
          onClick={() => handleSaveSettings(activeSection)}
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Sauvegarde...</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>Sauvegarder</span>
            </>
          )}
        </button>
      </div>

      {/* Modal de confirmation */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirmer l'action
              </h3>
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir effectuer cette action ? Cette opération ne peut pas être annulée.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmSystemAction}
                disabled={isSubmitting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Exécution...' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 