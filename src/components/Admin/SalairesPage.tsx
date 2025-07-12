import React from 'react';
import SalaireForm from '../Forms/SalaireForm';
import SalairesList from './SalairesList';

// Ce composant sera le conteneur principal pour la gestion des salaires.
// Il sera accessible uniquement par les administrateurs.

const SalairesPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Gestion des Salaires</h1>
        <p className="text-gray-600 mt-1">
          Cette section est réservée aux administrateurs pour la saisie et le suivi des salaires.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Colonne 1 : Formulaire de saisie */}
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-blue-700">Payer un Salaire</h2>
          <SalaireForm />
        </div>

        {/* Colonne 2 : Historique des paiements */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-blue-700">Historique des Salaires</h2>
          <SalairesList />
        </div>
      </div>
    </div>
  );
};

export default SalairesPage; 