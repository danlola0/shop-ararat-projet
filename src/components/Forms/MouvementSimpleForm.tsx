import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { ArrowLeftRight, Save, TrendingUp } from 'lucide-react';

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

  // --- Taux journalier ---
  const [tauxJournalier, setTauxJournalier] = useState<number | null>(null);
  const [tauxJournalierLoading, setTauxJournalierLoading] = useState(true);

  useEffect(() => {
    const fetchTaux = async () => {
      setTauxJournalierLoading(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const tauxQuery = query(collection(db, 'TauxJournalier'), where('date', '==', todayStr));
        const snap = await getDocs(tauxQuery);
        if (!snap.empty) {
          setTauxJournalier(snap.docs[0].data().taux_du_jour);
        } else {
          const lastTauxQuery = query(collection(db, 'TauxJournalier'), orderBy('date', 'desc'), limit(1));
          const lastSnap = await getDocs(lastTauxQuery);
          if (!lastSnap.empty) {
            setTauxJournalier(lastSnap.docs[0].data().taux_du_jour);
          } else {
            setTauxJournalier(null);
          }
        }
      } catch (e) {
        console.error("Erreur de chargement du taux", e);
        setTauxJournalier(null);
      } finally {
        setTauxJournalierLoading(false);
      }
    };
    fetchTaux();
  }, []);


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
      
      const isMultiTransaction = transactions.length > 1 || transactions[0].montant !== '' || transactions[0].description !== '';

      if (isMultiTransaction) {
        totalMontant = transactions.reduce((sum, t) => sum + (parseFloat(t.montant) || 0), 0).toString();
        fullDescription = transactions.map(t => t.description).filter(Boolean).join(' | ');
      }

      if (!isMultiTransaction && (montant === '' || description === '')) {
        setError("Veuillez remplir le montant et la description.");
        setLoading(false);
        return;
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

      {/* Affichage du Taux */}
      <div className="mb-4 p-3 bg-blue-100 border border-blue-200 rounded-lg flex items-center justify-center">
        <TrendingUp size={20} className="text-blue-700 mr-2" />
        <span className="font-semibold text-blue-800">
          {tauxJournalierLoading 
            ? 'Chargement du taux...' 
            : tauxJournalier 
              ? `Taux du jour : 1 USD = ${tauxJournalier.toLocaleString('fr-FR')} CDF`
              : 'Aucun taux défini.'
          }
        </span>
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