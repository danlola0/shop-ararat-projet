import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, getDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { Download, Printer, FileSpreadsheet, Calendar, TrendingUp, DollarSign, Calculator } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from 'axios';

interface Mouvement {
  id: string;
  operation: 'Entrée' | 'Sortie';
  montant: number;
  description: string;
  date: string;
}

interface Operation {
  total_general: number;
  espece_en_caisse: number;
  argent_electronique: any;
  vente_credit: any;
  total_general_anterieur?: number;
}

interface Shop { id: string; name: string; }

const SynthesePage: React.FC = () => {
  const { currentUser } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState<'jour' | 'semaine' | 'mois' | 'synthese' | 'annee'>('jour');
  const [totalGeneralToday, setTotalGeneralToday] = useState<number>(0);
  const [totalGeneralAnterieur, setTotalGeneralAnterieur] = useState<number>(0);
  const [variation, setVariation] = useState<number>(0);
  const [totalGeneralAjuste, setTotalGeneralAjuste] = useState<number>(0);
  const [beneficeNet, setBeneficeNet] = useState<number>(0);
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [loading, setLoading] = useState(false);
  const [noData, setNoData] = useState(false);
  const [beneficesParJour, setBeneficesParJour] = useState<any[]>([]);
  
  // États pour les rapports Excel
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<string>('');
  const [availableReports, setAvailableReports] = useState<any[]>([]);

  // Récupérer la liste des shops si admin/globalAdmin
  useEffect(() => {
    const fetchShops = async () => {
      if (currentUser?.role === 'admin' || currentUser?.role === 'globalAdmin') {
        const snap = await getDocs(collection(db, 'shops'));
        const fetchedShops = snap.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Shop));
        setShops(fetchedShops);
        // Par défaut, sélectionner le shop de l'utilisateur connecté si présent, sinon le premier shop
        if (!selectedShopId) {
          const defaultShop = fetchedShops.find(s => s.id === currentUser.shopId) || fetchedShops[0];
          if (defaultShop) setSelectedShopId(defaultShop.id);
        }
      } else {
        setSelectedShopId(currentUser?.shopId || '');
      }
    };
    fetchShops();
    // eslint-disable-next-line
  }, [currentUser]);

  useEffect(() => {
    const fetchSynthese = async () => {
      if (!selectedShopId || !selectedDate) return;
      setLoading(true);
      setNoData(false);
      try {
        // Déterminer la plage de dates selon la période sélectionnée
        const dateObj = new Date(selectedDate);
        let startDate = selectedDate;
        let endDate = selectedDate;
        let periodLabel = '';
        if (selectedPeriod === 'jour') {
          startDate = endDate = selectedDate;
          periodLabel = `du ${new Date(selectedDate).toLocaleDateString('fr-FR')}`;
        } else if (selectedPeriod === 'semaine') {
          const day = dateObj.getDay() || 7;
          const monday = new Date(dateObj);
          monday.setDate(dateObj.getDate() - day + 1);
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          startDate = monday.toISOString().split('T')[0];
          endDate = sunday.toISOString().split('T')[0];
          periodLabel = `du ${monday.toLocaleDateString('fr-FR')} au ${sunday.toLocaleDateString('fr-FR')}`;
        } else if (selectedPeriod === 'mois') {
          const first = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
          const last = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
          startDate = first.toISOString().split('T')[0];
          endDate = last.toISOString().split('T')[0];
          periodLabel = `${first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
        } else if (selectedPeriod === 'annee') {
          const first = new Date(dateObj.getFullYear(), 0, 1);
          const last = new Date(dateObj.getFullYear(), 11, 31);
          startDate = first.toISOString().split('T')[0];
          endDate = last.toISOString().split('T')[0];
          periodLabel = `${first.toLocaleDateString('fr-FR', { year: 'numeric' })}`;
        }

        // 1. Récupérer les opérations de la période
        let opQuery;
        if (selectedPeriod === 'jour') {
          opQuery = query(
            collection(db, 'operations'),
            where('shopId', '==', selectedShopId),
            where('date', '==', selectedDate),
            limit(1)
          );
        } else {
          opQuery = query(
            collection(db, 'operations'),
            where('shopId', '==', selectedShopId),
            where('date', '>=', startDate),
            where('date', '<=', endDate)
          );
        }
        const opSnap = await getDocs(opQuery);
        let totalToday = 0, totalAnterieur = 0;
        let beneficeSemaine = 0;
        let beneficesParJourLocal = [];
        let beneficeSynthese = 0;
        if (selectedPeriod === 'synthese') {
          // Récupérer toutes les opérations du shop, triées par date
          const opQuery = query(
            collection(db, 'operations'),
            where('shopId', '==', selectedShopId),
            where('periode_rapport', '==', 'soir')
          );
          const opSnap = await getDocs(opQuery);
          // Construire une map date -> total_general
          const dateToTotal = {};
          opSnap.docs.forEach(doc => {
            const data = doc.data() as Operation;
            dateToTotal[data.date] = data.total_general || 0;
          });
          // Trier les dates
          const dates = Object.keys(dateToTotal).sort();
          let previousTotal = null;
          beneficesParJourLocal = [];
          dates.forEach(dateStr => {
            const totalSoir = dateToTotal[dateStr];
            let beneficeJour = 0;
            if (previousTotal !== null) {
              beneficeJour = totalSoir - previousTotal;
            }
            beneficesParJourLocal.push({ date: new Date(dateStr).toLocaleDateString('fr-FR'), benefice: beneficeJour });
            beneficeSynthese += beneficeJour;
            previousTotal = totalSoir;
          });
          setBeneficesParJour(beneficesParJourLocal);
          setBeneficeNet(beneficeSynthese);
          setTotalGeneralToday(Object.values(dateToTotal).reduce((sum, v) => sum + (v || 0), 0));
          setTotalGeneralAnterieur(0); // Pas de sens en synthèse
          setTotalGeneralAjuste(0);
          setVariation(0);
        } else if (selectedPeriod === 'jour') {
          if (!opSnap.empty) {
            // Essayer de récupérer le rapport du soir d'abord, puis le rapport du matin
            const rapportSoir = opSnap.docs.find(doc => doc.data().periode_rapport === 'soir');
            const rapportMatin = opSnap.docs.find(doc => doc.data().periode_rapport === 'matin');
            if (rapportSoir) {
              const data = rapportSoir.data() as Operation;
              totalToday = data.total_general || 0;
            } else if (rapportMatin) {
              const data = rapportMatin.data() as Operation;
              totalToday = data.total_general || 0;
            } else {
              totalToday = 0;
            }
          }
        } else if (selectedPeriod === 'semaine') {
          // Charger tous les rapports du soir existants pour le shop (toute l'historique)
          const opQueryAll = query(
            collection(db, 'operations'),
            where('shopId', '==', selectedShopId),
            where('periode_rapport', '==', 'soir')
          );
          const opSnapAll = await getDocs(opQueryAll);
          console.log('[DEBUG] Nombre de rapports du soir trouvés pour le shop :', opSnapAll.docs.length);
          // Construire une map date -> total_general
          const dateToTotal = {};
          opSnapAll.docs.forEach(doc => {
            const data = doc.data() as Operation;
            dateToTotal[data.date] = data.total_general || 0;
          });
          console.log('[DEBUG] Dates trouvées :', Object.keys(dateToTotal));
          // Trier les dates
          const dates = Object.keys(dateToTotal).sort();
          let previousTotalAll = null;
          let beneficeTotalHistorique = 0;
          let beneficesParJourLocal = [];
          dates.forEach(dateStr => {
            const totalSoir = dateToTotal[dateStr];
            let beneficeJour = 0;
            if (previousTotalAll !== null) {
              beneficeJour = totalSoir - previousTotalAll;
            }
            beneficesParJourLocal.push({ date: new Date(dateStr).toLocaleDateString('fr-FR'), benefice: beneficeJour });
            beneficeTotalHistorique += beneficeJour;
            previousTotalAll = totalSoir;
          });
          setBeneficesParJour(beneficesParJourLocal);
          setBeneficeNet(beneficeTotalHistorique);
        } else if (selectedPeriod === 'mois') {
          // Calcul du bénéfice net jour par jour sur le mois
          const first = new Date(startDate);
          const last = new Date(endDate);
          const dayMs = 24 * 60 * 60 * 1000;
          beneficesParJourLocal = [];
          let previousTotal = null;
          let beneficeMois = 0;
          for (let d = new Date(first); d <= last; d = new Date(d.getTime() + dayMs)) {
            const currentDateStr = d.toISOString().split('T')[0];
            // Récupérer le rapport du soir du jour
            const opDayQuery = query(
              collection(db, 'operations'),
              where('shopId', '==', selectedShopId),
              where('date', '==', currentDateStr),
              where('periode_rapport', '==', 'soir'),
              limit(1)
            );
            const opDaySnap = await getDocs(opDayQuery);
            let totalSoir = null;
            if (!opDaySnap.empty) {
              const data = opDaySnap.docs[0].data() as Operation;
              totalSoir = data.total_general || 0;
              console.log(`[DEBUG] Mois - ${currentDateStr} - totalSoir trouvé:`, totalSoir);
            } else {
              console.log(`[DEBUG] Mois - ${currentDateStr} - aucun totalSoir trouvé`);
            }
            // Récupérer le rapport du soir de la veille
            let totalVeille = null;
            if (+d === +first) {
              // Pour le premier jour, chercher la veille du mois
              const veille = new Date(first.getTime() - dayMs);
              const veilleStr = veille.toISOString().split('T')[0];
              const opVeilleQuery = query(
                collection(db, 'operations'),
                where('shopId', '==', selectedShopId),
                where('date', '==', veilleStr),
                where('periode_rapport', '==', 'soir'),
                limit(1)
              );
              const opVeilleSnap = await getDocs(opVeilleQuery);
              if (!opVeilleSnap.empty) {
                const dataVeille = opVeilleSnap.docs[0].data() as Operation;
                totalVeille = dataVeille.total_general || 0;
                console.log(`[DEBUG] Mois - veille (${veilleStr}) - totalVeille trouvé:`, totalVeille);
              } else {
                totalVeille = 0;
                console.log(`[DEBUG] Mois - veille (${veilleStr}) - aucun totalVeille trouvé`);
              }
            } else {
              totalVeille = previousTotal !== null ? previousTotal : 0;
              console.log(`[DEBUG] Mois - ${currentDateStr} - totalVeille (précédent):`, totalVeille);
            }
            if (totalSoir !== null && totalVeille !== null) {
              const beneficeJour = totalSoir - totalVeille;
              beneficeMois += beneficeJour;
              beneficesParJourLocal.push({ date: d.toLocaleDateString('fr-FR'), benefice: beneficeJour });
              console.log(`[DEBUG] Mois - ${currentDateStr} - beneficeJour:`, beneficeJour);
            } else {
              beneficesParJourLocal.push({ date: d.toLocaleDateString('fr-FR'), benefice: 0 });
              console.log(`[DEBUG] Mois - ${currentDateStr} - beneficeJour: 0 (donnée manquante)`);
            }
            previousTotal = totalSoir !== null ? totalSoir : previousTotal;
          }
          setBeneficesParJour(beneficesParJourLocal);
          setBeneficeNet(beneficeMois);
        } else if (selectedPeriod === 'annee') {
          // Calcul du bénéfice net jour par jour sur l'année
          const dateObj = new Date(selectedDate);
          const first = new Date(dateObj.getFullYear(), 0, 1);
          const last = new Date(dateObj.getFullYear(), 11, 31);
          const dayMs = 24 * 60 * 60 * 1000;
          let beneficesParJourLocal = [];
          let previousTotal = null;
          let beneficeAnnee = 0;
          for (let d = new Date(first); d <= last; d = new Date(d.getTime() + dayMs)) {
            const currentDateStr = d.toISOString().split('T')[0];
            // Récupérer le rapport du soir du jour
            const opDayQuery = query(
              collection(db, 'operations'),
              where('shopId', '==', selectedShopId),
              where('date', '==', currentDateStr),
              where('periode_rapport', '==', 'soir'),
              limit(1)
            );
            const opDaySnap = await getDocs(opDayQuery);
            let totalSoir = null;
            if (!opDaySnap.empty) {
              const data = opDaySnap.docs[0].data() as Operation;
              totalSoir = data.total_general || 0;
            }
            // Récupérer le rapport du soir de la veille
            let totalVeille = null;
            if (+d === +first) {
              // Pour le premier jour, chercher la veille de l'année
              const veille = new Date(first.getTime() - dayMs);
              const veilleStr = veille.toISOString().split('T')[0];
              const opVeilleQuery = query(
                collection(db, 'operations'),
                where('shopId', '==', selectedShopId),
                where('date', '==', veilleStr),
                where('periode_rapport', '==', 'soir'),
                limit(1)
              );
              const opVeilleSnap = await getDocs(opVeilleQuery);
              if (!opVeilleSnap.empty) {
                const dataVeille = opVeilleSnap.docs[0].data() as Operation;
                totalVeille = dataVeille.total_general || 0;
              } else {
                totalVeille = 0;
              }
            } else {
              totalVeille = previousTotal !== null ? previousTotal : 0;
            }
            let beneficeJour = 0;
            if (totalSoir !== null && totalVeille !== null) {
              beneficeJour = totalSoir - totalVeille;
              beneficeAnnee += beneficeJour;
            }
            beneficesParJourLocal.push({ date: d.toLocaleDateString('fr-FR'), benefice: beneficeJour });
            previousTotal = totalSoir !== null ? totalSoir : previousTotal;
          }
          setBeneficesParJour(beneficesParJourLocal);
          setBeneficeNet(beneficeAnnee);
        } else {
          setBeneficesParJour([]);
        }

        // 2. Récupérer le total général antérieur (veille, début de période)
        if (selectedPeriod === 'jour') {
          const dateVeille = new Date(selectedDate);
          dateVeille.setDate(dateVeille.getDate() - 1);
          const dateVeilleStr = dateVeille.toISOString().split('T')[0];
          const opVeilleQuery = query(
            collection(db, 'operations'),
            where('shopId', '==', selectedShopId),
            where('date', '==', dateVeilleStr),
            where('periode_rapport', '==', 'soir'),
            limit(1)
          );
          const opVeilleSnap = await getDocs(opVeilleQuery);
          if (!opVeilleSnap.empty) {
            const dataVeille = opVeilleSnap.docs[0].data() as Operation;
            totalAnterieur = dataVeille.total_general || 0;
            console.log('[DEBUG] Total général antérieur récupéré (soir de la veille):', totalAnterieur);
          } else {
            // Si pas de rapport du soir, essayer de récupérer le rapport du matin de la veille
            console.log('[DEBUG] Aucun rapport du soir trouvé pour la veille, tentative avec le rapport du matin');
            const opVeilleMatinQuery = query(
              collection(db, 'operations'),
              where('shopId', '==', selectedShopId),
              where('date', '==', dateVeilleStr),
              where('periode_rapport', '==', 'matin'),
              limit(1)
            );
            const opVeilleMatinSnap = await getDocs(opVeilleMatinQuery);
            if (!opVeilleMatinSnap.empty) {
              const dataVeilleMatin = opVeilleMatinSnap.docs[0].data() as Operation;
              totalAnterieur = dataVeilleMatin.total_general || 0;
              console.log('[DEBUG] Total général antérieur récupéré (matin de la veille):', totalAnterieur);
            } else {
              totalAnterieur = 0;
              console.log('[DEBUG] Aucun rapport trouvé pour la veille');
            }
          }
        } else {
          // Pour les périodes, chercher la dernière opération AVANT la période
          const beforePeriodQuery = query(
            collection(db, 'operations'),
            where('shopId', '==', selectedShopId),
            where('date', '<', startDate),
            orderBy('date', 'desc'),
            limit(1)
          );
          const beforePeriodSnap = await getDocs(beforePeriodQuery);
          if (!beforePeriodSnap.empty) {
            const dataBefore = beforePeriodSnap.docs[0].data() as Operation;
            totalAnterieur = dataBefore.total_general || 0;
          } else {
            totalAnterieur = 0;
          }
        }

        setTotalGeneralToday(totalToday);
        setTotalGeneralAnterieur(totalAnterieur);

        // 3. Récupérer les mouvements de la période
        let mouvementsQuery;
        if (selectedPeriod === 'jour') {
          mouvementsQuery = query(
            collection(db, 'mouvements'),
            where('shopId', '==', selectedShopId),
            where('date', '==', selectedDate)
          );
        } else {
          mouvementsQuery = query(
            collection(db, 'mouvements'),
            where('shopId', '==', selectedShopId),
            where('date', '>=', startDate),
            where('date', '<=', endDate)
          );
        }
        const snap = await getDocs(mouvementsQuery);
        let sumEntrees = 0, sumSorties = 0;
        const allMouvements: Mouvement[] = [];
        snap.forEach(docSnap => {
          const mvt = docSnap.data() as Mouvement;
          allMouvements.push({ ...mvt, id: docSnap.id });
          if (mvt.operation === 'Entrée') {
            sumEntrees += Number(mvt.montant) || 0;
          } else if (mvt.operation === 'Sortie') {
            sumSorties += Number(mvt.montant) || 0;
          }
        });
        setMouvements(allMouvements);
        const varValue = sumEntrees - sumSorties;
        setVariation(varValue);
        // 4. Calcul du total général antérieur ajusté
        let tgaAjuste = totalAnterieur;
        if (varValue >= 0) tgaAjuste = totalAnterieur + varValue;
        else tgaAjuste = totalAnterieur - Math.abs(varValue);
        setTotalGeneralAjuste(tgaAjuste);
        // 5. Calcul du bénéfice net
        if (selectedPeriod === 'semaine') {
          setBeneficeNet(beneficeSemaine);
        } else {
          setBeneficeNet(totalToday - tgaAjuste);
        }
        setNoData(false);
      } catch (e) {
        setNoData(true);
      } finally {
        setLoading(false);
      }
    };
    fetchSynthese();
  }, [selectedShopId, selectedDate, selectedPeriod]);

  // Ajout : récupération de tout l'historique des bénéfices nets pour affichage global en mode 'semaine'
  const [beneficesHistorique, setBeneficesHistorique] = useState<any[]>([]);
  useEffect(() => {
    const fetchBeneficesHistorique = async () => {
      if ((selectedPeriod !== 'semaine' && selectedPeriod !== 'mois' && selectedPeriod !== 'annee') || !selectedShopId) {
        setBeneficesHistorique([]);
        return;
      }
      const opQueryAll = query(
        collection(db, 'operations'),
        where('shopId', '==', selectedShopId),
        where('periode_rapport', '==', 'soir')
      );
      const opSnapAll = await getDocs(opQueryAll);
      const dateToTotal = {};
      opSnapAll.docs.forEach(doc => {
        const data = doc.data() as Operation;
        dateToTotal[data.date] = data.total_general || 0;
      });
      const dates = Object.keys(dateToTotal).sort();
      let previousTotalAll = null;
      let benefices = [];
      dates.forEach(dateStr => {
        const totalSoir = dateToTotal[dateStr];
        let beneficeJour = 0;
        if (previousTotalAll !== null) {
          beneficeJour = totalSoir - previousTotalAll;
        }
        benefices.push({ date: new Date(dateStr).toLocaleDateString('fr-FR'), benefice: beneficeJour });
        previousTotalAll = totalSoir;
      });
      setBeneficesHistorique(benefices);
    };
    fetchBeneficesHistorique();
  }, [selectedPeriod, selectedShopId]);

  // Fonction d'export de la synthèse (PDF)
  const handleExport = () => {
    const shopName = shops.find(s => s.id === selectedShopId)?.name || 'Shop sélectionné';
    const dateObj = new Date(selectedDate);
    let periodLabel = '';
    if (selectedPeriod === 'jour') {
      periodLabel = `du ${dateObj.toLocaleDateString('fr-FR')}`;
    } else if (selectedPeriod === 'semaine') {
      const day = dateObj.getDay() || 7;
      const monday = new Date(dateObj);
      monday.setDate(dateObj.getDate() - day + 1);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      periodLabel = `du ${monday.toLocaleDateString('fr-FR')} au ${sunday.toLocaleDateString('fr-FR')}`;
    } else if (selectedPeriod === 'mois') {
      const first = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
      const last = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
      periodLabel = `${first.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;
    } else if (selectedPeriod === 'annee') {
      const first = new Date(dateObj.getFullYear(), 0, 1);
      const last = new Date(dateObj.getFullYear(), 11, 31);
      periodLabel = `${first.toLocaleDateString('fr-FR', { year: 'numeric' })}`;
    }

    const doc = new jsPDF();

    // En-tête coloré
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(`Synthèse Financière`, 12, 15);
    doc.setFontSize(12);
    doc.text(`${shopName} - ${periodLabel}`, 12, 23);

    // Corps du PDF
    let y = 38;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Total Général sur la période : ${totalGeneralToday.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`, 12, y);
    y += 7;
    doc.text(`Total Général Antérieur : ${totalGeneralAnterieur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`, 12, y);
    y += 7;
    doc.text(`Variation (Entrées - Sorties) : ${(variation >= 0 ? '+' : '') + variation.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`, 12, y);
    y += 7;
    doc.text(`Total Antérieur Ajusté : ${totalGeneralAjuste.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`, 12, y);
    y += 7;
    doc.text(`Bénéfice Net : ${beneficeNet.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`, 12, y);
    y += 12;

    doc.setFontSize(13);
    doc.text('Détail des mouvements', 12, y);
    y += 4;
    doc.setFontSize(10);

    const tableData = mouvements.length === 0
      ? [["Aucun mouvement", '', '']]
      : mouvements.map(mvt => [mvt.operation, mvt.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $', mvt.description]);

    autoTable(doc, {
      head: [["Type", "Montant", "Description"]],
      body: tableData,
      startY: y + 2,
      styles: { fontSize: 10 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      margin: { left: 12, right: 12 }
    });

    doc.save(`synthese_${shopName.replace(/\s+/g, '_')}_${selectedPeriod}_${selectedDate}.pdf`);
  };

  // Fonctions pour les rapports Excel
      const fetchAvailableReports = async () => {
      try {
        const res = await axios.get('https://shop-ararat-api.onrender.com/api/list-reports');
        setAvailableReports(res.data.reports.map((report: any) => ({
          id: report.filename,
          name: report.filename,
          downloadUrl: report.downloadUrl,
          generatedAt: report.createdAt || '',
          size: report.size || '',
          shopName: shops.find(s => s.id === selectedShopId)?.name || 'Shop',
          period: '',      // Optionnel
        })));
      } catch (err) {
        setAvailableReports([]);
      }
    };

  useEffect(() => {
    fetchAvailableReports();
    // eslint-disable-next-line
  }, []);

  const generateExcelReport = async (reportType: 'daily' | 'monthly' | 'yearly' | 'custom') => {
    setGeneratingReport(true);
    setReportStatus('Génération du rapport en cours...');

    try {
      // Déterminer la période
      let startDate = '';
      let endDate = '';
      let periodLabel = '';

      if (reportType === 'daily') {
        startDate = selectedDate;
        endDate = selectedDate;
        periodLabel = `quotidien_${selectedDate}`;
      } else if (reportType === 'monthly') {
        const dateObj = new Date(selectedDate);
        const first = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
        const last = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
        startDate = first.toISOString().split('T')[0];
        endDate = last.toISOString().split('T')[0];
        periodLabel = `mensuel_${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}`;
      } else if (reportType === 'yearly') {
        const dateObj = new Date(selectedDate);
        const first = new Date(dateObj.getFullYear(), 0, 1); // 1er janvier
        const last = new Date(dateObj.getFullYear(), 11, 31); // 31 décembre
        startDate = first.toISOString().split('T')[0];
        endDate = last.toISOString().split('T')[0];
        periodLabel = `annuel_${dateObj.getFullYear()}`;
      } else {
        // Custom - utiliser la période sélectionnée
        const dateObj = new Date(selectedDate);
        if (selectedPeriod === 'jour') {
          startDate = endDate = selectedDate;
          periodLabel = `jour_${selectedDate}`;
        } else if (selectedPeriod === 'semaine') {
          const day = dateObj.getDay() || 7;
          const monday = new Date(dateObj);
          monday.setDate(dateObj.getDate() - day + 1);
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          startDate = monday.toISOString().split('T')[0];
          endDate = sunday.toISOString().split('T')[0];
          periodLabel = `semaine_${startDate}_${endDate}`;
        } else if (selectedPeriod === 'mois') {
          const first = new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
          const last = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
          startDate = first.toISOString().split('T')[0];
          endDate = last.toISOString().split('T')[0];
          periodLabel = `mois_${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}`;
        }
      }

      // Appel réel à l'API Flask
      setReportStatus(`Génération du rapport ${periodLabel}...`);
      
      const response = await axios.post('https://shop-ararat-api.onrender.com/api/generate-report', {
        type: reportType,
        startDate,
        endDate,
        shopId: selectedShopId,
      });

      console.log('Réponse API:', response.data);
      
      if (response.data.success) {
        setReportStatus(`✅ Rapport ${periodLabel} généré avec succès !`);
        // Rafraîchir la liste des rapports disponibles
        fetchAvailableReports();
      } else {
        setReportStatus(`❌ Erreur: ${response.data.message || 'Erreur inconnue'}`);
      }

      setTimeout(() => setReportStatus(''), 5000);
    } catch (error) {
      console.error('Erreur génération rapport:', error);
      setReportStatus('❌ Erreur lors de la génération du rapport');
    } finally {
      setGeneratingReport(false);
    }
  };

  const downloadReport = (report: any) => {
    // Créer un élément <a> temporaire pour forcer le téléchargement
    const link = document.createElement('a');
    link.href = report.downloadUrl;
    link.download = report.name; // Nom du fichier à télécharger
    link.target = '_blank';
    
    // Ajouter l'élément au DOM, cliquer dessus, puis le supprimer
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
      {/* En-tête moderne avec gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 sm:p-6 mb-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <TrendingUp size={28} className="text-yellow-300 sm:w-8 sm:h-8" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Synthèse Financière</h1>
            <p className="text-blue-100 text-sm sm:text-base">Vue d'ensemble de vos performances</p>
          </div>
        </div>
      </div>
      
      {/* Informations du shop et de la date - Design moderne */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <TrendingUp size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {shops.find(s => s.id === selectedShopId)?.name || 'Shop sélectionné'}
              </h2>
              <p className="text-sm text-gray-600">
                Date : {new Date(selectedDate).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Section des filtres - Design moderne */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <Calendar size={24} className="text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Filtres de synthèse</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(currentUser?.role === 'admin' || currentUser?.role === 'globalAdmin') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sélectionner un shop</label>
              <select
                value={selectedShopId}
                onChange={e => setSelectedShopId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {shops.map(shop => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date de la synthèse</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
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
          {/* Message si aucune donnée - Design moderne */}
          {noData && (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-8 mb-6">
              <div className="text-center">
                <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp size={32} className="text-yellow-600" />
                </div>
                <h3 className="text-xl font-bold text-yellow-800 mb-3">
                  Aucune donnée disponible
                </h3>
                <p className="text-yellow-700 max-w-md mx-auto">
                  Aucune donnée disponible pour le shop <strong>"{shops.find(s => s.id === selectedShopId)?.name}"</strong> 
                  à la date du <strong>{new Date(selectedDate).toLocaleDateString('fr-FR')}</strong>.
                </p>
              </div>
            </div>
          )}
          
          {/* Cartes de statistiques modernes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {/* Carte Total Général Aujourd'hui */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-l-4 border-blue-500 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Général Aujourd'hui</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {noData ? '0,00' : totalGeneralToday.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <TrendingUp size={24} className="text-blue-600" />
                </div>
              </div>
            </div>

            {/* Carte Total Général Antérieur */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-l-4 border-purple-500 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Général Antérieur</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">
                    {noData ? '0,00' : totalGeneralAnterieur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <Calendar size={24} className="text-purple-600" />
                </div>
              </div>
            </div>

            {/* Carte Variation */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-l-4 border-green-500 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Variation</p>
                  <p className={"text-xl sm:text-2xl font-bold " + (noData || variation >= 0 ? 'text-green-600' : 'text-red-600')}>
                    {noData ? '0,00' : (variation >= 0 ? '+' : '') + variation.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <TrendingUp size={24} className="text-green-600" />
                </div>
              </div>
            </div>

            {/* Carte Total Antérieur Ajusté */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-l-4 border-orange-500 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Antérieur Ajusté</p>
                  {totalGeneralAnterieur !== 0 ? (
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {noData ? '0,00' : totalGeneralAjuste.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                    </p>
                  ) : (
                    <p className="text-sm text-yellow-600 font-semibold">Non calculé</p>
                  )}
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <Calculator size={24} className="text-orange-600" />
                </div>
              </div>
            </div>

            {/* Carte Bénéfice Net */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border-l-4 border-emerald-500 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Bénéfice Net</p>
                  {totalGeneralAnterieur !== 0 ? (
                    <p className={"text-xl sm:text-2xl font-bold " + (noData || beneficeNet >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                      {noData ? '0,00' : beneficeNet.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                    </p>
                  ) : (
                    <p className="text-sm text-yellow-600 font-semibold">Non calculé</p>
                  )}
                </div>
                <div className="bg-emerald-100 p-3 rounded-full">
                  <DollarSign size={24} className="text-emerald-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Affichage de la période synthèse */}
          {selectedPeriod === 'synthese' && (
            <div className="mb-2 text-green-800 font-semibold text-sm">
              Période : Toute l'historique
            </div>
          )}
          {/* Nouveau tableau du bénéfice net uniquement - Design moderne */}
          {totalGeneralAnterieur !== 0 ? (
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-lg p-4 sm:p-6 mb-8 border border-green-200">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign size={24} className="text-green-600" />
                <h2 className="text-xl font-bold text-green-800">Tableau du Bénéfice Net</h2>
              </div>
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-green-200">
                  <thead className="bg-green-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-green-700 uppercase tracking-wider">Bénéfice Net</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-green-700 uppercase tracking-wider">Devise</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-green-100">
                    <tr className="hover:bg-green-50 transition-colors">
                      <td className="px-4 py-4 font-bold text-green-900 text-xl">
                        {noData ? '0,00' : beneficeNet.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 text-green-700 font-semibold">$</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl shadow-lg p-6 mb-8 border border-yellow-200">
              <div className="text-center">
                <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calculator size={32} className="text-yellow-600" />
                </div>
                <h2 className="text-xl font-bold text-yellow-800 mb-2">Bénéfice net non calculé</h2>
                <p className="text-yellow-700">Le bénéfice net n'est pas affiché car le Total Général Antérieur est nul (aucune base de comparaison).</p>
              </div>
            </div>
          )}
          
          {/* Tableau détaillé des bénéfices par jour pour semaine */}
          {selectedPeriod === 'semaine' && (
            <div className="bg-green-50 rounded-xl shadow p-6 mb-8 border border-green-100">
              <h3 className="text-base font-bold mb-3 text-green-800">Détail des bénéfices par jour (semaine)</h3>
              <table className="min-w-full divide-y divide-green-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">Bénéfice Net</th>
                  </tr>
                </thead>
                <tbody>
                  {beneficesParJour.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-green-900 font-semibold">{item.date}</td>
                      <td className={"px-4 py-2 font-bold " + (item.benefice >= 0 ? 'text-green-700' : 'text-red-600')}>
                        {item.benefice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tableau de tous les bénéfices nets de l'historique, affiché en mode semaine, mois ou année */}
          {(selectedPeriod === 'semaine' || selectedPeriod === 'mois' || selectedPeriod === 'annee') && beneficesHistorique.length > 0 && (
            <div className="bg-blue-50 rounded-xl shadow p-6 mb-8 border border-blue-200">
              <h3 className="text-base font-bold mb-3 text-blue-800">Bénéfices nets de tout l'historique</h3>
              <table className="min-w-full divide-y divide-blue-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-blue-700 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-blue-700 uppercase">Bénéfice Net</th>
                  </tr>
                </thead>
                <tbody>
                  {beneficesHistorique.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-blue-900 font-semibold">{item.date}</td>
                      <td className={"px-4 py-2 font-bold " + (item.benefice >= 0 ? 'text-green-700' : 'text-red-600')}>
                        {item.benefice.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tableau des mouvements - Design moderne */}
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp size={24} className="text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Détail des mouvements</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Montant</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Description</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {(noData || mouvements.length === 0) && (
                    <tr>
                      <td colSpan={3} className="text-center text-gray-400 py-8">
                        <div className="flex flex-col items-center gap-2">
                          <TrendingUp size={32} className="text-gray-300" />
                          <span className="text-sm">
                            {noData ? 'Aucune donnée disponible pour cette date' : 'Aucun mouvement'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {mouvements.map((mvt, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          mvt.operation === 'Entrée' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {mvt.operation}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {mvt.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                      </td>
                      <td className="px-4 py-3 text-gray-700">{mvt.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Section des boutons de rapports - Design moderne - TOUJOURS VISIBLE */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <FileSpreadsheet size={24} className="text-green-600" />
          <h2 className="text-xl font-bold text-gray-900">Génération de Rapports Excel</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Bouton Rapport Quotidien */}
          <button
            onClick={() => generateExcelReport('daily')}
            disabled={generatingReport}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={24} />
              <div className="text-left">
                <h3 className="font-semibold">Rapport Quotidien</h3>
                <p className="text-sm opacity-90">Données du jour</p>
              </div>
            </div>
          </button>

          {/* Bouton Rapport Mensuel */}
          <button
            onClick={() => generateExcelReport('monthly')}
            disabled={generatingReport}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none"
          >
            <div className="flex items-center gap-3">
              <Calendar size={24} />
              <div className="text-left">
                <h3 className="font-semibold">Rapport Mensuel</h3>
                <p className="text-sm opacity-90">Synthèse mensuelle</p>
              </div>
            </div>
          </button>

          {/* Bouton Rapport Annuel */}
          <button
            onClick={() => generateExcelReport('yearly')}
            disabled={generatingReport}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none"
          >
            <div className="flex items-center gap-3">
              <Calendar size={24} />
              <div className="text-left">
                <h3 className="font-semibold">Rapport Annuel</h3>
                <p className="text-sm opacity-90">Synthèse annuelle</p>
              </div>
            </div>
          </button>

          {/* Bouton Rapport Personnalisé */}
          <button
            onClick={() => generateExcelReport('custom')}
            disabled={generatingReport}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none"
          >
            <div className="flex items-center gap-3">
              <TrendingUp size={24} />
              <div className="text-left">
                <h3 className="font-semibold">Rapport Personnalisé</h3>
                <p className="text-sm opacity-90">Période choisie</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Status des rapports - Design moderne */}
      {reportStatus && (
        <div className="mb-6">
          {reportStatus.includes('✅') ? (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="bg-green-100 p-2 rounded-full">
                  <FileSpreadsheet size={20} className="text-green-600" />
                </div>
                <span className="text-green-800 font-medium">{reportStatus}</span>
              </div>
            </div>
          ) : reportStatus.includes('❌') ? (
            <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="bg-red-100 p-2 rounded-full">
                  <FileSpreadsheet size={20} className="text-red-600" />
                </div>
                <span className="text-red-800 font-medium">{reportStatus}</span>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full">
                  <FileSpreadsheet size={20} className="text-blue-600" />
                </div>
                <span className="text-blue-800 font-medium">{reportStatus}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section des rapports disponibles - Design moderne */}
      {availableReports.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-8 border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <FileSpreadsheet size={24} className="text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">Rapports Excel Disponibles</h2>
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {availableReports.length} rapport{availableReports.length > 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableReports.map((report) => (
              <div key={report.id} className="border border-gray-200 rounded-xl p-4 hover:border-green-300 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-white to-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight">{report.name}</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{report.size}</span>
                </div>
                <div className="text-xs text-gray-600 mb-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                    <span><strong>Shop:</strong> {report.shopName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span><strong>Généré:</strong> {new Date(report.generatedAt).toLocaleString('fr-FR')}</span>
                  </div>
                </div>
                <button
                  onClick={() => downloadReport(report)}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-105"
                >
                  <Download size={16} />
                  Télécharger
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SynthesePage; 