import { DepotCarteForm } from './DepotCarteForm';
// import CapitalInitialForm from './CapitalInitialForm';
// import MouvementForm from './MouvementForm';
import React, { useState } from 'react';
import MouvementForm from './MouvementForm';
import OperationForm from './OperationForm';

const categories = [
  {
    id: 'principal',
    label: 'Formulaires principaux',
    forms: [
      // { id: 'capital', label: 'Capital initial', component: CapitalInitialForm },
      { id: 'operations', label: 'Opérations', component: OperationForm },
      { id: 'depot', label: 'Dépôts de carte', component: DepotCarteForm },
      { id: 'mouvement', label: 'Mouvements', component: MouvementForm }
      // { id: 'mouvements', label: 'Mouvements', component: MouvementForm }
    ]
  }
];

export const FormsPage: React.FC<{ initialCategory?: string }> = ({ initialCategory }) => {
  const [activeCategory, setActiveCategory] = useState(initialCategory || categories[0].id);
  const [activeForm, setActiveForm] = useState(categories.find(cat => cat.id === (initialCategory || categories[0].id))?.forms[0].id || categories[0].forms[0].id);

  const currentCategory = categories.find(cat => cat.id === activeCategory)!;
  const ActiveComponent = currentCategory.forms.find(f => f.id === activeForm)?.component || currentCategory.forms[0].component;

  return (
    <div className="p-2 sm:p-6 w-full max-w-full">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Formulaires de Saisie</h1>
      {/* Onglets de catégories (un seul ici) */}
      <div className="border-b border-gray-200 mb-4 sm:mb-6 overflow-x-auto w-full">
        <nav className="-mb-px flex flex-col xs:flex-row space-y-2 xs:space-y-0 xs:space-x-2 sm:space-x-8 w-full">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setActiveForm(cat.forms[0].id);
              }}
              className={`py-2 px-2 sm:px-1 border-b-2 font-medium text-base sm:text-sm transition-colors whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </nav>
      </div>
      {/* Sous-onglets de formulaires */}
      <div className="border-b border-gray-100 mb-4 flex flex-col xs:flex-row space-y-1 xs:space-y-0 xs:space-x-1 sm:space-x-4 w-full overflow-x-auto">
        {currentCategory.forms.map((form) => (
          <button
            key={form.id}
            onClick={() => setActiveForm(form.id)}
            className={`py-1 px-2 border-b-2 font-medium text-base sm:text-sm transition-colors whitespace-nowrap ${
              activeForm === form.id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
            }`}
          >
            {form.label}
          </button>
        ))}
      </div>
      {/* Formulaire actif */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 sm:p-6 w-full max-w-full overflow-x-auto">
        <ActiveComponent />
      </div>
    </div>
  );
};