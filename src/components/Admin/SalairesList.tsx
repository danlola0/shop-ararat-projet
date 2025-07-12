import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { User, Shop } from '../../types';

interface Salaire {
  id: string;
  userId: string;
  shopId: string;
  montant: number;
  devise: string;
  mois: string;
  datePaiement: {
    toDate: () => Date;
  };
}

const SalairesList: React.FC = () => {
  const [salaires, setSalaires] = useState<Salaire[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [shops, setShops] = useState<Map<string, Shop>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtres
  const [filterShop, setFilterShop] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersMap = new Map(usersSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as User]));
        setUsers(usersMap);

        // Fetch shops
        const shopsSnapshot = await getDocs(collection(db, 'shops'));
        const shopsMap = new Map(shopsSnapshot.docs.map(doc => [doc.id, { id: doc.id, ...doc.data() } as Shop]));
        setShops(shopsMap);
        
        // Fetch salaires
        const salairesQuery = query(collection(db, 'salaires'), orderBy('datePaiement', 'desc'));
        const salairesSnapshot = await getDocs(salairesQuery);
        const salairesData = salairesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Salaire));
        setSalaires(salairesData);

      } catch (err) {
        console.error(err);
        setError('Erreur lors de la récupération des données.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredSalaires = useMemo(() => {
    return salaires
      .filter(s => !filterShop || s.shopId === filterShop)
      // .filter(s => !filterUser || s.userId === filterUser) // A implementer
      .filter(s => !filterMonth || s.mois === filterMonth);
  }, [salaires, filterShop, filterUser, filterMonth]);
  
  if (loading) return <div className="text-center p-4">Chargement...</div>;
  if (error) return <div className="text-center p-4 text-red-500">{error}</div>;

  return (
    <div className="space-y-4">
      {/* TODO: Ajouter les filtres ici */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-2 px-4 border-b">Date</th>
              <th className="py-2 px-4 border-b">Mois</th>
              <th className="py-2 px-4 border-b">Utilisateur</th>
              <th className="py-2 px-4 border-b">Shop</th>
              <th className="py-2 px-4 border-b text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            {filteredSalaires.length > 0 ? (
              filteredSalaires.map(salaire => {
                const user = users.get(salaire.userId);
                const shop = shops.get(salaire.shopId);
                return (
                  <tr key={salaire.id} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b">{salaire.datePaiement.toDate().toLocaleDateString()}</td>
                    <td className="py-2 px-4 border-b">{salaire.mois}</td>
                    <td className="py-2 px-4 border-b">{user ? `${user.prenom} ${user.nom}` : 'Inconnu'}</td>
                    <td className="py-2 px-4 border-b">{shop ? shop.name : 'Inconnu'}</td>
                    <td className="py-2 px-4 border-b text-right font-semibold">{new Intl.NumberFormat().format(salaire.montant)} {salaire.devise}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-4">Aucun salaire enregistré.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalairesList; 