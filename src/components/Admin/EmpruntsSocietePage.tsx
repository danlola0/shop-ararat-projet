import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { empruntSocieteService } from '../../services/firestore';
import { EmpruntSociete } from '../../types';
import { Trash2, Edit, X } from 'lucide-react';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../../firebase';

const EmpruntsSocietePage: React.FC = () => {
  const { currentUser } = useAuth();
  const [montant, setMontant] = useState('');
  const [devise, setDevise] = useState<'CDF' | 'USD'>('CDF');
  const [type, setType] = useState<'emprunt' | 'remboursement'>('emprunt');
  const [motif, setMotif] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [operations, setOperations] = useState<EmpruntSociete[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('interne');

  // Filtres
  const [filterDevise, setFilterDevise] = useState<'ALL' | 'CDF' | 'USD'>('ALL');
  const [filterType, setFilterType] = useState<'ALL' | 'emprunt' | 'remboursement'>('ALL');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [filterShop, setFilterShop] = useState('ALL');
  const [shops, setShops] = useState<{id: string, name: string}[]>([]);
  const [filterSource, setFilterSource] = useState('ALL');

  const sourceOptions = [
    { value: 'interne', label: 'Interne (caisse carte)' },
    { value: 'echange', label: 'Caisse Échange de Monnaie' },
    { value: 'credit', label: 'Caisse Vente de Crédit' },
    { value: 'transaction', label: 'Caisse Transactions Électroniques' },
    { value: 'personnel', label: 'Personnel' },
    { value: 'banque', label: 'Banque' },
    { value: 'partenaire', label: 'Partenaire' },
    { value: 'autre', label: 'Autre' }
  ];

  const [editingOperation, setEditingOperation] = useState<EmpruntSociete | null>(null);
  const [editForm, setEditForm] = useState({ montant: '', devise: 'CDF', type: 'emprunt', motif: '', source: 'interne' });
  const [showEditModal, setShowEditModal] = useState(false);

  // Charger les shops pour l'admin global
  const fetchShops = async () => {
    try {
      // Récupération directe depuis Firestore
      const shopsSnapshot = await getDocs(collection(db, 'users'));
      const allUsers = shopsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Extraire les shops uniques des utilisateurs
      const shopIds = [...new Set(allUsers.map(u => u.shopId).filter(id => id && id !== 'ALL_SHOPS'))];
      const shopNames = [...new Set(allUsers.map(u => u.shopName).filter(name => name && name !== 'Tous les Shops'))];
      
      const allShops = shopIds.map((id, index) => ({
        id,
        name: shopNames[index] || id
      }));
      
      setShops(allShops);
    } catch (error) {
      console.error('Erreur lors de la récupération des shops:', error);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  // Charger les opérations d'emprunt/remboursement
  const fetchOperations = async () => {
    setLoading(true);
    try {
      let ops = [];
      if (currentUser) {
        if (currentUser.role === 'admin' && currentUser.shopId === 'ALL_SHOPS') {
          ops = await empruntSocieteService.getAllForAdmin(currentUser);
        } else {
          ops = await empruntSocieteService.getByShop(currentUser.shopId);
        }
      }
      setOperations(ops);
    } catch (e) {
      setOperations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperations();
    // eslint-disable-next-line
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!montant || isNaN(Number(montant)) || Number(montant) <= 0) {
      setErrorMessage('Le montant est obligatoire et doit être supérieur à 0.');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
      return;
    }
    setIsSubmitting(true);
    setShowError(false);
    setShowSuccess(false);
    try {
      await empruntSocieteService.create({
        shopId: currentUser.shopId,
        shopName: currentUser.shopName,
        montant: Number(montant),
        devise,
        type,
        source,
        motif,
        date: new Date().toISOString(),
        userId: currentUser.id,
        userName: `${currentUser.prenom} ${currentUser.nom}`
      });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
      setMontant('');
      setMotif('');
      setSource('interne');
      fetchOperations();
    } catch (e) {
      setErrorMessage('Erreur lors de l\'enregistrement.');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtrage des opérations
  const filteredOperations = operations.filter(op => {
    if (filterDevise !== 'ALL' && op.devise !== filterDevise) return false;
    if (filterType !== 'ALL' && op.type !== filterType) return false;
    if (filterShop !== 'ALL' && op.shopId !== filterShop) return false;
    if (filterSource !== 'ALL' && op.source !== filterSource) return false;
    if (filterStart && new Date(op.date) < new Date(filterStart)) return false;
    if (filterEnd && new Date(op.date) > new Date(filterEnd)) return false;
    return true;
  });

  // Export CSV
  const handleExportCSV = () => {
    const rows = [
      ['Date', 'Type', 'Montant', 'Devise', 'Motif', 'Utilisateur', 'Shop'],
      ...filteredOperations.map(op => [
        new Date(op.date).toLocaleDateString(),
        op.type === 'emprunt' ? 'Emprunt' : 'Remboursement',
        op.montant.toLocaleString(),
        op.devise,
        op.motif || '-',
        op.userName,
        op.shopName
      ])
    ];
    const csvContent = rows.map(e => e.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'emprunts_societe.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Suppression d'une opération
  const handleDeleteOperation = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette opération ?')) return;
    try {
      await empruntSocieteService.delete(id);
      fetchOperations();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (e) {
      setErrorMessage('Erreur lors de la suppression.');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    }
  };

  // Ouvrir le modal d'édition
  const handleOpenEdit = (op: EmpruntSociete) => {
    setEditingOperation(op);
    setEditForm({
      montant: op.montant.toString(),
      devise: op.devise,
      type: op.type,
      motif: op.motif || '',
      source: op.source || 'interne',
    });
    setShowEditModal(true);
  };

  // Soumettre la modification
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOperation) return;
    try {
      await empruntSocieteService.update(editingOperation.id, {
        montant: Number(editForm.montant),
        devise: editForm.devise,
        type: editForm.type,
        motif: editForm.motif,
        source: editForm.source,
      });
      setShowEditModal(false);
      setEditingOperation(null);
      fetchOperations();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (e) {
      setErrorMessage('Erreur lors de la modification.');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Gestion des emprunts société</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white rounded-lg shadow p-4 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
            <input type="number" min="1" required value={montant} onChange={e => setMontant(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Montant" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
            <select value={devise} onChange={e => setDevise(e.target.value as 'CDF' | 'USD')} className="w-full px-3 py-2 border border-gray-300 rounded-md">
              <option value="CDF">Franc Congolais (CDF)</option>
              <option value="USD">Dollar (USD)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type d'opération</label>
            <select value={type} onChange={e => setType(e.target.value as 'emprunt' | 'remboursement')} className="w-full px-3 py-2 border border-gray-300 rounded-md">
              <option value="emprunt">Emprunt société</option>
              <option value="remboursement">Remboursement</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Motif (optionnel)</label>
            <input type="text" value={motif} onChange={e => setMotif(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Motif ou commentaire" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source de l'emprunt</label>
            <select value={source} onChange={e => setSource(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md">
              {sourceOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        {showSuccess && <div className="text-green-600 text-sm mt-2">Opération enregistrée avec succès !</div>}
        {showError && <div className="text-red-600 text-sm mt-2">{errorMessage}</div>}
      </form>

      {/* Filtres */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Devise</label>
          <select value={filterDevise} onChange={e => setFilterDevise(e.target.value as any)} className="px-2 py-1 border rounded">
            <option value="ALL">Toutes</option>
            <option value="CDF">CDF</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="px-2 py-1 border rounded">
            <option value="ALL">Tous</option>
            <option value="emprunt">Emprunt</option>
            <option value="remboursement">Remboursement</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Début</label>
          <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="px-2 py-1 border rounded" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fin</label>
          <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="px-2 py-1 border rounded" />
        </div>
        {currentUser && currentUser.role === 'admin' && currentUser.shopId === 'ALL_SHOPS' && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Shop</label>
            <select value={filterShop} onChange={e => setFilterShop(e.target.value)} className="px-2 py-1 border rounded">
              <option value="ALL">Tous</option>
              {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Source</label>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="px-2 py-1 border rounded">
            <option value="ALL">Toutes</option>
            {sourceOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <button onClick={handleExportCSV} className="ml-auto bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50" type="button">
          📥 Exporter CSV
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Historique des emprunts/remboursements</h2>
        {loading ? (
          <div className="text-gray-500">Chargement...</div>
        ) : filteredOperations.length === 0 ? (
          <div className="text-gray-400">Aucune opération trouvée</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Montant</th>
                <th className="px-3 py-2 text-left">Devise</th>
                <th className="px-3 py-2 text-left">Motif</th>
                <th className="px-3 py-2 text-left">Utilisateur</th>
                <th className="px-3 py-2 text-left">Shop</th>
                <th className="px-3 py-2 text-left">Source</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOperations.map(op => (
                <tr key={op.id}>
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(op.date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{op.type === 'emprunt' ? 'Emprunt' : 'Remboursement'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{op.montant.toLocaleString()}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{op.devise}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{op.motif || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{op.userName}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{op.shopName}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{sourceOptions.find(opt => opt.value === op.source)?.label || op.source}</td>
                  <td className="px-3 py-2 whitespace-nowrap flex gap-2">
                    <button onClick={() => handleOpenEdit(op)} className="text-blue-600 hover:text-blue-900" title="Modifier"><Edit size={16} /></button>
                    <button onClick={() => handleDeleteOperation(op.id)} className="text-red-600 hover:text-red-900" title="Supprimer"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showEditModal && editingOperation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Modifier l'opération</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
                <input type="number" min="1" required value={editForm.montant} onChange={e => setEditForm({...editForm, montant: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Devise</label>
                <select value={editForm.devise} onChange={e => setEditForm({...editForm, devise: e.target.value as 'CDF' | 'USD'})} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="CDF">Franc Congolais (CDF)</option>
                  <option value="USD">Dollar (USD)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type d'opération</label>
                <select value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value as 'emprunt' | 'remboursement'})} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  <option value="emprunt">Emprunt société</option>
                  <option value="remboursement">Remboursement</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Motif (optionnel)</label>
                <input type="text" value={editForm.motif} onChange={e => setEditForm({...editForm, motif: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source de l'emprunt</label>
                <select value={editForm.source} onChange={e => setEditForm({...editForm, source: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                  {sourceOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors text-sm">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmpruntsSocietePage; 