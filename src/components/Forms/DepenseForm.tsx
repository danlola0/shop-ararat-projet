import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';

const categories = [
  { value: 'salaire', label: 'Salaire' },
  { value: 'depense', label: 'Dépense' }
];

const devises = ['CDF', 'USD'];

interface DepenseFormProps {
  forceCategorie?: 'salaire' | 'depense';
  showUser?: boolean;
}

const DepenseForm: React.FC<DepenseFormProps> = ({ forceCategorie, showUser }) => {
  const { currentUser } = useAuth();
  const [categorie, setCategorie] = useState(forceCategorie || 'salaire');
  const [montant, setMontant] = useState('');
  const [devise, setDevise] = useState('CDF');
  const [dateOperation, setDateOperation] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [user, setUser] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    setLoading(true);
    try {
      if (!currentUser) throw new Error('Utilisateur non connecté');
      if (!montant || isNaN(Number(montant)) || Number(montant) <= 0) throw new Error('Montant invalide');
      await addDoc(collection(db, 'depenses'), {
        montant: Number(montant),
        devise,
        shopId: currentUser.shopId,
        dateOperation,
        categorie: forceCategorie || categorie,
        description: showUser && user ? `Salaire: ${user}${description ? ' - ' + description : ''}` : description,
        createdBy: currentUser.id,
        createdAt: serverTimestamp(),
        ...(showUser ? { user } : {})
      });
      setSuccess('Enregistré avec succès !');
      setMontant('');
      setDescription('');
      setUser('');
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6 p-6 bg-white rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-extrabold text-blue-700 mb-1 text-center">{forceCategorie === 'salaire' ? 'Saisie Salaire' : 'Saisie Dépense'}</h2>
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-center">{success}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-center">{error}</div>}
      {!forceCategorie && (
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select value={categorie} onChange={e => setCategorie(e.target.value)} className="w-full border rounded px-2 py-1">
            {categories.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      )}
      {showUser && (
        <div>
          <label className="block text-sm font-medium mb-1">User</label>
          <input type="text" value={user} onChange={e => setUser(e.target.value)} className="w-full border rounded px-2 py-1" required />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">Montant</label>
        <input type="number" value={montant} onChange={e => setMontant(e.target.value)} className="w-full border rounded px-2 py-1" required min={0} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Devise</label>
        <select value={devise} onChange={e => setDevise(e.target.value)} className="w-full border rounded px-2 py-1">
          {devises.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Date de l'opération</label>
        <input type="date" value={dateOperation} onChange={e => setDateOperation(e.target.value)} className="w-full border rounded px-2 py-1" required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full border rounded px-2 py-1" />
      </div>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded w-full" disabled={loading}>{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
    </form>
  );
};

export default DepenseForm; 