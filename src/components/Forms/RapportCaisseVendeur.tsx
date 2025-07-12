import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '../../firebase/config';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';

const RapportCaisseVendeur: React.FC = () => {
  const { currentUser } = useAuth();
  const [observation, setObservation] = useState('');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [period, setPeriod] = useState('today');

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      setLoading(true);
      const today = new Date();
      let startDate: string;
      let endDate: string;
      switch (period) {
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
      // Récupérer toutes les opérations du shop sur la période
      const [echangesSnapshot, creditsSnapshot, depotsSnapshot, transactionsSnapshot] = await Promise.all([
        getDocs(collection(db, 'echanges')),
        getDocs(collection(db, 'ventes_credit')),
        getDocs(collection(db, 'depots')),
        getDocs(collection(db, 'transactions'))
      ]);

      const echanges = echangesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => item.shopId === currentUser.shopId);
      const credits = creditsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => item.shopId === currentUser.shopId);
      const depots = depotsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => item.shopId === currentUser.shopId);
      const transactionsE = transactionsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => item.shopId === currentUser.shopId);

      const filterByDate = (data: any[]) => {
        return data.filter(item => {
          const itemDate = new Date(item.date);
          const start = new Date(startDate);
          const end = new Date(endDate);
          return itemDate >= start && itemDate <= end;
        });
      };
      const txs = [
        ...filterByDate(echanges).map(item => ({
          date: item.date,
          type: 'Échange de Monnaie',
          montant: item.montant || item.montantInitialFrancs || 0,
          caisse: 'Échange',
        })),
        ...filterByDate(credits).map(item => ({
          date: item.date,
          type: 'Vente de Crédit',
          montant: item.stockVendu ? Object.values(item.stockVendu).reduce((a: any, b: any) => a + b, 0) : 0,
          caisse: 'Crédit',
        })),
        ...filterByDate(depots).map(item => ({
          date: item.date,
          type: 'Dépôt de Carte',
          montant: item.montant,
          caisse: 'Carte',
        })),
        ...filterByDate(transactionsE).map(item => ({
          date: item.date,
          type: 'Transaction Électronique',
          montant: item.montantEnvoye || 0,
          caisse: 'Transactions',
        })),
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setTransactions(txs);
      setLoading(false);
    };
    fetchData();
  }, [currentUser, period]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Export Excel (CSV)
  const handleExportCSV = () => {
    const rows = [
      ['Date', 'Type', 'Montant', 'Caisse'],
      ...transactions.map(tx => [
        formatDate(tx.date),
        tx.type,
        tx.montant,
        tx.caisse
      ]),
      ['', '', '', ''],
      ['Observations', observation]
    ];
    const csvContent = rows.map(e => e.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'rapport_shop.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Rapport d'activité - ${currentUser?.shopName || ''}`, 10, 10);
    autoTable(doc, {
      head: [['Date', 'Type', 'Montant', 'Caisse']],
      body: transactions.map(tx => [
        formatDate(tx.date),
        tx.type,
        tx.montant,
        tx.caisse
      ])
    });
    doc.text('Observations :', 10, doc.lastAutoTable.finalY + 10);
    doc.text(observation || '-', 10, doc.lastAutoTable.finalY + 20);
    doc.save('rapport_shop.pdf');
  };

  // Envoi du rapport (PDF)
  const handleSendReport = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      // Générer le PDF
      const doc = new jsPDF();
      doc.text(`Rapport d'activité - ${currentUser.shopName}`, 10, 10);
      autoTable(doc, {
        head: [['Date', 'Type', 'Montant', 'Caisse']],
        body: transactions.map(tx => [
          formatDate(tx.date),
          tx.type,
          tx.montant,
          tx.caisse
        ])
      });
      doc.text('Observations :', 10, doc.lastAutoTable.finalY + 10);
      doc.text(observation || '-', 10, doc.lastAutoTable.finalY + 20);
      const pdfBlob = doc.output('blob');
      // Upload PDF dans Storage
      const storage = getStorage();
      const fileName = `rapport_${currentUser.shopId}_${currentUser.id}_${Date.now()}.pdf`;
      const storageRef = ref(storage, `rapports_caisse/${fileName}`);
      await uploadBytes(storageRef, pdfBlob);
      const pdfUrl = await getDownloadURL(storageRef);
      // Enregistrer dans Firestore
      await addDoc(collection(db, 'rapports_caisse'), {
        shopId: currentUser.shopId,
        shopName: currentUser.shopName,
        userId: currentUser.id,
        userNom: currentUser.prenom + ' ' + currentUser.nom,
        date: new Date().toISOString(),
        observation,
        pdfUrl
      });
      alert('Rapport envoyé et archivé avec succès !');
      setObservation('');
    } catch (e) {
      alert('Erreur lors de l\'envoi du rapport.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-4">
      <h2 className="text-lg font-semibold mb-2">Rapport de caisse du shop</h2>
      <div className="flex flex-wrap gap-4 items-center mb-2">
        <label className="text-xs font-medium text-gray-600">Période :</label>
        <select value={period} onChange={e => setPeriod(e.target.value)} className="px-2 py-1 border rounded">
          <option value="today">Aujourd'hui</option>
          <option value="week">Cette semaine</option>
          <option value="month">Ce mois</option>
        </select>
      </div>
      <textarea
        value={observation}
        onChange={e => setObservation(e.target.value)}
        placeholder="Observations ou commentaires du vendeur..."
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md min-h-[40px]"
      />
      <div className="flex flex-wrap gap-4 items-center">
        <button onClick={handleExportCSV} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50" type="button" disabled={loading}>
          📥 Exporter Excel
        </button>
        <button onClick={handleExportPDF} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50" type="button" disabled={loading}>
          📄 Exporter PDF
        </button>
        <button onClick={handleSendReport} className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50" type="button" disabled={loading}>
          📤 Envoyer mon rapport
        </button>
      </div>
    </div>
  );
};

export default RapportCaisseVendeur; 