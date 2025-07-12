import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../../hooks/useAuth';
import { Save, ChevronDown, ChevronUp, CreditCard, DollarSign, Layers, AlertCircle, XCircle, CheckCircle } from 'lucide-react';

const electronicServices = [
  { key: 'mpesa', label: 'Mpesa' },
  { key: 'orange_money', label: 'Orange Money' },
  { key: 'afrimoney', label: 'Afrimoney' },
  { key: 'airtel_money', label: 'Airtel Money' }
];
const creditNetworks = [
  { key: 'vodacom', label: 'Vodacom' },
  { key: 'orange', label: 'Orange' },
  { key: 'africell', label: 'Africell' },
  { key: 'airtel', label: 'Airtel' }
];

const todayStr = () => new Date().toISOString().split('T')[0];
const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

const OperationForm: React.FC = () => {
  const { currentUser } = useAuth();
  const [especeCaisse, setEspeceCaisse] = useState('');
  const [electronic, setElectronic] = useState(
    Object.fromEntries(electronicServices.map(s => [s.key, { stockInitial: '', stockFinal: '', reappro: '' }]))
  );
  const [credit, setCredit] = useState(
    Object.fromEntries(creditNetworks.map(n => [n.key, { stockInitial: '', stockFinal: '', reappro: '' }]))
  );
  const [expandedElectronic, setExpandedElectronic] = useState<string | null>(null);
  const [expandedCredit, setExpandedCredit] = useState<string | null>(null);
  const [totalGeneral, setTotalGeneral] = useState(0);
  const [totalGeneralAnterieur, setTotalGeneralAnterieur] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [alert, setAlert] = useState<string | null>(null);
  const [reapproSuccess, setReapproSuccess] = useState<string | null>(null);
  const [initialLocked, setInitialLocked] = useState(false);
  const [finalLocked, setFinalLocked] = useState(false);
  const [autoFilledStocks, setAutoFilledStocks] = useState<{[key: string]: boolean}>({});
  // Remplacer l'usage global de isClotured par un verrouillage spécifique à la période
  const [isCloturedMatin, setIsCloturedMatin] = useState(false);
  const [isCloturedSoir, setIsCloturedSoir] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Nouveaux états pour la validation des stocks
  const [stockErrors, setStockErrors] = useState<{[key: string]: string}>({});

  // --- Taux journalier ---
  const [tauxJournalier, setTauxJournalier] = useState<number | null>(null);
  const [tauxJournalierLoading, setTauxJournalierLoading] = useState(true);
  const [tauxJournalierError, setTauxJournalierError] = useState('');
  const [especeCaisseCDF, setEspeceCaisseCDF] = useState(''); // Nouveau champ pour la saisie en CDF

  // Ajout d'un état pour stock final CDF par service électronique
  const [electronicCDF, setElectronicCDF] = useState(
    Object.fromEntries(electronicServices.map(s => [s.key, '']))
  );

  // Ajout d'un état pour stock initial CDF par service électronique
  const [electronicInitialCDF, setElectronicInitialCDF] = useState(
    Object.fromEntries(electronicServices.map(s => [s.key, '']))
  );

  // Ajout de l'état pour le type de rapport (matin/soir)
  const [periodeRapport, setPeriodeRapport] = useState<'' | 'matin' | 'soir'>('');
  const [doublonRapport, setDoublonRapport] = useState('');

  const isClotured = periodeRapport === 'matin' ? isCloturedMatin : periodeRapport === 'soir' ? isCloturedSoir : false;

  // 1. Ajouter l'état pour le verrouillage
  const [especeCaisseLocked, setEspeceCaisseLocked] = useState(false);
  const [especeCaisseCDFLocked, setEspeceCaisseCDFLocked] = useState(false);

  // Récupérer le taux du jour à l'ouverture du formulaire
  useEffect(() => {
    const fetchTaux = async () => {
      setTauxJournalierLoading(true);
      setTauxJournalierError('');
      try {
        // Utiliser la date sélectionnée dans le formulaire au lieu de toujours aujourd'hui
        const dateStr = date; // Utilise la date sélectionnée
        const tauxQuery = query(collection(db, 'TauxJournalier'), where('date', '==', dateStr));
        const snap = await getDocs(tauxQuery);
        if (!snap.empty) {
          const doc = snap.docs[0];
          setTauxJournalier(doc.data().taux_du_jour);
        } else {
          setTauxJournalier(null);
        }
      } catch (e) {
        setTauxJournalierError('Erreur lors de la récupération du taux du jour.');
      } finally {
        setTauxJournalierLoading(false);
      }
    };
    fetchTaux();
  }, [date]); // Ajouter 'date' comme dépendance pour recharger quand la date change

  // Vérifie si tous les stocks finaux sont saisis
  const allFinalsEntered = () => {
    let ok = true;
    electronicServices.forEach(s => {
      if (!electronic[s.key].stockFinal) ok = false;
    });
    creditNetworks.forEach(n => {
      if (!credit[n.key].stockFinal) ok = false;
    });
    return ok;
  };

  // Initialisation automatique à la première ouverture du jour
  useEffect(() => {
    const initDay = async () => {
      if (!currentUser?.shopId) return;
      // Réinitialiser les stocks récupérés automatiquement
      setAutoFilledStocks({});
      // Lors du chargement ou changement de date/période, vérifier l'existence d'un rapport pour chaque période
      const checkCloture = async () => {
        setIsCloturedMatin(false);
        setIsCloturedSoir(false);
        if (!currentUser?.shopId || !date) return;
        // Vérifier matin
        const opMatin = query(
          collection(db, 'operations'),
          where('shopId', '==', currentUser.shopId),
          where('date', '==', date),
          where('periode_rapport', '==', 'matin')
        );
        const snapMatin = await getDocs(opMatin);
        if (!snapMatin.empty) setIsCloturedMatin(true);
        // Vérifier soir
        const opSoir = query(
          collection(db, 'operations'),
          where('shopId', '==', currentUser.shopId),
          where('date', '==', date),
          where('periode_rapport', '==', 'soir')
        );
        const snapSoir = await getDocs(opSoir);
        if (!snapSoir.empty) setIsCloturedSoir(true);
      };
      checkCloture();
      
      // CORRECTION : Charger les données selon la période sélectionnée
      const opQuery = query(
        collection(db, 'operations'),
        where('shopId', '==', currentUser.shopId),
        where('date', '==', date),
        where('periode_rapport', '==', periodeRapport)
      );
      const opSnap = await getDocs(opQuery);
      
      if (!opSnap.empty) {
        // Opération existante pour la période sélectionnée
        const data = opSnap.docs[0].data();
        
        // Pré-remplir les champs selon la période
        if (periodeRapport === 'matin') {
          // Pour le matin : chercher les données du soir de la veille pour pré-remplir espece en caisse
          const d = new Date(date);
          d.setDate(d.getDate() - 1);
          const dateVeille = d.toISOString().split('T')[0];
          const soirQuery = query(
            collection(db, 'operations'),
            where('shopId', '==', currentUser.shopId),
            where('date', '==', dateVeille),
            where('periode_rapport', '==', 'soir')
          );
          const soirSnap = await getDocs(soirQuery);
          if (!soirSnap.empty) {
            const soirData = soirSnap.docs[0].data();
            console.log('RAPPORT SOIR TROUVÉ', soirData);
            setEspeceCaisse(soirData.espece_en_caisse?.toString() || '');
            setEspeceCaisseCDF(soirData.espece_en_caisse_cdf?.toString() || '');
            setEspeceCaisseLocked(true);
            setEspeceCaisseCDFLocked(true);
            setAutoFilledStocks(prev => ({
              ...prev,
              especeCaisse: soirData.espece_en_caisse !== undefined && soirData.espece_en_caisse !== null,
              especeCaisseCDF: soirData.espece_en_caisse_cdf !== undefined && soirData.espece_en_caisse_cdf !== null
            }));
          } else {
            console.log('AUCUN RAPPORT SOIR TROUVÉ pour', dateVeille, currentUser.shopId);
            setEspeceCaisse('');
            setEspeceCaisseCDF('');
            setAutoFilledStocks(prev => ({
              ...prev,
              especeCaisse: false,
              especeCaisseCDF: false
            }));
          }
          setElectronic(prev => {
            const copy = { ...prev };
            electronicServices.forEach(s => {
              copy[s.key] = {
                stockInitial: data.argent_electronique?.[s.key]?.stock_initial?.toString() || '',
                stockFinal: data.argent_electronique?.[s.key]?.stock_final?.toString() || '',
                reappro: data.argent_electronique?.[s.key]?.approvisionnement?.toString() || ''
              };
            });
            return copy;
          });
          setCredit(prev => {
            const copy = { ...prev };
            creditNetworks.forEach(n => {
              copy[n.key] = {
                stockInitial: data.vente_credit?.[n.key]?.stock_initial?.toString() || '',
                stockFinal: data.vente_credit?.[n.key]?.stock_final?.toString() || '',
                reappro: data.vente_credit?.[n.key]?.approvisionnement?.toString() || ''
              };
            });
            return copy;
          });
          // Verrouiller les champs du matin car déjà saisis
          setInitialLocked(true);
          setFinalLocked(true);
        } else if (periodeRapport === 'soir') {
          // Toujours formulaire vierge et éditable pour le soir, aucune récupération ni verrouillage
          setEspeceCaisse('');
          setEspeceCaisseCDF('');
          setElectronic(prev => {
            const copy = { ...prev };
            electronicServices.forEach(s => {
              copy[s.key] = { stockInitial: '', stockFinal: '', reappro: '' };
            });
            return copy;
          });
          setCredit(prev => {
            const copy = { ...prev };
            creditNetworks.forEach(n => {
              copy[n.key] = { stockInitial: '', stockFinal: '', reappro: '' };
            });
            return copy;
          });
          setTotalGeneralAnterieur(0);
          setInitialLocked(false);
          setFinalLocked(false);
          setEspeceCaisseLocked(false);
          setEspeceCaisseCDFLocked(false);
          setAutoFilledStocks({}); // Ajouté : jamais de verrouillage auto pour le soir
          setAlert(null);
        }
        
        // Valider les stocks existants
        electronicServices.forEach(s => {
          validateStockFinal('electronic', s.key, data.argent_electronique?.[s.key]?.stock_final?.toString() || '');
        });
        creditNetworks.forEach(n => {
          validateStockFinal('credit', n.key, data.vente_credit?.[n.key]?.stock_final?.toString() || '');
        });
      } else {
        // Aucune opération existante pour la période sélectionnée
        if (periodeRapport === 'matin') {
          // Pour le matin : chercher les données de la veille pour pré-remplir les stocks initiaux
          const d = new Date(date);
          d.setDate(d.getDate() - 1);
          const dateVeille = d.toISOString().split('T')[0];
          const yestQuery = query(
            collection(db, 'operations'),
            where('shopId', '==', currentUser.shopId),
            where('date', '==', dateVeille),
            where('periode_rapport', '==', 'soir')
          );
          const yestSnap = await getDocs(yestQuery);
          if (!yestSnap.empty) {
            const yestData = yestSnap.docs[0].data();
            console.log('[DEBUG] RAPPORT DU SOIR DE LA VEILLE TROUVÉ:', yestData);
            console.log('[DEBUG] Période du rapport récupéré:', yestData.periode_rapport);
            console.log('[DEBUG] Structure argent_electronique:', yestData.argent_electronique);
            console.log('[DEBUG] Structure vente_credit:', yestData.vente_credit);
            console.log('[DEBUG] === STRUCTURE COMPLÈTE DES DONNÉES ===');
            console.log('[DEBUG] yestData complet:', JSON.stringify(yestData, null, 2));
            console.log('[DEBUG] === VÉRIFICATION ALTERNATIVE DES STRUCTURES ===');
            console.log('[DEBUG] yestData.argent_electronique type:', typeof yestData.argent_electronique);
            console.log('[DEBUG] yestData.vente_credit type:', typeof yestData.vente_credit);
            console.log('[DEBUG] yestData.argent_electronique est un objet?', yestData.argent_electronique && typeof yestData.argent_electronique === 'object');
            console.log('[DEBUG] yestData.vente_credit est un objet?', yestData.vente_credit && typeof yestData.vente_credit === 'object');
            console.log('[DEBUG] === VÉRIFICATION DES VALEURS STOCK_FINAL ===');
            console.log('[DEBUG] argent_electronique keys:', Object.keys(yestData.argent_electronique || {}));
            console.log('[DEBUG] vente_credit keys:', Object.keys(yestData.vente_credit || {}));
            console.log('[DEBUG] electronicServices keys attendues:', electronicServices.map(s => s.key));
            console.log('[DEBUG] creditNetworks keys attendues:', creditNetworks.map(n => n.key));
            
            // AJOUT : Log détaillé de la structure
            console.log('[DEBUG] === DÉTAIL ARGENT ÉLECTRONIQUE ===');
            Object.keys(yestData.argent_electronique || {}).forEach(key => {
              console.log(`[DEBUG] ${key}:`, JSON.stringify(yestData.argent_electronique[key], null, 2));
            });
            
            console.log('[DEBUG] === DÉTAIL VENTE CRÉDIT ===');
            Object.keys(yestData.vente_credit || {}).forEach(key => {
              console.log(`[DEBUG] ${key}:`, JSON.stringify(yestData.vente_credit[key], null, 2));
            });
            
            const newAutoFilledStocks: {[key: string]: boolean} = {};
            
            // Vérifier si tous les stocks finaux de la veille existent
            let allFinalsExist = true;
            console.log('[DEBUG] VÉRIFICATION DES STOCKS FINAUX ÉLECTRONIQUES:');
            electronicServices.forEach(s => {
              const stockFinal = yestData.argent_electronique?.[s.key]?.stock_final;
              console.log(`[DEBUG] ${s.key}: stock_final =`, stockFinal, 'type:', typeof stockFinal);
              console.log(`[DEBUG] ${s.key}: chemin complet = yestData.argent_electronique.${s.key}.stock_final`);
              console.log(`[DEBUG] ${s.key}: yestData.argent_electronique[${s.key}] =`, yestData.argent_electronique?.[s.key]);
              if (stockFinal === undefined || stockFinal === null) {
                console.log(`[DEBUG] ❌ ${s.key}: stock_final manquant ou null`);
                allFinalsExist = false;
              } else {
                console.log(`[DEBUG] ✅ ${s.key}: stock_final présent =`, stockFinal);
              }
            });
            
            console.log('[DEBUG] VÉRIFICATION DES STOCKS FINAUX CRÉDIT:');
            creditNetworks.forEach(n => {
              const stockFinal = yestData.vente_credit?.[n.key]?.stock_final;
              console.log(`[DEBUG] ${n.key}: stock_final =`, stockFinal, 'type:', typeof stockFinal);
              if (stockFinal === undefined || stockFinal === null) {
                console.log(`[DEBUG] ❌ ${n.key}: stock_final manquant ou null`);
                allFinalsExist = false;
              } else {
                console.log(`[DEBUG] ✅ ${n.key}: stock_final présent =`, stockFinal);
              }
            });
            
            console.log('[DEBUG] RÉSULTAT FINAL allFinalsExist:', allFinalsExist);
            
            if (allFinalsExist) {
              // Tous les stocks finaux existent - on peut récupérer les valeurs
              console.log('[DEBUG] ✅ RÉCUPÉRATION DES STOCKS FINAUX D\'HIER COMME STOCKS INITIAUX D\'AUJOURD\'HUI');
              setElectronic(prev => {
                const copy = { ...prev };
                electronicServices.forEach(s => {
                  const stockFinalVeille = yestData.argent_electronique?.[s.key]?.stock_final;
                  const stockInitialVeille = yestData.argent_electronique?.[s.key]?.stock_initial;
                  console.log(`[DEBUG] ${s.key}: stock_final d'hier =`, stockFinalVeille, 'stock_initial d\'hier =', stockInitialVeille);
                  
                  // Pour le rapport du soir, on utilise toujours les stocks finaux
                  let stockAUtiliser = stockFinalVeille;
                  console.log(`[DEBUG] ${s.key}: utilisation du stock_final du soir d'hier =`, stockFinalVeille);
                  
                  copy[s.key].stockInitial = stockAUtiliser?.toString() || '';
                  copy[s.key].stockFinal = ''; // Garder le stock final vide pour nouvelle saisie
                  copy[s.key].reappro = ''; // ✅ Réapprovisionnement remis à zéro pour nouvelle journée
                  if (stockAUtiliser !== undefined && stockAUtiliser !== null && stockAUtiliser !== '' && stockAUtiliser !== 0) {
                    newAutoFilledStocks[`electronic_${s.key}`] = true;
                    console.log(`[DEBUG] ✅ ${s.key}: stock initial défini à`, stockAUtiliser);
                  }
                });
                return copy;
              });
              setCredit(prev => {
                const copy = { ...prev };
                creditNetworks.forEach(n => {
                  const stockFinalVeille = yestData.vente_credit?.[n.key]?.stock_final;
                  const stockInitialVeille = yestData.vente_credit?.[n.key]?.stock_initial;
                  console.log(`[DEBUG] ${n.key}: stock_final d'hier =`, stockFinalVeille, 'stock_initial d\'hier =', stockInitialVeille);
                  
                  // Pour le rapport du soir, on utilise toujours les stocks finaux
                  let stockAUtiliser = stockFinalVeille;
                  console.log(`[DEBUG] ${n.key}: utilisation du stock_final du soir d'hier =`, stockFinalVeille);
                  
                  copy[n.key].stockInitial = stockAUtiliser?.toString() || '';
                  copy[n.key].stockFinal = ''; // Garder le stock final vide pour nouvelle saisie
                  copy[n.key].reappro = ''; // ✅ Réapprovisionnement remis à zéro pour nouvelle journée
                  if (stockAUtiliser !== undefined && stockAUtiliser !== null && stockAUtiliser !== '' && stockAUtiliser !== 0) {
                    newAutoFilledStocks[`credit_${n.key}`] = true;
                    console.log(`[DEBUG] ✅ ${n.key}: stock initial défini à`, stockAUtiliser);
                  }
                });
                return copy;
              });
              setTotalGeneralAnterieur(yestData.total_general || 0);
              console.log('[DEBUG] ✅ Total général antérieur défini à:', yestData.total_general || 0);
              setAutoFilledStocks(newAutoFilledStocks);
              // AJOUT : reporter l'espèce en caisse du soir précédent
              setEspeceCaisse(
                yestData.espece_en_caisse !== undefined && yestData.espece_en_caisse !== null
                  ? yestData.espece_en_caisse + ''
                  : ''
              );
              setEspeceCaisseCDF(
                yestData.espece_en_caisse_cdf !== undefined && yestData.espece_en_caisse_cdf !== null
                  ? yestData.espece_en_caisse_cdf + ''
                  : ''
              );
            } else {
              // Certains stocks finaux manquent - mais on va quand même essayer de récupérer ceux qui existent
              console.log('[DEBUG] ⚠️ Certains stocks finaux manquent, mais on récupère ceux qui existent');
              setElectronic(prev => {
                const copy = { ...prev };
                electronicServices.forEach(s => {
                  const stockFinalVeille = yestData.argent_electronique?.[s.key]?.stock_final;
                  const stockInitialVeille = yestData.argent_electronique?.[s.key]?.stock_initial;
                  console.log(`[DEBUG] ${s.key}: tentative de récupération, stock_final =`, stockFinalVeille, 'stock_initial =', stockInitialVeille);
                  
                  // Pour le rapport du soir, on utilise toujours les stocks finaux
                  let stockAUtiliser = stockFinalVeille;
                  console.log(`[DEBUG] ${s.key}: utilisation du stock_final du soir d'hier =`, stockFinalVeille);
                  
                  if (stockAUtiliser !== undefined && stockAUtiliser !== null && stockAUtiliser !== '' && stockAUtiliser !== 0) {
                    copy[s.key].stockInitial = stockAUtiliser.toString();
                    newAutoFilledStocks[`electronic_${s.key}`] = true;
                    console.log(`[DEBUG] ✅ ${s.key}: stock initial défini à`, stockAUtiliser);
                  } else {
                  copy[s.key].stockInitial = '';
                  copy[s.key].stockFinal = '';
                    copy[s.key].reappro = '';
                    console.log(`[DEBUG] ❌ ${s.key}: aucun stock valide trouvé, initial mis à vide`);
                  }
                });
                return copy;
              });
              setCredit(prev => {
                const copy = { ...prev };
                creditNetworks.forEach(n => {
                  const stockFinalVeille = yestData.vente_credit?.[n.key]?.stock_final;
                  const stockInitialVeille = yestData.vente_credit?.[n.key]?.stock_initial;
                  console.log(`[DEBUG] ${n.key}: tentative de récupération, stock_final =`, stockFinalVeille, 'stock_initial =', stockInitialVeille);
                  
                  // Pour le rapport du soir, on utilise toujours les stocks finaux
                  let stockAUtiliser = stockFinalVeille;
                  console.log(`[DEBUG] ${n.key}: utilisation du stock_final du soir d'hier =`, stockFinalVeille);
                  
                  if (stockAUtiliser !== undefined && stockAUtiliser !== null && stockAUtiliser !== '' && stockAUtiliser !== 0) {
                    copy[n.key].stockInitial = stockAUtiliser.toString();
                    newAutoFilledStocks[`credit_${n.key}`] = true;
                    console.log(`[DEBUG] ✅ ${n.key}: stock initial défini à`, stockAUtiliser);
                  } else {
                  copy[n.key].stockInitial = '';
                  copy[n.key].stockFinal = '';
                    copy[n.key].reappro = '';
                    console.log(`[DEBUG] ❌ ${n.key}: aucun stock valide trouvé, initial mis à vide`);
                  }
                });
                return copy;
              });
              setTotalGeneralAnterieur(yestData.total_general || 0);
              console.log('[DEBUG] ✅ Total général antérieur défini à:', yestData.total_general || 0);
              setAutoFilledStocks(newAutoFilledStocks);
              // Afficher un avertissement
              const today = new Date();
              const selectedDate = new Date(date);
              const diffTime = Math.abs(today.getTime() - selectedDate.getTime());
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays > 1) {
                setAlert("Attention : Certains stocks finaux de la veille sont manquants. Les stocks initiaux d'aujourd'hui restent vides et modifiables. Veuillez corriger les données de la veille avant de continuer.");
              }
              // Réinitialiser l'espèce en caisse pour la nouvelle journée UNIQUEMENT si pas de rapport du soir
              setEspeceCaisse('');
              setEspeceCaisseCDF('');
            }
          } else {
            // Aucun rapport du soir pour la veille - total général antérieur reste à 0
            console.log('[DEBUG] ❌ AUCUN RAPPORT DU SOIR TROUVÉ pour la veille:', dateVeille);
            // Réinitialiser tous les stocks initiaux à vide car pas de continuité
            setElectronic(prev => {
              const copy = { ...prev };
              electronicServices.forEach(s => {
                copy[s.key].stockInitial = '';
                copy[s.key].stockFinal = '';
                copy[s.key].reappro = ''; // ✅ Réapprovisionnement remis à zéro
              });
              return copy;
            });
            setCredit(prev => {
              const copy = { ...prev };
              creditNetworks.forEach(n => {
                copy[n.key].stockInitial = '';
                copy[n.key].stockFinal = '';
                copy[n.key].reappro = ''; // ✅ Réapprovisionnement remis à zéro
              });
              return copy;
            });
            setTotalGeneralAnterieur(0);
            setAutoFilledStocks({});
            // Afficher un avertissement si c'est un jour ouvré (pas le premier jour)
            const today = new Date();
            const selectedDate = new Date(date);
            const diffTime = Math.abs(today.getTime() - selectedDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 1) {
              setAlert("Attention : Aucune opération trouvée pour la veille. Les stocks initiaux restent vides et modifiables. Veuillez vérifier les données de la veille.");
            }
            // Réinitialiser l'espèce en caisse pour la nouvelle journée UNIQUEMENT si pas de rapport du soir
            setEspeceCaisse('');
            setEspeceCaisseCDF('');
          }
          setInitialLocked(false);
          setFinalLocked(false);
        } else if (periodeRapport === 'soir') {
          // Pour le soir : chercher les données du matin pour les afficher en lecture seule
          const matinQuery = query(
            collection(db, 'operations'),
            where('shopId', '==', currentUser.shopId),
            where('date', '==', date),
            where('periode_rapport', '==', 'matin')
          );
          const matinSnap = await getDocs(matinQuery);
          
          if (!matinSnap.empty) {
            // Données du matin existent - les charger en lecture seule
            const matinData = matinSnap.docs[0].data();
            // setEspeceCaisse(matinData.espece_en_caisse?.toString() || ''); // [PATCH] Ne pas pré-remplir pour le soir
            // setEspeceCaisseCDF(matinData.espece_en_caisse_cdf?.toString() || ''); // [PATCH] Ne pas pré-remplir pour le soir
            setElectronic(prev => {
              const copy = { ...prev };
              electronicServices.forEach(s => {
                copy[s.key] = {
                  stockInitial: matinData.argent_electronique?.[s.key]?.stock_initial?.toString() || '',
                  stockFinal: '', // Vide pour saisie du soir
                  reappro: matinData.argent_electronique?.[s.key]?.approvisionnement?.toString() || ''
                };
              });
              return copy;
            });
            setCredit(prev => {
              const copy = { ...prev };
              creditNetworks.forEach(n => {
                copy[n.key] = {
                  stockInitial: matinData.vente_credit?.[n.key]?.stock_initial?.toString() || '',
                  stockFinal: '', // Vide pour saisie du soir
                  reappro: matinData.vente_credit?.[n.key]?.approvisionnement?.toString() || ''
                };
              });
              return copy;
            });
            setTotalGeneralAnterieur(matinData.total_general || 0);
            // Verrouiller les champs initiaux (données du matin), permettre la saisie des stocks finaux
            setInitialLocked(true);
            setFinalLocked(false);
            setEspeceCaisseLocked(false); // [PATCH] Toujours déverrouiller le champ especeCaisse pour le soir
            setAutoFilledStocks(prev => ({ ...prev, especeCaisse: false, especeCaisseCDF: false })); // [PATCH] Toujours éditable pour le soir
          } else {
            // Pas de données du matin : initialiser les champs à vide et permettre la saisie du soir
            setEspeceCaisse('');
            setEspeceCaisseCDF('');
            setElectronic(prev => {
              const copy = { ...prev };
              electronicServices.forEach(s => {
                copy[s.key] = {
                  stockInitial: '',
                  stockFinal: '',
                  reappro: ''
                };
              });
              return copy;
            });
            setCredit(prev => {
              const copy = { ...prev };
              creditNetworks.forEach(n => {
                copy[n.key] = {
                  stockInitial: '',
                  stockFinal: '',
                  reappro: ''
                };
              });
              return copy;
            });
            setTotalGeneralAnterieur(0);
            setInitialLocked(false);
            setFinalLocked(false);
            setAlert(null); // On n'affiche plus d'erreur bloquante
          }
        }
      }
    };
    initDay();
    // eslint-disable-next-line
  }, [currentUser?.shopId, date, periodeRapport]); // Ajouter periodeRapport comme dépendance

  // Calcul automatique du total général (ajout conversion CDF si champ rempli)
  useEffect(() => {
    let total = 0;
    // Espèce en caisse USD + conversion CDF
    if (tauxJournalier && especeCaisseCDF) {
      total += parseFloat(especeCaisseCDF) / tauxJournalier;
    }
    total += parseFloat(especeCaisse) || 0;
    // Argent électronique USD + CDF converti
    electronicServices.forEach(s => {
      total += Number(parseFloat(electronic[s.key].stockFinal) || 0);
      if (tauxJournalier && electronicCDF[s.key]) {
        total += parseFloat(electronicCDF[s.key]) / tauxJournalier;
      }
    });
    // Crédit
    creditNetworks.forEach(n => {
      total += Number(parseFloat(credit[n.key].stockFinal) || 0);
    });
    setTotalGeneral(total);
  }, [especeCaisse, especeCaisseCDF, electronic, credit, tauxJournalier, electronicCDF]);

  // Calcul du stock initial effectif (stock initial + réapprovisionnement)
  const getStockInitialEffectif = (bloc: any) => {
    return (parseFloat(bloc.stockInitial) || 0) + (parseFloat(bloc.reappro) || 0);
  };

  // Nouvelle fonction de validation des stocks
  const validateStockFinal = (type: 'electronic' | 'credit', key: string, stockFinal: string) => {
    const bloc = type === 'electronic' ? electronic[key] : credit[key];
    const stockInitialEffectif = getStockInitialEffectif(bloc);
    const finalValue = parseFloat(stockFinal) || 0;
    
    // Suppression de la validation qui empêchait le stock final d'être supérieur au stock initial effectif
    const errorKey = `${type}_${key}`;
    setStockErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[errorKey];
      return newErrors;
    });
    return true;
  };

  // Fonction pour vérifier s'il y a des erreurs de validation
  const hasValidationErrors = () => {
    return Object.keys(stockErrors).length > 0;
  };

  const handleElectronicChange = (key: string, field: string, value: string) => {
    setElectronic(e => ({ ...e, [key]: { ...e[key], [field]: value } }));
    
    // Valider le stock final si c'est ce champ qui change
    if (field === 'stockFinal') {
      validateStockFinal('electronic', key, value);
    }
    
    // Re-valider le stock final si le stock initial ou réappro change
    if (field === 'stockInitial' || field === 'reappro') {
      validateStockFinal('electronic', key, electronic[key].stockFinal);
    }
  };

  // Fonction pour appliquer le réapprovisionnement immédiatement
  const handleApplyReappro = (type: 'electronic' | 'credit', key: string) => {
    const bloc = type === 'electronic' ? electronic[key] : credit[key];
    const reapproValue = parseFloat(bloc.reappro) || 0;
    
    if (reapproValue > 0) {
      const newStockInitial = (parseFloat(bloc.stockInitial) || 0) + reapproValue;
      
      if (type === 'electronic') {
        setElectronic(e => ({
          ...e,
          [key]: {
            ...e[key],
            stockInitial: newStockInitial.toString(),
            reappro: '' // Remettre à zéro après application
          }
        }));
      } else {
        setCredit(c => ({
          ...c,
          [key]: {
            ...c[key],
            stockInitial: newStockInitial.toString(),
            reappro: '' // Remettre à zéro après application
          }
        }));
      }
      
      // Afficher un message de succès temporaire
      setReapproSuccess(`Réapprovisionnement de ${reapproValue} appliqué avec succès !`);
      setTimeout(() => setReapproSuccess(null), 3000);
    }
  };
  
  const handleCreditChange = (key: string, field: string, value: string) => {
    setCredit(c => ({ ...c, [key]: { ...c[key], [field]: value } }));
    
    // Valider le stock final si c'est ce champ qui change
    if (field === 'stockFinal') {
      validateStockFinal('credit', key, value);
    }
    
    // Re-valider le stock final si le stock initial ou réappro change
    if (field === 'stockInitial' || field === 'reappro') {
      validateStockFinal('credit', key, credit[key].stockFinal);
    }
  };

  // Affiche une alerte si le stock final n'a pas été saisi la veille
  useEffect(() => {
    const checkFinalStockYesterday = async () => {
      if (!currentUser?.shopId) return;
      // Trouver la veille de la date sélectionnée
      const d = new Date(date);
      d.setDate(d.getDate() - 1);
      const dateVeille = d.toISOString().split('T')[0];
      const yestQuery = query(
        collection(db, 'operations'),
        where('shopId', '==', currentUser.shopId),
        where('date', '==', dateVeille)
      );
      const yestSnap = await getDocs(yestQuery);
      if (!yestSnap.empty) {
        const yestData = yestSnap.docs[0].data();
        let missing = false;
        electronicServices.forEach(s => {
          if (!yestData.argent_electronique?.[s.key]?.stock_final) missing = true;
        });
        creditNetworks.forEach(n => {
          if (!yestData.vente_credit?.[n.key]?.stock_final) missing = true;
        });
        if (missing) {
          setAlert("Attention : Le stock final n'a pas été saisi pour tous les services hier. Le stock initial d'aujourd'hui peut être incorrect.");
        }
      }
    };
    checkFinalStockYesterday();
    // eslint-disable-next-line
  }, [currentUser?.shopId, date]);

  // Vérification des doublons lors du changement de date ou de période
  useEffect(() => {
    const checkDoublon = async () => {
      setDoublonRapport('');
      if (!currentUser?.shopId || !date || !periodeRapport) return;
      const opQuery = query(
        collection(db, 'operations'),
        where('shopId', '==', currentUser.shopId),
        where('date', '==', date),
        where('periode_rapport', '==', periodeRapport)
      );
      const opSnap = await getDocs(opQuery);
      if (!opSnap.empty) {
        setDoublonRapport(`Rapport du ${periodeRapport === 'matin' ? 'matin' : 'soir'} déjà enregistré pour cette date.`);
      }
    };
    checkDoublon();
  }, [currentUser?.shopId, date, periodeRapport]);

  // Nouvelle fonction pour la clôture de la journée (ajout stockage CDF et conversion USD)
  const handleClotureJournee = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    // Vérifier les erreurs de validation avant de continuer
    if (hasValidationErrors()) {
      setError("Veuillez corriger les erreurs de validation des stocks avant de continuer.");
      setLoading(false);
      return;
    }
    if (periodeRapport === 'soir' && !allFinalsEntered()) {
      setError("Veuillez saisir tous les stocks finaux avant de clôturer la journée.");
      setLoading(false);
      return;
    }
    if (doublonRapport) {
      setError(doublonRapport);
      setLoading(false);
      return;
    }
    try {
      if (!currentUser?.shopId || !currentUser?.id) {
        setError("Utilisateur ou shop non identifié.");
        setLoading(false);
        return;
      }
      const shopId = currentUser.shopId;
      const userId = currentUser.id;
      // Structure de stockage conforme au prompt
      const argent_electronique: any = {};
      electronicServices.forEach(s => {
        argent_electronique[s.key] = {
          stock_initial: getStockInitialEffectif(electronic[s.key]),
          stock_final: parseFloat(electronic[s.key].stockFinal) || 0,
          approvisionnement: parseFloat(electronic[s.key].reappro) || 0
        };
      });
      const vente_credit: any = {};
      creditNetworks.forEach(n => {
        vente_credit[n.key] = {
          stock_initial: getStockInitialEffectif(credit[n.key]),
          stock_final: parseFloat(credit[n.key].stockFinal) || 0,
          approvisionnement: parseFloat(credit[n.key].reappro) || 0
        };
      });
      // Conversion automatique CDF → USD
      let espece_en_caisse_usd = parseFloat(especeCaisse) || 0;
      let espece_en_caisse_cdf = parseFloat(especeCaisseCDF) || 0;
      let montant_cdf_saisi = espece_en_caisse_cdf > 0 ? espece_en_caisse_cdf : null;
      if (tauxJournalier && espece_en_caisse_cdf > 0) {
        espece_en_caisse_usd += espece_en_caisse_cdf / tauxJournalier;
      }
      // Calcul du total général
      const total_elec = electronicServices.reduce((total, s) => {
        const stockFinalUSD = parseFloat(electronic[s.key].stockFinal) || 0;
        const stockFinalCDF = parseFloat(electronicCDF[s.key]) || 0;
        const stockFinalCDFenUSD = tauxJournalier ? stockFinalCDF / tauxJournalier : 0;
        return total + stockFinalUSD + stockFinalCDFenUSD;
      }, 0);
      const total_credit = Object.values(vente_credit).reduce((total: number, item: any) => total + Number(item.stock_final || 0), 0);
      const total_general = espece_en_caisse_usd + total_elec + total_credit;
      // Enregistrement dans la collection racine 'operations'
      await addDoc(collection(db, 'operations'), {
        userId,
        shopId,
        date,
        espece_en_caisse: espece_en_caisse_usd,
        espece_en_caisse_cdf: espece_en_caisse_cdf,
        montant_cdf_saisi: montant_cdf_saisi,
        argent_electronique,
        vente_credit,
        total_general,
        periode_rapport: periodeRapport,
        createdAt: new Date().toISOString()
      });
      setSuccess(true);
      setFinalLocked(true);
      // setIsClotured(true); // This line is removed as per the new_code
      if (periodeRapport === 'matin') {
        setIsCloturedMatin(true);
      } else {
        setIsCloturedSoir(true);
      }
    } catch (err) {
      setError("Erreur lors de la clôture de la journée.");
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(false), 2000);
    }
  };

  // Réinitialiser finalLocked à chaque changement de période ou de date
  useEffect(() => {
    setFinalLocked(false);
  }, [periodeRapport, date]);

  useEffect(() => {
    if (periodeRapport === 'soir') {
      const checkSoir = async () => {
        if (!currentUser?.shopId || !date) return;
        console.log('SHOPID UTILISATEUR CONNECTÉ', currentUser?.shopId);
        const opSoir = query(
          collection(db, 'operations'),
          where('shopId', '==', currentUser.shopId),
          where('date', '==', date),
          where('periode_rapport', '==', 'soir')
        );
        const snapSoir = await getDocs(opSoir);
        if (snapSoir.empty) {
          setEspeceCaisse('');
          setEspeceCaisseCDF('');
        }
      };
      checkSoir();
    }
  }, [periodeRapport, date, currentUser?.shopId]);

  // SUPPRIMÉ : Ce useEffect entrait en conflit avec initDay et réinitialisait les données
  // La logique de réinitialisation pour le soir est maintenant gérée dans initDay

  const shouldBeEditable = periodeRapport === 'soir' && !finalLocked && !isClotured;

  console.log('[DEBUG] RENDER : especeCaisse', especeCaisse, 'locked', especeCaisseLocked, 'periode', periodeRapport);

  return (
    <div className="max-w-2xl mx-auto bg-white p-3 sm:p-6 rounded-lg shadow border mt-4">
      <h2 className="text-2xl font-bold text-blue-900 mb-6 flex items-center gap-2">
        <Layers className="text-blue-600" size={28} /> Opération
      </h2>
      
      {/* Label taux journalier */}
      <div className="mb-4">
        {tauxJournalierLoading ? (
          <span className="text-blue-700">Chargement du taux du jour…</span>
        ) : tauxJournalier !== null ? (
          <span className="inline-block bg-blue-50 border border-blue-200 text-blue-900 rounded px-3 py-2 font-semibold">
            Taux du jour : 1 USD = {tauxJournalier.toLocaleString('fr-FR')} CDF
          </span>
        ) : (
          <span className="text-red-600">Aucun taux journalier défini pour aujourd'hui.</span>
        )}
      </div>
      {/* Champ Date */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Date de l'opération</label>
        <input
          type="date"
          className="w-full border rounded px-3 py-2"
          value={date}
          onChange={e => setDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          required
        />
      </div>
      {/* Toujours afficher le sélecteur de période */}
      <div className="mb-4 flex flex-col sm:flex-row gap-2 sm:gap-6 items-stretch sm:items-center w-full">
        <label htmlFor="periode_rapport" className="font-semibold">Période du rapport :</label>
        <select
          id="periode_rapport"
          value={periodeRapport}
          onChange={e => setPeriodeRapport(e.target.value as 'matin' | 'soir')}
          className="border rounded px-3 py-2 w-full sm:w-auto"
          required
        >
          <option value="" disabled>Sélectionner le type de rapport</option>
          <option value="matin">Rapport du matin</option>
          <option value="soir">Rapport du soir</option>
        </select>
      </div>
      {alert && (
        <div className="flex items-center bg-yellow-50 border border-yellow-300 text-yellow-800 rounded p-3 mb-4">
          <AlertCircle className="mr-2" /> {alert}
        </div>
      )}
      
      {/* Affichage du total antérieur */}
      {periodeRapport === 'matin' && totalGeneralAnterieur > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <span className="text-sm font-semibold text-blue-900">
            Total général antérieur (soir d'hier) : {totalGeneralAnterieur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
          </span>
        </div>
      )}
      {/* Toujours afficher le formulaire et tous les champs, sans condition sur tauxJournalier ou periodeRapport */}
      <form onSubmit={handleClotureJournee} className="space-y-6">
        {periodeRapport === 'matin' && (
          <>
            {/* Espèce en caisse USD */}
            <div className="bg-gray-50 rounded-lg p-4 border mb-2">
              <label className="block text-sm font-medium mb-1">Espèce en caisse (USD)</label>
              <input
                type="number"
                value={especeCaisse}
                onChange={e => setEspeceCaisse(e.target.value)}
                onBlur={e => {
                  if (e.target.value) {
                    setEspeceCaisse(Number(e.target.value).toFixed(2));
                  }
                }}
                className="w-full border rounded px-3 py-2"
                placeholder="Saisir le montant en USD"
                min="0"
                required={!especeCaisseCDF}
                disabled={isClotured || autoFilledStocks['especeCaisse']}
              />
            </div>
            {/* Espèce en caisse CDF */}
            <div className="bg-gray-50 rounded-lg p-4 border mb-2">
              <label className="block text-sm font-medium mb-1">Espèce en caisse (CDF)</label>
              <input
                type="number"
                value={especeCaisseCDF}
                onChange={e => setEspeceCaisseCDF(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Saisir le montant en CDF"
                min="0"
                required={!especeCaisse}
                disabled={isClotured || !tauxJournalier || (initialLocked && currentUser?.role !== 'admin') || autoFilledStocks['especeCaisseCDF']}
              />
              {!tauxJournalier && (
                <div className="text-xs text-red-600 mt-1">Impossible de convertir en USD sans taux du jour.</div>
              )}
              {especeCaisseCDF && tauxJournalier && (
                <div className="text-xs text-blue-700 mt-1">
                  Montant converti en USD : <span className="font-bold">{(parseFloat(especeCaisseCDF) / tauxJournalier).toFixed(2)} $</span>
                </div>
              )}
            </div>
            {/* Total espèce en caisse USD (somme USD saisi + CDF converti) */}
            <div className="mb-4">
              <span className="text-sm font-semibold text-blue-900">
                Total espèce en caisse (USD) :{' '}
                {typeof ((parseFloat(especeCaisse) || 0) + ((especeCaisseCDF && tauxJournalier) ? (parseFloat(especeCaisseCDF) / tauxJournalier) : 0)) === 'number'
                  ? ((parseFloat(especeCaisse) || 0) + ((especeCaisseCDF && tauxJournalier) ? (parseFloat(especeCaisseCDF) / tauxJournalier) : 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : '0,00'} $
              </span>
            </div>
            {/* Argent Électronique */}
            <div className="bg-gray-50 rounded-lg p-4 border mb-2">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="text-green-600" size={20} />
                <span className="font-semibold">Argent Électronique</span>
              </div>
              {electronicServices.map((s, idx) => (
                <div key={s.key} className="mb-2">
                  <button
                    type="button"
                    className="flex items-center w-full justify-between px-3 py-2 bg-white border rounded hover:bg-gray-100"
                    onClick={() => setExpandedElectronic(expandedElectronic === s.key ? null : s.key)}
                  >
                    <span>{s.label}</span>
                    {expandedElectronic === s.key ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {expandedElectronic === s.key && (
                    <div className="flex flex-col gap-3 sm:grid sm:grid-cols-4 mt-3 bg-gray-50 p-3 rounded border">
                      {/* Affichage dynamique selon periodeRapport */}
                      {periodeRapport === 'matin' && (
                        <>
                          {/* Stock initial ($) */}
                          <div>
                            <label className="block text-xs font-medium mb-1">Stock initial ($)</label>
                            <input
                              type="number"
                              value={electronic[s.key].stockInitial}
                              onChange={e => handleElectronicChange(s.key, 'stockInitial', e.target.value)}
                              className="w-full border rounded px-2 py-1"
                              min="0"
                              disabled={isClotured || (initialLocked && currentUser?.role !== 'admin') || autoFilledStocks[`electronic_${s.key}`]}
                            />
                          </div>
                          {/* Stock initial (CDF) */}
                          <div>
                            <label className="block text-xs font-medium mb-1">Stock initial (CDF)</label>
                            <input
                              type="number"
                              value={electronicInitialCDF[s.key]}
                              onChange={e => setElectronicInitialCDF(c => ({ ...c, [s.key]: e.target.value }))}
                              className="w-full border rounded px-2 py-1"
                              min="0"
                              disabled={isClotured || (initialLocked && currentUser?.role !== 'admin') || autoFilledStocks[`electronic_${s.key}`] || !tauxJournalier}
                              placeholder="Montant en CDF"
                            />
                            {tauxJournalier && (
                              <div className="text-xs text-green-700 mt-1">
                                Montant converti en USD : <span className="font-bold">{((parseFloat(electronicInitialCDF[s.key]) || 0) / tauxJournalier).toFixed(2)} $</span>
                              </div>
                            )}
                          </div>
                          {/* Total Stock initial (USD + CDF converti) */}
                          <div className="col-span-4 mb-2">
                            <span className="text-xs font-semibold text-blue-900">
                              Total Stock initial (USD) :{' '}
                              {(
                                (parseFloat(electronic[s.key].stockInitial) || 0) +
                                ((parseFloat(electronicInitialCDF[s.key]) || 0) / (tauxJournalier || 1))
                              ).toFixed(2)} $
                            </span>
                          </div>
                          {/* Réapprovisionnement ($) */}
                          <div className="col-span-4">
                            <label className="block text-xs font-medium mb-1">Réapprovisionnement ($)</label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                value={electronic[s.key].reappro}
                                onChange={e => handleElectronicChange(s.key, 'reappro', e.target.value)}
                                className="flex-1 border rounded px-2 py-1"
                                min="0"
                                disabled={isClotured}
                                placeholder="Montant"
                              />
                              <button
                                type="button"
                                onClick={() => handleApplyReappro('electronic', s.key)}
                                disabled={isClotured || !electronic[s.key].reappro || parseFloat(electronic[s.key].reappro) <= 0}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Appliquer le réapprovisionnement au stock initial"
                              >
                                ✓
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                      {periodeRapport === 'soir' && (
                        <>
                          {/* Stock final ($) */}
                          <div>
                            <label className="block text-xs font-medium mb-1">Stock final ($)</label>
                            <input
                              type="number"
                              value={electronic[s.key].stockFinal}
                              onChange={e => handleElectronicChange(s.key, 'stockFinal', e.target.value)}
                              className={`w-full border rounded px-2 py-1 ${stockErrors[`electronic_${s.key}`] ? 'border-red-500' : ''}`}
                              min="0"
                              disabled={isClotured}
                            />
                            {stockErrors[`electronic_${s.key}`] && (
                              <div className="flex items-center text-red-600 text-xs mt-1">
                                <XCircle size={12} className="mr-1" />
                                {stockErrors[`electronic_${s.key}`]}
                              </div>
                            )}
                            {tauxJournalier && (
                              <div className="text-xs text-blue-700 mt-1">
                                Montant en CDF : <span className="font-bold">{((parseFloat(electronic[s.key].stockFinal) || 0) * tauxJournalier).toLocaleString('fr-FR')} CDF</span>
                              </div>
                            )}
                          </div>
                          {/* Stock final (CDF) */}
                          <div>
                            <label className="block text-xs font-medium mb-1">Stock final (CDF)</label>
                            <input
                              type="number"
                              value={electronicCDF[s.key]}
                              onChange={e => setElectronicCDF(c => ({ ...c, [s.key]: e.target.value }))}
                              className="w-full border rounded px-2 py-1"
                              min="0"
                              disabled={isClotured || !tauxJournalier}
                              placeholder="Montant en CDF"
                            />
                            {tauxJournalier && (
                              <div className="text-xs text-green-700 mt-1">
                                Montant converti en USD : <span className="font-bold">{((parseFloat(electronicCDF[s.key]) || 0) / tauxJournalier).toFixed(2)} $</span>
                              </div>
                            )}
                          </div>
                          {/* Total Stock final (USD + CDF converti) */}
                          <div className="col-span-4 mb-2">
                            <span className="text-xs font-semibold text-blue-900">
                              Total Stock final (USD) :{' '}
                              {(
                                (parseFloat(electronic[s.key].stockFinal) || 0) +
                                ((parseFloat(electronicCDF[s.key]) || 0) / (tauxJournalier || 1))
                              ).toFixed(2)} $
                            </span>
                          </div>
                        </>
                      )}
                      {/* Stock initial effectif (toujours affiché) */}
                      <div className="col-span-4 text-xs text-gray-500 mt-1">
                        Stock initial effectif = Stock initial + Réapprovisionnement = <span className="font-semibold text-blue-600">{getStockInitialEffectif(electronic[s.key]).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Vente à Crédit */}
            <div className="bg-gray-50 rounded-lg p-4 border mb-2">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="text-yellow-600" size={20} />
                <span className="font-semibold">Vente à Crédit</span>
              </div>
              {creditNetworks.map(n => (
                <div key={n.key} className="mb-2">
                  <button
                    type="button"
                    className="flex items-center w-full justify-between px-3 py-2 bg-white border rounded hover:bg-gray-100"
                    onClick={() => setExpandedCredit(expandedCredit === n.key ? null : n.key)}
                  >
                    <span>{n.label}</span>
                    {expandedCredit === n.key ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {expandedCredit === n.key && (
                    <div className="flex flex-col gap-3 sm:grid sm:grid-cols-3 mt-3 bg-gray-50 p-3 rounded border">
                      {/* Affichage dynamique selon periodeRapport */}
                      {periodeRapport === 'matin' && (
                        <>
                          {/* Stock initial */}
                          <div>
                            <label className="block text-xs font-medium mb-1">Stock initial</label>
                            <input
                              type="number"
                              value={credit[n.key].stockInitial}
                              onChange={e => handleCreditChange(n.key, 'stockInitial', e.target.value)}
                              className="w-full border rounded px-2 py-1"
                              min="0"
                              disabled={isClotured || autoFilledStocks[`credit_${n.key}`]}
                            />
                          </div>
                          {/* Réapprovisionnement */}
                          <div>
                            <label className="block text-xs font-medium mb-1">Réapprovisionnement</label>
                            <div className="flex gap-1">
                              <input
                                type="number"
                                value={credit[n.key].reappro}
                                onChange={e => handleCreditChange(n.key, 'reappro', e.target.value)}
                                className="flex-1 border rounded px-2 py-1"
                                min="0"
                                disabled={isClotured}
                                placeholder="Montant"
                              />
                              <button
                                type="button"
                                onClick={() => handleApplyReappro('credit', n.key)}
                                disabled={isClotured || !credit[n.key].reappro || parseFloat(credit[n.key].reappro) <= 0}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Appliquer le réapprovisionnement au stock initial"
                              >
                                ✓
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                      {periodeRapport === 'soir' && (
                        <>
                          {/* Stock final */}
                          <div>
                            <label className="block text-xs font-medium mb-1">Stock final</label>
                            <input
                              type="number"
                              value={credit[n.key].stockFinal}
                              onChange={e => handleCreditChange(n.key, 'stockFinal', e.target.value)}
                              className={`w-full border rounded px-2 py-1 ${stockErrors[`credit_${n.key}`] ? 'border-red-500' : ''}`}
                              min="0"
                              disabled={isClotured}
                            />
                            {stockErrors[`credit_${n.key}`] && (
                              <div className="flex items-center text-red-600 text-xs mt-1">
                                <XCircle size={12} className="mr-1" />
                                {stockErrors[`credit_${n.key}`]}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Bouton de clôture */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || isClotured}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-2" size={20} />
                    Clôturer le matin
                  </>
                )}
              </button>
            </div>
          </>
        )}
        {periodeRapport === 'soir' && !doublonRapport && (
          <>
            {/* Espèce en caisse USD */}
            <div className="bg-gray-50 rounded-lg p-4 border mb-2">
              <label className="block text-sm font-medium mb-1">Espèce en caisse (USD)</label>
              <input
                type="number"
                value={especeCaisse}
                onChange={e => setEspeceCaisse(e.target.value)}
                onBlur={e => {
                  if (e.target.value) {
                    setEspeceCaisse(Number(e.target.value).toFixed(2));
                  }
                }}
                className="w-full border rounded px-3 py-2"
                placeholder="Saisir le montant en USD"
                min="0"
                disabled={isClotured}
              />
            </div>
            {/* Espèce en caisse CDF */}
            <div className="bg-gray-50 rounded-lg p-4 border mb-2">
              <label className="block text-sm font-medium mb-1">Espèce en caisse (CDF)</label>
              <input
                type="number"
                value={especeCaisseCDF}
                onChange={e => setEspeceCaisseCDF(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Saisir le montant en CDF"
                min="0"
                disabled={isClotured || !tauxJournalier}
              />
              {!tauxJournalier && (
                <div className="text-xs text-red-600 mt-1">Impossible de convertir en USD sans taux du jour.</div>
              )}
              {especeCaisseCDF && tauxJournalier && (
                <div className="text-xs text-blue-700 mt-1">
                  Montant converti en USD : <span className="font-bold">{(parseFloat(especeCaisseCDF) / tauxJournalier).toFixed(2)} $</span>
                </div>
              )}
            </div>
            {/* Total espèce en caisse USD (somme USD saisi + CDF converti) */}
            <div className="mb-4">
              <span className="text-sm font-semibold text-blue-900">
                Total espèce en caisse (USD) :{' '}
                {typeof ((parseFloat(especeCaisse) || 0) + ((especeCaisseCDF && tauxJournalier) ? (parseFloat(especeCaisseCDF) / tauxJournalier) : 0)) === 'number'
                  ? ((parseFloat(especeCaisse) || 0) + ((especeCaisseCDF && tauxJournalier) ? (parseFloat(especeCaisseCDF) / tauxJournalier) : 0)).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : '0,00'} $
              </span>
            </div>
            {/* Argent Électronique */}
            <div className="bg-gray-50 rounded-lg p-4 border mb-2">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="text-green-600" size={20} />
                <span className="font-semibold">Argent Électronique</span>
              </div>
              {electronicServices.map((s, idx) => (
                <div key={s.key} className="mb-2">
                  <button
                    type="button"
                    className="flex items-center w-full justify-between px-3 py-2 bg-white border rounded hover:bg-gray-100"
                    onClick={() => setExpandedElectronic(expandedElectronic === s.key ? null : s.key)}
                  >
                    <span>{s.label}</span>
                    {expandedElectronic === s.key ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {expandedElectronic === s.key && (
                    <div className="flex flex-col gap-3 sm:grid sm:grid-cols-4 mt-3 bg-gray-50 p-3 rounded border">
                      {/* Affichage dynamique selon periodeRapport */}
                      {periodeRapport === 'matin' && (
                        <>
                          {/* Stock final ($) */}
                          <div>
                            <label className="block text-xs font-medium mb-1">Stock final ($)</label>
                            <input
                              type="number"
                              value={electronic[s.key].stockFinal}
                              onChange={e => handleElectronicChange(s.key, 'stockFinal', e.target.value)}
                              className={`w-full border rounded px-2 py-1 ${stockErrors[`electronic_${s.key}`] ? 'border-red-500' : ''}`}
                              min="0"
                              disabled={isClotured}
                            />
                            {stockErrors[`electronic_${s.key}`] && (
                              <div className="flex items-center text-red-600 text-xs mt-1">
                                <XCircle size={12} className="mr-1" />
                                {stockErrors[`electronic_${s.key}`]}
                              </div>
                            )}
                            {tauxJournalier && (
                              <div className="text-xs text-blue-700 mt-1">
                                Montant en CDF : <span className="font-bold">{((parseFloat(electronic[s.key].stockFinal) || 0) * tauxJournalier).toLocaleString('fr-FR')} CDF</span>
                              </div>
                            )}
                          </div>
                          {/* Stock final (CDF) */}
                          <div>
                            <label className="block text-xs font-medium mb-1">Stock final (CDF)</label>
                            <input
                              type="number"
                              value={electronicCDF[s.key]}
                              onChange={e => setElectronicCDF(c => ({ ...c, [s.key]: e.target.value }))}
                              className="w-full border rounded px-2 py-1"
                              min="0"
                              disabled={isClotured || !tauxJournalier}
                              placeholder="Montant en CDF"
                            />
                            {tauxJournalier && (
                              <div className="text-xs text-green-700 mt-1">
                                Montant converti en USD : <span className="font-bold">{((parseFloat(electronicCDF[s.key]) || 0) / tauxJournalier).toFixed(2)} $</span>
                              </div>
                            )}
                          </div>
                          {/* Total Stock final (USD + CDF converti) */}
                          <div className="col-span-4 mb-2">
                            <span className="text-xs font-semibold text-blue-900">
                              Total Stock final (USD) :{' '}
                              {(
                                (parseFloat(electronic[s.key].stockFinal) || 0) +
                                ((parseFloat(electronicCDF[s.key]) || 0) / (tauxJournalier || 1))
                              ).toFixed(2)} $
                            </span>
                          </div>
                        </>
                      )}
                      {periodeRapport === 'soir' && (
                        <>
                          {/* Stock final ($) */}
                          <div>
                            <label className="block text-xs font-medium mb-1">Stock final ($)</label>
                            <input
                              type="number"
                              value={electronic[s.key].stockFinal}
                              onChange={e => handleElectronicChange(s.key, 'stockFinal', e.target.value)}
                              className={`w-full border rounded px-2 py-1 ${stockErrors[`electronic_${s.key}`] ? 'border-red-500' : ''}`}
                              min="0"
                              disabled={isClotured}
                            />
                            {stockErrors[`electronic_${s.key}`] && (
                              <div className="flex items-center text-red-600 text-xs mt-1">
                                <XCircle size={12} className="mr-1" />
                                {stockErrors[`electronic_${s.key}`]}
                              </div>
                            )}
                            {tauxJournalier && (
                              <div className="text-xs text-blue-700 mt-1">
                                Montant en CDF : <span className="font-bold">{((parseFloat(electronic[s.key].stockFinal) || 0) * tauxJournalier).toLocaleString('fr-FR')} CDF</span>
                              </div>
                            )}
                          </div>
                          {/* Stock final (CDF) */}
                          <div>
                            <label className="block text-xs font-medium mb-1">Stock final (CDF)</label>
                            <input
                              type="number"
                              value={electronicCDF[s.key]}
                              onChange={e => setElectronicCDF(c => ({ ...c, [s.key]: e.target.value }))}
                              className="w-full border rounded px-2 py-1"
                              min="0"
                              disabled={isClotured || !tauxJournalier}
                              placeholder="Montant en CDF"
                            />
                            {tauxJournalier && (
                              <div className="text-xs text-green-700 mt-1">
                                Montant converti en USD : <span className="font-bold">{((parseFloat(electronicCDF[s.key]) || 0) / tauxJournalier).toFixed(2)} $</span>
                              </div>
                            )}
                          </div>
                          {/* Total Stock final (USD + CDF converti) */}
                          <div className="col-span-4 mb-2">
                            <span className="text-xs font-semibold text-blue-900">
                              Total Stock final (USD) :{' '}
                              {(
                                (parseFloat(electronic[s.key].stockFinal) || 0) +
                                ((parseFloat(electronicCDF[s.key]) || 0) / (tauxJournalier || 1))
                              ).toFixed(2)} $
                            </span>
                          </div>
                        </>
                      )}
                      {/* Stock initial effectif (toujours affiché) */}
                      <div className="col-span-4 text-xs text-gray-500 mt-1">
                        Stock initial effectif = Stock initial + Réapprovisionnement = <span className="font-semibold text-blue-600">{getStockInitialEffectif(electronic[s.key]).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Vente à Crédit */}
            <div className="bg-gray-50 rounded-lg p-4 border mb-2">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="text-yellow-600" size={20} />
                <span className="font-semibold">Vente à Crédit</span>
              </div>
              {creditNetworks.map(n => (
                <div key={n.key} className="mb-2">
                  <button
                    type="button"
                    className="flex items-center w-full justify-between px-3 py-2 bg-white border rounded hover:bg-gray-100"
                    onClick={() => setExpandedCredit(expandedCredit === n.key ? null : n.key)}
                  >
                    <span>{n.label}</span>
                    {expandedCredit === n.key ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {expandedCredit === n.key && (
                    <div className="flex flex-col gap-3 sm:grid sm:grid-cols-3 mt-3 bg-gray-50 p-3 rounded border">
                      {/* Affichage dynamique selon periodeRapport */}
                      {periodeRapport === 'matin' && (
                        <>
                          {/* Stock final */}
                          <div>
                            <label className="block text-xs font-medium mb-1">Stock final</label>
                            <input
                              type="number"
                              value={credit[n.key].stockFinal}
                              onChange={e => handleCreditChange(n.key, 'stockFinal', e.target.value)}
                              className={`w-full border rounded px-2 py-1 ${stockErrors[`credit_${n.key}`] ? 'border-red-500' : ''}`}
                              min="0"
                              disabled={isClotured}
                            />
                            {stockErrors[`credit_${n.key}`] && (
                              <div className="flex items-center text-red-600 text-xs mt-1">
                                <XCircle size={12} className="mr-1" />
                                {stockErrors[`credit_${n.key}`]}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      {periodeRapport === 'soir' && (
                        <>
                          {/* Stock final */}
                          <div>
                            <label className="block text-xs font-medium mb-1">Stock final</label>
                            <input
                              type="number"
                              value={credit[n.key].stockFinal}
                              onChange={e => handleCreditChange(n.key, 'stockFinal', e.target.value)}
                              className={`w-full border rounded px-2 py-1 ${stockErrors[`credit_${n.key}`] ? 'border-red-500' : ''}`}
                              min="0"
                              disabled={isClotured}
                            />
                            {stockErrors[`credit_${n.key}`] && (
                              <div className="flex items-center text-red-600 text-xs mt-1">
                                <XCircle size={12} className="mr-1" />
                                {stockErrors[`credit_${n.key}`]}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Total général du soir */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-lg font-bold text-blue-900">
                Total général du soir : {totalGeneral.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
              </span>
            </div>
            {/* Bouton de clôture */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={loading || isClotured}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-2" size={20} />
                    Clôturer la journée
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </form>
      {reapproSuccess && (
        <div className="flex items-center bg-green-50 border border-green-300 text-green-800 rounded p-3 mb-4">
          <CheckCircle className="mr-2" /> {reapproSuccess}
        </div>
      )}
      {error && (
        <div className="flex items-center bg-red-50 border border-red-300 text-red-800 rounded p-3 mb-4">
          <XCircle className="mr-2" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center bg-green-50 border border-green-300 text-green-800 rounded p-3 mb-4">
          <CheckCircle className="mr-2" /> Opération enregistrée avec succès !
        </div>
      )}
      {doublonRapport && (
        <div className="flex items-center bg-yellow-50 border border-yellow-300 text-yellow-800 rounded p-3 mb-4">
          <AlertCircle className="mr-2" /> {doublonRapport}
        </div>
      )}
    </div>
  );
};

export default OperationForm;