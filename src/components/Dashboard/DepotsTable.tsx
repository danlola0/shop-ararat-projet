import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

interface Depot {
  id: string;
  clientId: string;
  montant: number;
  type: 'dépôt' | 'retrait';
  date: string;
  description: string;
  devise: 'CDF' | 'USD';
}

interface Client {
  id: string;
  nom: string;
}

interface DepotsTableProps {
  selectedShopId: string;
}

const DepotsTable: React.FC<DepotsTableProps> = ({ selectedShopId }) => {
  const [depots, setDepots] = useState<Depot[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [page, setPage] = useState(1);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [modalDepot, setModalDepot] = useState<Depot | null>(null);
  const [loading, setLoading] = useState(false);

  // Récupérer les clients
  useEffect(() => {
    const fetchClients = async () => {
      const snap = await getDocs(collection(db, 'clients'));
      setClients(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    };
    fetchClients();
  }, []);

  // Récupérer les dépôts/retraits filtrés par shop
  useEffect(() => {
    const fetchDepots = async () => {
      setLoading(true);
      if (!selectedShopId) {
        setDepots([]);
        setLoading(false);
        return;
      }
      let q = query(
        collection(db, 'depots'),
        where('shopId', '==', selectedShopId),
        orderBy('date', 'desc')
      );
      const snap = await getDocs(q);
      setDepots(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Depot)));
      setLoading(false);
    };
    fetchDepots();
  }, [selectedShopId]);

  // DEBUG : Afficher les opérations du client Gaston en détail
  useEffect(() => {
    const clientGaston = clients.find(c => c.nom && c.nom.toLowerCase().includes('gaston'));
    if (clientGaston) {
      const opsGaston = depots.filter(d => d.clientId === clientGaston.id);
      console.log('DEBUG - Opérations Gaston (détail):');
      opsGaston.forEach(op => console.log(op));
    }
  }, [clients, depots]);

  // Pagination
  const depotsFiltres = depots.filter(d => {
    let ok = true;
    if (selectedClient) ok = ok && d.clientId === selectedClient;
    if (dateDebut) ok = ok && d.date >= dateDebut;
    if (dateFin) ok = ok && d.date <= dateFin;
    return ok;
  });
  const totalPages = Math.ceil(depotsFiltres.length / 3);
  const depotsPage = depotsFiltres.slice((page - 1) * 3, page * 3);

  // Trouver le nom du client
  const getClientName = (id: string) => clients.find(c => c.id === id)?.nom || 'Inconnu';

  // Calcul du solde restant pour chaque client et chaque devise (type 'depot' sans accent)
  const getSoldeRestant = (clientId: string, devise: 'CDF' | 'USD') => {
    const depotsClient = depots.filter(d => d.clientId === clientId && d.devise === devise);
    const totalDepots = depotsClient.filter(d => d.type === 'depot').reduce((sum, d) => sum + d.montant, 0);
    const totalRetraits = depotsClient.filter(d => d.type === 'retrait').reduce((sum, d) => sum + d.montant, 0);
    return totalDepots - totalRetraits;
  };

  // Calcul du total général des soldes restants positifs pour chaque devise
  const totalGeneralSoldeCDF = clients.reduce((sum, c) => {
    const solde = getSoldeRestant(c.id, 'CDF');
    return solde > 0 ? sum + solde : sum;
  }, 0);
  const totalGeneralSoldeUSD = clients.reduce((sum, c) => {
    const solde = getSoldeRestant(c.id, 'USD');
    return solde > 0 ? sum + solde : sum;
  }, 0);

  // Liste des clients ayant au moins une opération dans ce shop
  const clientsAvecOperations = clients.filter(c => depots.some(d => d.clientId === c.id));

  // Actions
  const handleDelete = (id: string) => {
    // TODO: suppression Firestore
    alert('Suppression à implémenter pour l\'id ' + id);
  };
  const handleEdit = (depot: Depot) => {
    setModalDepot(depot);
  };
  const closeModal = () => setModalDepot(null);

  return (
    <div className="bg-white p-2 sm:p-4 rounded shadow mt-4 overflow-x-auto w-full max-w-full">
      <h2 className="text-xl font-bold mb-4">Dépôts & Retraits Carte</h2>
      <div className="flex flex-col sm:flex-row gap-1 mb-2 w-full max-w-full">
        <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="border rounded px-2 py-1 text-sm">
          <option value="">Tous les clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="border rounded px-2 py-1 text-sm" />
      </div>
      <div className="w-full max-w-full overflow-x-auto">
        <table className="min-w-full border text-xs sm:text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Client</th>
              <th className="p-2 border">Solde restant CDF</th>
              <th className="p-2 border">Solde restant USD</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="text-center p-4">Chargement...</td></tr>
            ) : clientsAvecOperations.length === 0 ? (
              <tr><td colSpan={3} className="text-center p-4">Aucun résultat</td></tr>
            ) : clientsAvecOperations.map(c => (
              <tr key={c.id}>
                <td className="p-2 border">{c.nom}</td>
                <td className="p-2 border">{getSoldeRestant(c.id, 'CDF').toFixed(2)}</td>
                <td className="p-2 border">{getSoldeRestant(c.id, 'USD').toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 font-bold">
              <td className="p-2 border text-right">Total à rembourser :</td>
              <td className="p-2 border">{totalGeneralSoldeCDF.toFixed(2)} CDF</td>
              <td className="p-2 border">{totalGeneralSoldeUSD.toFixed(2)} USD</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-2">
        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 border rounded disabled:opacity-50 text-sm">Précédent</button>
        <span className="text-sm">Page {page} / {totalPages || 1}</span>
        <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded disabled:opacity-50 text-sm">Suivant</button>
      </div>
      {/* Modal d'édition */}
      {modalDepot && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg min-w-[300px]">
            <h3 className="font-bold mb-2">Modifier le dépôt/retrait</h3>
            {/* Formulaire d'édition à implémenter */}
            <div className="mb-4">(Formulaire à compléter)</div>
            <button onClick={closeModal} className="bg-gray-200 px-4 py-2 rounded">Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepotsTable; 