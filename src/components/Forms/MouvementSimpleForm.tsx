import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { ArrowLeftRight, Save } from 'lucide-react';

const MouvementSimpleForm: React.FC = () => {
  const { currentUser } = useAuth();
  const [operation, setOperation] = useState<'Entrée' | 'Sortie'>('Entrée');
  const [montant, setMontant] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState([{ montant: '', description: '' }]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    try {
      if (!currentUser?.shopId || !currentUser?.id) {
        setError("Utilisateur ou shop non identifié.");
        setLoading(false);
        return;
      }
      let totalMontant = montant;
      let fullDescription = description;
      if (transactions.length > 1 || transactions[0].montant !== '' || transactions[0].description !== '') {
        totalMontant = transactions.reduce((sum, t) => sum + (parseFloat(t.montant) || 0), 0).toString();
        fullDescription = transactions.map(t => t.description).filter(Boolean).join(' | ');
      }
      const shopId = currentUser.shopId;
      const userId = currentUser.id;
      await addDoc(collection(db, 'mouvements'), {
        userId,
        shopId,
        operation,
        montant: parseFloat(totalMontant),
        description: fullDescription,
        date,
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
      setMontant('');
      setDescription('');
      setOperation('Entrée');
      setDate(new Date().toISOString().split('T')[0]);
      setTransactions([{ montant: '', description: '' }]);
    } catch (err) {
      setError("Erreur lors de l'enregistrement du mouvement.");
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(false), 2000);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-gray-50 p-6 rounded-lg shadow border mt-4">
      <div className="flex items-center mb-4">
        <ArrowLeftRight className="text-blue-600 mr-2" size={28} />
        <h2 className="text-2xl font-bold text-blue-900">Mouvements</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Sélectionner l'opération</label>
          <div className="relative">
            <select
              value={operation}
              onChange={e => setOperation(e.target.value as 'Entrée' | 'Sortie')}
              className="w-full border rounded px-3 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="Entrée">Entrée</option>
              <option value="Sortie">Sortie</option>
            </select>
            <span className="absolute right-3 top-3 pointer-events-none">
              <ArrowLeftRight size={18} className="text-gray-400" />
            </span>
          </div>
        </div>
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
              className="w-full border rounded px-3 py-2"
              placeholder="Saisir le montant"
              min="0"
              required
            />
            <input
              type="text"
              value={t.description}
              onChange={e => {
                const arr = [...transactions];
                arr[idx].description = e.target.value;
                setTransactions(arr);
              }}
              className="w-full border rounded px-3 py-2"
              placeholder="Ex. : Achat stock, Vente produit…"
              required
            />
            {transactions.length > 1 && (
              <button type="button" onClick={() => setTransactions(transactions.filter((_, i) => i !== idx))} className="text-red-600">Supprimer</button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => setTransactions([...transactions, { montant: '', description: '' }])}
          className="bg-green-600 text-white px-2 py-1 rounded text-xs mb-2"
        >
          Ajouter une transaction
        </button>
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        {error && <div className="text-red-600 font-semibold p-3 bg-red-50 rounded-md">{error}</div>}
        {success && (
          <div className="text-green-600 font-semibold p-3 bg-green-50 rounded-md">
            Mouvements enregistrés avec succès !
          </div>
        )}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-semibold flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={loading}
          >
            <Save size={18} />
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MouvementSimpleForm; 