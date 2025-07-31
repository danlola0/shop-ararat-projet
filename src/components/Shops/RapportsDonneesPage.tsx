import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { Filter, Download, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Spinner } from '../common/Spinner';
import logo from '/public/ararat.jpg'; // Import the logo

// Interfaces
interface Operation {
  id: string;
  shopId: string;
  date: string;
  total_general: number;
  periode_rapport: 'matin' | 'soir';
}
interface Depot { id: string; clientId: string; montant: number; date: string; devise: string; }
interface Mouvement { id: string; operation: 'Entrée' | 'Sortie'; montant: number; description: string; date: string; devise: string; }
interface Shop { id: string; name: string; }
interface Client { id: string; nom: string; prenom: string; }

type Period = 'jour' | 'semaine' | 'mois' | 'annee' | 'tout';

const RapportsDonneesPage: React.FC = () => {
  const { currentUser } = useAuth();
  
  const [shops, setShops] = useState<Shop[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('jour');
  const [loading, setLoading] = useState(false);

  const [operations, setOperations] = useState<Operation[]>([]);
  const [depots, setDepots] = useState<Depot[]>([]);
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [operationVeille, setOperationVeille] = useState<Operation | null>(null);
  
  // State for pagination
  const [depotsPage, setDepotsPage] = useState(1);
  const [mouvementsPage, setMouvementsPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchInitialData = async () => {
      const shopsSnap = await getDocs(collection(db, 'shops'));
      const shopsData = shopsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shop));
      setShops(shopsData);
      if (shopsData.length > 0 && !selectedShopId) {
        setSelectedShopId(shopsData[0].id);
      }
      
      const clientsSnap = await getDocs(collection(db, 'clients'));
      setClients(clientsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    };
    fetchInitialData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedShopId) return;
      setLoading(true);
      setDepotsPage(1); // Reset page on new data fetch
      setMouvementsPage(1); // Reset page on new data fetch

      try {
        const dateObj = new Date(selectedDate);
        let startDateStr: string, endDateStr: string;

        switch (selectedPeriod) {
          case 'jour':
            startDateStr = endDateStr = selectedDate;
            break;
          case 'semaine':
            const day = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1; // Lundi=0, Dimanche=6
            const monday = new Date(dateObj);
            monday.setDate(dateObj.getDate() - day);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            startDateStr = monday.toISOString().split('T')[0];
            endDateStr = sunday.toISOString().split('T')[0];
            break;
          case 'mois':
            startDateStr = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1).toISOString().split('T')[0];
            endDateStr = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0).toISOString().split('T')[0];
            break;
          case 'annee':
            startDateStr = new Date(dateObj.getFullYear(), 0, 1).toISOString().split('T')[0];
            endDateStr = new Date(dateObj.getFullYear(), 11, 31).toISOString().split('T')[0];
            break;
          case 'tout':
          default:
            startDateStr = '2020-01-01';
            endDateStr = '2099-12-31';
            break;
        }

        const fetchDataForCollection = async (collectionName: string, dateField: string = 'date') => {
          const q = query(
            collection(db, collectionName),
            where('shopId', '==', selectedShopId),
            where(dateField, '>=', startDateStr),
            where(dateField, '<=', endDateStr)
          );
          const snap = await getDocs(q);
          return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        };

        setOperations(await fetchDataForCollection('operations') as Operation[]);
        setDepots(await fetchDataForCollection('depots') as Depot[]);
        setMouvements(await fetchDataForCollection('mouvements') as Mouvement[]);

        if (selectedPeriod === 'jour') {
          const dateVeille = new Date(dateObj);
          dateVeille.setDate(dateObj.getDate() - 1);
          const dateVeilleStr = dateVeille.toISOString().split('T')[0];
          const veilleQuery = query(
            collection(db, 'operations'),
            where('shopId', '==', selectedShopId),
            where('date', '==', dateVeilleStr),
            where('periode_rapport', '==', 'soir')
          );
          const veilleSnap = await getDocs(veilleQuery);
          setOperationVeille(veilleSnap.empty ? null : { id: veilleSnap.docs[0].id, ...veilleSnap.docs[0].data() } as Operation);
        } else {
          setOperationVeille(null);
        }

      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedShopId, selectedDate, selectedPeriod]);

  const { totalVentes, beneficeDuJour, operationSoir } = useMemo(() => {
    const opSoir = operations.find(op => op.periode_rapport === 'soir' && op.date === selectedDate);
    const totalAnterieur = operationVeille?.total_general || 0;
    const benefice = opSoir && operationVeille ? opSoir.total_general - totalAnterieur : 0;

    return {
      totalVentes: opSoir?.total_general || 0,
      beneficeDuJour: benefice,
      operationSoir: opSoir,
    };
  }, [operations, operationVeille, selectedDate]);

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? `${client.nom} ${client.prenom || ''}`.trim() : 'Inconnu';
  };

  const handleDownloadPDF = async () => {
    if (loading) return;
    if (!operations.length && !depots.length && !mouvements.length) {
      alert("Il n'y a pas de données à exporter.");
      return;
    }

    const doc = new jsPDF();
    const shopName = shops.find(s => s.id === selectedShopId)?.name || 'Shop Inconnu';
    const periodText = `Période: ${selectedPeriod} - Date: ${selectedDate}`;
    
    const addWatermarkAndHeaders = (doc: jsPDF) => {
      const pageCount = doc.internal.getNumberOfPages();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Header
        doc.setFontSize(16);
        doc.setTextColor(40);
        doc.text(`Rapport de Données - ${shopName}`, 14, 20);
        doc.setFontSize(10);
        doc.text(periodText, 14, 26);
        doc.setDrawColor(180, 180, 180);
        doc.line(14, 29, pageWidth - 14, 29);

        // Footer
        const footerText = `Page ${i} sur ${pageCount}`;
        doc.setFontSize(8);
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
        
        // Watermark
        doc.setGState(new (doc as any).GState({opacity: 0.1}));
        const imgWidth = 100;
        const imgHeight = 100;
        const x = (pageWidth - imgWidth) / 2;
        const y = (pageHeight - imgHeight) / 2;
        doc.addImage(logo, 'JPEG', x, y, imgWidth, imgHeight);
        doc.setGState(new (doc as any).GState({opacity: 1}));
      }
    };

    let currentY = 40;

    // Operations Table
    if (operations.length > 0) {
      doc.setFontSize(12);
      doc.text('Opérations', 14, currentY);
      currentY += 7;
      autoTable(doc, {
        head: [['Date', 'Période', 'Total Général', 'Total Antérieur', 'Bénéfice']],
        body: operations.map(op => {
          const opSoir = op.periode_rapport === 'soir' && op.date === selectedDate;
          const benefice = opSoir && operationVeille ? op.total_general - operationVeille.total_general : 0;
          return [
            op.date,
            op.periode_rapport,
            `${op.total_general.toLocaleString('fr-FR')} $`,
            opSoir ? `${operationVeille?.total_general.toLocaleString('fr-FR') || 'N/A'} $` : '',
            opSoir ? `${benefice.toLocaleString('fr-FR')} $` : ''
          ];
        }),
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133] },
      });
      currentY = (doc as any).lastAutoTable.finalY;
    } else {
      doc.text('Aucune opération trouvée.', 14, currentY);
      currentY += 10;
    }

    currentY += 10;

    // Depots Table
    if (depots.length > 0) {
      doc.setFontSize(12);
      doc.text('Dépôts Clients', 14, currentY);
      currentY += 7;
      autoTable(doc, {
        head: [['Client', 'Montant']],
        body: depots.map(d => [getClientName(d.clientId), `${d.montant.toLocaleString('fr-FR')} ${d.devise}`]),
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133] },
      });
      currentY = (doc as any).lastAutoTable.finalY;
    } else {
      doc.text('Aucun dépôt trouvé.', 14, currentY);
      currentY += 10;
    }

    currentY += 10;

    // Mouvements Table
    if (mouvements.length > 0) {
      doc.setFontSize(12);
      doc.text('Mouvements de Caisse', 14, currentY);
      currentY += 7;
      autoTable(doc, {
        head: [['Type', 'Montant', 'Description']],
        body: mouvements.map(m => [m.operation, `${m.montant.toLocaleString('fr-FR')} ${m.devise}`, m.description]),
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133] },
      });
    } else {
      doc.text('Aucun mouvement trouvé.', 14, currentY);
    }

    addWatermarkAndHeaders(doc);

    doc.save(`rapport_${shopName}_${selectedDate}.pdf`);
  };
  
  // Pagination logic for depots
  const paginatedDepots = useMemo(() => {
    const startIndex = (depotsPage - 1) * itemsPerPage;
    return depots.slice(startIndex, startIndex + itemsPerPage);
  }, [depots, depotsPage]);
  const totalDepotsPages = Math.ceil(depots.length / itemsPerPage);

  // Pagination logic for mouvements
  const paginatedMouvements = useMemo(() => {
    const startIndex = (mouvementsPage - 1) * itemsPerPage;
    return mouvements.slice(startIndex, startIndex + itemsPerPage);
  }, [mouvements, mouvementsPage]);
  const totalMouvementsPages = Math.ceil(mouvements.length / itemsPerPage);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Rapports de Données</h1>
      <p className="text-gray-600 mb-8">Analyse détaillée des données en format tableau</p>

      <div className="bg-white rounded-lg shadow p-6 mb-8 flex flex-wrap justify-between items-center">
        <div className="flex flex-wrap gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shop</label>
            <select value={selectedShopId} onChange={(e) => setSelectedShopId(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm">
              {shops.map(shop => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date de référence</label>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value as Period)} className="w-full border-gray-300 rounded-md shadow-sm">
              <option value="jour">Jour</option>
              <option value="semaine">Semaine</option>
              <option value="mois">Mois</option>
              <option value="annee">Année</option>
              <option value="tout">Toutes les données</option>
            </select>
          </div>
        </div>
        <div className="mt-4 md:mt-0">
            <button
              onClick={handleDownloadPDF}
              className="bg-blue-600 text-white px-4 py-2 rounded-md shadow hover:bg-blue-700 transition flex items-center gap-2"
              disabled={loading}
            >
              <Download size={18} />
              Télécharger le PDF
            </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* ... cartes de stats ... */}
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
            <h2 className="text-xl font-bold text-gray-800 p-6">Opérations</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Période</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Général</th>
                    {selectedPeriod === 'jour' && <>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Antérieur</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bénéfice</th>
                    </>}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedPeriod === 'jour' && operationVeille && (
                    <tr className="bg-gray-100">
                      <td className="px-6 py-4">{operationVeille.date}</td>
                      <td className="px-6 py-4">{operationVeille.periode_rapport}</td>
                      <td className="px-6 py-4 text-right font-medium">{operationVeille.total_general.toLocaleString('fr-FR')} $</td>
                      <td className="px-6 py-4 text-right text-gray-500" colSpan={2}>—</td>
                    </tr>
                  )}
                  {operations.length > 0 ? operations.map(op => (
                     <tr key={op.id}>
                      <td className="px-6 py-4">{op.date}</td>
                      <td className="px-6 py-4">{op.periode_rapport}</td>
                      <td className="px-6 py-4 text-right font-medium">{op.total_general.toLocaleString('fr-FR')} $</td>
                      {selectedPeriod === 'jour' && op.periode_rapport === 'soir' && <>
                        <td className="px-6 py-4 text-right">{operationVeille?.total_general.toLocaleString('fr-FR')} $</td>
                        <td className="px-6 py-4 text-right font-bold text-green-600">{beneficeDuJour.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $</td>
                      </>}
                      {selectedPeriod === 'jour' && op.periode_rapport !== 'soir' && <td colSpan={2}></td>}
                    </tr>
                  )) : (
                    <tr><td colSpan={selectedPeriod === 'jour' ? 5 : 3} className="px-6 py-4 text-center text-gray-500">Aucune opération trouvée.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <h2 className="text-xl font-bold text-gray-800 p-6">Dépôts Clients ({depots.length})</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedDepots.length === 0 ? (
                      <tr><td colSpan={2} className="px-6 py-4 text-center text-gray-500">Aucun dépôt trouvé.</td></tr>
                    ) : (
                      paginatedDepots.map(d => (
                        <tr key={d.id}>
                          <td className="px-6 py-4">{getClientName(d.clientId)}</td>
                          <td className="px-6 py-4 text-right">{d.montant.toLocaleString('fr-FR')} {d.devise}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totalDepotsPages > 1 && (
                <div className="p-4 flex justify-between items-center">
                  <button 
                    onClick={() => setDepotsPage(p => p - 1)} 
                    disabled={depotsPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Précédent
                  </button>
                  <span>
                    Page {depotsPage} sur {totalDepotsPages}
                  </span>
                  <button 
                    onClick={() => setDepotsPage(p => p + 1)} 
                    disabled={depotsPage === totalDepotsPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Suivant
                  </button>
                </div>
              )}
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <h2 className="text-xl font-bold text-gray-800 p-6">Mouvements de Caisse ({mouvements.length})</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedMouvements.length === 0 ? (
                      <tr><td colSpan={3} className="px-6 py-4 text-center text-gray-500">Aucun mouvement trouvé.</td></tr>
                    ) : (
                      paginatedMouvements.map(m => (
                        <tr key={m.id}>
                          <td className="px-6 py-4">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${m.operation === 'Entrée' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {m.operation}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">{m.montant.toLocaleString('fr-FR')} {m.devise}</td>
                          <td className="px-6 py-4 text-gray-500">{m.description}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totalMouvementsPages > 1 && (
                <div className="p-4 flex justify-between items-center">
                  <button 
                    onClick={() => setMouvementsPage(p => p - 1)} 
                    disabled={mouvementsPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Précédent
                  </button>
                  <span>
                    Page {mouvementsPage} sur {totalMouvementsPages}
                  </span>
                  <button 
                    onClick={() => setMouvementsPage(p => p + 1)} 
                    disabled={mouvementsPage === totalMouvementsPages}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Suivant
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RapportsDonneesPage;