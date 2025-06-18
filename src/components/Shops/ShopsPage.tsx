import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Download, 
  X, 
  CheckCircle, 
  AlertCircle,
  MapPin,
  Phone,
  User,
  Calendar
} from 'lucide-react';
import { User as UserType, Shop } from '../../types';
import { shopService, isGlobalAdmin } from '../../services/firestore';

interface ShopsPageProps {
  user: UserType;
}

interface ShopWithStats extends Shop {
  usersCount: number;
  revenue: number;
  transactionsCount: number;
}

export const ShopsPage: React.FC<ShopsPageProps> = ({ user }) => {
  const [shops, setShops] = useState<ShopWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    phone: '',
    manager: '',
    description: ''
  });

  // Récupérer les shops
  const fetchShops = async () => {
    try {
      setLoading(true);
      let shopsData: Shop[];

      if (isGlobalAdmin(user)) {
        console.log('Récupération de tous les shops pour admin global...');
        shopsData = await shopService.getAll();
        console.log('Shops récupérés:', shopsData);
      } else {
        console.log('Récupération du shop pour admin local:', user.shopId);
        // Pour les admins de shop, montrer seulement leur shop
        shopsData = [{
          id: user.shopId,
          name: user.shopName,
          location: 'Localisation du shop',
          createdAt: new Date().toISOString()
        }];
      }

      // Ajouter des statistiques simulées pour l'exemple
      const shopsWithStats: ShopWithStats[] = shopsData.map(shop => ({
        ...shop,
        usersCount: Math.floor(Math.random() * 10) + 1,
        revenue: Math.floor(Math.random() * 50000) + 10000,
        transactionsCount: Math.floor(Math.random() * 100) + 20
      }));

      setShops(shopsWithStats);
    } catch (error: any) {
      console.error('Erreur détaillée lors de la récupération des shops:', error);
      console.error('Code d\'erreur:', error.code);
      console.error('Message d\'erreur:', error.message);
      
      let errorMsg = 'Erreur lors de la récupération des shops';
      
      if (error.code === 'permission-denied') {
        errorMsg = 'Permission refusée. Vérifiez les règles Firestore pour la collection "shops".';
        setShowPermissionAlert(true);
        
        // Données de démonstration en cas d'erreur de permission
        const demoShops: ShopWithStats[] = [
          {
            id: 'demo-shop-1',
            name: 'Shop Central',
            location: 'Kinshasa, RDC',
            phone: '+243 123 456 789',
            manager: 'Jean Dupont',
            description: 'Shop principal au centre-ville',
            createdAt: new Date().toISOString(),
            usersCount: 8,
            revenue: 45000,
            transactionsCount: 85
          },
          {
            id: 'demo-shop-2',
            name: 'Shop Nord',
            location: 'Lubumbashi, RDC',
            phone: '+243 987 654 321',
            manager: 'Marie Martin',
            description: 'Shop dans le quartier nord',
            createdAt: new Date().toISOString(),
            usersCount: 5,
            revenue: 32000,
            transactionsCount: 62
          }
        ];
        setShops(demoShops);
      } else if (error.code === 'unavailable') {
        errorMsg = 'Service Firebase temporairement indisponible.';
      } else if (error.message) {
        errorMsg = `Erreur: ${error.message}`;
      }
      
      setErrorMessage(errorMsg);
      setShowError(true);
      setTimeout(() => setShowError(false), 8000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, [user]);

  // Gérer l'ouverture du modal
  const handleOpenModal = (shop?: Shop) => {
    if (shop) {
      setEditingShop(shop);
      setFormData({
        name: shop.name,
        location: shop.location || '',
        phone: '',
        manager: '',
        description: ''
      });
    } else {
      setEditingShop(null);
      setFormData({
        name: '',
        location: '',
        phone: '',
        manager: '',
        description: ''
      });
    }
    setShowModal(true);
  };

  // Gérer la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setErrorMessage('Le nom du shop est requis');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
      return;
    }

    try {
      if (editingShop) {
        // Modification
        await shopService.update(editingShop.id, {
          name: formData.name,
          location: formData.location,
          phone: formData.phone,
          manager: formData.manager,
          description: formData.description
        });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
      } else {
        // Création
        await shopService.create({
          name: formData.name,
          location: formData.location,
          phone: formData.phone,
          manager: formData.manager,
          description: formData.description,
          createdAt: new Date().toISOString()
        });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
      }

      setShowModal(false);
      fetchShops();
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      setErrorMessage(error.message || 'Erreur lors de la sauvegarde');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    }
  };

  // Gérer la suppression
  const handleDelete = async (shopId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce shop ? Cette action est irréversible.')) {
      return;
    }

    try {
      await shopService.delete(shopId);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      fetchShops();
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      setErrorMessage(error.message || 'Erreur lors de la suppression');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    }
  };

  // Filtrer les shops
  const filteredShops = shops.filter(shop =>
    shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Formater la date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // Formater la monnaie
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'CDF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Messages de succès et d'erreur */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle size={16} className="text-green-600 mr-2" />
            <p className="text-sm text-green-800">
              {editingShop ? 'Shop modifié avec succès !' : 'Shop créé avec succès !'}
            </p>
          </div>
        </div>
      )}

      {showError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle size={16} className="text-red-600 mr-2" />
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Alert Permission */}
      {showPermissionAlert && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle size={20} className="text-yellow-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">
                Mode Démonstration
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                Les règles Firestore ne sont pas configurées pour la collection "shops". 
                Affichage des données de démonstration. 
                <a 
                  href="https://console.firebase.google.com/project/shop-ararat-projet/firestore/rules" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline ml-1"
                >
                  Configurer les règles
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Gestion des Shops
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {isGlobalAdmin(user) ? 'Gestion de tous les shops' : `Gestion du shop: ${user.shopName}`}
          </p>
        </div>
        {isGlobalAdmin(user) && (
          <button
            onClick={() => handleOpenModal()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 text-sm"
          >
            <Plus size={16} />
            <span>Ajouter un Shop</span>
          </button>
        )}
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <Search size={16} className="text-gray-600" />
            <input
              type="text"
              placeholder="Rechercher un shop..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-gray-600" />
            <span className="text-sm text-gray-600">
              {filteredShops.length} shop{filteredShops.length !== 1 ? 's' : ''} trouvé{filteredShops.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Liste des shops */}
      {loading ? (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Chargement des shops...</p>
          </div>
        </div>
      ) : filteredShops.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <Building size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun shop trouvé</h3>
          <p className="text-gray-600">
            {searchTerm ? 'Aucun shop ne correspond à votre recherche.' : 'Aucun shop n\'a été créé pour le moment.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredShops.map((shop) => (
            <div key={shop.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Building size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{shop.name}</h3>
                    <p className="text-sm text-gray-600">{shop.location}</p>
                  </div>
                </div>
                {isGlobalAdmin(user) && (
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleOpenModal(shop)}
                      className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                      title="Modifier"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(shop.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Statistiques */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-indigo-600">{shop.usersCount}</p>
                  <p className="text-xs text-gray-600">Utilisateurs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(shop.revenue)}</p>
                  <p className="text-xs text-gray-600">Revenus</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{shop.transactionsCount}</p>
                  <p className="text-xs text-gray-600">Transactions</p>
                </div>
              </div>

              {/* Informations supplémentaires */}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Calendar size={14} />
                  <span>Créé le {formatDate(shop.createdAt)}</span>
                </div>
                {shop.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone size={14} />
                    <span>{shop.phone}</span>
                  </div>
                )}
                {shop.manager && (
                  <div className="flex items-center space-x-2">
                    <User size={14} />
                    <span>Manager: {shop.manager}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal pour ajouter/modifier un shop */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingShop ? 'Modifier le Shop' : 'Ajouter un Shop'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du Shop *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Nom du shop"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Localisation
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Adresse du shop"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="+243 123 456 789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager
                </label>
                <input
                  type="text"
                  value={formData.manager}
                  onChange={(e) => setFormData({...formData, manager: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Nom du manager"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Description du shop..."
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
                >
                  {editingShop ? 'Modifier' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}; 