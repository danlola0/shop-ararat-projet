import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Phone, MapPin, Building, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { User as UserType, Shop } from '../../types';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [shops, setShops] = useState<Shop[]>([]);
  const [loadingShops, setLoadingShops] = useState(false);
  
  const { login, register, logout, currentUser } = useAuth();
  const navigate = useNavigate();

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
    role: 'user' as 'user'
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
      role: 'user'
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
        const querySnapshot = await getDocs(collection(db, 'shops'));
        const shopsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setShops(shopsData);
      } catch (error) {
        console.error('Erreur lors de la récupération des shops:', error);
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
    if (!isLogin) {
      setFormData((prev) => ({ ...prev, role: 'user' }));
    }
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        
        // Message de succès pour la connexion
        setSuccessMessage('Connexion réussie !');
        
        // Attendre un peu pour que l'utilisateur voie le message
        setTimeout(() => {
          clearFormData();
          navigate('/dashboard');
        }, 2000);
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
        const userCredential = await register(formData.email, formData.password, userData);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: formData.email,
          nom: formData.nom,
          prenom: formData.prenom,
          sexe: formData.sexe,
          poste: formData.poste,
          telephone: formData.telephone,
          shopId: formData.shopId,
          shopName: formData.shopName,
          role: formData.role,
          createdAt: new Date()
        });
        await logout(); // Déconnecte immédiatement après inscription
        setSuccessMessage("Votre compte a été créé avec succès !");
        setTimeout(() => {
          setSuccessMessage('');
          setIsLogin(true); // Passe en mode login
          navigate('/login'); // Redirige vers la page de connexion (adapter le chemin si besoin)
        }, 2500);
      }
    } catch (error: any) {
      let friendlyError = 'Une erreur inattendue est survenue. Merci de vérifier vos informations ou de réessayer plus tard.';
      if (isLogin && error.code) {
        switch (error.code) {
          case 'auth/wrong-password':
          case 'auth/user-not-found':
            friendlyError = 'Email ou mot de passe incorrect.';
            break;
          case 'auth/invalid-email':
            friendlyError = 'Adresse email invalide.';
            break;
          case 'auth/too-many-requests':
            friendlyError = 'Trop de tentatives. Veuillez réessayer plus tard.';
            break;
          default:
            friendlyError = 'Une erreur inattendue est survenue. Merci de vérifier vos informations ou de réessayer plus tard.';
        }
      }
      setError(friendlyError);
      
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md lg:max-w-lg p-4 sm:p-8 lg:p-10 border border-white/20 relative">
        {/* Logo et titre */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse" style={{ animation: 'pulseLogo 2s infinite' }}>
            <Building size={36} className="text-white sm:w-10 sm:h-10 drop-shadow-lg" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 drop-shadow-lg" style={{ textShadow: '0 0 16px #60a5fa, 0 0 32px #818cf8' }}>Shop Ararat Projet</h1>
          <p className="text-base sm:text-lg text-gray-600 mt-2 animate-fadein">
            {isLogin ? 'Connectez-vous à votre compte' : 'Créez votre compte'}
          </p>
        </div>

        {/* Message de succès */}
        {successMessage && (
          <div className={`border rounded-lg px-4 py-3 text-sm mb-4 flex items-center shadow-sm animate-fadein ${
            successMessage.includes('Connexion réussie') 
              ? 'bg-blue-50 border-blue-200 text-blue-700' 
              : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            <CheckCircle size={18} className="mr-2 flex-shrink-0" />
            {successMessage}
          </div>
        )}
        {/* Message d'erreur */}
        {error && (
          <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm mb-4 flex items-center shadow-sm animate-fadein">
            <XCircle size={18} className="mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-5 animate-fadein">
          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
            <input
              type="email"
              autoComplete="email"
              className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-white/80 placeholder-gray-400 transition"
              placeholder="Adresse email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={loading}
            />
          </div>
          {/* Mot de passe */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-white/80 placeholder-gray-400 transition"
              placeholder="Mot de passe"
              value={formData.password}
              onChange={e => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={loading}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 focus:outline-none"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {/* Champs supplémentaires pour inscription */}
          {!isLogin && (
            <>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                  <input
                    type="text"
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-white/80 placeholder-gray-400 transition"
                    placeholder="Nom"
                    value={formData.nom}
                    onChange={e => setFormData({ ...formData, nom: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="relative flex-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                  <input
                    type="text"
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-white/80 placeholder-gray-400 transition"
                    placeholder="Prénom"
                    value={formData.prenom}
                    onChange={e => setFormData({ ...formData, prenom: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                  <input
                    type="tel"
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-white/80 placeholder-gray-400 transition"
                    placeholder="Téléphone"
                    value={formData.telephone}
                    onChange={e => setFormData({ ...formData, telephone: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="relative flex-1">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
                  <select
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-white/80 placeholder-gray-400 transition"
                    value={formData.shopId}
                    onChange={e => handleShopChange(e.target.value)}
                    required
                    disabled={loading || loadingShops}
                  >
                    <option value="">Sélectionner un shop</option>
                    {shops.map(shop => (
                      <option key={shop.id} value={shop.id}>{shop.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    className="w-full pl-3 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-white/80 placeholder-gray-400 transition"
                    placeholder="Poste (optionnel)"
                    value={formData.poste}
                    onChange={e => setFormData({ ...formData, poste: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div className="relative flex-1">
                  <select
                    className="w-full pl-3 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base bg-white/80 placeholder-gray-400 transition"
                    value={formData.sexe}
                    onChange={e => setFormData({ ...formData, sexe: e.target.value as 'M' | 'F' })}
                    required
                    disabled={loading}
                  >
                    <option value="M">Homme</option>
                    <option value="F">Femme</option>
                  </select>
                </div>
              </div>
            </>
          )}
          {/* Bouton de connexion/inscription */}
          <button
            type="submit"
            className="w-full py-3 mt-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
            ) : (
              isLogin ? 'Connexion' : 'Créer un compte'
            )}
          </button>
        </form>
        {/* Lien pour changer de mode */}
        <div className="mt-6 text-center">
          <button
            type="button"
            className="text-blue-600 hover:underline font-semibold transition"
            onClick={handleModeSwitch}
            disabled={loading}
          >
            {isLogin ? "Créer un compte" : "J'ai déjà un compte"}
          </button>
        </div>
        {/* Animation CSS personnalisée */}
        <style>{`
          @keyframes pulseLogo {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.08); box-shadow: 0 0 32px #60a5fa44, 0 0 64px #818cf844; }
          }
          .animate-fadein {
            animation: fadein 1.2s;
          }
          @keyframes fadein {
            from { opacity: 0; transform: translateY(16px); }
            to { opacity: 1; transform: none; }
          }
        `}</style>
      </div>
    </div>
  );
};