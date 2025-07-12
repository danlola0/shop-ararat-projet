import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { User, Shop } from '../../types';

const SalaireForm: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedShopId, setSelectedShopId] = useState('');
  const [montant, setMontant] = useState('');
  const [devise, setDevise] = useState('USD');
  const [mois, setMois] = useState(new Date().toISOString().slice(0, 7)); // Format YYYY-MM
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Charger les utilisateurs et les shops
  useEffect(() => {
    const fetchUsersAndShops = async () => {
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        setUsers(usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));

        const shopsSnapshot = await getDocs(collection(db, 'shops'));
        setShops(shopsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop)));
      } catch (err) {
        setError('Erreur lors du chargement des données.');
      }
    };
    fetchUsersAndShops();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !selectedShopId || !montant) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await addDoc(collection(db, 'salaires'), {
        userId: selectedUserId,
        shopId: selectedShopId,
        montant: Number(montant),
        devise,
        mois,
        description,
        datePaiement: serverTimestamp(),
        paidBy: currentUser?.id,
      });

      setSuccess('Le salaire a été enregistré avec succès !');
      // Réinitialiser le formulaire
      setSelectedUserId('');
      setSelectedShopId('');
      setMontant('');
      setDescription('');

    } catch (err) {
      setError('Une erreur est survenue lors de l\'enregistrement.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">{error}</div>}
      {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">{success}</div>}

      <div>
        <label htmlFor="shop" className="block text-sm font-medium text-gray-700">Shop</label>
        <select id="shop" value={selectedShopId} onChange={e => setSelectedShopId(e.target.value)} required className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          <option value="">Sélectionner un shop</option>
          {shops.map(shop => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="user" className="block text-sm font-medium text-gray-700">Utilisateur</label>
        <select id="user" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} required className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          <option value="">Sélectionner un utilisateur</option>
          {users.map(user => <option key={user.id} value={user.id}>{user.prenom} {user.nom}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="montant" className="block text-sm font-medium text-gray-700">Montant</label>
        <input type="number" id="montant" value={montant} onChange={e => setMontant(e.target.value)} required className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2" />
      </div>

      <div>
        <label htmlFor="devise" className="block text-sm font-medium text-gray-700">Devise</label>
        <select id="devise" value={devise} onChange={e => setDevise(e.target.value)} className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          <option value="USD">Dollar (USD)</option>
          <option value="CDF">Franc Congolais (CDF)</option>
        </select>
      </div>

      <div>
        <label htmlFor="mois" className="block text-sm font-medium text-gray-700">Mois du Salaire</label>
        <input type="month" id="mois" value={mois} onChange={e => setMois(e.target.value)} required className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2" />
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description (Optionnel)</label>
        <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"></textarea>
      </div>

      <button type="submit" disabled={loading} className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400">
        {loading ? 'Enregistrement...' : 'Enregistrer le Salaire'}
      </button>
    </form>
  );
};

export default SalaireForm; 