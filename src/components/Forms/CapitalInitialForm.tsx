import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { collection, addDoc } from 'firebase/firestore';

const CapitalInitialForm: React.FC = () => {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({
    electronique: '',
    especeVente: '',
    soldeDepotCarte: '',
    stockRestant: '',
    justification: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Calculs automatiques
  const especeEnCaisse = (parseFloat(form.electronique) || 0) + (parseFloat(form.especeVente) || 0) + (parseFloat(form.soldeDepotCarte) || 0);
  const valeurStockRestant = parseFloat(form.stockRestant) || 0;
  const totalGeneral = especeEnCaisse + valeurStockRestant;

  const handleChange = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await addDoc(collection(db, 'capitaux'), {
        shopId: currentUser.shopId,
        userId: currentUser.id,
        dateOperation: form.date,
        electronique: parseFloat(form.electronique) || 0,
        especeVente: parseFloat(form.especeVente) || 0,
        soldeDepotCarte: parseFloat(form.soldeDepotCarte) || 0,
        especeEnCaisse,
        valeurStockRestant,
        totalGeneral,
        justification: form.justification,
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
      setForm({
        electronique: '',
        especeVente: '',
        soldeDepotCarte: '',
        stockRestant: '',
        justification: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (err: any) {
      setError("Erreur lors de l'enregistrement du capital initial.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-md space-y-6">
      <h2 className="text-2xl font-bold text-blue-900 mb-4">Capital initial du jour ($)</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Argent électronique ($)</label>
          <input
            type="number"
            value={form.electronique}
            onChange={e => handleChange('electronique', e.target.value)}
            className="w-full border rounded px-2 py-1"
            placeholder="ex: 100"
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Espèces issues de vente crédit ($)</label>
          <input
            type="number"
            value={form.especeVente}
            onChange={e => handleChange('especeVente', e.target.value)}
            className="w-full border rounded px-2 py-1"
            placeholder="ex: 200"
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Solde dépôt carte ($)</label>
          <input
            type="number"
            value={form.soldeDepotCarte}
            onChange={e => handleChange('soldeDepotCarte', e.target.value)}
            className="w-full border rounded px-2 py-1"
            placeholder="ex: 50"
            min="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Valeur du stock restant ($)</label>
          <input
            type="number"
            value={form.stockRestant}
            onChange={e => handleChange('stockRestant', e.target.value)}
            className="w-full border rounded px-2 py-1"
            placeholder="ex: 70"
            min="0"
          />
        </div>
      </div>
      <div className="mt-6 p-4 bg-gray-50 rounded border">
        <div className="mb-2 font-semibold">Espèce en caisse : <span className="text-blue-700">{especeEnCaisse.toLocaleString()} $</span></div>
        <div className="mb-2 font-semibold">Valeur du stock restant : <span className="text-blue-700">{valeurStockRestant.toLocaleString()} $</span></div>
        <div className="mb-2 font-bold text-lg">TOTAL GÉNÉRAL : <span className="text-green-700">{totalGeneral.toLocaleString()} $</span></div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Date</label>
        <input
          type="date"
          value={form.date}
          onChange={e => handleChange('date', e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Justification (optionnel)</label>
        <input
          type="text"
          value={form.justification}
          onChange={e => handleChange('justification', e.target.value)}
          className="w-full border rounded px-2 py-1"
          placeholder="Saisir une justification si besoin"
        />
      </div>
      {error && <div className="text-red-600 font-semibold p-3 bg-red-50 rounded-md">{error}</div>}
      {success && (
        <div className="text-green-600 font-semibold p-3 bg-green-50 rounded-md">
          Capital initial enregistré avec succès !
        </div>
      )}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Enregistrement...' : 'Valider'}
        </button>
      </div>
    </form>
  );
};

export default CapitalInitialForm; 