import React, { useState, useEffect } from 'react';
import { DollarSign, CreditCard, Users, TrendingUp, ArrowUp, ArrowDown, Calendar, Filter } from 'lucide-react';
import { User } from '../../types';
import { 
  echangeService, 
  venteCreditService, 
  depotService, 
  transactionService,
  isGlobalAdmin 
} from '../../services/firestore';

interface DashboardProps {
  user: User;
}

interface DashboardStats {
  echanges: number;
  credits: number;
  depots: number;
  transactions: number;
  totalRevenue: number;
}

interface RecentTransaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  status: string;
  shopName?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [stats, setStats] = useState<DashboardStats>({
    echanges: 0,
    credits: 0,
    depots: 0,
    transactions: 0,
    totalRevenue: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('today');

  // Calculer les statistiques
  const calculateStats = async () => {
    try {
      setLoading(true);
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let startDate: string;
      let endDate: string;
      
      switch (selectedPeriod) {
        case 'today':
          startDate = today.toISOString().split('T')[0];
          endDate = today.toISOString().split('T')[0];
          break;
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
        default:
          startDate = today.toISOString().split('T')[0];
          endDate = today.toISOString().split('T')[0];
      }

      // Récupérer les données selon le rôle de l'utilisateur
      let echanges, credits, depots, transactions;
      
      if (isGlobalAdmin(user)) {
        // Admin global - toutes les données
        echanges = await echangeService.getAllForAdmin(user);
        credits = await venteCreditService.getAllForAdmin(user);
        depots = await depotService.getAllForAdmin(user);
        transactions = await transactionService.getAllForAdmin(user);
      } else {
        // Admin shop ou vendeur - données de son shop
        echanges = await echangeService.getByShop(user.shopId);
        credits = await venteCreditService.getByShop(user.shopId);
        depots = await depotService.getByShop(user.shopId);
        transactions = await transactionService.getByShop(user.shopId);
      }

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

      // Calculer les totaux
      const echangesTotal = filteredEchanges.reduce((sum, item) => sum + (item.montant || 0), 0);
      const creditsTotal = filteredCredits.reduce((sum, item) => sum + (item.montant || 0), 0);
      const depotsTotal = filteredDepots.reduce((sum, item) => sum + (item.montant || 0), 0);
      const transactionsTotal = filteredTransactions.reduce((sum, item) => sum + (item.montant || 0), 0);

      setStats({
        echanges: filteredEchanges.length,
        credits: filteredCredits.length,
        depots: filteredDepots.length,
        transactions: filteredTransactions.length,
        totalRevenue: echangesTotal + creditsTotal + depotsTotal + transactionsTotal
      });

      // Préparer les transactions récentes
      const allRecentData = [
        ...filteredEchanges.map(item => ({
          id: item.id,
          type: 'Échange de Monnaie',
          amount: item.montant || 0,
          date: item.date,
          status: 'Complété',
          shopName: item.shopName
        })),
        ...filteredCredits.map(item => ({
          id: item.id,
          type: `Crédit ${item.operateur || ''}`,
          amount: item.montant || 0,
          date: item.date,
          status: 'Complété',
          shopName: item.shopName
        })),
        ...filteredDepots.map(item => ({
          id: item.id,
          type: 'Dépôt de Carte',
          amount: item.montant || 0,
          date: item.date,
          status: 'Complété',
          shopName: item.shopName
        })),
        ...filteredTransactions.map(item => ({
          id: item.id,
          type: item.type || 'Transaction Électronique',
          amount: item.montant || 0,
          date: item.date,
          status: 'Complété',
          shopName: item.shopName
        }))
      ];

      // Trier par date et prendre les 10 plus récentes
      const sortedRecent = allRecentData
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      setRecentTransactions(sortedRecent);

    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateStats();
  }, [user, selectedPeriod]);

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

  const statsCards = [
    {
      title: 'Échanges',
      value: stats.echanges.toString(),
      amount: formatCurrency(stats.echanges),
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Crédits vendus',
      value: stats.credits.toString(),
      amount: formatCurrency(stats.credits),
      icon: CreditCard,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Dépôts clients',
      value: stats.depots.toString(),
      amount: formatCurrency(stats.depots),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Transactions',
      value: stats.transactions.toString(),
      amount: formatCurrency(stats.transactions),
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

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

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            Dashboard - {user.shopName}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {isGlobalAdmin(user) ? 'Vue globale de tous les shops' : `Shop: ${user.shopName}`}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="today">Aujourd'hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
            </select>
            <Calendar size={16} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Total Revenue Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium">Chiffre d'affaires total</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(stats.totalRevenue)}</p>
            <p className="text-blue-200 text-sm mt-1">
              {selectedPeriod === 'today' ? "Aujourd'hui" : 
               selectedPeriod === 'week' ? "Cette semaine" : "Ce mois"}
            </p>
          </div>
          <div className="bg-blue-500 p-3 rounded-full">
            <TrendingUp size={24} className="text-white" />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{stat.title}</p>
                  <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{stat.amount}</p>
                </div>
                <div className={`${stat.bgColor} p-2 sm:p-3 rounded-full flex-shrink-0 ml-3`}>
                  <Icon size={20} className={`${stat.color} sm:w-6 sm:h-6`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Transactions récentes</h2>
          <p className="text-sm text-gray-600 mt-1">
            {recentTransactions.length} transaction{recentTransactions.length > 1 ? 's' : ''} trouvée{recentTransactions.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="divide-y divide-gray-200">
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => (
              <div key={transaction.id} className="p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <DollarSign size={16} className="text-blue-600 sm:w-5 sm:h-5" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{transaction.type}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs sm:text-sm text-gray-600">{formatDate(transaction.date)}</p>
                      <p className="text-xs sm:text-sm text-gray-600">•</p>
                      <p className="text-xs sm:text-sm text-gray-600">{formatTime(transaction.date)}</p>
                      {isGlobalAdmin(user) && transaction.shopName && (
                        <>
                          <p className="text-xs sm:text-sm text-gray-600">•</p>
                          <p className="text-xs sm:text-sm text-blue-600 font-medium">{transaction.shopName}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(transaction.amount)}</p>
                    <p className="text-xs text-green-600">{transaction.status}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-2">
                <DollarSign size={48} className="mx-auto" />
              </div>
              <p className="text-gray-600">Aucune transaction trouvée pour cette période</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};