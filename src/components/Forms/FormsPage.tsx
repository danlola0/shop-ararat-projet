import React, { useState } from 'react';
import { EchangeMonnaieForm } from './EchangeMonnaieForm';
import { VenteCreditForm } from './VenteCreditForm';
import { DepotCarteForm } from './DepotCarteForm';
import { TransactionElectroniqueForm } from './TransactionElectroniqueForm';

export const FormsPage: React.FC = () => {
  const [activeForm, setActiveForm] = useState('echange');

  const forms = [
    { id: 'echange', label: 'Échange de Monnaie', shortLabel: 'Échange', component: EchangeMonnaieForm },
    { id: 'credit', label: 'Vente de Crédit', shortLabel: 'Crédit', component: VenteCreditForm },
    { id: 'depot', label: 'Dépôt de Carte', shortLabel: 'Dépôt', component: DepotCarteForm },
    { id: 'transaction', label: 'Transactions Électroniques', shortLabel: 'Transactions', component: TransactionElectroniqueForm }
  ];

  const ActiveComponent = forms.find(form => form.id === activeForm)?.component || EchangeMonnaieForm;

  return (
    <div className="p-3 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Formulaires de Saisie</h1>
      
      {/* Tabs - Responsive */}
      <div className="border-b border-gray-200 mb-4 sm:mb-6 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
          {forms.map((form) => (
            <button
              key={form.id}
              onClick={() => setActiveForm(form.id)}
              className={`py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                activeForm === form.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="hidden sm:inline">{form.label}</span>
              <span className="sm:hidden">{form.shortLabel}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Active Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-6">
        <ActiveComponent />
      </div>
    </div>
  );
};