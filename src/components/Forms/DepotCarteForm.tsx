import React, { useState } from 'react';
import { CreditCard, Save, User, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { depotService, clientService } from '../../services/firestore';
import { useAuth } from '../../hooks/useAuth';

export const DepotCarteForm: React.FC = () => {
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [clientType, setClientType] = useState<'nouveau' | 'existant'>('nouveau');
  const [formData, setFormData] = useState({
    // Données client
    nom: '',
    prenom: '',
    sexe: 'M' as 'M' | 'F',
    poste: '',
    telephone: '',
    // Données transaction
    montant: '',
    type: 'depot' as 'depot' | 'retrait',
    date: new Date().toISOString().split('T')[0]
  });
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setErrorMessage('Vous devez être connecté pour enregistrer un dépôt');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
      return;
    }

    setIsSubmitting(true);
    setShowError(false);
    setShowSuccess(false);

    try {
      let clientId = '';

      // Si nouveau client, créer le client d'abord
      if (clientType === 'nouveau') {
        const clientData = {
          nom: formData.nom,
          prenom: formData.prenom,
          sexe: formData.sexe,
          poste: formData.poste,
          telephone: formData.telephone,
          shopId: currentUser.shopId,
          shopName: currentUser.shopName,
          createdAt: new Date().toISOString()
        };

        clientId = await clientService.create(clientData);
      } else {
        // Pour client existant, on devrait récupérer l'ID du client sélectionné
        // Pour l'instant, on utilise un ID temporaire
        clientId = 'client_existant';
      }

      // Préparer les données pour Firebase
      const depotData = {
        clientId,
        clientNom: formData.nom,
        clientPrenom: formData.prenom,
        clientTelephone: formData.telephone,
        montant: parseFloat(formData.montant),
        type: formData.type,
        date: formData.date,
        shopId: currentUser.shopId,
        shopName: currentUser.shopName,
        userId: currentUser.id,
        userName: `${currentUser.prenom} ${currentUser.nom}`,
        createdAt: new Date().toISOString()
      };

      // Sauvegarder dans Firebase
      await depotService.create(depotData);

      // Succès
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);

      // Réinitialiser le formulaire
      setFormData({
        nom: '',
        prenom: '',
        sexe: 'M',
        poste: '',
        telephone: '',
        montant: '',
        type: 'depot',
        date: new Date().toISOString().split('T')[0]
      });

    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      setErrorMessage(error.message || 'Erreur lors de la sauvegarde du dépôt');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClientSearch = () => {
    // Simuler la recherche d'un client
    console.log('Recherche client:', searchTerm);
  };

  return (
    <div className="space-y-4">
      {/* Messages de succès et d'erreur */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle size={20} className="text-green-600 mr-3" />
            <p className="text-sm text-green-800">Dépôt de carte enregistré avec succès !</p>
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
          <CreditCard size={24} className="text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">Dépôt de Carte (Épargne)</h2>
        </div>

        {/* Type de client */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Type de client</h3>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="clientType"
                value="nouveau"
                checked={clientType === 'nouveau'}
                onChange={(e) => setClientType(e.target.value as 'nouveau' | 'existant')}
                className="mr-2"
              />
              Nouveau client
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="clientType"
                value="existant"
                checked={clientType === 'existant'}
                onChange={(e) => setClientType(e.target.value as 'nouveau' | 'existant')}
                className="mr-2"
              />
              Client existant
            </label>
          </div>
        </div>

        {/* Recherche client existant */}
        {clientType === 'existant' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher un client
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nom, prénom ou téléphone"
              />
              <button
                type="button"
                onClick={handleClientSearch}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Search size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Informations client (nouveau client) */}
        {clientType === 'nouveau' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informations Client</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prénom
                </label>
                <input
                  type="text"
                  required
                  value={formData.prenom}
                  onChange={(e) => setFormData({...formData, prenom: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sexe
                </label>
                <select
                  value={formData.sexe}
                  onChange={(e) => setFormData({...formData, sexe: e.target.value as 'M' | 'F'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poste
                </label>
                <input
                  type="text"
                  required
                  value={formData.poste}
                  onChange={(e) => setFormData({...formData, poste: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  required
                  value={formData.telephone}
                  onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Transaction */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de transaction
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as 'depot' | 'retrait'})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="depot">Dépôt</option>
                <option value="retrait">Retrait</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.montant}
                onChange={(e) => setFormData({...formData, montant: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Enregistrement...</span>
            </>
          ) : (
            <>
              <Save size={20} />
              <span>Enregistrer le Dépôt</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};