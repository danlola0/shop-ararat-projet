import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { TrendingUp, Calendar, DollarSign, Users, BarChart3, Filter, Download } from 'lucide-react';

interface Operation {
  id: string;
  shopId: string;
  date: string;
  total_general: number;
  periode_rapport: string;
  createdAt: any;
}

interface Depot {
  id: string;
  clientId: string;
  montant: number;
  date: string;
  createdAt: any;
}

interface Mouvement {
  id: string;
  shopId: string;
  operation: 'Entrée' | 'Sortie';
  montant: number;
  description: string;
  date: string;
  devise: string;
}

interface Shop {
  id: string;
  name: string;
}

const RapportsDonneesPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState<'jour' | 'semaine' | 'mois' | 'annee'>('jour');
  const [loading, setLoading] = useState(false);
  
  // Données d'analyse
  const [operations, setOperations] = useState<Operation[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [stats, setStats] = useState<any>({});

  // Charger les shops
  useEffect(() => {
    const fetchShops = async () => {
      const shopsSnap = await getDocs(collection(db, 'shops'));
      const shopsData = shopsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop));
      setShops(shopsData);
      if (shopsData.length > 0 && !selectedShopId) {
        setSelectedShopId(shopsData[0].id);
      }
    };
    fetchShops();
  }, [selectedShopId]);

  // Charger les données d'analyse
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedShopId || !selectedDate) return;
      
      setLoading(true);
      
      try {
        // Déterminer la plage de dates
        const dateObj = new Date(selectedDate);
        let startDate = selectedDate;
        let endDate = selectedDate;
        
        if (selectedPeriod === 'jour') {
          startDate = endDate = selectedDate;
        } else if (selectedPeriod === 'semaine') {
          const day = dateObj.getDay() || 7;
          const monday = new Date(dateObj);
          monday.setDate(dateObj.getDate() - day + 1);
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          startDate = monday.toISOString().split('T')[0];
          endDate = sunday.toISOString().split('T')[0];
        } else if (selectedPeriod === 'mois') {
          const first = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
          const last = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
          startDate = first.toISOString().split('T')[0];
          endDate = last.toISOString().split('T')[0];
        } else if (selectedPeriod === 'annee') {
          const first = new Date(dateObj.getFullYear(), 0, 1);
          const last = new Date(dateObj.getFullYear(), 11, 31);
          startDate = first.toISOString().split('T')[0];
          endDate = last.toISOString().split('T')[0];
        }

        // Charger les opérations
        const opQuery = query(
          collection(db, 'operations'),
          where('shopId', '==', selectedShopId),
          where('date', '>=', startDate),
          where('date', '<=', endDate),
          orderBy('date', 'desc')
        );
        const opSnap = await getDocs(opQuery);
        const operationsData = opSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Operation));
        setOperations(operationsData);

        // Charger les dépôts
        const depQuery = query(
          collection(db, 'depots'),
          where('shopId', '==', selectedShopId),
          where('date', '>=', startDate),
          where('date', '<=', endDate),
          orderBy('date', 'desc')
        );
        const depSnap = await getDocs(depQuery);
        const depotsData = depSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Depot));
        setDepots(depotsData);

        // Charger les mouvements
        const mvtQuery = query(
          collection(db, 'mouvements'),
          where('shopId', '==', selectedShopId),
          where('date', '>=', startDate),
          where('date', '<=', endDate),
          orderBy('date', 'desc')
        );
        const mvtSnap = await getDocs(mvtQuery);
        const mouvementsData = mvtSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Mouvement));
        setMouvements(mouvementsData);

        // Calculer les statistiques
        const totalVentes = operationsData.reduce((sum, op) => sum + (op.total_general || 0), 0);
        const totalDepots = depotsData.reduce((sum, dep) => sum + (dep.montant || 0), 0);
        const totalEntrees = mouvementsData
          .filter(mvt => mvt.operation === 'Entrée')
          .reduce((sum, mvt) => sum + (mvt.montant || 0), 0);
        const totalSorties = mouvementsData
          .filter(mvt => mvt.operation === 'Sortie')
          .reduce((sum, mvt) => sum + (mvt.montant || 0), 0);
        const beneficeEstime = totalVentes * 0.15;

        setStats({
          totalVentes,
          totalDepots,
          totalEntrees,
          totalSorties,
          beneficeEstime,
          nombreOperations: operationsData.length,
          nombreDepots: depotsData.length,
          nombreMouvements: mouvementsData.length
        });

      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedShopId, selectedDate, selectedPeriod]);

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Rapports de Données</h1>
        <p className="text-gray-600">Analyse détaillée des données en format tableau</p>
      </div>

      {/* Contrôles de filtrage */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <Filter size={24} className="text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Filtres</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Sélection du shop */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Shop</label>
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Sélectionner un shop</option>
              {shops.map(shop => (
                <option key={shop.id} value={shop.id}>{shop.name}</option>
              ))}
            </select>
          </div>

          {/* Sélection de la date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Sélection de la période */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="jour">Jour</option>
              <option value="semaine">Semaine</option>
              <option value="mois">Mois</option>
              <option value="annee">Année</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-blue-700 font-semibold">Chargement des données...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Statistiques générales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Ventes</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalVentes?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <DollarSign size={24} className="text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Bénéfice Estimé</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.beneficeEstime?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <TrendingUp size={24} className="text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Dépôts</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.totalDepots?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <Users size={24} className="text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Opérations</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.nombreOperations || 0}</p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <BarChart3 size={24} className="text-orange-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Tableau des opérations */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <BarChart3 size={24} className="text-blue-600" />
                <h2 className="text-xl font-bold text-gray-900">Opérations</h2>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {operations.length} opération{operations.length > 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => exportToCSV(operations, 'operations')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                Exporter CSV
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Période</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Général</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bénéfice Estimé</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {operations.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center text-gray-500 py-8">
                        Aucune opération trouvée pour cette période
                      </td>
                    </tr>
                  ) : (
                    operations.map((op) => (
                      <tr key={op.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(op.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            op.periode_rapport === 'matin' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {op.periode_rapport}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {op.total_general?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                          {((op.total_general || 0) * 0.15).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tableau des dépôts */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Users size={24} className="text-purple-600" />
                <h2 className="text-xl font-bold text-gray-900">Dépôts Clients</h2>
                <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {depots.length} dépôt{depots.length > 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => exportToCSV(depots, 'depots')}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                Exporter CSV
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {depots.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center text-gray-500 py-8">
                        Aucun dépôt trouvé pour cette période
                      </td>
                    </tr>
                  ) : (
                    depots.map((depot) => (
                      <tr key={depot.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(depot.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {depot.clientId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {depot.montant?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tableau des mouvements */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <TrendingUp size={24} className="text-green-600" />
                <h2 className="text-xl font-bold text-gray-900">Mouvements de Caisse</h2>
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                  {mouvements.length} mouvement{mouvements.length > 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => exportToCSV(mouvements, 'mouvements')}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                Exporter CSV
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Devise</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {mouvements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-gray-500 py-8">
                        Aucun mouvement trouvé pour cette période
                      </td>
                    </tr>
                  ) : (
                    mouvements.map((mvt) => (
                      <tr key={mvt.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(mvt.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            mvt.operation === 'Entrée' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {mvt.operation}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {mvt.montant?.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {mvt.devise || '$'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {mvt.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RapportsDonneesPage; 