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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';

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
  role: 'admin' | 'user';
  password: string;
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
  const [errorMessage, setErrorMessage] = useState('');

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
    role: 'admin',
    password: ''
  });

  const { currentUser, loading: authLoading } = useAuth();

  // Initialiser le formulaire avec les shops disponibles
  useEffect(() => {
    if (shops.length > 0 && currentUser && currentUser.role !== 'admin') {
      setFormData(prev => ({
        ...prev,
        shopId: currentUser.shopId,
        shopName: currentUser.shopName
      }));
    }
  }, [shops, currentUser]);

  // Charger la liste des shops au montage
  useEffect(() => {
    // Les shops sont maintenant chargés dynamiquement dans fetchUsers
    // basés sur les shopId des utilisateurs existants
  }, []);

  // Récupérer les utilisateurs
  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('Récupération des utilisateurs pour:', currentUser?.email);

      let allUsers: User[] = [];
      
      if (currentUser && currentUser.role === 'admin') {
        console.log('Admin - récupération de tous les utilisateurs');
        // Récupérer tous les utilisateurs depuis Firestore
        const usersSnapshot = await getDocs(collection(db, 'users'));
        allUsers = usersSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          docId: doc.id,
          ...doc.data() 
        } as User));
        // Correction : charger la liste des shops depuis la collection 'shops'
        const shopsSnap = await getDocs(collection(db, 'shops'));
        const shopsList = shopsSnap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name
        }));
        setShops([
          { id: 'all', name: 'Tous les shops' },
          ...shopsList
        ]);
      } else if (currentUser) {
        console.log('User - récupération des utilisateurs du shop:', currentUser.shopId);
        // Récupérer seulement les utilisateurs du même shop
        const usersSnapshot = await getDocs(collection(db, 'users'));
        allUsers = usersSnapshot.docs
          .map(doc => ({ 
            id: doc.id, 
            docId: doc.id,
            ...doc.data() 
          } as User))
          .filter(user => user.shopId === currentUser.shopId);
      }

      console.log('Utilisateurs récupérés:', allUsers.length);

      // Ajouter les propriétés d'action
      const usersWithActions = allUsers.map(u => ({
        ...u,
        isSelected: false
      }));

      setUsers(usersWithActions);
      setFilteredUsers(usersWithActions);

      setShowPermissionAlert(false);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      setErrorMessage("Impossible de charger les utilisateurs, vérifiez vos droits Firestore.");
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
    if (!authLoading && currentUser && (currentUser.shopId || currentUser.role === 'admin')) {
      fetchUsers();
    }
  }, [currentUser, authLoading]);

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
  const handleAddUser = async () => {
    setEditingUser(null);
    setErrorMessage('');
    // Les shops sont déjà chargés dans fetchUsers
    setShops(shops);
    setFormData({
      email: '',
      nom: '',
      prenom: '',
      sexe: 'M',
      poste: '',
      telephone: '',
      shopId: currentUser?.role === 'admin' ? '' : currentUser!.shopId,
      shopName: currentUser?.role === 'admin' ? '' : currentUser!.shopName,
      role: 'admin',
      password: ''
    });
    setShowUserModal(true);
  };

  // Ouvrir le modal pour modifier un utilisateur
  const handleEditUser = async (userToEdit: User) => {
    setEditingUser(userToEdit);
    setErrorMessage('');
    setShops(shops);
    setFormData({
      email: userToEdit.email,
      nom: userToEdit.nom,
      prenom: userToEdit.prenom,
      sexe: userToEdit.sexe,
      poste: userToEdit.poste,
      telephone: userToEdit.telephone,
      shopId: userToEdit.shopId,
      shopName: userToEdit.shopName,
      role: userToEdit.role as 'user' | 'admin',
      password: ''
    });
    setShowUserModal(true);
  };

  // Sauvegarder l'utilisateur (ajout ou modification)
  const handleSaveUser = async () => {
    if (loading || !currentUser) {
      setErrorMessage("Veuillez patienter, l'authentification est en cours...");
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');

    const userData = {
      email: formData.email,
      nom: formData.nom,
      prenom: formData.prenom,
      sexe: formData.sexe,
      poste: formData.poste,
      telephone: formData.telephone,
      shopId: formData.shopId,
      shopName: shops.find(s => s.id === formData.shopId)?.name || '',
      role: formData.role,
    };
    try {
      if (editingUser) {
        if (!editingUser.docId) {
          throw new Error("L'ID du document de l'utilisateur est manquant.");
        }
        // Mise à jour directe dans Firestore
        await updateDoc(doc(db, 'users', editingUser.docId), userData);
        await fetchUsers();
        setShowUserModal(false);
        setSuccessMessage(`L'utilisateur ${formData.nom} ${formData.prenom} (${formData.email}) a été mis à jour avec succès !`);
      } else {
        if (!formData.password) {
          throw new Error("Le mot de passe est requis pour créer un utilisateur.");
        }
        // Création directe dans Firestore
        await addDoc(collection(db, 'users'), userData);
        await fetchUsers();
        setShowUserModal(false);
        setSuccessMessage(`L'utilisateur ${formData.nom} ${formData.prenom} (${formData.email}) a été créé avec succès !`);
      }
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      setErrorMessage(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Supprimer un utilisateur
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.")) {
      return;
    }
      try {
      // Suppression directe dans Firestore
      await deleteDoc(doc(db, 'users', userId));
      await fetchUsers();
        setSuccessMessage('Utilisateur supprimé avec succès !');
      setTimeout(() => setSuccessMessage(''), 5000);
      } catch (error: any) {
        console.error('Erreur lors de la suppression:', error);
      setErrorMessage('Erreur lors de la suppression de l\'utilisateur');
    }
  };

  // Supprimer plusieurs utilisateurs
  const handleDeleteSelected = async () => {
    if (selectedUsers.length === 0) {
      setErrorMessage('Aucun utilisateur sélectionné');
      return;
    }
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedUsers.length} utilisateur(s) ? Cette action est irréversible.`)) {
      return;
    }
      try {
      // Suppression multiple directe dans Firestore
      const deletePromises = selectedUsers.map(id => deleteDoc(doc(db, 'users', id)));
        await Promise.all(deletePromises);
      await fetchUsers();
        setSelectedUsers([]);
      setSuccessMessage(`${selectedUsers.length} utilisateur(s) supprimé(s) avec succès !`);
      setTimeout(() => setSuccessMessage(''), 5000);
      } catch (error: any) {
        console.error('Erreur lors de la suppression multiple:', error);
      setErrorMessage('Erreur lors de la suppression des utilisateurs');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
      case 'globalAdmin':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <UserCheck size={12} className="mr-1" />
            Administrateur Global
          </span>
        );
      case 'user':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Users size={12} className="mr-1" />
            Utilisateur
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

  // Ajout du contrôle de connexion
  if (!authLoading && !currentUser) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Vous n'êtes pas connecté.</p>
          <p className="text-sm text-gray-500 mt-2">Veuillez vous connecter pour accéder à la gestion des utilisateurs.</p>
        </div>
      </div>
    );
  }

  if (!currentUser || (!currentUser.shopId && currentUser.role !== 'admin')) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Utilisateur non défini ou shopId manquant</p>
          <p className="text-sm text-gray-500 mt-2">Veuillez vous reconnecter ou vérifier vos droits d'accès.</p>
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
    <div className="p-2 sm:p-6 space-y-4 sm:space-y-6">
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
            {currentUser?.role === 'admin' ? 'Gestion de tous les utilisateurs' : `Utilisateurs du shop: ${currentUser.shopName || currentUser.shopId}`}
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
            <div className="bg-purple-50 p-2 rounded-lg">
              <UserCheck size={20} className="text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Administrateurs globaux</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredUsers.filter(u => u.role === 'admin' || u.role === 'globalAdmin').length}
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
              <p className="text-sm font-medium text-gray-600">Utilisateurs</p>
              <p className="text-2xl font-bold text-gray-900">
                {filteredUsers.filter(u => u.role === 'user').length}
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
              />
            </div>
          </div>
          {/* Filtre par rôle */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
          >
            <option value="all">Tous les rôles</option>
            <option value="admin">Administrateurs de shop</option>
            <option value="user">Utilisateurs</option>
          </select>
          {/* Filtre par shop (admin global seulement) */}
          {currentUser?.role === 'admin' && (
            <select
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
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
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-2 sm:p-6 border-b border-gray-200">
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
          <table className="w-full text-xs sm:text-sm">
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
                          className="text-blue-600 hover:text-blue-700"
                          title="Modifier"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(userItem.id)}
                          className="text-red-600 hover:text-red-700"
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

              {errorMessage && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative mb-4" role="alert">
                  <strong className="font-bold">Erreur: </strong>
                  <span className="block sm:inline">{errorMessage}</span>
                  {/* Affichage du message technique pour debug */}
                  {typeof errorMessage === 'object' && errorMessage !== null && (
                    <pre className="mt-2 text-xs text-gray-700">{JSON.stringify(errorMessage, null, 2)}</pre>
                  )}
                  {typeof errorMessage === 'string' && errorMessage.startsWith('FirebaseError:') && (
                    <pre className="mt-2 text-xs text-gray-700">{errorMessage}</pre>
                  )}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleSaveUser(); }} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (pour la connexion) *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="identifiant@exemple.com"
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
                      Postnom *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.poste}
                      onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Postnom"
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

                {/* Mot de passe (toujours affiché, même en modification) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mot de passe {editingUser ? '' : '*'}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Minimum 6 caractères"
                    minLength={6}
                    required={!editingUser}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {editingUser ? 'Laisse vide pour ne pas changer le mot de passe.' : 'Le mot de passe sera envoyé à l\'utilisateur par email'}
                  </p>
                </div>

                {/* Shop (admin global seulement) */}
                {currentUser?.role === 'admin' && (
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
                      disabled={formData.role === 'admin'}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formData.role === 'admin' ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    >
                      <option value="">Sélectionner un shop</option>
                      {shops.filter(s => s.id !== 'all').map((shop) => (
                        <option key={shop.id} value={shop.id}>
                          {shop.name}
                        </option>
                      ))}
                    </select>
                    {formData.role === 'admin' && (
                      <div className="text-xs text-gray-500 mt-2">
                        Automatiquement défini pour les administrateurs
                      </div>
                    )}
                  </div>
                )}

                {/* Information pour Admin Global */}
                {formData.role === 'admin' && currentUser?.role === 'admin' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <Building size={16} className="text-blue-600 mr-2" />
                      <span className="text-sm text-blue-800 font-medium">
                        Cet administrateur aura accès à tous les shops et toutes les fonctionnalités.
                      </span>
                    </div>
                    <p className="text-xs text-blue-700 mt-1">
                      Cet administrateur aura accès à tous les shops et toutes les fonctionnalités.
                    </p>
                  </div>
                )}

                {/* Rôle */}
                {currentUser?.role === 'admin' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Rôle</label>
                    <select
                      value={formData.role}
                      onChange={e => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                      className="w-full border rounded px-2 py-1"
                    >
                      <option value="user">Utilisateur</option>
                      <option value="admin">Administrateur</option>
                    </select>
                  </div>
                )}

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