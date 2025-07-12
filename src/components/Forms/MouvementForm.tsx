import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';

const typesMouvement = [
  { value: 'vente_credit', label: 'Vente crédit' },
  { value: 'depot_carte', label: 'Dépôt carte' },
  { value: 'depense', label: 'Dépense' },
  { value: 'retrait_admin', label: 'Retrait admin' },
  { value: 'pret', label: 'Prêt' },
  { value: 'autre', label: 'Autre' }
];

const MouvementForm: React.FC = () => {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({
    type: 'vente_credit',
    montant: '',
    date: new Date().toISOString().split('T')[0],
    justification: ''
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mouvements, setMouvements] = useState<any[]>([]);
  const [transactions, setTransactions] = useState([{ montant: '', justification: '' }]);

  // Charger les mouvements du jour
  useEffect(() => {
    if (!currentUser) return;
    const fetchMouvements = async () => {
      const q = query(
        collection(db, 'mouvements'),
        where('shopId', '==', currentUser.shopId),
        where('date', '==', form.date),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setMouvements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchMouvements();
  }, [currentUser, form.date, success]);

  const handleChange = (field: string, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      let montant = form.montant;
      let justification = form.justification;
      if (["entrée", "sortie"].includes(form.type)) {
        montant = transactions.reduce((sum, t) => sum + (parseFloat(t.montant) || 0), 0).toString();
        justification = transactions.map(t => t.justification).filter(Boolean).join(' | ');
      }
      await addDoc(collection(db, 'mouvements'), {
        shopId: currentUser.shopId,
        userId: currentUser.id,
        type: form.type,
        montant: parseFloat(montant) || 0,
        date: form.date,
        justification,
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
      setForm({
        type: 'vente_credit',
        montant: '',
        date: form.date,
        justification: ''
      });
      setTransactions([{ montant: '', justification: '' }]);
    } catch (err: any) {
      setError("Erreur lors de l'enregistrement du mouvement.");
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(false), 1500);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-md space-y-6">
      <h2 className="text-2xl font-bold text-blue-900 mb-4">Ajouter des mouvements</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type de mouvement</label>
          <select
            value={form.type}
            onChange={e => {
              handleChange('type', e.target.value);
              if (["entrée", "sortie"].includes(e.target.value)) {
                setTransactions([{ montant: '', justification: '' }]);
              }
            }}
            className="w-full border rounded px-2 py-1"
          >
            <option value="entrée">Entrée</option>
            <option value="sortie">Sortie</option>
            {typesMouvement.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {["entrée", "sortie"].includes(form.type) ? (
          <>
            {transactions.map((t, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <input
                  type="number"
                  value={t.montant}
                  onChange={e => {
                    const arr = [...transactions];
                    arr[idx].montant = e.target.value;
                    setTransactions(arr);
                  }}
                  className="border rounded px-2 py-1"
                  placeholder="Montant"
                  min="0"
                  required
                />
                <input
                  type="text"
                  value={t.justification}
                  onChange={e => {
                    const arr = [...transactions];
                    arr[idx].justification = e.target.value;
                    setTransactions(arr);
                  }}
                  className="border rounded px-2 py-1"
                  placeholder="Justification"
                />
                {transactions.length > 1 && (
                  <button type="button" onClick={() => setTransactions(transactions.filter((_, i) => i !== idx))} className="text-red-600">Supprimer</button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setTransactions([...transactions, { montant: '', justification: '' }])}
              className="bg-green-600 text-white px-2 py-1 rounded text-xs mb-2"
            >
              Ajouter une transaction
            </button>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Montant ($)</label>
              <input
                type="number"
                value={form.montant}
                onChange={e => handleChange('montant', e.target.value)}
                className="w-full border rounded px-2 py-1"
                placeholder="ex: 100"
                min="0"
                required
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
          </>
        )}
        {error && <div className="text-red-600 font-semibold p-3 bg-red-50 rounded-md">{error}</div>}
        {success && (
          <div className="text-green-600 font-semibold p-3 bg-green-50 rounded-md">
            Mouvement enregistré avec succès !
          </div>
        )}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Enregistrement...' : 'Ajouter'}
          </button>
        </div>
      </form>
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-2 text-gray-800">Mouvements du jour ({form.date})</h3>
        {mouvements.length === 0 ? (
          <div className="text-gray-500">Aucun mouvement saisi pour cette date.</div>
        ) : (
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1 border">Type</th>
                <th className="px-2 py-1 border">Montant ($)</th>
                <th className="px-2 py-1 border">Justification</th>
                <th className="px-2 py-1 border">Heure</th>
              </tr>
            </thead>
            <tbody>
              {mouvements.map(mvt => (
                <tr key={mvt.id}>
                  <td className="px-2 py-1 border">{typesMouvement.find(t => t.value === mvt.type)?.label || mvt.type}</td>
                  <td className="px-2 py-1 border text-right">{mvt.montant}</td>
                  <td className="px-2 py-1 border">{mvt.justification}</td>
                  <td className="px-2 py-1 border">{mvt.createdAt ? new Date(mvt.createdAt).toLocaleTimeString() : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MouvementForm; 