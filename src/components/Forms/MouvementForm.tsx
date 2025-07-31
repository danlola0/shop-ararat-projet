import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { collection, addDoc, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { where as firestoreWhere } from 'firebase/firestore';

const MouvementForm: React.FC = () => {
  const { currentUser } = useAuth();
  const [form, setForm] = useState({
    type: 'vente_credit',
    montant: '',
    montantCDF: '',
    date: new Date().toISOString().split('T')[0],
    justification: ''
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mouvements, setMouvements] = useState<any[]>([]);
  const [transactions, setTransactions] = useState([{ montant: '', montantCDF: '', justification: '' }]);
  const [tauxJournalier, setTauxJournalier] = useState<number | null>(null);
  const [tauxJournalierLoading, setTauxJournalierLoading] = useState(true);
  const [tauxJournalierError, setTauxJournalierError] = useState('');

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

  useEffect(() => {
    const fetchTaux = async () => {
      setTauxJournalierLoading(true);
      setTauxJournalierError('');
      try {
        const dateStr = form.date;
        let tauxTrouve = false;

        const tauxQuery = query(collection(db, 'TauxJournalier'), firestoreWhere('date', '==', dateStr));
        const snap = await getDocs(tauxQuery);
        
        if (!snap.empty) {
          const doc = snap.docs[0];
          setTauxJournalier(doc.data().taux_du_jour);
          tauxTrouve = true;
        } else {
          const lastTauxQuery = query(collection(db, 'TauxJournalier'), orderBy('date', 'desc'), limit(1));
          const lastSnap = await getDocs(lastTauxQuery);
          if (!lastSnap.empty) {
            const lastDoc = lastSnap.docs[0];
            setTauxJournalier(lastDoc.data().taux_du_jour);
            setTauxJournalierError(`Taux du ${dateStr} non trouvé. Utilisation du dernier taux connu (${lastDoc.data().date}).`);
            tauxTrouve = true;
          }
        }

        if (!tauxTrouve) {
          setTauxJournalier(null);
          setTauxJournalierError("Aucun taux de change n'a été défini dans le système.");
        }

      } catch (e) {
        setTauxJournalier(null);
        setTauxJournalierError('Erreur critique lors de la récupération du taux.');
      } finally {
        setTauxJournalierLoading(false);
      }
    };
    fetchTaux();
  }, [form.date]);

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
        montant = transactions.reduce((sum, t) => sum + (parseFloat((t.montant || '').replace(',', '.')) || 0), 0).toString();
        justification = transactions.map(t => t.justification).filter(Boolean).join(' | ');
      }
      await addDoc(collection(db, 'mouvements'), {
        shopId: currentUser.shopId,
        userId: currentUser.id,
        type: form.type,
        montant: parseFloat(montant.replace(',', '.')) || 0,
        montantCDF: parseFloat(form.montantCDF.replace(',', '.')) || 0,
        date: form.date,
        justification,
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
      setForm({
        type: 'vente_credit',
        montant: '',
        montantCDF: '',
        date: form.date,
        justification: ''
      });
      setTransactions([{ montant: '', montantCDF: '', justification: '' }]);
    } catch (err: any) {
      setError("Erreur lors de l'enregistrement du mouvement.");
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(false), 1500);
    }
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-md space-y-6 w-full sm:w-auto">
      <h2 className="text-2xl font-bold text-blue-900 mb-4">Ajouter des mouvements</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type de mouvement</label>
          <select
            value={form.type}
            onChange={e => {
              handleChange('type', e.target.value);
              if (["entrée", "sortie"].includes(e.target.value)) {
                setTransactions([{ montant: '', montantCDF: '', justification: '' }]);
              }
            }}
            className="w-full border rounded px-2 py-1"
          >
            <option value="">Sélectionner un type de mouvement</option>
            <option value="entrée">Entrée</option>
            <option value="sortie">Sortie</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date du mouvement</label>
          <input
            type="date"
            value={form.date}
            onChange={e => handleChange('date', e.target.value)}
            className="w-full border rounded px-2 py-1"
            required
          />
        </div>
        {(form.type === 'entrée' || form.type === 'sortie') && (
          <>
            <p className="text-blue-700 text-sm mb-2 font-medium flex items-center gap-2">
              <span className="bg-blue-100 rounded-full px-2 py-1">Astuce</span>
              Vous pouvez ajouter plusieurs lignes pour cette opération.
            </p>
            {transactions.map((t, idx) => {
              return (
                <div key={idx} className="flex flex-col sm:flex-row gap-2 mb-4 items-end p-3 bg-blue-50 border border-blue-200 rounded-lg w-full">
                  <div className="flex-1">
                    <label className="block text-xs font-medium mb-1">Montant ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={t.montant}
                      onChange={e => {
                        const val = e.target.value.replace(',', '.');
                        const arr = [...transactions];
                        arr[idx].montant = val;
                        if (tauxJournalier) {
                            arr[idx].montantCDF = val ? (parseFloat(val) * tauxJournalier).toFixed(2) : '';
                        }
                        setTransactions(arr);
                      }}
                      className="border rounded px-2 py-1 w-full"
                      placeholder="Montant en $"
                      min="0"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium mb-1">Montant (CDF)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={t.montantCDF}
                      onChange={e => {
                        const val = e.target.value.replace(',', '.');
                        const arr = [...transactions];
                        arr[idx].montantCDF = val;
                        if (tauxJournalier) {
                            arr[idx].montant = val ? (parseFloat(val) / tauxJournalier).toFixed(2) : '';
                        }
                        setTransactions(arr);
                      }}
                      className="border rounded px-2 py-1 w-full"
                      placeholder="Montant en CDF"
                      min="0"
                    />
                  </div>
                  <input
                    type="text"
                    value={t.justification}
                    onChange={e => {
                      const arr = [...transactions];
                      arr[idx].justification = e.target.value;
                      setTransactions(arr);
                    }}
                    className="border rounded px-2 py-1 flex-1"
                    placeholder="Justification"
                  />
                  {transactions.length > 1 && (
                    <button type="button" onClick={() => setTransactions(transactions.filter((_, i) => i !== idx))} className="text-red-600">Supprimer</button>
                  )}
                </div>
              );
            })}
             <div className="w-full">
                {tauxJournalierLoading ? (
                  <span className="text-blue-700 text-xs">Chargement du taux…</span>
                ) : tauxJournalier !== null ? (
                  <span className="inline-block bg-blue-50 border border-blue-200 text-blue-900 rounded px-2 py-1 text-xs font-semibold mt-1">
                    Taux utilisé : 1 USD = {tauxJournalier.toLocaleString('fr-FR')} CDF
                  </span>
                ) : null}
                 {tauxJournalierError && <div className="text-orange-600 text-xs mt-1">{tauxJournalierError}</div>}
            </div>
            <button
              type="button"
              onClick={() => setTransactions([
                ...transactions,
                { montant: '', montantCDF: '', justification: '' }
              ])}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow transition-colors mb-2 mt-2"
            >
              <span className="text-lg font-bold">+</span> Ajouter une transaction
            </button>
            {transactions.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-lg font-bold text-green-900">
                Total général : {
                  transactions.reduce((sum, t) => {
                    const usd = parseFloat(t.montant?.replace(',', '.') || '0') || 0;
                    return sum + usd;
                  }, 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                } $
              </div>
            )}
          </>
        )}
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
            Mouvement enregistré avec succès !
          </div>
        )}
        <div className="flex justify-end pt-4 w-full">
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Enregistrement...' : 'Enregistrement'}
          </button>
        </div>
      </form>
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-2 text-gray-800">Mouvements du jour ({form.date.split('-').reverse().join('/')})</h3>
        {mouvements.length === 0 ? (
          <div className="text-gray-500">Aucun mouvement saisi pour cette date.</div>
        ) : (
          <table className="min-w-full border text-sm w-full sm:w-auto overflow-x-auto">
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
                  <td className="px-2 py-1 border">{mvt.type}</td>
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