import React, { useState } from 'react';
import { CreditCard, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { venteCreditService } from '../../services/firestore';
import { useAuth } from '../../hooks/useAuth';

export const VenteCreditForm: React.FC = () => {
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState({
    stockInitial: '',
    stockVendu: {
      vodacom: '',
      orange: '',
      airtel: '',
      africell: ''
    },
    fournisseur: '',
    stockFinal: '',
    date: new Date().toISOString().split('T')[0]
  });

  const handleStockVenduChange = (reseau: string, value: string) => {
    setFormData({
      ...formData,
      stockVendu: {
        ...formData.stockVendu,
        [reseau]: value
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setErrorMessage('Vous devez être connecté pour enregistrer une vente');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
      return;
    }

    setIsSubmitting(true);
    setShowError(false);
    setShowSuccess(false);

    try {
      // Préparer les données pour Firebase
      const venteData = {
        ...formData,
        stockInitial: parseFloat(formData.stockInitial),
        stockVendu: {
          vodacom: parseFloat(formData.stockVendu.vodacom) || 0,
          orange: parseFloat(formData.stockVendu.orange) || 0,
          airtel: parseFloat(formData.stockVendu.airtel) || 0,
          africell: parseFloat(formData.stockVendu.africell) || 0
        },
        stockFinal: parseFloat(formData.stockFinal),
        shopId: currentUser.shopId,
        shopName: currentUser.shopName,
        userId: currentUser.id,
        userName: `${currentUser.prenom} ${currentUser.nom}`,
        createdAt: new Date().toISOString()
      };

      // Sauvegarder dans Firebase
      await venteCreditService.create(venteData);

      // Succès
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);

      // Réinitialiser le formulaire
      setFormData({
        stockInitial: '',
        stockVendu: {
          vodacom: '',
          orange: '',
          airtel: '',
          africell: ''
        },
        fournisseur: '',
        stockFinal: '',
        date: new Date().toISOString().split('T')[0]
      });

    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      setErrorMessage(error.message || 'Erreur lors de la sauvegarde de la vente');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Messages de succès et d'erreur */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle size={20} className="text-green-600 mr-3" />
            <p className="text-sm text-green-800">Vente de crédit enregistrée avec succès !</p>
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
          <CreditCard size={24} className="text-green-600" />
          <h2 className="text-xl font-semibold text-gray-900">Vente de Crédit</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock Initial
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.stockInitial}
              onChange={(e) => setFormData({...formData, stockInitial: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock Final
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.stockFinal}
              onChange={(e) => setFormData({...formData, stockFinal: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fournisseur
            </label>
            <input
              type="text"
              required
              value={formData.fournisseur}
              onChange={(e) => setFormData({...formData, fournisseur: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nom du fournisseur"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Stock Vendu par Réseau</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(formData.stockVendu).map(([reseau, value]) => (
              <div key={reseau}>
                <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                  {reseau}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={value}
                  onChange={(e) => handleStockVenduChange(reseau, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Enregistrement...</span>
            </>
          ) : (
            <>
              <Save size={20} />
              <span>Enregistrer la Vente</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};