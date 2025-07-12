import React, { useState, useEffect } from 'react';
import { Smartphone, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

export const TransactionElectroniqueForm: React.FC = () => {
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    reseau: 'mpesa' as 'mpesa' | 'airtel' | 'orange' | 'africell',
    stockInitialFrancs: '',
    stockInitialDollars: '',
    montantEnvoye: '',
    montantRecu: '',
    stockFinalFrancs: '',
    stockFinalDollars: '',
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
          where('reseau', '==', 'transaction'),
          where('devise', '==', devise),
          where('type', '==', 'transaction'),
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
                ? { stockInitialFrancs: lastStock.stockFinal.toString() }
                : { stockInitialDollars: lastStock.stockFinal.toString() }
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
      setErrorMessage('Vous devez être connecté pour enregistrer une transaction');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
      return;
    }

    setIsSubmitting(true);
    setShowError(false);
    setShowSuccess(false);

    try {
      // Préparer les données pour Firebase
      const transactionData = {
        ...formData,
        stockInitialFrancs: parseFloat(formData.stockInitialFrancs),
        stockInitialDollars: parseFloat(formData.stockInitialDollars),
        montantEnvoye: parseFloat(formData.montantEnvoye),
        montantRecu: parseFloat(formData.montantRecu),
        stockFinalFrancs: parseFloat(formData.stockFinalFrancs),
        stockFinalDollars: parseFloat(formData.stockFinalDollars),
        shopId: currentUser.shopId,
        shopName: currentUser.shopName,
        userId: currentUser.id,
        userName: `${currentUser.prenom} ${currentUser.nom}`,
        createdAt: new Date().toISOString()
      };

      // Sauvegarder dans Firebase
      await addDoc(collection(db, 'transactions'), transactionData);

      // Enregistrer aussi dans la collection centrale 'mouvements'
      if ((parseFloat(formData.montantEnvoye) || 0) > 0) {
        await addDoc(collection(db, 'mouvements'), {
          type: 'autre',
          montant: parseFloat(formData.montantEnvoye) || 0,
          devise: 'CDF', // À adapter si tu veux gérer la devise dynamiquement
          date: formData.date,
          shopId: currentUser.shopId,
          userId: currentUser.id,
          libelle: 'Transaction électronique (envoyé)',
          createdAt: new Date().toISOString()
        });
      }
      if ((parseFloat(formData.montantRecu) || 0) > 0) {
        await addDoc(collection(db, 'mouvements'), {
          type: 'autre',
          montant: parseFloat(formData.montantRecu) || 0,
          devise: 'USD', // À adapter si tu veux gérer la devise dynamiquement
          date: formData.date,
          shopId: currentUser.shopId,
          userId: currentUser.id,
          libelle: 'Transaction électronique (reçu)',
          createdAt: new Date().toISOString()
        });
      }

      // Sauvegarder le stock final dans Firestore
      const saveStockFinal = async (devise: string, stockFinal: number) => {
        try {
          await addDoc(collection(db, 'stocks'), {
          shopId: currentUser.shopId,
            reseau: 'transaction',
            devise: devise,
          type: 'transaction',
            stockFinal: stockFinal,
          date: formData.date,
            createdAt: new Date().toISOString()
          });
        } catch (error) {
          console.error(`Erreur lors de la sauvegarde du stock final ${devise}:`, error);
        }
      };

      // Sauvegarder les stocks finaux
      await saveStockFinal('CDF', parseFloat(formData.stockFinalFrancs));
      await saveStockFinal('USD', parseFloat(formData.stockFinalDollars));

      // Succès
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);

      // Réinitialiser le formulaire
      setFormData({
        reseau: 'mpesa',
        stockInitialFrancs: '',
        stockInitialDollars: '',
        montantEnvoye: '',
        montantRecu: '',
        stockFinalFrancs: '',
        stockFinalDollars: '',
        date: new Date().toISOString().split('T')[0]
      });

    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      setErrorMessage(error.message || 'Erreur lors de la sauvegarde de la transaction');
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
          ? { stockInitialFrancs: ((parseFloat(formData.stockInitialFrancs) || 0) + ajout).toString() }
          : { stockInitialDollars: ((parseFloat(formData.stockInitialDollars) || 0) + ajout).toString() }
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
        libelle: `Réapprovisionnement stock initial ${formData.reseau}`,
        justification: justification[devise],
        createdAt: new Date().toISOString()
      });
      setAjoutStock(a => ({ ...a, [devise]: '' }));
      setJustification(j => ({ ...j, [devise]: '' }));
      setShowAjout(s => ({ ...s, [devise]: false }));
    }
  };

  const reseaux = [
    { value: 'mpesa', label: 'M-Pesa', color: 'text-green-600' },
    { value: 'airtel', label: 'Airtel Money', color: 'text-red-600' },
    { value: 'orange', label: 'Orange Money', color: 'text-orange-600' },
    { value: 'africell', label: 'Africell Money', color: 'text-blue-600' }
  ];

  return (
    <div className="space-y-4">
      {/* Messages de succès et d'erreur */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle size={20} className="text-green-600 mr-3" />
            <p className="text-sm text-green-800">Transaction électronique enregistrée avec succès !</p>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <Smartphone size={24} className="text-orange-600" />
          <h2 className="text-xl font-semibold text-gray-900">Transactions Électroniques</h2>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Réseau de paiement
          </label>
          <select
            value={formData.reseau}
            onChange={(e) => setFormData({...formData, reseau: e.target.value as any})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {reseaux.map((reseau) => (
              <option key={reseau.value} value={reseau.value}>
                {reseau.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Stock Initial</h3>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Stock Initial Francs</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.stockInitialFrancs}
                onChange={(e) => setFormData({...formData, stockInitialFrancs: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Stock Initial Dollars</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.stockInitialDollars}
                onChange={(e) => setFormData({...formData, stockInitialDollars: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Transactions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant Envoyé
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.montantEnvoye}
                onChange={(e) => setFormData({...formData, montantEnvoye: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant Reçu
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.montantRecu}
                onChange={(e) => setFormData({...formData, montantRecu: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Stock Final</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Francs
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.stockFinalFrancs}
                onChange={(e) => setFormData({...formData, stockFinalFrancs: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dollars
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.stockFinalDollars}
                onChange={(e) => setFormData({...formData, stockFinalDollars: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          </div>
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Enregistrement...</span>
            </>
          ) : (
            <>
              <Save size={20} />
              <span>Enregistrer la Transaction</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};