import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Shop {
  id: string;
  name: string;
}

interface BeneficeJourShop {
  date: string;
  benefice: number;
  shopName: string;
  devise: string;
}

interface MontantAvecDevise {
  montant: number;
  devise: string;
}

interface DailySummary {
  capitalInitial: MontantAvecDevise;
  totalDepenses: MontantAvecDevise;
  totalDepotsCarte: MontantAvecDevise;
  totalMouvements: MontantAvecDevise;
  totalSoir: MontantAvecDevise;
  rapportMatinTrouve: boolean;
  rapportSoirTrouve: boolean;
}

const periods = [
  { value: 'jour', label: 'Jour' },
  { value: 'semaine', label: 'Semaine' },
  { value: 'mois', label: 'Mois' },
  { value: 'annee', label: 'Année' },
];

// Helper pour obtenir la plage de dates
const getDateRange = (period: string, dateStr: string) => {
  const selectedDate = new Date(dateStr);
  selectedDate.setUTCHours(0, 0, 0, 0);

  if (period === 'jour') {
    const endDate = new Date(selectedDate);
    endDate.setUTCDate(selectedDate.getUTCDate() + 1);
    return { startDate: selectedDate.toISOString().split('T')[0], endDate: selectedDate.toISOString().split('T')[0] };
  }
  if (period === 'semaine') {
    const dayIndex = selectedDate.getUTCDay() === 0 ? 6 : selectedDate.getUTCDay() - 1;
    const startDate = new Date(selectedDate);
    startDate.setUTCDate(selectedDate.getUTCDate() - dayIndex);
    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + 6);
    return { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] };
  }
  if (period === 'mois') {
    const startDate = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth(), 1));
    const endDate = new Date(Date.UTC(selectedDate.getUTCFullYear(), selectedDate.getUTCMonth() + 1, 0));
    return { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] };
  }
  if (period === 'annee') {
    const startDate = new Date(Date.UTC(selectedDate.getUTCFullYear(), 0, 1));
    const endDate = new Date(Date.UTC(selectedDate.getUTCFullYear(), 11, 31));
    return { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] };
  }
  return { startDate: dateStr, endDate: dateStr };
};


