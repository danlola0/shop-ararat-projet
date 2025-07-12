import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Users, TrendingUp, ArrowUp, ArrowDown, Calendar, Filter, Trash2, Edit, X, ChevronLeft, ChevronRight, Store } from 'lucide-react';
import { User } from '../../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../firebase/config';
import { collection, addDoc, getDocs, query, where, orderBy, limit, Timestamp, doc, setDoc, updateDoc } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DepotsTable from './DepotsTable';

interface DashboardProps {
  user: User;
}

interface DashboardStats {
  echanges: number;
  credits: number;
  depots: number;
  transactions: number;
  totalRevenue: number;
  tresorerieReelleCDF: number;
  tresorerieReelleUSD: number;
  soldeBrutCDF: number;
  soldeBrutUSD: number;
  soldeReelCDF: number;
  soldeReelUSD: number;
}

interface RecentTransaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  status: string;
  shopName?: string;
  collection: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState<DashboardStats>({
    echanges: 0,
    credits: 0,
    depots: 0,
    transactions: 0,
    totalRevenue: 0,
    tresorerieReelleCDF: 0,
    tresorerieReelleUSD: 0,
    soldeBrutCDF: 0,
    soldeBrutUSD: 0,
    soldeReelCDF: 0,
    soldeReelUSD: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [clients, setClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [emprunts, setEmprunts] = useState<any[]>([]);
  const [empruntsLoading, setEmpruntsLoading] = useState(true);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [clientFormData, setClientFormData] = useState({ nom: '', prenom: '', telephone: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // 10 clients par page
  const [chiffreJour, setChiffreJour] = useState(0);
  const [chiffreMois, setChiffreMois] = useState(0);
  const [soldeCaisse, setSoldeCaisse] = useState(0);
  const [soldeElectronique, setSoldeElectronique] = useState(0);
  const [soldeCredit, setSoldeCredit] = useState(0);
  const [evolutionData, setEvolutionData] = useState<{ date: string, total: number }[]>([]);
  const [shops, setShops] = useState<{id: string, name: string}[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>(user.shopId);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // --- Taux journalier ---
  const [tauxJournalier, setTauxJournalier] = useState<number | null>(null);
  const [tauxJournalierId, setTauxJournalierId] = useState<string | null>(null);
  const [tauxJournalierLoading, setTauxJournalierLoading] = useState(true);
  const [tauxJournalierInput, setTauxJournalierInput] = useState('');
  const [tauxJournalierError, setTauxJournalierError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editInput, setEditInput] = useState('');

  // Calculer les statistiques
  const fetchStats = async () => {
    setLoading(true);
    try {
      const shopId = user.role === 'admin' ? 'ALL_SHOPS' : user.shopId;
      
      // Récupération directe depuis Firestore
      const [depotsSnapshot, echangesSnapshot, ventesSnapshot] = await Promise.all([
        getDocs(collection(db, 'depots')),
        getDocs(collection(db, 'echanges')),
        getDocs(collection(db, 'ventes_credit'))
      ]);

      // Filtrer selon le shop et la période
      const filterByShopAndPeriod = (docs, shopId, period) => {
        return docs.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => {
            const itemDate = new Date(item.date || item.createdAt);
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - period);
            
            return (shopId === 'ALL_SHOPS' || item.shopId === shopId) && 
                   itemDate >= startDate;
          });
      };

      const depots = filterByShopAndPeriod(depotsSnapshot, shopId, selectedPeriod);
      const echanges = filterByShopAndPeriod(echangesSnapshot, shopId, selectedPeriod);
      const ventes = filterByShopAndPeriod(ventesSnapshot, shopId, selectedPeriod);

      // Calculer les statistiques
      const totalDepots = depots.reduce((sum, depot) => sum + (depot.montant || 0), 0);
      const totalEchanges = echanges.reduce((sum, echange) => sum + (echange.montant || 0), 0);
      const totalVentes = ventes.reduce((sum, vente) => sum + (vente.montant || 0), 0);

      setStats({
        totalDepots,
        totalEchanges,
        totalVentes,
        totalTransactions: depots.length + echanges.length + ventes.length
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les clients et calculer leur solde
  const fetchClients = async () => {
    setClientsLoading(true);
    try {
      let allClients = [];
      if (user.role === 'admin') {
        // Admin voit tous les clients
        const clientsSnapshot = await getDocs(collection(db, 'clients'));
        allClients = clientsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
      } else {
        // User voit seulement les clients de son shop
        const clientsSnapshot = await getDocs(collection(db, 'clients'));
        allClients = clientsSnapshot.docs
          .map(doc => ({ 
            id: doc.id, 
            ...doc.data() 
          }))
          .filter(client => client.shopId === user.shopId);
      }
      setClients(allClients);
    } catch (error) {
      console.error('Erreur lors de la récupération des clients pour le dashboard:', error);
    } finally {
      setClientsLoading(false);
    }
  };

  // Charger les emprunts/remboursements société
  useEffect(() => {
    const fetchEmprunts = async () => {
      setEmpruntsLoading(true);
      try {
        let allEmprunts = user.role === 'admin'
          ? await emprunts.map(emprunt => ({ ...emprunt, type: 'emprunt' }))
          : await emprunts.map(emprunt => ({ ...emprunt, type: 'emprunt' }));
        setEmprunts(allEmprunts);
      } catch (e) {
        setEmprunts([]);
      } finally {
        setEmpruntsLoading(false);
      }
    };
    fetchEmprunts();
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [user, selectedPeriod]);

  useEffect(() => {
    fetchClients();
  }, [user]);

  useEffect(() => {
    const fetchChiffres = async () => {
      if (!selectedShopId) {
        console.log('DEBUG: selectedShopId est vide ou null');
        return;
      }
      
      console.log('DEBUG: Récupération des chiffres pour shopId:', selectedShopId, 'date:', selectedDate);
      
      const selectedDateObj = new Date(selectedDate);
      const yyyy = selectedDateObj.getFullYear();
      const mm = String(selectedDateObj.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDateObj.getDate()).padStart(2, '0');
      const selectedDateStr = `${yyyy}-${mm}-${dd}`;
      const monthStr = `${yyyy}-${mm}`;
      
      console.log('DEBUG: Date sélectionnée:', selectedDateStr);
      console.log('DEBUG: Mois en cours:', monthStr);
      
      // Récupérer toutes les opérations du shop pour le mois
      const opsQuery = query(
        collection(db, 'operations'),
        where('shopId', '==', selectedShopId)
      );
      const opsSnap = await getDocs(opsQuery);
      
      console.log('DEBUG: Nombre total d\'opérations trouvées:', opsSnap.size);
      
      let chiffreJourTmp = 0, chiffreMoisTmp = 0;
      let soldeCaisseTmp = 0, soldeElectroniqueTmp = 0, soldeCreditTmp = 0;
      let lastOp = null;
      
      opsSnap.forEach(docSnap => {
        const data = docSnap.data();
        console.log('DEBUG: Opération trouvée - Date:', data.date, 'Total:', data.total_general, 'ShopId:', data.shopId);
        
        if (data.date === selectedDateStr) {
          chiffreJourTmp += data.total_general || 0;
          lastOp = data;
          console.log('DEBUG: Opération de la date sélectionnée trouvée - Total ajouté:', data.total_general);
        }
        if (data.date && data.date.startsWith(monthStr)) {
          chiffreMoisTmp += data.total_general || 0;
          console.log('DEBUG: Opération du mois trouvée - Total ajouté:', data.total_general);
        }
      });
      
      console.log('DEBUG: Chiffre jour calculé:', chiffreJourTmp);
      console.log('DEBUG: Chiffre mois calculé:', chiffreMoisTmp);
      
      // Soldes à partir de la dernière opération de la date sélectionnée (ou la plus récente)
      if (lastOp) {
        soldeCaisseTmp = lastOp.espece_en_caisse || 0;
        soldeElectroniqueTmp = Object.values(lastOp.argent_electronique || {}).reduce((sum, item) => sum + (item.stock_final || 0), 0);
        soldeCreditTmp = Object.values(lastOp.vente_credit || {}).reduce((sum, item) => sum + (item.stock_final || 0), 0);
        
        console.log('DEBUG: Dernière opération trouvée - Espèce:', soldeCaisseTmp, 'Électronique:', soldeElectroniqueTmp, 'Crédit:', soldeCreditTmp);
      } else {
        console.log('DEBUG: Aucune opération trouvée pour la date sélectionnée');
      }
      
      setChiffreJour(chiffreJourTmp);
      setChiffreMois(chiffreMoisTmp);
      setSoldeCaisse(soldeCaisseTmp);
      setSoldeElectronique(soldeElectroniqueTmp);
      setSoldeCredit(soldeCreditTmp);
    };
    fetchChiffres();
  }, [selectedShopId, selectedDate]);

  useEffect(() => {
    const fetchEvolution = async () => {
      if (!selectedShopId) return;
      const today = new Date();
      const days = 7;
      const dates: string[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
      }
      const opsQuery = query(
        collection(db, 'operations'),
        where('shopId', '==', selectedShopId)
      );
      const opsSnap = await getDocs(opsQuery);
      const dataByDate: Record<string, number> = {};
      opsSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.date && dates.includes(data.date)) {
          dataByDate[data.date] = (dataByDate[data.date] || 0) + (data.total_general || 0);
        }
      });
      const chartData = dates.map(date => ({ date: date.slice(5), total: dataByDate[date] || 0 }));
      setEvolutionData(chartData);
    };
    fetchEvolution();
  }, [selectedShopId]);

  useEffect(() => {
    // Récupérer la liste des shops si admin/globalAdmin
    const fetchShops = async () => {
      if (user.role === 'admin' || user.role === 'globalAdmin') {
        const snap = await getDocs(collection(db, 'shops'));
        const fetchedShops = snap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        setShops(fetchedShops);
        // Par défaut, sélectionner le shop de l'utilisateur connecté si présent, sinon le premier shop
        if (!selectedShopId) {
          const defaultShop = fetchedShops.find(s => s.id === user.shopId) || fetchedShops[0];
          if (defaultShop) setSelectedShopId(defaultShop.id);
        }
      } else {
        setShops([{ id: user.shopId, name: user.shopName }]);
        setSelectedShopId(user.shopId);
      }
    };
    fetchShops();
    // eslint-disable-next-line
  }, [user]);

  // Récupérer le taux du jour à l’ouverture du Dashboard
  useEffect(() => {
    const fetchTaux = async () => {
      setTauxJournalierLoading(true);
      setTauxJournalierError('');
      try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const tauxQuery = query(collection(db, 'TauxJournalier'), where('date', '==', dateStr));
        const snap = await getDocs(tauxQuery);
        if (!snap.empty) {
          const doc = snap.docs[0];
          setTauxJournalier(doc.data().taux_du_jour);
          setTauxJournalierId(doc.id);
        } else {
          setTauxJournalier(null);
          setTauxJournalierId(null);
        }
      } catch (e) {
        setTauxJournalierError('Erreur lors de la récupération du taux du jour.');
      } finally {
        setTauxJournalierLoading(false);
      }
    };
    fetchTaux();
  }, []);

  // Soumission du formulaire de taux journalier
  const handleTauxJournalierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTauxJournalierError('');
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      // Vérifier qu’il n’existe pas déjà un taux pour aujourd’hui
      const tauxQuery = query(collection(db, 'TauxJournalier'), where('date', '==', dateStr));
      const snap = await getDocs(tauxQuery);
      if (!snap.empty) {
        setTauxJournalierError('Un taux est déjà défini pour aujourd’hui.');
        return;
      }
      // Enregistrer le taux
      const docRef = await addDoc(collection(db, 'TauxJournalier'), {
        taux_du_jour: Number(tauxJournalierInput),
        date: dateStr,
        cree_par: user.displayName || user.email || user.uid || 'admin',
        createdAt: Timestamp.now()
      });
      setTauxJournalier(Number(tauxJournalierInput));
      setTauxJournalierId(docRef.id);
      setTauxJournalierInput('');
    } catch (e) {
      console.error('Erreur Firestore lors de l’enregistrement du taux :', e);
      setTauxJournalierError('Erreur lors de l’enregistrement du taux.');
    }
  };

  const handleEditTaux = () => {
    setEditInput(tauxJournalier?.toString() || '');
    setEditMode(true);
  };

  const handleUpdateTaux = async (e: React.FormEvent) => {
    e.preventDefault();
    setTauxJournalierError('');
    try {
      if (!tauxJournalierId) return;
      const tauxRef = doc(db, 'TauxJournalier', tauxJournalierId);
      await updateDoc(tauxRef, {
        taux_du_jour: Number(editInput),
        modifie_par: user.displayName || user.email || user.uid || 'admin',
        updatedAt: Timestamp.now()
      });
      setTauxJournalier(Number(editInput));
      setEditMode(false);
    } catch (e) {
      console.error('Erreur Firestore lors de la modification du taux :', e);
      setTauxJournalierError('Erreur lors de la modification du taux.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'CDF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calcul du bénéfice total et du nombre de clients carte épargne
  const totalBeneficeCDF = clients.reduce((sum, c) => c.deviseOuverture === 'CDF' ? sum + c.montantOuverture : sum, 0);
  const totalBeneficeUSD = clients.reduce((sum, c) => c.deviseOuverture === 'USD' ? sum + c.montantOuverture : sum, 0);
  const totalClients = clients.length;

  // Calculs par caisse pour les emprunts société
  const caisses = [
    { key: 'interne', label: 'Caisse Carte (épargne)' },
    { key: 'echange', label: 'Caisse Échange de Monnaie' },
    { key: 'credit', label: 'Caisse Vente de Crédit' },
    { key: 'transaction', label: 'Caisse Transactions Électroniques' }
  ];

  const indicateursCaisses = caisses.map(caisse => {
    const totalEmpruntCDF = emprunts.filter(e => e.devise === 'CDF' && e.type === 'emprunt' && e.source === caisse.key).reduce((sum, e) => sum + e.montant, 0);
    const totalRemboursementCDF = emprunts.filter(e => e.devise === 'CDF' && e.type === 'remboursement' && e.source === caisse.key).reduce((sum, e) => sum + e.montant, 0);
    const soldeNetEmpruntCDF = totalEmpruntCDF - totalRemboursementCDF;
    const totalEmpruntUSD = emprunts.filter(e => e.devise === 'USD' && e.type === 'emprunt' && e.source === caisse.key).reduce((sum, e) => sum + e.montant, 0);
    const totalRemboursementUSD = emprunts.filter(e => e.devise === 'USD' && e.type === 'remboursement' && e.source === caisse.key).reduce((sum, e) => sum + e.montant, 0);
    const soldeNetEmpruntUSD = totalEmpruntUSD - totalRemboursementUSD;
    // Pour la caisse carte, la trésorerie réelle = somme des soldes réels clients - solde net des emprunts
    // Pour les autres caisses, on affiche juste le solde net des emprunts (sauf si tu veux une logique de solde de caisse séparée)
    let tresorerieReelleCDF = null;
    let tresorerieReelleUSD = null;
    if (caisse.key === 'interne') {
      tresorerieReelleCDF = clients.reduce((sum, c) => sum + c.soldeReelCDF, 0) - soldeNetEmpruntCDF;
      tresorerieReelleUSD = clients.reduce((sum, c) => sum + c.soldeReelUSD, 0) - soldeNetEmpruntUSD;
    }
    return {
      ...caisse,
      soldeNetEmpruntCDF,
      soldeNetEmpruntUSD,
      tresorerieReelleCDF,
      tresorerieReelleUSD
    };
  });

  // Affichage conditionnel pour shop vide
  const isShopVide =
    stats.echanges === 0 &&
    stats.credits === 0 &&
    stats.depots === 0 &&
    stats.transactions === 0 &&
    stats.totalRevenue === 0;

  const handleDeleteTransaction = async (collection: string, docId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette transaction ? L'action est irréversible.")) {
      return;
    }
    try {
      // await deleteDocument(collection, docId); // This line was removed as per the edit hint
      // Rafraîchir les données du tableau de bord après la suppression
      fetchStats(); 
    } catch (error) {
      console.error("Erreur lors de la suppression de la transaction:", error);
      alert("Une erreur est survenue lors de la suppression.");
    }
  };

  const handleOpenEditModal = (client: any) => {
    setEditingClient(client);
    setClientFormData({ nom: client.nom, prenom: client.prenom, telephone: client.telephone });
    setShowClientModal(true);
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    try {
      // await clientService.update(editingClient.id, clientFormData);
      setShowClientModal(false);
      setEditingClient(null);
      fetchClients(); // Rafraîchir la liste
    } catch (error) {
      console.error("Erreur lors de la mise à jour du client:", error);
      alert("La mise à jour a échoué.");
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce client ? Toutes ses informations de base seront perdues.")) {
      try {
        // await clientService.delete(clientId);
        fetchClients(); // Rafraîchir la liste
      } catch (error) {
        console.error("Erreur lors de la suppression du client:", error);
        alert("La suppression a échoué.");
      }
    }
  };

  // Logique de pagination pour les clients
  const totalClientPages = Math.ceil(clients.length / itemsPerPage);
  const currentClients = clients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalClientPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Ajout de la fonction utilitaire pour le statut
  function getStatusClass(status: string) {
    switch (status) {
      case 'Complété':
        return 'bg-green-100 text-green-800';
      case 'En cours':
        return 'bg-yellow-100 text-yellow-800';
      case 'Annulé':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <p>Utilisateur non trouvé.</p>;
  }

  const noData = stats.transactions === 0 && clients.length === 0 && emprunts.length === 0;

  return (
    <div className="p-2 sm:p-6 space-y-2 sm:space-y-6 overflow-x-hidden w-full max-w-full">
      {/* Formulaire taux journalier (admin uniquement) */}
      {user.role === 'admin' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <h2 className="text-lg font-bold mb-2 text-blue-900">Taux de change journalier</h2>
          {tauxJournalierLoading ? (
            <div className="text-blue-700">Chargement du taux du jour…</div>
          ) : tauxJournalier !== null ? (
            editMode ? (
              <form onSubmit={handleUpdateTaux} className="flex items-end gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-1">Nouveau taux du jour (CDF pour 1 USD)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editInput}
                    onChange={e => setEditInput(e.target.value)}
                    className="border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex : 2700"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 rounded-lg shadow"
                >
                  Sauvegarder
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="ml-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold px-4 py-2 rounded-lg shadow"
                >
                  Annuler
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-4 mb-4">
                <div className="text-green-700 font-semibold text-lg">
                  Taux du jour : 1 USD = {tauxJournalier.toLocaleString('fr-FR')} CDF
                </div>
                <button
                  onClick={handleEditTaux}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg shadow"
                >
                  Modifier
                </button>
              </div>
            )
          ) : (
            <form onSubmit={handleTauxJournalierSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 sm:gap-4 mb-4 w-full">
              <div className="w-full">
                <label className="block text-sm font-medium text-blue-800 mb-1">Taux du jour (CDF pour 1 USD)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={tauxJournalierInput}
                  onChange={e => setTauxJournalierInput(e.target.value)}
                  className="border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                  placeholder="Ex : 2700"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg shadow w-full sm:w-auto text-base"
              >
                Valider le taux
              </button>
            </form>
          )}
          {tauxJournalierError && <div className="text-red-600 mt-2">{tauxJournalierError}</div>}
        </div>
      )}
      {/* Header avec liste déroulante de sélection de shop */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Dashboard - {user.shopName}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {user.role === 'admin' ? 'Vue globale de tous les shops' : `Shop: ${user.shopName}`}
          </p>
        </div>
        <div className="flex flex-col xs:flex-row xs:items-center gap-2 w-full xs:w-auto">
          {shops.length > 0 && (
            <div className="flex flex-col items-start w-full xs:w-auto">
              <label className="mb-1 text-sm font-medium text-gray-700 flex items-center gap-2">
                <Store className="text-blue-500" size={18} />
                Sélectionner un shop :
              </label>
              <select
                value={selectedShopId}
                onChange={e => setSelectedShopId(e.target.value)}
                className="appearance-none bg-white border border-blue-300 rounded-lg px-4 py-2 pr-8 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition w-full xs:w-auto"
              >
                <option value="" disabled>Choisissez un shop…</option>
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col items-start w-full xs:w-auto">
            <label className="mb-1 text-sm font-medium text-gray-700 flex items-center gap-2">
              <Calendar className="text-green-500" size={18} />
              Date :
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="appearance-none bg-white border border-green-300 rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm transition w-full xs:w-auto"
            />
          </div>
          <div className="relative w-full xs:w-auto">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full xs:w-auto"
            >
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
            </select>
            <Calendar size={16} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-6 mb-4 w-full max-w-full">
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center border-t-4 border-blue-600">
          <DollarSign className="text-blue-600 mb-2" size={32} />
          <div className="text-xs text-gray-500">Chiffre d'affaires du jour</div>
          <div className="text-2xl font-bold text-blue-900">{chiffreJour} $</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center border-t-4 border-green-600">
          <TrendingUp className="text-green-600 mb-2" size={32} />
          <div className="text-xs text-gray-500">Chiffre d'affaires du mois</div>
          <div className="text-2xl font-bold text-green-900">{chiffreMois.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center border-t-4 border-yellow-500">
          <DollarSign className="text-yellow-500 mb-2" size={32} />
          <div className="text-xs text-gray-500">Solde caisse</div>
          <div className="text-2xl font-bold text-yellow-700">{soldeCaisse} $</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center border-t-4 border-purple-600">
          <CreditCard className="text-purple-600 mb-2" size={32} />
          <div className="text-xs text-gray-500">Solde électronique</div>
          <div className="text-2xl font-bold text-purple-900">{soldeElectronique} $</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center border-t-4 border-pink-600">
          <TrendingUp className="text-pink-600 mb-2" size={32} />
          <div className="text-xs text-gray-500">Solde crédit</div>
          <div className="text-2xl font-bold text-pink-900">{soldeCredit} $</div>
        </div>
      </div>

      {/* Graphique d'évolution */}
      <div className="bg-white rounded-xl shadow p-6 mb-8 border border-blue-100">
        <h2 className="text-lg font-bold mb-4">Évolution du chiffre d'affaires (7 derniers jours)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={evolutionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tableau des dépôts/retraits carte */}
      <DepotsTable selectedShopId={selectedShopId} />

      {noData ? (
        <div className="p-6 text-center text-gray-500">
          <h2 className="text-xl font-semibold mb-2">Aucune donnée pour ce shop.</h2>
          <p>Ajoutez des utilisateurs ou effectuez des opérations pour voir les indicateurs.</p>
        </div>
      ) : (
        <></>
      )}
    </div>
  );
};