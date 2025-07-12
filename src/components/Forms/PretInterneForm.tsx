import React, { useState, useEffect } from 'react';
import { CurrencyDollarIcon, CalendarIcon, PencilIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { db } from '../../firebase/config';
import { collection, addDoc, Timestamp, getDocs } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';

interface Shop {
  id: string;
  name: string;
}

const PretInterneForm: React.FC = () => {
  const [montant, setMontant] = useState(0);
  const [devise, setDevise] = useState('CDF');
  const [date, setDate] = useState('');
  const [shopReceveur, setShopReceveur] = useState('');
  const [justification, setJustification] = useState('');
  const [shops, setShops] = useState<Shop[]>([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { currentUser } = useAuth();

  // Charger la liste des shops pour le dropdown
  useEffect(() => {
    const fetchShops = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'shops'));
        const shopsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Shop[];
        setShops(shopsList.filter(s => s.id !== currentUser?.shopId)); // Exclure le shop courant
      } catch (err) {
        setError('Erreur lors du chargement des shops');
      }
    };
    fetchShops();
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    setLoading(true);
    try {
      if (!currentUser) throw new Error("Utilisateur non connecté");
      if (!date) throw new Error("Veuillez choisir une date");
      if (!shopReceveur) throw new Error("Veuillez choisir le shop receveur");
      if (montant <= 0) throw new Error("Le montant doit être supérieur à zéro");
      
      const shopReceveurObj = shops.find(s => s.id === shopReceveur);
      
      // 1. Enregistrer le prêt interne (pour traçabilité et gestion des créances/dettes)
      const docData = {
        montant,
        devise,
        date: Timestamp.fromDate(new Date(date)),
        shopEmetteurId: currentUser.shopId,
        shopEmetteurName: currentUser.shopName,
        shopReceveurId: shopReceveur,
        shopReceveurName: shopReceveurObj?.name || '',
        interne: true,
        statut: 'en_attente',
        justification,
        createdBy: currentUser.id,
        createdByName: currentUser.nom + ' ' + currentUser.prenom,
        createdAt: Timestamp.now()
      };
      await addDoc(collection(db, 'creances_dettes'), docData);

      // 2. Enregistrer dans la collection centrale 'mouvements'
      await addDoc(collection(db, 'mouvements'), {
        type: 'pret',
        montant: parseFloat(montant.toString()),
        devise: devise,
        date: date,
        shopId: currentUser.shopId,
        userId: currentUser.id,
        libelle: `Prêt interne - ${justification || 'Prêt interne entre shops'}`,
        createdAt: new Date().toISOString()
      });

      setSuccess('Prêt interne enregistré avec succès ! Les espèces en caisse ont été automatiquement soustraites.');
      setMontant(0);
      setDevise('CDF');
      setDate('');
      setShopReceveur('');
      setJustification('');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6 p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-extrabold text-indigo-700 mb-1 text-center">Prêt Interne entre Shops</h2>
      <p className="text-gray-500 text-center mb-4">Enregistrez ici un prêt interne entre votre shop et un autre shop. <strong>Les espèces en caisse seront automatiquement soustraites.</strong></p>
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded mb-4 text-center font-semibold">
          Données enregistrées avec succès !
        </div>
      )}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-center">{error}</div>}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-gray-400">
            <CurrencyDollarIcon className="h-5 w-5" />
          </span>
          <input
            type="number"
            value={montant}
            onChange={e => setMontant(Number(e.target.value))}
            required
            className="pl-10 pr-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 transition outline-none shadow-sm"
            placeholder="Montant du prêt"
            min={0}
            disabled={loading}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
        <select
          value={devise}
          onChange={e => setDevise(e.target.value)}
          className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 transition outline-none shadow-sm py-2 px-3"
          disabled={loading}
        >
          <option value="CDF">Franc Congolais (CDF)</option>
          <option value="USD">Dollar (USD)</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-gray-400">
            <CalendarIcon className="h-5 w-5" />
          </span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className="pl-10 pr-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 transition outline-none shadow-sm"
            disabled={loading}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Shop receveur</label>
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-gray-400">
            <UserGroupIcon className="h-5 w-5" />
          </span>
          <select
            value={shopReceveur}
            onChange={e => setShopReceveur(e.target.value)}
            className="pl-10 pr-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 transition outline-none shadow-sm"
            required
            disabled={loading}
          >
            <option value="">Sélectionner un shop</option>
            {shops.map(shop => (
              <option key={shop.id} value={shop.id}>{shop.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Justification <span className="text-gray-400 text-xs">(optionnel)</span></label>
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-gray-400">
            <PencilIcon className="h-5 w-5" />
          </span>
          <input
            type="text"
            value={justification}
            onChange={e => setJustification(e.target.value)}
            className="pl-10 pr-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 transition outline-none shadow-sm"
            placeholder="Motif, référence, etc."
            disabled={loading}
          />
        </div>
      </div>
      <button
        type="submit"
        className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition text-lg mt-2 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? 'Enregistrement...' : "Enregistrer le prêt interne"}
      </button>
    </form>
  );
};

export default PretInterneForm; 