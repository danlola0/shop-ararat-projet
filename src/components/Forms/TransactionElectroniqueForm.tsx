import React, { useState } from 'react';
import { Smartphone, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { transactionService } from '../../services/firestore';
import { useAuth } from '../../hooks/useAuth';

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
      await transactionService.create(transactionData);

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Francs
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.stockInitialFrancs}
                onChange={(e) => setFormData({...formData, stockInitialFrancs: e.target.value})}
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
                value={formData.stockInitialDollars}
                onChange={(e) => setFormData({...formData, stockInitialDollars: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
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