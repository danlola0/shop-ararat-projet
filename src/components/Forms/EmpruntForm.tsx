import React, { useState } from 'react';
import { CurrencyDollarIcon, CalendarIcon, PencilIcon } from '@heroicons/react/24/outline';
import { db } from '../../firebase/config';
import { collection, addDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';

interface EmpruntFormProps {
  onSubmit?: (data: EmpruntFormData) => void;
}

export interface EmpruntFormData {
  montant: number;
  devise: string;
  date: string;
  description?: string;
}

const EmpruntForm: React.FC<EmpruntFormProps> = ({ onSubmit }) => {
  const [montant, setMontant] = useState(0);
  const [devise, setDevise] = useState('CDF');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
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
      const docData = {
        montant,
        devise,
        dateOperation: date,
        description,
        shopId: currentUser.shopId,
        shopName: currentUser.shopName,
        type: 'emprunt',
        createdAt: serverTimestamp(),
        createdBy: currentUser.id,
        createdByName: currentUser.nom + ' ' + currentUser.prenom
      };
      await addDoc(collection(db, 'creances_dettes'), docData);
      setSuccess('Emprunt enregistré avec succès !');
      setMontant(0);
      setDevise('CDF');
      setDate('');
      setDescription('');
      if (onSubmit) onSubmit(docData);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6 p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-extrabold text-blue-700 mb-1 text-center">Saisie d'Emprunt</h2>
      <p className="text-gray-500 text-center mb-4">Enregistrez ici un nouvel emprunt contracté par votre shop.</p>
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-center">{success}</div>}
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
            className="pl-10 pr-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition outline-none shadow-sm"
            placeholder="Montant de l'emprunt"
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
          className="w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition outline-none shadow-sm py-2 px-3"
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
            className="pl-10 pr-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition outline-none shadow-sm"
            disabled={loading}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 text-xs">(optionnel)</span></label>
        <div className="relative">
          <span className="absolute left-3 top-2.5 text-gray-400">
            <PencilIcon className="h-5 w-5" />
          </span>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="pl-10 pr-3 py-2 w-full rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition outline-none shadow-sm"
            placeholder="Motif, référence, etc."
            disabled={loading}
          />
        </div>
      </div>
      <button
        type="submit"
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition text-lg mt-2 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? 'Enregistrement...' : "Enregistrer l'emprunt"}
      </button>
    </form>
  );
};

export default EmpruntForm; 