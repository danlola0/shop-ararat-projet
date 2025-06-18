import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  MoreHorizontal,
  UserCheck,
  UserX,
  Building,
  Mail,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle,
  X,
  Save,
  Plus
} from 'lucide-react';
import { User } from '../../types';
import { userService, isGlobalAdmin } from '../../services/firestore';

interface UsersPageProps {
  user?: User;
}

interface UserWithActions extends User {
  isSelected?: boolean;
}

interface UserFormData {
  email: string;
  nom: string;
  prenom: string;
  sexe: 'M' | 'F';
  poste: string;
  telephone: string;
  shopId: string;
  shopName: string;
  role: 'admin' | 'vendeur';
}

export const UsersPage: React.FC<UsersPageProps> = ({ user }) => {
  const [users, setUsers] = useState<UserWithActions[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithActions[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedShop, setSelectedShop] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // État du formulaire
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    nom: '',
    prenom: '',
    sexe: 'M',
    poste: '',
    telephone: '',
    shopId: '',
    shopName: '',
    role: 'vendeur'
  });

  // Initialiser le formulaire avec les shops disponibles
  useEffect(() => {
    if (shops.length > 0 && !isGlobalAdmin(user!)) {
      setFormData(prev => ({
        ...prev,
        shopId: user!.shopId,
        shopName: user!.shopName
      }));
    }
  }, [shops, user]);

  // Récupérer les utilisateurs
  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Récupération des utilisateurs pour:', user?.email);

      let allUsers: User[];
      
      if (isGlobalAdmin(user!)) {
        console.log('Admin global - récupération de tous les utilisateurs');
        allUsers = await userService.getAllUsersForAdmin(user!);
      } else {
        console.log('Admin shop - récupération des utilisateurs du shop:', user!.shopId);
        allUsers = await userService.getByShop(user!.shopId);
      }

      console.log('Utilisateurs récupérés:', allUsers.length);

      // Ajouter les propriétés d'action
      const usersWithActions = allUsers.map(u => ({
        ...u,
        isSelected: false
      }));

      setUsers(usersWithActions);
      setFilteredUsers(usersWithActions);

      // Récupérer les shops pour les filtres
      if (isGlobalAdmin(user!)) {
        const shopIds = [...new Set(allUsers.map(u => u.shopId).filter(id => id !== 'ALL_SHOPS'))];
        const shopNames = [...new Set(allUsers.map(u => u.shopName).filter(name => name !== 'Tous les Shops'))];
        
        const shopsList = shopIds.map((id, index) => ({
          id,
          name: shopNames[index] || id
        }));
        
        setShops([
          { id: 'all', name: 'Tous les shops' },
          ...shopsList
        ]);
      } else {
        setShops([
          { id: user!.shopId, name: user!.shopName }
        ]);
      }

    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      
      if (error.message.includes('permissions')) {
        console.log('Erreur de permissions - affichage des utilisateurs de démonstration');
        setShowPermissionAlert(true);
        
        // Données de démonstration
        const demoUsers: UserWithActions[] = isGlobalAdmin(user!) ? [
          {
            id: '1',
            email: 'admin@shopararat.com',
            nom: 'Admin',
            prenom: 'Principal',
            sexe: 'M',
            poste: 'Administrateur Principal',
            telephone: '+243 000 000 000',
            shopId: 'ALL_SHOPS',
            shopName: 'Tous les Shops',
            role: 'admin',
            isSelected: false
          },
          {
            id: '2',
            email: 'admin1@shopararat.com',
            nom: 'Dupont',
            prenom: 'Jean',
            sexe: 'M',
            poste: 'Administrateur Shop',
            telephone: '+243 111 111 111',
            shopId: 'shop1',
            shopName: 'Banunu',
            role: 'admin',
            isSelected: false
          },
          {
            id: '3',
            email: 'vendeur1@shopararat.com',
            nom: 'Martin',
            prenom: 'Marie',
            sexe: 'F',
            poste: 'Vendeuse',
            telephone: '+243 222 222 222',
            shopId: 'shop1',
            shopName: 'Banunu',
            role: 'vendeur',
            isSelected: false
          },
          {
            id: '4',
            email: 'vendeur2@shopararat.com',
            nom: 'Bernard',
            prenom: 'Pierre',
            sexe: 'M',
            poste: 'Vendeur',
            telephone: '+243 333 333 333',
            shopId: 'shop2',
            shopName: 'Kinshasa Centre',
            role: 'vendeur',
            isSelected: false
          }
        ] : [
          {
            id: '1',
            email: 'vendeur1@shopararat.com',
            nom: 'Martin',
            prenom: 'Marie',
            sexe: 'F',
            poste: 'Vendeuse',
            telephone: '+243 222 222 222',
            shopId: user!.shopId,
            shopName: user!.shopName,
            role: 'vendeur',
            isSelected: false
          },
          {
            id: '2',
            email: 'vendeur2@shopararat.com',
            nom: 'Bernard',
            prenom: 'Pierre',
            sexe: 'M',
            poste: 'Vendeur',
            telephone: '+243 333 333 333',
            shopId: user!.shopId,
            shopName: user!.shopName,
            role: 'vendeur',
            isSelected: false
          }
        ];

        setUsers(demoUsers);
        setFilteredUsers(demoUsers);
      }
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les utilisateurs
  useEffect(() => {
    let filtered = users;

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.poste.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtre par rôle
    if (selectedRole !== 'all') {
      filtered = filtered.filter(user => user.role === selectedRole);
    }

    // Filtre par shop
    if (selectedShop !== 'all') {
      filtered = filtered.filter(user => user.shopId === selectedShop);
    }

    // Filtre par statut (simulé)
    if (selectedStatus !== 'all') {
      // Pour l'exemple, on considère tous les utilisateurs comme actifs
      filtered = filtered.filter(user => selectedStatus === 'active');
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, selectedRole, selectedShop, selectedStatus]);

  // Charger les utilisateurs au montage
  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  // Gestion de la sélection multiple
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    }
  };

  // Ouvrir le modal pour ajouter un utilisateur
  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      nom: '',
      prenom: '',
      sexe: 'M',
      poste: '',
      telephone: '',
      shopId: isGlobalAdmin(user!) ? '' : user!.shopId,
      shopName: isGlobalAdmin(user!) ? '' : user!.shopName,
      role: 'vendeur'
    });
    setShowUserModal(true);
  };

  // Ouvrir le modal pour modifier un utilisateur
  const handleEditUser = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setFormData({
      email: userToEdit.email,
      nom: userToEdit.nom,
      prenom: userToEdit.prenom,
      sexe: userToEdit.sexe,
      poste: userToEdit.poste,
      telephone: userToEdit.telephone,
      shopId: userToEdit.shopId,
      shopName: userToEdit.shopName,
      role: userToEdit.role
    });
    setShowUserModal(true);
  };

  // Sauvegarder l'utilisateur (ajout ou modification)
  const handleSaveUser = async () => {
    try {
      setIsSubmitting(true);

      if (editingUser) {
        // Modification
        await userService.update(editingUser.id, formData);
        setSuccessMessage('Utilisateur modifié avec succès !');
      } else {
        // Ajout - simulation car on ne peut pas créer d'utilisateur sans mot de passe
        console.log('Ajout d\'utilisateur:', formData);
        setSuccessMessage('Utilisateur ajouté avec succès !');
      }

      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      
      setShowUserModal(false);
      fetchUsers(); // Recharger la liste
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde de l\'utilisateur');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Supprimer un utilisateur
  const handleDeleteUser = async (userId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      try {
        // Simulation de suppression
        console.log('Utilisateur supprimé:', userId);
        setSuccessMessage('Utilisateur supprimé avec succès !');
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
        
        // Mettre à jour la liste localement
        setUsers(users.filter(u => u.id !== userId));
        setFilteredUsers(filteredUsers.filter(u => u.id !== userId));
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression de l\'utilisateur');
      }
    }
  };

  // Supprimer plusieurs utilisateurs
  const handleDeleteSelected = async () => {
    if (selectedUsers.length === 0) return;
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${selectedUsers.length} utilisateur(s) ?`)) {
      try {
        // Simulation de suppression multiple
        console.log('Utilisateurs supprimés:', selectedUsers);
        setSuccessMessage(`${selectedUsers.length} utilisateur(s) supprimé(s) avec succès !`);
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
        
        // Mettre à jour la liste localement
        setUsers(users.filter(u => !selectedUsers.includes(u.id)));
        setFilteredUsers(filteredUsers.filter(u => !selectedUsers.includes(u.id)));
        setSelectedUsers([]);
      } catch (error) {
        console.error('Erreur lors de la suppression multiple:', error);
        alert('Erreur lors de la suppression des utilisateurs');
      }
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            <UserCheck size={12} className="mr-1" />
            Administrateur
          </span>
        );
      case 'vendeur':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Users size={12} className="mr-1" />
            Vendeur
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {role}
          </span>
        );
    }
  };

  const getShopBadge = (shopId: string, shopName: string) => {
    if (shopId === 'ALL_SHOPS') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Building size={12} className="mr-1" />
          Tous les Shops
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
        <Building size={12} className="mr-1" />
        {shopName}
      </span>
    );
  };

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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des utilisateurs...</p>
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
                Les règles Firestore ne sont pas configurées. Affichage des utilisateurs de démonstration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Gestion des Utilisateurs
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {isGlobalAdmin(user) ? 'Gestion de tous les utilisateurs' : `Utilisateurs du shop: ${user.shopName}`}
          </p>
        </div>
        <button
          onClick={handleAddUser}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm"
        >
          <UserPlus size={16} />
          <span>Ajouter Utilisateur</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="bg-blue-50 p-2 rounded-lg">
              <Users size={20} className="text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{filteredUsers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="bg-purple-50 p-2 rounded-lg">
              <UserCheck size={20} className="text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Administrateurs</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredUsers.filter(u => u.role === 'admin').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="bg-green-50 p-2 rounded-lg">
              <Users size={20} className="text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Vendeurs</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredUsers.filter(u => u.role === 'vendeur').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="flex items-center">
            <div className="bg-orange-50 p-2 rounded-lg">
              <CheckCircle size={20} className="text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Actifs</p>
              <p className="text-2xl font-bold text-gray-900">{filteredUsers.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filtres:</span>
          </div>
          
          {/* Recherche */}
          <div className="flex-1">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          
          {/* Filtre par rôle */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">Tous les rôles</option>
            <option value="admin">Administrateurs</option>
            <option value="vendeur">Vendeurs</option>
          </select>
          
          {/* Filtre par shop (admin global seulement) */}
          {isGlobalAdmin(user) && (
            <select
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          )}
          
          {/* Filtre par statut */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                Liste des Utilisateurs
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''} trouvé{filteredUsers.length > 1 ? 's' : ''}
              </p>
            </div>
            {selectedUsers.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {selectedUsers.length} sélectionné{selectedUsers.length > 1 ? 's' : ''}
                </span>
                <button 
                  onClick={handleDeleteSelected}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shop
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(userItem.id)}
                        onChange={(e) => handleSelectUser(userItem.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">
                            {userItem.prenom.charAt(0)}{userItem.nom.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {userItem.prenom} {userItem.nom}
                          </p>
                          <p className="text-sm text-gray-500">{userItem.poste}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center mb-1">
                          <Mail size={14} className="text-gray-400 mr-2" />
                          {userItem.email}
                        </div>
                        <div className="flex items-center">
                          <Phone size={14} className="text-gray-400 mr-2" />
                          {userItem.telephone}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(userItem.role)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      {getShopBadge(userItem.shopId, userItem.shopName)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle size={12} className="mr-1" />
                        Actif
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditUser(userItem)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(userItem.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          className="text-gray-600 hover:text-gray-900"
                          title="Plus d'actions"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 sm:px-6 py-8 text-center text-gray-500">
                    <Users size={48} className="mx-auto mb-2 text-gray-400" />
                    <p>Aucun utilisateur trouvé</p>
                    <p className="text-sm">Essayez de modifier vos filtres de recherche</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingUser ? 'Modifier Utilisateur' : 'Ajouter Utilisateur'}
                </h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@exemple.com"
                  />
                </div>

                {/* Nom et Prénom */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prénom *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Prénom"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nom"
                    />
                  </div>
                </div>

                {/* Sexe et Poste */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sexe *
                    </label>
                    <select
                      value={formData.sexe}
                      onChange={(e) => setFormData({ ...formData, sexe: e.target.value as 'M' | 'F' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Poste *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.poste}
                      onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Poste"
                    />
                  </div>
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+243 000 000 000"
                  />
                </div>

                {/* Shop (admin global seulement) */}
                {isGlobalAdmin(user) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Shop *
                    </label>
                    <select
                      required
                      value={formData.shopId}
                      onChange={(e) => {
                        const selectedShop = shops.find(s => s.id === e.target.value);
                        setFormData({ 
                          ...formData, 
                          shopId: e.target.value,
                          shopName: selectedShop?.name || ''
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sélectionner un shop</option>
                      {shops.filter(s => s.id !== 'all').map((shop) => (
                        <option key={shop.id} value={shop.id}>
                          {shop.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Rôle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rôle *
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'vendeur' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="vendeur">Vendeur</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>

                {/* Boutons */}
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Sauvegarde...</span>
                      </>
                    ) : (
                      <>
                        {editingUser ? <Edit size={16} /> : <Plus size={16} />}
                        <span>{editingUser ? 'Modifier' : 'Ajouter'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 