const SynthesePage: React.FC = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'jour' | 'semaine' | 'mois' | 'annee'>('jour');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [benefices, setBenefices] = useState<BeneficeJourShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  
  useEffect(() => {
    const fetchShops = async () => {
      const snap = await getDocs(collection(db, 'shops'));
      setShops(snap.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    };
    fetchShops();
  }, []);

  useEffect(() => {
    const fetchSummary = async () => {
      setSummaryLoading(true);
      setDailySummary(null);

      const { startDate, endDate } = getDateRange(selectedPeriod, selectedDate);

      try {
        const collectionsToQuery = ['depenses', 'depot_carte', 'mouvements', 'operations'];
        let queries;

        if (selectedShopId !== 'all') {
            queries = collectionsToQuery.map(name => query(collection(db, name), where('shopId', '==', selectedShopId)));
        } else {
            queries = collectionsToQuery.map(name => query(collection(db, name), where('date', '>=', startDate), where('date', '<=', endDate)));
        }

        const snapshots = await Promise.all(queries.map(q => getDocs(q)));
        const [depensesSnap, depotsCarteSnap, mouvementsSnap, operationsSnap] = snapshots;

        const filterByDate = (docs: any[]) => {
            if (selectedShopId === 'all') {
                return docs;
            }
            return docs.filter(doc => {
                const data = doc.data();
                return data.date >= startDate && data.date <= endDate;
            });
        };

        const getSummary = (snap: any): MontantAvecDevise => {
            const docs = filterByDate(snap.docs);
            if (docs.length === 0) return { montant: 0, devise: '$' };
            const total = docs.reduce((sum: number, doc: any) => sum + (doc.data().montant || 0), 0);
            const devise = docs[0]?.data().devise || '$';
            return { montant: total, devise };
        };

        const totalDepenses = getSummary(depensesSnap);
        const totalDepotsCarte = getSummary(depotsCarteSnap);
        const totalMouvements = getSummary(mouvementsSnap);
        
        const allOperations = filterByDate(operationsSnap.docs);
        const rapportsMatin = allOperations.filter(doc => doc.data().periode_rapport === 'matin');
        const rapportsSoir = allOperations.filter(doc => doc.data().periode_rapport === 'soir');

        const capitalInitial = rapportsMatin.reduce((sum, doc) => sum + (doc.data().total_general || 0), 0);
        const totalSoir = rapportsSoir.reduce((sum, doc) => sum + (doc.data().total_general || 0), 0);

        setDailySummary({
          totalDepenses,
          totalDepotsCarte,
          totalMouvements,
          capitalInitial: { montant: capitalInitial, devise: rapportsMatin[0]?.data().devise || '$' },
          totalSoir: { montant: totalSoir, devise: rapportsSoir[0]?.data().devise || '$' },
          rapportMatinTrouve: rapportsMatin.length > 0,
          rapportSoirTrouve: rapportsSoir.length > 0,
        });

      } catch (error) {
        console.error("Error fetching summary:", error);
        setDailySummary({
          capitalInitial: { montant: 0, devise: '$' },
          totalDepenses: { montant: 0, devise: '$' },
          totalDepotsCarte: { montant: 0, devise: '$' },
          totalMouvements: { montant: 0, devise: '$' },
          totalSoir: { montant: 0, devise: '$' },
          rapportMatinTrouve: false,
          rapportSoirTrouve: false,
        });
      } finally {
        setSummaryLoading(false);
      }
    };

    fetchSummary();
  }, [selectedShopId, selectedDate, selectedPeriod]);


  useEffect(() => {
    const fetchBenefices = async () => {
      setLoading(true);
      let allBenefices: BeneficeJourShop[] = [];
      const shopsToFetch = selectedShopId === 'all' ? shops : shops.filter(s => s.id === selectedShopId);
      for (const shop of shopsToFetch) {
        const opQuery = query(collection(db, 'operations'), where('shopId', '==', shop.id), where('periode_rapport', '==', 'soir'));
        const opSnap = await getDocs(opQuery);
        
        const dateToOperation: Record<string, { total: number; devise: string }> = {};
        opSnap.docs.forEach(doc => {
          const data = doc.data();
          dateToOperation[data.date] = { total: data.total_general || 0, devise: data.devise || '$' };
        });

        const dates = Object.keys(dateToOperation).sort();
        let previousTotal: number | null = null;
        dates.forEach(dateStr => {
          const { total: totalSoir, devise: deviseJour } = dateToOperation[dateStr];
          let beneficeJour = 0;
          if (previousTotal !== null) {
            beneficeJour = totalSoir - previousTotal;
          }
          
          const { startDate, endDate } = getDateRange(selectedPeriod, selectedDate);
          if (dateStr >= startDate && dateStr <= endDate) {
            allBenefices.push({ date: dateStr, benefice: beneficeJour, shopName: shop.name, devise: deviseJour });
          }
          previousTotal = totalSoir;
        });
      }
      allBenefices.sort((a, b) => a.date.localeCompare(b.date) || a.shopName.localeCompare(b.shopName));
      setBenefices(allBenefices);
      setLoading(false);
    };
    if (shops.length > 0) fetchBenefices();
  }, [shops, selectedDate, selectedPeriod, selectedShopId]);

  const totalsByShop: { [shopName: string]: { total: number; devise: string } } = {};
  benefices.forEach(b => {
    if (!totalsByShop[b.shopName]) {
      totalsByShop[b.shopName] = { total: 0, devise: b.devise };
    }
    totalsByShop[b.shopName].total += b.benefice;
    totalsByShop[b.shopName].devise = b.devise;
  });

  const shopNames = Object.keys(totalsByShop);
  let bestShop = null, worstShop = null;
  if (shopNames.length > 0) {
    bestShop = shopNames.reduce((a, b) => (totalsByShop[a].total > totalsByShop[b].total ? a : b));
    worstShop = shopNames.reduce((a, b) => (totalsByShop[a].total < totalsByShop[b].total ? a : b));
  }

  const dates = Array.from(new Set(benefices.map(b => b.date))).sort();
  const chartData = dates.map(date => {
    const entry: any = { date: new Date(date).toLocaleDateString('fr-FR') };
    shopNames.forEach(shop => {
      const b = benefices.find(x => x.date === date && x.shopName === shop);
      entry[shop] = b ? b.benefice : 0;
    });
    return entry;
  });

  const formatCurrency = (amount: number, devise: string) => {
    return amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ` ${devise}`;
  };
  
  const getSummaryTitle = () => {
    const date = new Date(selectedDate);
    date.setUTCHours(0,0,0,0);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    
    if (selectedPeriod === 'jour') {
      return `Résumé Détaillé du ${date.toLocaleDateString('fr-FR', { weekday: 'long', ...options })}`;
    }
    if (selectedPeriod === 'semaine') {
      const { startDate, endDate } = getDateRange(selectedPeriod, selectedDate);
      return `Résumé Détaillé pour la semaine du ${new Date(startDate).toLocaleDateString('fr-FR', options)} au ${new Date(endDate).toLocaleDateString('fr-FR', options)}`;
    }
    if (selectedPeriod === 'mois') {
      return `Résumé Détaillé pour le mois de ${date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    }
    if (selectedPeriod === 'annee') {
      return `Résumé Détaillé pour l'année ${date.getUTCFullYear()}`;
    }
    return "Résumé Détaillé";
  };

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <h1 className="text-2xl font-bold mb-4 text-blue-900">Synthèse des bénéfices de tous les shops</h1>
      <div className="flex flex-wrap gap-4 mb-6 items-end">
          <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shop</label>
              <select
            className="border rounded px-2 py-1"
                value={selectedShopId}
                onChange={e => setSelectedShopId(e.target.value)}
              >
            <option value="all">Tous les shops</option>
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
            </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
          <select
            className="border rounded px-2 py-1"
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value as any)}
          >
            {periods.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
          <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date de référence</label>
            <input
              type="date"
            className="border rounded px-2 py-1"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Bénéfice</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Nom du shop</th>
                  </tr>
                </thead>
                <tbody>
            {loading ? (
              <tr><td colSpan={3} className="text-center py-4">Chargement...</td></tr>
            ) : benefices.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-4">Aucun bénéfice trouvé pour cette période.</td></tr>
            ) : (
              benefices.map((item, idx) => (
                    <tr key={idx}>
                  <td className="px-4 py-2 text-gray-900 font-semibold">{new Date(item.date).toLocaleDateString('fr-FR')}</td>
                      <td className={"px-4 py-2 font-bold " + (item.benefice >= 0 ? 'text-green-700' : 'text-red-600')}>
                        {formatCurrency(item.benefice, item.devise)}
                      </td>
                  <td className="px-4 py-2 text-gray-700">{item.shopName}</td>
                    </tr>
              ))
            )}
                </tbody>
              </table>
            </div>

      {shopNames.length > 0 && bestShop && worstShop && (
        <div className="my-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 bg-green-50 border-l-4 border-green-500 rounded p-4">
              <span className="font-bold text-green-800">Félicitations</span> au shop <span className="font-semibold">{bestShop}</span> pour le meilleur bénéfice sur cette période&nbsp;: <span className="text-green-700 font-bold">{formatCurrency(totalsByShop[bestShop].total, totalsByShop[bestShop].devise)}</span>
            </div>
            <div className="flex-1 bg-red-50 border-l-4 border-red-500 rounded p-4">
              <span className="font-bold text-red-800">Attention</span> au shop <span className="font-semibold">{worstShop}</span> qui a le bénéfice le plus faible sur cette période&nbsp;: <span className="text-red-700 font-bold">{formatCurrency(totalsByShop[worstShop].total, totalsByShop[worstShop].devise)}</span>
            </div>
          </div>
        </div>
      )}

      {shopNames.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-4 border border-blue-200 my-6">
          <h2 className="text-lg font-bold mb-4 text-blue-800">Évolution des bénéfices par shop</h2>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              {shopNames.map((shop, idx) => (
                <Line key={shop} type="monotone" dataKey={shop} stroke={['#2563eb', '#059669', '#f59e42', '#e11d48', '#a21caf'][idx % 5]} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Daily Summary Section */}
      <div className="mt-8">
        {summaryLoading ? (
          <p className="text-center text-gray-500">Chargement du résumé...</p>
        ) : !dailySummary ? (
          <p className="text-center text-gray-500">Aucune donnée de résumé à afficher.</p>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">
              {getSummaryTitle()}
            </h2>
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="col-span-1 md:col-span-2 border-b pb-4 mb-4">
                <h3 className="text-lg font-semibold text-blue-900">Rapports Journaliers</h3>
                {!dailySummary.rapportMatinTrouve && <p className="text-sm text-red-500">Rapport du matin manquant.</p>}
                {!dailySummary.rapportSoirTrouve && <p className="text-sm text-red-500">Rapport du soir manquant.</p>}
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800 font-semibold">Capital Initial</p>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(dailySummary.capitalInitial.montant, dailySummary.capitalInitial.devise)}</p>
              </div>

              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm text-red-800 font-semibold">Total des Dépenses</p>
                <p className="text-2xl font-bold text-red-900">{formatCurrency(dailySummary.totalDepenses.montant, dailySummary.totalDepenses.devise)}</p>
              </div>

              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800 font-semibold">Total des Mouvements</p>
                <p className="text-2xl font-bold text-yellow-900">{formatCurrency(dailySummary.totalMouvements.montant, dailySummary.totalMouvements.devise)}</p>
              </div>

              <div className="p-4 bg-indigo-50 rounded-lg">
                <p className="text-sm text-indigo-800 font-semibold">Total Dépôts Carte Épargne</p>
                <p className="text-2xl font-bold text-indigo-900">{formatCurrency(dailySummary.totalDepotsCarte.montant, dailySummary.totalDepotsCarte.devise)}</p>
              </div>

              <div className="col-span-1 md:col-span-2 p-4 bg-green-50 rounded-lg mt-4">
                <p className="text-md text-green-800 font-semibold">Total Caisse (Soir)</p>
                <p className="text-3xl font-bold text-green-900">{formatCurrency(dailySummary.totalSoir.montant, dailySummary.totalSoir.devise)}</p>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SynthesePage;