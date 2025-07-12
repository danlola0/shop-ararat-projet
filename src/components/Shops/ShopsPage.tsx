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
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

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
  const [filteredShops, setFilteredShops] = useState<ShopWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuccess, setShowSuccess] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: ''
  });

  // Définir fetchShopsData dans le scope du composant pour qu'il soit accessible partout
  const fetchShopsData = async () => {
    setLoading(true);
    try {
      // Récupération directe depuis Firestore
      const [shopsSnapshot, usersSnapshot, echangesSnapshot, creditsSnapshot, depotsSnapshot] = await Promise.all([
        getDocs(collection(db, 'shops')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'echanges')),
        getDocs(collection(db, 'ventes_credit')),
        getDocs(collection(db, 'depots'))
      ]);
      const shopsDocs = shopsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filtrer selon le rôle de l'utilisateur
      const filterByRole = (docs, user) => {
        return docs.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => user.role === 'admin' || item.shopId === user.shopId);
      };

      const allUsers = filterByRole(usersSnapshot, user);
      const allEchanges = filterByRole(echangesSnapshot, user);
      const allCredits = filterByRole(creditsSnapshot, user);
      const allDepots = filterByRole(depotsSnapshot, user);

      // Créer une liste de shops basée sur tous les shops enregistrés
      const shopsList = shopsDocs.map(shopDoc => {
        const id = shopDoc.id;
        return {
          id,
          name: shopDoc.name || 'Shop sans nom',
          location: shopDoc.location || '',
          description: shopDoc.description || '',
          createdAt: shopDoc.createdAt || new Date().toISOString(),
          usersCount: allUsers.filter(u => u.shopId === id && u.role === 'user').length,
          revenue: allEchanges.filter(e => e.shopId === id).reduce((sum, item) => sum + (item.montantDepart || 0), 0) +
                  allCredits.filter(c => c.shopId === id).reduce((sum, item) => sum + (item.montant || 0), 0) +
                  allDepots.filter(d => d.shopId === id).reduce((sum, item) => sum + (item.montant || 0), 0),
          transactionsCount: allEchanges.filter(e => e.shopId === id).length +
                            allCredits.filter(c => c.shopId === id).length +
                            allDepots.filter(d => d.shopId === id).length
        };
      });

      setShops(shopsList);
      setFilteredShops(shopsList);
    } catch (error: any) {
      console.error('ShopsPage: Erreur lors de la récupération des données:', error);
      setErrorMessage('Erreur lors de la récupération des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopsData();
  }, [user]);

  useEffect(() => {
    const results = shops.filter(shop =>
      shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (shop.location && shop.location.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredShops(results);
  }, [searchTerm, shops]);

  // Gérer l'ouverture du modal
  const handleOpenModal = (shop?: Shop) => {
    if (shop) {
      setEditingShop(shop);
      setFormData({
        name: shop.name,
        location: shop.location || '',
        description: shop.description || ''
      });
    } else {
      setEditingShop(null);
      setFormData({
        name: '',
        location: '',
        description: ''
      });
    }
    setShowModal(true);
  };

  // Gérer la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Protection contre double-clic
    setIsSubmitting(true);

    if (!formData.name.trim()) {
      setErrorMessage('Le nom du shop est requis');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
      setIsSubmitting(false);
      return;
    }

    try {
      // Création directe dans Firestore
      const shopRef = await addDoc(collection(db, 'shops'), {
        name: formData.name,
        location: formData.location,
        description: formData.description,
        createdAt: new Date().toISOString()
      });
      const shopId = shopRef.id;

      // Création automatique des collections associées (documents placeholder)
      await Promise.all([
        // Mouvement initial
        addDoc(collection(db, 'mouvements'), {
          shopId,
          type: 'init',
          montant: 0,
          date: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }),
        // Stock initial
        addDoc(collection(db, 'stocks'), {
          shopId,
          stockFinal: 0,
          devise: 'CDF',
          type: 'init',
          date: new Date().toISOString(),
          createdAt: new Date().toISOString()
        })
      ]);
      
      await fetchShopsData(); // Rafraîchir la liste après création
      setShowSuccess('Le shop a été créé avec succès et les collections associées ont été initialisées !');
      setTimeout(() => setShowSuccess(false), 6000);
      setShowModal(false);
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      setErrorMessage('Erreur lors de la sauvegarde du shop');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gérer la suppression
  const handleDelete = async (shopId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce shop ? Cette action est irréversible.')) {
      return;
    }
    try {
      // Supprimer ou commenter les lignes suivantes :
      // await shopService.delete(shopId);
      
      // Suppression directe dans Firestore
      await deleteDoc(doc(db, 'shops', shopId));
      await fetchShopsData(); // Rafraîchir la liste après suppression
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      setErrorMessage('Erreur lors de la suppression du shop');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || isNaN(new Date(dateString).getTime())) {
      return '-';
    }
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'CDF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Messages de succès et d'erreur */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle size={16} className="text-green-600 mr-2" />
            <p className="text-sm text-green-800">{showSuccess}</p>
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
            {user.role === 'admin' ? 'Gestion de tous les shops' : `Gestion du shop: ${user.shopName}`}
          </p>
        </div>
        {user.role === 'admin' && (
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
                {user.role === 'admin' && (
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
              {(shop.usersCount === 0 && shop.revenue === 0 && shop.transactionsCount === 0) ? (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-4 text-center text-base font-semibold mb-4">
                  Aucune donnée pour ce shop.<br />Ajoutez des utilisateurs ou effectuez des opérations pour voir les indicateurs.
                </div>
              ) : (
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
              )}

              {/* Informations supplémentaires */}
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Calendar size={14} />
                  <span>Créé le {formatDate(shop.createdAt)}</span>
                </div>
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (editingShop ? 'Modification...' : 'Création...') : (editingShop ? 'Modifier' : 'Créer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}; 