import React, { useState, useEffect } from 'react';
import { DollarSign, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

export const EchangeMonnaieForm: React.FC = () => {
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    montantInitialFrancs: '',
    montantInitialDollars: '',
    tauxJour: '',
    billetsEchangesFrancs: '',
    billetsEchangesDollars: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [ajoutStock, setAjoutStock] = useState({ CDF: '', USD: '' });
  const [justification, setJustification] = useState({ CDF: '', USD: '' });
  const [showAjout, setShowAjout] = useState({ CDF: false, USD: false });

  useEffect(() => {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];
    
    // Pré-remplissage automatique pour Francs
    const getLastStockFinal = async (devise: string) => {
      try {
        const stockQuery = query(
          collection(db, 'stocks'),
          where('shopId', '==', currentUser.shopId),
          where('reseau', '==', 'echange'),
          where('devise', '==', devise),
          where('type', '==', 'echange'),
          orderBy('date', 'desc'),
          limit(1)
        );
        const stockSnapshot = await getDocs(stockQuery);
        if (!stockSnapshot.empty) {
          const lastStock = stockSnapshot.docs[0].data();
          if (lastStock.stockFinal !== undefined) {
        setFormData(formData => ({
          ...formData,
              ...(devise === 'CDF' 
                ? { montantInitialFrancs: lastStock.stockFinal.toString() }
                : { montantInitialDollars: lastStock.stockFinal.toString() }
              )
        }));
      }
        }
      } catch (error) {
        console.error(`Erreur lors de la récupération du stock ${devise}:`, error);
      }
    };

    getLastStockFinal('CDF');
    getLastStockFinal('USD');
  }, [currentUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setErrorMessage('Vous devez être connecté pour enregistrer un échange');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
      return;
    }

    setIsSubmitting(true);
    setShowError(false);
    setShowSuccess(false);

    try {
      // Préparer les données pour Firebase
      const echangeData = {
        ...formData,
        montantInitialFrancs: parseFloat(formData.montantInitialFrancs),
        montantInitialDollars: parseFloat(formData.montantInitialDollars),
        tauxJour: parseFloat(formData.tauxJour),
        billetsEchangesFrancs: parseFloat(formData.billetsEchangesFrancs),
        billetsEchangesDollars: parseFloat(formData.billetsEchangesDollars),
        shopId: currentUser.shopId,
        shopName: currentUser.shopName,
        userId: currentUser.id,
        userName: `${currentUser.prenom} ${currentUser.nom}`,
        createdAt: new Date().toISOString()
      };

      // Sauvegarder dans Firebase
      await addDoc(collection(db, 'echanges'), echangeData);

      // Enregistrer aussi dans la collection centrale 'mouvements'
      if ((parseFloat(formData.montantInitialFrancs) || 0) > 0) {
        await addDoc(collection(db, 'mouvements'), {
          type: 'autre',
          montant: parseFloat(formData.montantInitialFrancs) || 0,
          devise: 'CDF',
          date: formData.date,
          shopId: currentUser.shopId,
          userId: currentUser.id,
          libelle: 'Échange de monnaie',
          createdAt: new Date().toISOString()
        });
      }
      if ((parseFloat(formData.montantInitialDollars) || 0) > 0) {
        await addDoc(collection(db, 'mouvements'), {
          type: 'autre',
          montant: parseFloat(formData.montantInitialDollars) || 0,
          devise: 'USD',
          date: formData.date,
          shopId: currentUser.shopId,
          userId: currentUser.id,
          libelle: 'Échange de monnaie',
          createdAt: new Date().toISOString()
        });
      }

      // Succès
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);

      // Réinitialiser le formulaire
      setFormData({
        montantInitialFrancs: '',
        montantInitialDollars: '',
        tauxJour: '',
        billetsEchangesFrancs: '',
        billetsEchangesDollars: '',
        date: new Date().toISOString().split('T')[0]
      });

    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      setErrorMessage(error.message || 'Erreur lors de la sauvegarde de l\'échange');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAjoutStock = async (devise: 'CDF' | 'USD') => {
    const ajout = parseFloat(ajoutStock[devise]) || 0;
    if (ajout > 0) {
      setFormData(formData => ({
        ...formData,
        ...(devise === 'CDF'
          ? { montantInitialFrancs: ((parseFloat(formData.montantInitialFrancs) || 0) + ajout).toString() }
          : { montantInitialDollars: ((parseFloat(formData.montantInitialDollars) || 0) + ajout).toString() }
        )
      }));
      // Enregistrer un mouvement d'approvisionnement
      await addDoc(collection(db, 'mouvements'), {
        type: 'approvisionnement',
        montant: ajout,
        devise,
        date: formData.date,
        shopId: currentUser.shopId,
        userId: currentUser.id,
        libelle: 'Réapprovisionnement monnaie',
        justification: justification[devise],
        createdAt: new Date().toISOString()
      });
      setAjoutStock(a => ({ ...a, [devise]: '' }));
      setJustification(j => ({ ...j, [devise]: '' }));
      setShowAjout(s => ({ ...s, [devise]: false }));
    }
  };

  return (
    <div className="space-y-4">
      {/* Messages de succès et d'erreur */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle size={20} className="text-green-600 mr-3" />
            <p className="text-sm text-green-800">Échange de monnaie enregistré avec succès !</p>
          </div>
        </div>
      )}

      {showError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle size={20} className="text-red-600 mr-3" />
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div className="flex items-center space-x-2 mb-4 sm:mb-6">
          <DollarSign size={20} className="text-blue-600 sm:w-6 sm:h-6" />
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Échange de Monnaie</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Montant Initial (Francs)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.montantInitialFrancs}
              onChange={(e) => setFormData({...formData, montantInitialFrancs: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="0.00"
            />
            <button
              type="button"
              className="text-xs text-blue-700 underline mt-1"
              onClick={() => setShowAjout(s => ({ ...s, CDF: !s.CDF }))}
            >
              + Ajouter un réapprovisionnement
            </button>
            {showAjout.CDF && (
              <div className="mt-2 flex flex-col gap-2">
                <input
                  type="number"
                  value={ajoutStock.CDF}
                  onChange={e => setAjoutStock(a => ({ ...a, CDF: e.target.value }))}
                  placeholder="Quantité ajoutée"
                  className="border rounded px-2 py-1"
                />
                <input
                  type="text"
                  value={justification.CDF}
                  onChange={e => setJustification(j => ({ ...j, CDF: e.target.value }))}
                  placeholder="Justification (optionnel)"
                  className="border rounded px-2 py-1"
                />
                <button
                  type="button"
                  className="bg-green-600 text-white px-2 py-1 rounded"
                  onClick={() => handleAjoutStock('CDF')}
                >Valider l'ajout</button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Montant Initial (Dollars)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.montantInitialDollars}
              onChange={(e) => setFormData({...formData, montantInitialDollars: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="0.00"
            />
            <button
              type="button"
              className="text-xs text-blue-700 underline mt-1"
              onClick={() => setShowAjout(s => ({ ...s, USD: !s.USD }))}
            >
              + Ajouter un réapprovisionnement
            </button>
            {showAjout.USD && (
              <div className="mt-2 flex flex-col gap-2">
                <input
                  type="number"
                  value={ajoutStock.USD}
                  onChange={e => setAjoutStock(a => ({ ...a, USD: e.target.value }))}
                  placeholder="Quantité ajoutée"
                  className="border rounded px-2 py-1"
                />
                <input
                  type="text"
                  value={justification.USD}
                  onChange={e => setJustification(j => ({ ...j, USD: e.target.value }))}
                  placeholder="Justification (optionnel)"
                  className="border rounded px-2 py-1"
                />
                <button
                  type="button"
                  className="bg-green-600 text-white px-2 py-1 rounded"
                  onClick={() => handleAjoutStock('USD')}
                >Valider l'ajout</button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Taux du Jour
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.tauxJour}
              onChange={(e) => setFormData({...formData, tauxJour: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Billets Échangés (Francs)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.billetsEchangesFrancs}
              onChange={(e) => setFormData({...formData, billetsEchangesFrancs: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Billets Échangés (Dollars)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.billetsEchangesDollars}
              onChange={(e) => setFormData({...formData, billetsEchangesDollars: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="0.00"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm sm:text-base"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Enregistrement...</span>
            </>
          ) : (
            <>
              <Save size={18} className="sm:w-5 sm:h-5" />
              <span>Enregistrer l'Échange</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};