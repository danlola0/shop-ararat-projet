import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Filter, 
  Calendar, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity,
  Building,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  X,
  Save
} from 'lucide-react';
import { User } from '../../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';

interface AdminPageProps {
  user?: User;
}

interface AdminStats {
  totalRevenue: number;
  totalTransactions: number;
  totalClients: number;
  totalUsers: number;
  averagePerShop: number;
  activeShops: number;
  totalDepots?: number;
}

interface ShopPerformance {
  shopId: string;
  shopName: string;
  revenue: number;
  transactions: number;
  clients: number;
  users: number;
  growth: number;
  depots?: number;
}

interface UserStats {
  total: number;
  admins: number;
  users: number;
  active: number;
  inactive: number;
}

export const AdminPage: React.FC<AdminPageProps> = ({ user }) => {
  console.log('AdminPage rendu avec user:', user);

  const [stats, setStats] = useState<AdminStats>({
    totalRevenue: 0,
    totalTransactions: 0,
    totalClients: 0,
    totalUsers: 0,
    averagePerShop: 0,
    activeShops: 0
  });
  const [shopPerformance, setShopPerformance] = useState<ShopPerformance[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    total: 0,
    admins: 0,
    users: 0,
    active: 0,
    inactive: 0
  });
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedShop, setSelectedShop] = useState('all');
  const [loading, setLoading] = useState(true);
  const [shops, setShops] = useState<{ id: string; name: string }[]>([]);
  const [showPermissionAlert, setShowPermissionAlert] = useState(false);
  const [editingShop, setEditingShop] = useState<ShopPerformance | null>(null);
  const [showShopModal, setShowShopModal] = useState(false);
  const [shopName, setShopName] = useState('');

  // Récupérer les shops disponibles
  const fetchShops = async () => {
    try {
      if (user && user.role === 'admin') {
        // On récupère les boutiques directement depuis le service des shops
        // const allShops = await shopService.getAll();
        
        setShops([
          { id: 'all', name: 'Tous les shops' },
          // on utilise la liste de boutiques renvoyée par le service
          // ...allShops 
        ]);
      } else {
        // Admin shop - seulement son shop
        setShops([
          { id: user!.shopId, name: user!.shopName }
        ]);
        setSelectedShop(user!.shopId);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des shops:', error);
      
      // En cas d'erreur de permissions, on garde le fallback
      if (error.message.includes('permissions')) {
        console.log('Erreur de permissions - utilisation des shops de démonstration');
        
        if (user && user.role === 'admin') {
          setShops([
            { id: 'all', name: 'Tous les shops' },
            { id: 'shop1', name: 'Banunu' },
            { id: 'shop2', name: 'Kinshasa Centre' },
            { id: 'shop3', name: 'Gombe' }
          ]);
        } else {
          setShops([
            { id: user!.shopId, name: user!.shopName }
          ]);
          setSelectedShop(user!.shopId);
        }
      }
    }
  };

  // Calculer les statistiques
  const calculateStats = async () => {
    try {
      setLoading(true);
      console.log('Début du calcul des statistiques pour:', user?.email);
      
      const today = new Date();
      let startDate: string;
      let endDate: string;
      
      switch (selectedPeriod) {
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = weekAgo.toISOString().split('T')[0];
          endDate = today.toISOString().split('T')[0];
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          startDate = monthAgo.toISOString().split('T')[0];
          endDate = today.toISOString().split('T')[0];
          break;
        case 'quarter':
          const quarterAgo = new Date(today);
          quarterAgo.setMonth(quarterAgo.getMonth() - 3);
          startDate = quarterAgo.toISOString().split('T')[0];
          endDate = today.toISOString().split('T')[0];
          break;
        default:
          const defaultMonthAgo = new Date(today);
          defaultMonthAgo.setMonth(defaultMonthAgo.getMonth() - 1);
          startDate = defaultMonthAgo.toISOString().split('T')[0];
          endDate = today.toISOString().split('T')[0];
      }

      console.log('Période sélectionnée:', selectedPeriod, 'de', startDate, 'à', endDate);

      // Récupérer toutes les données
      let echanges, credits, depots, transactions, clients, users;
      
      if (user && user.role === 'admin') {
        console.log('Admin global - récupération de toutes les données');
        // Récupération directe depuis Firestore
        const [echangesSnapshot, creditsSnapshot, depotsSnapshot, transactionsSnapshot, clientsSnapshot, usersSnapshot] = await Promise.all([
          getDocs(collection(db, 'echanges')),
          getDocs(collection(db, 'ventes_credit')),
          getDocs(collection(db, 'depots')),
          getDocs(collection(db, 'transactions')),
          getDocs(collection(db, 'clients')),
          getDocs(collection(db, 'users'))
        ]);

        echanges = echangesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        credits = creditsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        depots = depotsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        clients = clientsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else {
        console.log('Admin shop - récupération des données du shop:', user!.shopId);
        // Récupération filtrée par shop
        const [echangesSnapshot, creditsSnapshot, depotsSnapshot, transactionsSnapshot, clientsSnapshot, usersSnapshot] = await Promise.all([
          getDocs(collection(db, 'echanges')),
          getDocs(collection(db, 'ventes_credit')),
          getDocs(collection(db, 'depots')),
          getDocs(collection(db, 'transactions')),
          getDocs(collection(db, 'clients')),
          getDocs(collection(db, 'users'))
        ]);

        const filterByShop = (docs) => docs.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(item => item.shopId === user!.shopId);

        echanges = filterByShop(echangesSnapshot);
        credits = filterByShop(creditsSnapshot);
        depots = filterByShop(depotsSnapshot);
        transactions = filterByShop(transactionsSnapshot);
        clients = filterByShop(clientsSnapshot);
        users = filterByShop(usersSnapshot);
      }

      console.log('Données récupérées:', {
        echanges: echanges.length,
        credits: credits.length,
        depots: depots.length,
        transactions: transactions.length,
        clients: clients.length,
        users: users.length
      });

      // Filtrer par période
      const filterByDate = (data: any[]) => {
        return data.filter(item => {
          const itemDate = new Date(item.date);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return itemDate >= start && itemDate <= end;
        });
      };

      const filteredEchanges = filterByDate(echanges);
      const filteredCredits = filterByDate(credits);
      const filteredDepots = filterByDate(depots);
      const filteredTransactions = filterByDate(transactions);

      console.log('Données filtrées:', {
        echanges: filteredEchanges.length,
        credits: filteredCredits.length,
        depots: filteredDepots.length,
        transactions: filteredTransactions.length
      });

      // Calculer les totaux
      const echangesTotal = filteredEchanges.reduce((sum, item) => sum + (item.montant || 0), 0);
      const creditsTotal = filteredCredits.reduce((sum, item) => sum + (item.montant || 0), 0);
      const depotsTotal = filteredDepots.reduce((sum, item) => sum + (item.montant || 0), 0);
      const transactionsTotal = filteredTransactions.reduce((sum, item) => sum + (item.montant || 0), 0);

      const totalRevenue = echangesTotal + creditsTotal + depotsTotal + transactionsTotal;
      const totalTransactions = filteredEchanges.length + filteredCredits.length + filteredDepots.length + filteredTransactions.length;

      console.log('Totaux calculés:', {
        totalRevenue,
        totalTransactions,
        echangesTotal,
        creditsTotal,
        depotsTotal,
        transactionsTotal
      });

      // Calculer les statistiques par shop
      const shopStats = new Map<string, ShopPerformance>();
      
      if (user && user.role === 'admin') {
        // Grouper par shop
        const allData = [
          ...filteredEchanges.map(item => ({ ...item, type: 'echange' })),
          ...filteredCredits.map(item => ({ ...item, type: 'credit' })),
          ...filteredDepots.map(item => ({ ...item, type: 'depot' })),
          ...filteredTransactions.map(item => ({ ...item, type: 'transaction' }))
        ];

        allData.forEach(item => {
          const shopId = item.shopId;
          if (!shopStats.has(shopId)) {
            shopStats.set(shopId, {
              shopId,
              shopName: item.shopName || shopId,
              revenue: 0,
              transactions: 0,
              clients: 0,
              users: 0,
              growth: 0,
              depots: 0
            });
          }
          
          const shop = shopStats.get(shopId)!;
          shop.revenue += item.montant || 0;
          shop.transactions += 1;
          
          // Compter les dépôts séparément
          if (item.type === 'depot') {
            shop.depots += item.montant || 0;
          }
        });

        // Ajouter les clients et utilisateurs par shop
        clients.forEach(client => {
          const shop = shopStats.get(client.shopId);
          if (shop) shop.clients += 1;
        });

        users.forEach(user => {
          if (user.shopId !== 'ALL_SHOPS') {
            const shop = shopStats.get(user.shopId);
            if (shop) shop.users += 1;
          }
        });

        setShopPerformance(Array.from(shopStats.values()));
      } else {
        // Admin shop - seulement son shop
        const shopDepots = filteredDepots.reduce((sum, item) => sum + (item.montant || 0), 0);
        setShopPerformance([{
          shopId: user!.shopId,
          shopName: user!.shopName,
          revenue: totalRevenue,
          transactions: totalTransactions,
          clients: clients.length,
          users: users.length,
          growth: 0,
          depots: shopDepots
        }]);
      }

      // Statistiques utilisateurs
      const userStatsData = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        users: users.filter(u => u.role === 'user').length,
        active: users.length, // Simplifié pour l'exemple
        inactive: 0
      };

      setUserStats(userStatsData);
      setStats({
        totalRevenue,
        totalTransactions,
        totalClients: clients.length,
        totalUsers: users.length,
        averagePerShop: user && user.role === 'admin' ? totalRevenue / Math.max(shopStats.size, 1) : totalRevenue,
        activeShops: user && user.role === 'admin' ? shopStats.size : 1,
        totalDepots: depotsTotal
      });

      console.log('Statistiques finales mises à jour');

    } catch (error) {
      console.error('Erreur lors du calcul des statistiques:', error);
      
      // En cas d'erreur, afficher des données de démonstration
      if (error.message.includes('permissions')) {
        console.log('Erreur de permissions - affichage des données de démonstration');
        setShowPermissionAlert(true);
        
        // Données de démonstration
        const demoStats = {
          totalRevenue: 45000,
          totalTransactions: 156,
          totalClients: 89,
          totalUsers: 12,
          averagePerShop: user && user.role === 'admin' ? 15000 : 45000,
          activeShops: user && user.role === 'admin' ? 3 : 1,
          totalDepots: 12000
        };
        
        const demoShopPerformance = user && user.role === 'admin' ? [
          {
            shopId: 'shop1',
            shopName: 'Banunu',
            revenue: 18000,
            transactions: 67,
            clients: 34,
            users: 4,
            growth: 12,
            depots: 6000
          },
          {
            shopId: 'shop2',
            shopName: 'Kinshasa Centre',
            revenue: 15000,
            transactions: 45,
            clients: 28,
            users: 3,
            growth: 8,
            depots: 4000
          },
          {
            shopId: 'shop3',
            shopName: 'Gombe',
            revenue: 12000,
            transactions: 44,
            clients: 27,
            users: 5,
            growth: 18,
            depots: 2000
          }
        ] : [
          {
            shopId: user!.shopId,
            shopName: user!.shopName,
            revenue: 45000,
            transactions: 156,
            clients: 89,
            users: 12,
            growth: 15,
            depots: 12000
          }
        ];
        
        const demoUserStats = {
          total: 12,
          admins: 3,
          users: 9,
          active: 10,
          inactive: 2
        };
        
        setStats(demoStats);
        setShopPerformance(demoShopPerformance);
        setUserStats(demoUserStats);
      }
      
      // En cas d'erreur, on met quand même loading à false
      setLoading(false);
    } finally {
      setLoading(false);
      console.log('Calcul des statistiques terminé');
    }
  };

  useEffect(() => {
    if (user) {
      fetchShops();
    }
  }, [user]);

  useEffect(() => {
    if (user && shops.length > 0) {
      calculateStats();
    }
  }, [user, selectedPeriod, selectedShop, shops]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'CDF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Supprimer toute la fonction handleExportExcel car elle dépend de XLSX

  const handleExportReport = async () => {
    // Création du PDF
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleString('fr-FR');

    // Titre
    doc.setFontSize(18);
    doc.text('Rapport Administrateur', 14, 18);
    doc.setFontSize(12);
    doc.text(`Période : ${selectedPeriod === 'week' ? 'Cette semaine' : selectedPeriod === 'month' ? 'Ce mois' : 'Ce trimestre'}`, 14, 28);
    doc.text(`Généré le : ${dateStr}`, 14, 36);
    doc.text(`Utilisateur : ${user?.prenom} ${user?.nom} (${user?.role})`, 14, 44);
    if (user && user.role === 'admin') {
      doc.text('Vue : Tous les shops', 14, 52);
    } else {
      doc.text(`Shop : ${user?.shopName}`, 14, 52);
    }

    // Statistiques principales
    autoTable(doc, {
      startY: 60,
      head: [['Statistique', 'Valeur']],
      body: [
        ["Chiffre d'affaires total", formatCurrency(stats.totalRevenue)],
        ["Transactions totales", stats.totalTransactions],
        ["Clients actifs", stats.totalClients],
        ["Dépôts de cartes", stats.totalDepots || 0],
        [user && user.role === 'admin' ? 'Shops actifs' : 'Utilisateurs', user && user.role === 'admin' ? stats.activeShops : stats.totalUsers],
      ],
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] },
      styles: { fontSize: 10 }
    });

    // Performance par shop
    if (shopPerformance.length > 0) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [[
          "Shop", "Chiffre d'affaires", "Transactions", "Clients", "Dépôts Cartes", "Utilisateurs", "Croissance (%)"
        ]],
        body: shopPerformance.map(shop => [
          shop.shopName,
          formatCurrency(shop.revenue),
          shop.transactions,
          shop.clients,
          shop.depots || 0,
          shop.users,
          `${shop.growth}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 9 }
      });
    }

    // Détails des dépôts de cartes
    try {
      let depotsData;
      if (user && user.role === 'admin') {
        // Utiliser les données déjà récupérées dans calculateStats
        depotsData = depots;
      } else {
        // Utiliser les données déjà récupérées dans calculateStats
        depotsData = depots;
      }

      if (depotsData && depotsData.length > 0) {
        autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 10,
          head: [['Client', 'Montant', 'Type', 'Date', 'Shop']],
          body: depotsData.slice(0, 20).map(depot => [
            depot.clientName || 'N/A',
            formatCurrency(depot.montant),
            depot.type === 'depot' ? 'Dépôt' : 'Retrait',
            new Date(depot.date).toLocaleDateString('fr-FR'),
            depot.shopName || 'N/A'
          ]),
          theme: 'grid',
          headStyles: { fillColor: [245, 158, 11] },
          styles: { fontSize: 8 }
        });
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des dépôts:', error);
    }

    // Statistiques utilisateurs
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [['Total utilisateurs', 'Admins', 'Users', 'Actifs', 'Inactifs']],
      body: [[
        userStats.total,
        userStats.admins,
        userStats.users,
        userStats.active,
        userStats.inactive
      ]],
      theme: 'grid',
      headStyles: { fillColor: [168, 85, 247] },
      styles: { fontSize: 9 }
    });

    // Télécharger le PDF
    doc.save(`rapport-admin-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleOpenEditShopModal = (shop: ShopPerformance) => {
    setEditingShop(shop);
    setShopName(shop.shopName);
    setShowShopModal(true);
  };

  const handleUpdateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShop) return;
    try {
      // Mise à jour directe dans Firestore
      // await updateDoc(doc(db, 'shops', editingShop.shopId), { name: shopName });
      setShowShopModal(false);
      setEditingShop(null);
      // Rafraîchir les données pour voir le changement
      fetchShops();
      calculateStats();
    } catch (error) {
      console.error("Erreur lors de la mise à jour du shop:", error);
      alert("La mise à jour a échoué.");
    }
  };

  const handleDeleteShop = async (shopId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce shop ? Cette action pourrait avoir des conséquences importantes sur les utilisateurs et transactions liés.")) {
      try {
        // Suppression directe dans Firestore
        // await deleteDoc(doc(db, 'shops', shopId));
        // Rafraîchir les données
        fetchShops();
        calculateStats();
      } catch (error) {
        console.error("Erreur lors de la suppression du shop:", error);
        alert("La suppression a échoué.");
      }
    }
  };

  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Utilisateur non défini</p>
          <p className="text-sm text-gray-500 mt-2">Veuillez vous reconnecter</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des statistiques d'administration...</p>
        </div>
      </div>
    );
  }

  const statsCards = [
    {
      title: 'Chiffre d\'affaires total',
      value: formatCurrency(stats.totalRevenue),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: `${selectedPeriod === 'week' ? 'Cette semaine' : selectedPeriod === 'month' ? 'Ce mois' : 'Ce trimestre'}`
    },
    {
      title: 'Transactions totales',
      value: stats.totalTransactions.toString(),
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Toutes les opérations'
    },
    {
      title: 'Clients actifs',
      value: stats.totalClients.toString(),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Clients enregistrés'
    },
    {
      title: user && user.role === 'admin' ? 'Shops actifs' : 'Utilisateurs',
      value: user && user.role === 'admin' ? stats.activeShops.toString() : stats.totalUsers.toString(),
      icon: user && user.role === 'admin' ? Building : UserCheck,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: user && user.role === 'admin' ? 'Shops opérationnels' : 'Utilisateurs du shop'
    }
  ];

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {showPermissionAlert && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle size={20} className="text-yellow-600 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Mode Démonstration
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Les règles Firestore ne sont pas configurées pour les administrateurs globaux. 
                  Affichage des données de démonstration. 
                  <a 
                    href="https://console.firebase.google.com/project/shop-ararat-projet/firestore/rules" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline ml-1"
                  >
                    Configurer les règles
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Tableau de Bord Administratif</h1>
            <p className="text-sm text-gray-600 mt-1">
              Vue d'ensemble des performances de tous les shops
            </p>
          </div>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <button 
              onClick={handleExportReport}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Download size={16} />
              <span>📄 Exporter Rapport</span>
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Filtres:</label>
          </div>
          
          {user && user.role === 'admin' && (
            <select
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              className="w-full sm:w-auto bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
            >
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full sm:w-auto bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
          >
            <option value="month">Ce mois</option>
            <option value="week">Cette semaine</option>
            <option value="quarter">Ce trimestre</option>
          </select>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statsCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{stat.title}</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                  </div>
                  <div className={`${stat.bgColor} p-2 sm:p-3 rounded-full flex-shrink-0 ml-3`}>
                    <Icon size={20} className={`${stat.color} sm:w-6 sm:h-6`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Shop Performance */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              {user && user.role === 'admin' ? 'Performance par Shop' : 'Performance du Shop'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Statistiques détaillées {selectedPeriod === 'week' ? 'de cette semaine' : selectedPeriod === 'month' ? 'de ce mois' : 'de ce trimestre'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shop
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chiffre d'affaires
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transactions
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clients
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilisateurs
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shopPerformance.length > 0 ? (
                  shopPerformance.map((shop, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {shop.shopName}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(shop.revenue)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {shop.transactions}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {shop.clients}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {shop.users}
                      </td>
                      <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {shop.shopId !== 'all' && (
                          <div className="flex items-center space-x-2">
                            <button onClick={() => handleOpenEditShopModal(shop)} className="text-blue-600 hover:text-blue-900" title="Modifier">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDeleteShop(shop.shopId)} className="text-red-600 hover:text-red-900" title="Supprimer">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-4 sm:px-6 py-8 text-center text-gray-500">
                      Aucune donnée disponible pour cette période
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User Statistics */}
        {user && user.role === 'admin' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Statistiques Utilisateurs</h2>
              <p className="text-sm text-gray-600 mt-1">Répartition des utilisateurs par rôle</p>
            </div>
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Users size={24} className="text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">{userStats.total}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <UserCheck size={24} className="text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">{userStats.admins}</p>
                  <p className="text-sm text-gray-600">Administrateurs</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle size={24} className="text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">{userStats.users}</p>
                  <p className="text-sm text-gray-600">Users</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <Activity size={24} className="text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-600">{userStats.active}</p>
                  <p className="text-sm text-gray-600">Actifs</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Résumé d'Activité</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Moyenne par shop</p>
                  <p className="text-xl font-bold text-blue-900">{formatCurrency(stats.averagePerShop)}</p>
                </div>
                <TrendingUp size={20} className="text-blue-600" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">Taux de conversion</p>
                  <p className="text-xl font-bold text-green-900">
                    {stats.totalClients > 0 ? Math.round((stats.totalTransactions / stats.totalClients) * 100) : 0}%
                  </p>
                </div>
                <BarChart3 size={20} className="text-green-600" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-900">Efficacité</p>
                  <p className="text-xl font-bold text-purple-900">
                    {stats.totalUsers > 0 ? Math.round((stats.totalTransactions / stats.totalUsers)) : 0}
                  </p>
                  <p className="text-xs text-purple-700">transactions/utilisateur</p>
                </div>
                <Activity size={20} className="text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Modal de modification de shop */}
        {showShopModal && editingShop && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
              <form onSubmit={handleUpdateShop} className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Modifier le nom du shop</h2>
                  <button type="button" onClick={() => setShowShopModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nom du Shop</label>
                  <input type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md" required />
                </div>
                <div className="flex items-center justify-end space-x-3 pt-6">
                  <button type="button" onClick={() => setShowShopModal(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Annuler</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Enregistrer</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};