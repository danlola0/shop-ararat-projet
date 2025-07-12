import React, { useEffect, useState } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, getDoc, query, where, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { Download, Printer, FileSpreadsheet, Calendar, TrendingUp } from 'lucide-react';
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

  const generateExcelReport = async (reportType: 'daily' | 'monthly' | 'custom') => {
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
    window.open(report.downloadUrl, '_blank');
  };

  return (
    <div className="p-2 sm:p-6 max-w-4xl mx-auto w-full max-w-full overflow-x-hidden">
      <h1 className="text-2xl font-bold mb-6">Synthèse Financière</h1>
      
      {/* Informations du shop et de la date */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200 w-full max-w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full max-w-full">
          <div>
            <h2 className="text-lg font-semibold text-blue-900">
              {shops.find(s => s.id === selectedShopId)?.name || 'Shop sélectionné'}
            </h2>
            <p className="text-sm text-blue-700">
              Date de la synthèse : {new Date(selectedDate).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => window.print()}
            >
              <Printer size={16} />
              Imprimer
            </button>
            <button
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              onClick={handleExport}
            >
              <Download size={16} />
              Exporter
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col xs:flex-row items-center gap-2 mb-4 w-full max-w-full">
        {(currentUser?.role === 'admin' || currentUser?.role === 'globalAdmin') && (
          <select
            value={selectedShopId}
            onChange={e => setSelectedShopId(e.target.value)}
            className="border rounded px-2 py-1"
          >
            {shops.map(shop => (
              <option key={shop.id} value={shop.id}>{shop.name}</option>
            ))}
          </select>
        )}
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <select
          value={selectedPeriod}
          onChange={e => setSelectedPeriod(e.target.value as any)}
          className="border rounded px-2 py-1"
        >
          <option value="jour">Jour</option>
          <option value="semaine">Semaine</option>
          <option value="mois">Mois</option>
          <option value="annee">Année</option>
        </select>
        <span className="text-sm text-gray-600">Période</span>
        <span className="text-sm text-gray-600">Date de la synthèse</span>
      </div>
      
      {loading ? (
        <div className="text-center py-8 text-blue-700 font-semibold">Chargement des données...</div>
      ) : (
        <>
          {/* Message si aucune donnée */}
          {noData && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  Aucune donnée disponible
                </h3>
                <p className="text-yellow-700">
                  Aucune donnée disponible pour le shop "{shops.find(s => s.id === selectedShopId)?.name}" 
                  à la date du {new Date(selectedDate).toLocaleDateString('fr-FR')}.
                </p>
              </div>
            </div>
          )}
          
          <div className="bg-white rounded-xl shadow p-4 sm:p-6 mb-8 border border-blue-100 w-full max-w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-6 w-full max-w-full">
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500">Total Général Aujourd'hui</span>
                <span className="text-xl font-bold text-blue-700">
                  {noData ? '0,00' : totalGeneralToday.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500">Total Général Antérieur</span>
                <span className="text-xl font-bold text-blue-700">
                  {noData ? '0,00' : totalGeneralAnterieur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500">Variation (Entrées - Sorties)</span>
                <span className={"text-xl font-bold " + (noData || variation >= 0 ? 'text-green-600' : 'text-red-600')}>
                  {noData ? '0,00' : (variation >= 0 ? '+' : '') + variation.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                </span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500">Total Antérieur Ajusté</span>
                {totalGeneralAnterieur !== 0 ? (
                  <span className="text-xl font-bold text-blue-700">
                    {noData ? '0,00' : totalGeneralAjuste.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                  </span>
                ) : (
                  <span className="text-sm text-yellow-700 font-semibold text-center block px-2">Non calculé</span>
                )}
              </div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500">Bénéfice Net</span>
                {totalGeneralAnterieur !== 0 ? (
                  <span className={"text-2xl font-extrabold " + (noData || beneficeNet >= 0 ? 'text-green-700' : 'text-red-600')}>
                    {noData ? '0,00' : beneficeNet.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
                  </span>
                ) : (
                  <span className="text-sm text-yellow-700 font-semibold text-center block px-2">Bénéfice net non calculé</span>
                )}
              </div>
            </div>
          </div>

          {/* Affichage de la période synthèse */}
          {selectedPeriod === 'synthese' && (
            <div className="mb-2 text-green-800 font-semibold text-sm">
              Période : Toute l'historique
            </div>
          )}
          {/* Nouveau tableau du bénéfice net uniquement */}
          {totalGeneralAnterieur !== 0 ? (
            <div className="bg-green-50 rounded-xl shadow p-4 sm:p-6 mb-8 border border-green-200 w-full max-w-full overflow-x-auto">
              <h2 className="text-lg font-bold mb-4 text-green-800">Tableau du Bénéfice Net</h2>
              <div className="w-full max-w-full overflow-x-auto">
                <table className="min-w-full divide-y divide-green-200 text-xs sm:text-sm">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">Bénéfice Net</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">Devise</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-4 py-2 font-bold text-green-900 text-xl">
                        {noData ? '0,00' : beneficeNet.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2 text-green-700 font-semibold">$</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 rounded-xl shadow p-6 mb-8 border border-yellow-200 text-yellow-800 text-center">
              <h2 className="text-lg font-bold mb-2">Bénéfice net non calculé</h2>
              <p>Le bénéfice net n'est pas affiché car le Total Général Antérieur est nul (aucune base de comparaison).</p>
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

          <div className="bg-white rounded-xl shadow p-4 sm:p-6 border border-gray-100 w-full max-w-full overflow-x-auto">
            <h2 className="text-lg font-bold mb-4">Détail des mouvements</h2>
            <div className="w-full max-w-full overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {(noData || mouvements.length === 0) && (
                    <tr>
                      <td colSpan={3} className="text-center text-gray-400 py-4">
                        {noData ? 'Aucune donnée disponible pour cette date' : 'Aucun mouvement'}
                      </td>
                    </tr>
                  )}
                  {mouvements.map((mvt, idx) => (
                    <tr key={idx}>
                      <td className={"px-4 py-2 font-semibold " + (mvt.operation === 'Entrée' ? 'text-green-700' : 'text-red-700')}>{mvt.operation}</td>
                      <td className="px-4 py-2">{mvt.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $</td>
                      <td className="px-4 py-2">{mvt.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6">
        <button
          onClick={handleExport}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
        >
          <Printer size={16} />
          Exporter PDF
        </button>
        <button
          onClick={() => window.print()}
          className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
        >
          <Download size={16} />
          Imprimer
        </button>
        
        {/* Nouveaux boutons pour les rapports Excel */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => generateExcelReport('daily')}
            disabled={generatingReport}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
          >
            <FileSpreadsheet size={16} />
            Rapport Quotidien
          </button>
          <button
            onClick={() => generateExcelReport('monthly')}
            disabled={generatingReport}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
          >
            <Calendar size={16} />
            Rapport Mensuel
          </button>
          <button
            onClick={() => generateExcelReport('custom')}
            disabled={generatingReport}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors"
          >
            <TrendingUp size={16} />
            Rapport Personnalisé
          </button>
        </div>
      </div>

      {/* Status des rapports */}
      {reportStatus && (
        <div className="mb-4 p-3 rounded-lg text-sm font-medium text-center">
          {reportStatus.includes('✅') ? (
            <div className="bg-green-50 border border-green-200 text-green-800">
              {reportStatus}
            </div>
          ) : reportStatus.includes('❌') ? (
            <div className="bg-red-50 border border-red-200 text-red-800">
              {reportStatus}
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 text-blue-800">
              {reportStatus}
            </div>
          )}
        </div>
      )}

      {/* Section des rapports disponibles */}
      {availableReports.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4 sm:p-6 mb-8 border border-gray-100">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-green-600" />
            Rapports Excel Disponibles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableReports.map((report) => (
              <div key={report.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm">{report.name}</h3>
                  <span className="text-xs text-gray-500">{report.size}</span>
                </div>
                <div className="text-xs text-gray-600 mb-3">
                  <p><strong>Shop:</strong> {report.shopName}</p>
                  <p><strong>Période:</strong> {report.period}</p>
                  <p><strong>Généré:</strong> {report.generatedAt}</p>
                </div>
                <button
                  onClick={() => downloadReport(report)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Download size={14} />
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