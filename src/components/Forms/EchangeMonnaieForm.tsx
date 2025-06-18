import React, { useState } from 'react';
import { DollarSign, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { echangeService } from '../../services/firestore';
import { useAuth } from '../../hooks/useAuth';

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
    argentRecuFournisseur: '',
    date: new Date().toISOString().split('T')[0]
  });

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
        argentRecuFournisseur: parseFloat(formData.argentRecuFournisseur),
        shopId: currentUser.shopId,
        shopName: currentUser.shopName,
        userId: currentUser.id,
        userName: `${currentUser.prenom} ${currentUser.nom}`,
        createdAt: new Date().toISOString()
      };

      // Sauvegarder dans Firebase
      await echangeService.create(echangeData);

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
        argentRecuFournisseur: '',
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Argent Reçu du Fournisseur
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.argentRecuFournisseur}
            onChange={(e) => setFormData({...formData, argentRecuFournisseur: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="0.00"
          />
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