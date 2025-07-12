import React, { useState } from 'react';
import { CurrencyDollarIcon, CalendarIcon, PencilIcon } from '@heroicons/react/24/outline';
import { db } from '../../firebase/config';
import { collection, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';

const RetraitAdminForm: React.FC = () => {
  const [montant, setMontant] = useState(0);
  const [devise, setDevise] = useState('CDF');
  const [date, setDate] = useState('');
  const [justification, setJustification] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { currentUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    setLoading(true);
    try {
      if (!currentUser) throw new Error("Utilisateur non connecté");
      if (!date) throw new Error("Veuillez choisir une date");
      if (montant <= 0) throw new Error("Le montant doit être supérieur à zéro");
      
      // Enregistrer dans la collection centrale 'mouvements'
      await addDoc(collection(db, 'mouvements'), {
        type: 'retrait_admin',
        montant: parseFloat(montant.toString()),
        devise,
        date,
        shopId: currentUser.shopId,
        userId: currentUser.id,
        libelle: `Retrait administrateur - ${justification || 'Sans justification'}`,
        createdAt: new Date().toISOString()
      });

      setSuccess('Retrait enregistré avec succès ! Les espèces en caisse ont été automatiquement soustraites.');
      setMontant(0);
      setDevise('CDF');
      setDate('');
      setJustification('');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6 p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-extrabold text-red-700 mb-1 text-center">Retrait d'Espèces (Admin)</h2>
      <p className="text-gray-500 text-center mb-4">Enregistrez ici un retrait d'espèces effectué par un administrateur. <strong>Les espèces en caisse seront automatiquement soustraites.</strong></p>
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
            className="pl-10 pr-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-400 focus:border-red-500 transition outline-none shadow-sm"
            placeholder="Montant du retrait"
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
          className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-400 focus:border-red-500 transition outline-none shadow-sm py-2 px-3"
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
            className="pl-10 pr-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-400 focus:border-red-500 transition outline-none shadow-sm"
            disabled={loading}
          />
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
            className="pl-10 pr-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-400 focus:border-red-500 transition outline-none shadow-sm"
            placeholder="Motif, référence, etc."
            disabled={loading}
          />
        </div>
      </div>
      <button
        type="submit"
        className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition text-lg mt-2 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? 'Enregistrement...' : "Enregistrer le retrait"}
      </button>
    </form>
  );
};

export default RetraitAdminForm; 