import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Phone, MapPin, Building, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { User as UserType, Shop } from '../../types';
import { shopService } from '../../services/firestore';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [shops, setShops] = useState<Shop[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);
  
  const { login, register, currentUser } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nom: '',
    prenom: '',
    sexe: 'M' as 'M' | 'F',
    poste: '',
    telephone: '',
    shopId: '',
    shopName: '',
    role: 'vendeur' as 'vendeur' | 'admin'
  });

  // Fonction pour vider les champs
  const clearFormData = () => {
    setFormData({
      email: '',
      password: '',
      nom: '',
      prenom: '',
      sexe: 'M',
      poste: '',
      telephone: '',
      shopId: '',
      shopName: '',
      role: 'vendeur'
    });
    setError('');
    setSuccessMessage('');
  };

  // Écouter les changements d'état d'authentification pour vider les champs
  useEffect(() => {
    if (!currentUser) {
      clearFormData();
    }
  }, [currentUser]);

  // Récupérer les shops au chargement du composant
  useEffect(() => {
    const fetchShops = async () => {
      try {
        setLoadingShops(true);
        const shopsData = await shopService.getAll();
        setShops(shopsData);
      } catch (error) {
        console.error('Erreur lors de la récupération des shops:', error);
        // En cas d'erreur, on continue sans les shops
      } finally {
        setLoadingShops(false);
      }
    };

    fetchShops();
  }, []);

  // Gérer la sélection d'un shop
  const handleShopChange = (shopId: string) => {
    const selectedShop = shops.find(shop => shop.id === shopId);
    setFormData({
      ...formData,
      shopId: shopId,
      shopName: selectedShop ? selectedShop.name : ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        
        // Message de succès pour la connexion
        setSuccessMessage('Connexion réussie ! Redirection en cours...');
        
        // Attendre un peu pour que l'utilisateur voie le message
        setTimeout(() => {
          clearFormData();
        }, 1500);
      } else {
        // Validation pour l'inscription
        if (!formData.shopId) {
          throw new Error('Veuillez sélectionner un shop');
        }

        const userData: Omit<UserType, 'id'> = {
          nom: formData.nom,
          prenom: formData.prenom,
          sexe: formData.sexe,
          poste: formData.poste,
          telephone: formData.telephone,
          shopId: formData.shopId,
          shopName: formData.shopName,
          role: formData.role
        };
        await register(formData.email, formData.password, userData);
        
        // Message de succès et redirection vers login
        setSuccessMessage('Compte créé avec succès ! Vous pouvez maintenant vous connecter.');
        setIsLogin(true);
        
        // Réinitialiser le formulaire
        clearFormData();
      }
    } catch (error: any) {
      setError(error.message || 'Une erreur est survenue');
      
      // Vider les champs même en cas d'erreur pour l'inscription
      if (!isLogin) {
        clearFormData();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = () => {
    setIsLogin(!isLogin);
    clearFormData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm sm:max-w-md lg:max-w-lg p-4 sm:p-6 lg:p-8">
        {/* Logo et titre */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
            <Building size={24} className="text-white sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Shop Ararat Projet</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
            {isLogin ? 'Connectez-vous à votre compte' : 'Créez votre compte'}
          </p>
        </div>

        {/* Message de succès */}
        {successMessage && (
          <div className={`border rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-sm mb-4 flex items-center ${
            successMessage.includes('Connexion réussie') 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            <CheckCircle size={16} className="mr-2 flex-shrink-0" />
            {successMessage}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Email
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 sm:w-5 sm:h-5" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="votre@email.com"
              />
            </div>
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 sm:w-5 sm:h-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full pl-9 sm:pl-10 pr-12 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                {showPassword ? <EyeOff size={18} className="sm:w-5 sm:h-5" /> : <Eye size={18} className="sm:w-5 sm:h-5" />}
              </button>
            </div>
          </div>

          {/* Champs supplémentaires pour l'inscription */}
          {!isLogin && (
            <>
              {/* Nom et Prénom */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Prénom
                  </label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 sm:w-5 sm:h-5" />
                    <input
                      type="text"
                      required
                      value={formData.prenom}
                      onChange={(e) => setFormData({...formData, prenom: e.target.value})}
                      className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      placeholder="Prénom"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Nom
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nom}
                    onChange={(e) => setFormData({...formData, nom: e.target.value})}
                    className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Nom"
                  />
                </div>
              </div>

              {/* Sexe et Poste */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Sexe
                  </label>
                  <select
                    value={formData.sexe}
                    onChange={(e) => setFormData({...formData, sexe: e.target.value as 'M' | 'F'})}
                    className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    Poste
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.poste}
                    onChange={(e) => setFormData({...formData, poste: e.target.value})}
                    className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="Vendeur"
                  />
                </div>
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Téléphone
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 sm:w-5 sm:h-5" />
                  <input
                    type="tel"
                    required
                    value={formData.telephone}
                    onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                    className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="+243 123 456 789"
                  />
                </div>
              </div>

              {/* Shop */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Shop
                </label>
                <select
                  value={formData.shopId}
                  onChange={(e) => handleShopChange(e.target.value)}
                  className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  disabled={loadingShops}
                >
                  <option value="">
                    {loadingShops ? 'Chargement des shops...' : 'Sélectionnez un shop'}
                  </option>
                  {shops.map(shop => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name} {shop.location ? `(${shop.location})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rôle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Rôle
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as 'vendeur' | 'admin'})}
                  className="w-full px-4 py-2.5 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                >
                  <option value="vendeur">Vendeur</option>
                </select>
              </div>
            </>
          )}

          {/* Message d'erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Bouton de soumission */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 sm:py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base mt-4 sm:mt-6"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                {isLogin ? 'Connexion...' : 'Création...'}
              </div>
            ) : (
              isLogin ? 'Se connecter' : 'Créer le compte'
            )}
          </button>
        </form>

        {/* Lien pour changer de mode */}
        <div className="text-center mt-4 sm:mt-6">
          <p className="text-xs sm:text-sm text-gray-600">
            {isLogin ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?"}
            <button
              onClick={handleModeSwitch}
              className="ml-1 sm:ml-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              {isLogin ? 'Créer un compte' : 'Se connecter'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};