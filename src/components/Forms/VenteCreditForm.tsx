import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { collection, addDoc } from 'firebase/firestore';

const devises = ['CDF', 'USD'];

const VenteCreditForm: React.FC = () => {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({
    montant: '',
    devise: 'USD',
    stockAvant: '',
    stockApres: '',
    date: new Date().toISOString().split('T')[0],
    justification: ''
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      await addDoc(collection(db, 'ventesCredit'), {
        userId: currentUser.id,
        shopId: currentUser.shopId,
        montant: parseFloat(form.montant) || 0,
        devise: form.devise,
        stockAvant: parseFloat(form.stockAvant) || 0,
        stockApres: parseFloat(form.stockApres) || 0,
        date: form.date,
        justification: form.justification,
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
      setForm({
        montant: '',
        devise: 'USD',
        stockAvant: '',
        stockApres: '',
        date: new Date().toISOString().split('T')[0],
        justification: ''
      });
    } catch (err: any) {
      setError("Erreur lors de l'enregistrement de la vente de crédit.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Vente de Crédit</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={e => handleChange('date', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
          <select
            value={form.devise}
            onChange={e => handleChange('devise', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {devises.map(dev => (
              <option key={dev} value={dev}>{dev}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Montant de la vente</label>
          <input
            type="number"
            value={form.montant}
            onChange={e => handleChange('montant', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="ex: 100"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stock avant</label>
          <input
            type="number"
            value={form.stockAvant}
            onChange={e => handleChange('stockAvant', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="ex: 1000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stock après</label>
          <input
            type="number"
            value={form.stockApres}
            onChange={e => handleChange('stockApres', e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            placeholder="ex: 900"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Justification</label>
        <textarea
          value={form.justification}
          onChange={e => handleChange('justification', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
          rows={2}
          placeholder="ex: Vente de crédit du jour"
        />
      </div>
      {error && <div className="text-red-600 font-semibold p-3 bg-red-50 rounded-md">{error}</div>}
      {success && (
        <div className="text-green-600 font-semibold p-3 bg-green-50 rounded-md">
          Vente de crédit enregistrée avec succès !
        </div>
      )}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Enregistrement...' : 'Enregistrer la Vente'}
        </button>
      </div>
    </form>
  );
};

export default VenteCreditForm;