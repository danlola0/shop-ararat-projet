import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Save, User, Search, CheckCircle, AlertCircle, Printer } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';

export const DepotCarteForm: React.FC = () => {
  const { currentUser } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showPrint, setShowPrint] = useState(false);
  const [lastDepot, setLastDepot] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const [clientType, setClientType] = useState<'nouveau' | 'existant'>('nouveau');
  const [formData, setFormData] = useState({
    // Données client
    nom: '',
    prenom: '',
    sexe: 'M' as 'M' | 'F',
    poste: '',
    telephone: '',
    montantOuverture: '',
    deviseOuverture: 'CDF' as 'CDF' | 'USD',
    // Données transaction
    montant: '',
    type: 'depot' as 'depot' | 'retrait',
    date: new Date().toISOString().split('T')[0]
  });
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState<string>('');
  const [devise, setDevise] = useState<'CDF' | 'USD'>('CDF');
  const [soldeCDF, setSoldeCDF] = useState<number>(0);
  const [soldeUSD, setSoldeUSD] = useState<number>(0);
  const [soldeLoading, setSoldeLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  useEffect(() => {
    if (currentUser && clientType === 'existant') {
      const fetchClients = async () => {
        try {
          if (!currentUser) return;
          
          let clientList = [];
          
          // Récupérer les clients de la collection 'clients'
          const clientsSnapshot = await getDocs(collection(db, 'clients'));
          const clientsFromClients = clientsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            source: 'clients'
          }));
          
          // Récupérer les clients uniques de la collection 'depots'
          const depotsSnapshot = await getDocs(collection(db, 'depots'));
          const clientsFromDepots = depotsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: data.clientId || doc.id,
              nom: data.clientNom,
              prenom: data.clientPrenom,
              telephone: data.clientTelephone,
              shopId: data.shopId,
              source: 'depots'
            };
          });
          
          // Combiner et dédupliquer par téléphone
          const allClients = [...clientsFromClients, ...clientsFromDepots];
          const uniqueClients = allClients.filter((client, index, self) => 
            index === self.findIndex(c => c.telephone === client.telephone)
          );
          
          if (currentUser.role === 'admin') {
            // Admin voit tous les clients
            clientList = uniqueClients;
          } else {
            // User voit seulement les clients de son shop
            clientList = uniqueClients.filter(client => client.shopId === currentUser.shopId);
          }
          
          console.log('DEBUG: Clients chargés:', clientList.length);
          console.log('DEBUG: Clients:', clientList.map(c => ({ nom: c.nom, prenom: c.prenom, telephone: c.telephone, shopId: c.shopId })));
          
          setClients(clientList);
        } catch (error) {
          console.error('Erreur lors de la récupération des clients:', error);
        }
      };
      fetchClients();
    }
  }, [currentUser, clientType]);

  // Recherche de clients
  useEffect(() => {
    console.log('DEBUG: Recherche déclenchée avec terme:', searchTerm);
    console.log('DEBUG: Nombre total de clients disponibles:', clients.length);
    console.log('DEBUG: Clients disponibles:', clients.map(c => ({ nom: c.nom, prenom: c.prenom, telephone: c.telephone })));
    
    if (searchTerm.trim().length >= 2) {
      const results = clients.filter(client => 
        client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.telephone.includes(searchTerm)
      );
      
      console.log('DEBUG: Résultats de recherche trouvés:', results.length);
      console.log('DEBUG: Résultats:', results.map(c => ({ nom: c.nom, prenom: c.prenom, telephone: c.telephone })));
      
      setSearchResults(results);
      setIsSearching(true);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [searchTerm, clients]);

  const handleClientSelection = (clientId: string) => {
    setClientId(clientId);
    const found = clients.find(c => c.id === clientId);
    if (found) {
      setSelectedClient(found);
      setFormData({ 
        ...formData, 
        nom: found.nom, 
        prenom: found.prenom, 
        sexe: found.sexe, 
        poste: found.poste, 
        telephone: found.telephone 
      });
      calculerSolde(found.id);
      setErrorMessage('');
      setSearchTerm(`${found.nom} ${found.prenom} (${found.telephone})`);
      setIsSearching(false);
    } else {
      setClientId('');
      setSelectedClient(null);
      setSoldeCDF(0);
      setSoldeUSD(0);
    }
  };

  const calculerSolde = async (clientId: string) => {
    try {
      // Récupération directe depuis Firestore
      const operationsQuery = query(
        collection(db, 'depots'),
        where('clientId', '==', clientId)
      );
      const operationsSnapshot = await getDocs(operationsQuery);
      const operations = operationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      let totalDepotCDF = 0, totalRetraitCDF = 0, totalDepotUSD = 0, totalRetraitUSD = 0;
      
      operations.forEach(op => {
        if (op.devise === 'CDF') {
          if (op.type === 'depot') totalDepotCDF += op.montant;
          else if (op.type === 'retrait') totalRetraitCDF += op.montant;
        } else if (op.devise === 'USD') {
          if (op.type === 'depot') totalDepotUSD += op.montant;
          else if (op.type === 'retrait') totalRetraitUSD += op.montant;
        }
      });
      
      const soldeCDFFinal = totalDepotCDF - totalRetraitCDF;
      const soldeUSDFinal = totalDepotUSD - totalRetraitUSD;
      
      setSoldeCDF(soldeCDFFinal);
      setSoldeUSD(soldeUSDFinal);
    } catch (e) {
      console.error('Erreur lors du calcul du solde:', e);
      setSoldeCDF(0);
      setSoldeUSD(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setErrorMessage('Vous devez être connecté pour enregistrer un dépôt');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
      return;
    }

    setIsSubmitting(true);
    setShowError(false);
    setShowSuccess(false);

    try {
      let newClientId = clientId;
      if (clientType === 'nouveau') {
        if (!formData.montantOuverture || isNaN(Number(formData.montantOuverture)) || Number(formData.montantOuverture) <= 0) {
          setErrorMessage('Le montant d\'ouverture est obligatoire et doit être supérieur à 0.');
          setShowError(true);
          setTimeout(() => setShowError(false), 5000);
          setIsSubmitting(false);
          return;
        }
        const clientData = {
          nom: formData.nom,
          prenom: formData.prenom,
          sexe: formData.sexe,
          poste: formData.poste,
          telephone: formData.telephone,
          shopId: currentUser.shopId,
          shopName: currentUser.shopName,
          createdAt: new Date().toISOString(),
          montantOuverture: Number(formData.montantOuverture),
          deviseOuverture: formData.deviseOuverture
        };
        newClientId = await handleCreateClient(clientData);
        setClientId(newClientId);
        setSoldeCDF(0);
        setSoldeUSD(0);
      } else {
        // Pour client existant, il faut que clientId soit bien défini
        if (!clientId) {
          setErrorMessage('Veuillez sélectionner un client existant.');
          setShowError(true);
          setTimeout(() => setShowError(false), 5000);
          setIsSubmitting(false);
          return;
        }
      }

      // Vérification du solde avant retrait
      if (formData.type === 'retrait') {
        const montantRetrait = parseFloat(formData.montant);
        if (devise === 'CDF' && montantRetrait > soldeCDF) {
          setErrorMessage('Solde CDF insuffisant pour effectuer ce retrait.');
          setShowError(true);
          setTimeout(() => setShowError(false), 5000);
          setIsSubmitting(false);
          return;
        }
        if (devise === 'USD' && montantRetrait > soldeUSD) {
          setErrorMessage('Solde USD insuffisant pour effectuer ce retrait.');
          setShowError(true);
          setTimeout(() => setShowError(false), 5000);
          setIsSubmitting(false);
          return;
        }
      }

      // Préparer les données pour Firebase
      const depotData = {
        clientId: newClientId,
        clientNom: formData.nom,
        clientPrenom: formData.prenom,
        clientTelephone: formData.telephone,
        montant: parseFloat(formData.montant),
        type: formData.type,
        devise: devise,
        date: formData.date,
        shopId: currentUser.shopId,
        shopName: currentUser.shopName,
        userId: currentUser.id,
        userName: `${currentUser.prenom} ${currentUser.nom}`,
        createdAt: new Date().toISOString()
      };

      // Sauvegarder dans Firebase
      await addDoc(collection(db, 'depots'), depotData);

      // Enregistrer aussi dans la collection centrale 'mouvements'
      await addDoc(collection(db, 'mouvements'), {
        type: 'depot',
        montant: parseFloat(formData.montant),
        devise: devise,
        date: formData.date,
        shopId: currentUser.shopId,
        userId: currentUser.id,
        libelle: 'Dépôt de carte',
        createdAt: new Date().toISOString()
      });

      // Après opération, recalculer le solde
      calculerSolde(newClientId);

      // Succès
      setShowSuccess(true);
      setShowPrint(true);
      setLastDepot({
        ...formData,
        montant: clientType === 'nouveau' ? parseFloat(formData.montantOuverture) : parseFloat(formData.montant),
        devise: clientType === 'nouveau' ? formData.deviseOuverture : devise,
        date: new Date().toLocaleString(),
        numeroRecu: `DEP-${formData.date.replace(/-/g, '')}-001`,
        nouveauSolde: clientType === 'nouveau' ? parseFloat(formData.montantOuverture) : (Number(formData.montant) + (devise === 'CDF' ? soldeCDF : soldeUSD)),
        clientId: newClientId,
        isNewClient: clientType === 'nouveau'
      });
      setTimeout(() => setShowSuccess(false), 4000);

      // Réinitialiser le formulaire
      setFormData({
        nom: '',
        prenom: '',
        sexe: 'M',
        poste: '',
        telephone: '',
        montantOuverture: '',
        deviseOuverture: 'CDF',
        montant: '',
        type: 'depot',
        date: new Date().toISOString().split('T')[0]
      });

    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      setErrorMessage(error.message || 'Erreur lors de la sauvegarde du dépôt');
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    if (!lastDepot) return;
    
    // Debug: Vérifier les données utilisateur
    console.log('DEBUG: Données utilisateur pour impression:', {
      currentUser: currentUser,
      nom: currentUser?.nom,
      prenom: currentUser?.prenom,
      shopName: currentUser?.shopName
    });
    
    // Générer un numéro de carte unique
    let numeroCarte;
    if (lastDepot.isNewClient && lastDepot.clientId) {
      // Pour nouveau client, utiliser l'ID généré
      numeroCarte = `CARD-${lastDepot.clientId.slice(-8).toUpperCase()}`;
    } else if (selectedClient) {
      // Pour client existant
      numeroCarte = `CARD-${selectedClient.id.slice(-8).toUpperCase()}`;
    } else {
      // Fallback
      numeroCarte = `CARD-${Date.now().toString().slice(-8)}`;
    }
    
    // Récupérer le montant et la devise
    const montantOperation = lastDepot.montant || 0;
    const deviseOperation = lastDepot.devise || devise;
    
    // Calculer les soldes
    let soldeAvant, nouveauSolde;
    if (lastDepot.isNewClient) {
      // Nouveau client : solde avant = 0, nouveau solde = montant d'ouverture
      soldeAvant = 0;
      nouveauSolde = montantOperation;
    } else {
      // Client existant : calcul normal
      soldeAvant = deviseOperation === 'CDF' ? soldeCDF : soldeUSD;
      nouveauSolde = formData.type === 'depot' ? soldeAvant + montantOperation : soldeAvant - montantOperation;
    }
    
    // Générer un numéro de reçu unique
    const numeroRecu = `DEP-${formData.date.replace(/-/g, '')}-${Date.now().toString().slice(-3)}`;
    
    const printWindow = window.open('', '', 'width=350,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <pre style="font-family:monospace;font-size:14px;white-space:pre;">
🏢 Ararat projet shop

Téléphone : ${selectedClient?.telephone || formData.telephone || 'N/A'}

============================
       ✍️ REÇU D'ÉPARGNE
============================

Type         : ${lastDepot.isNewClient ? 'OUVERTURE DE COMPTE' : formData.type.toUpperCase()}
N° Reçu      : ${numeroRecu}
Date         : ${new Date().toLocaleString('fr-FR')}
Shop         : ${currentUser?.shopName || 'N/A'}
Agent        : ${currentUser?.prenom && currentUser?.nom ? `${currentUser.prenom} ${currentUser.nom}` : (currentUser?.email || 'Agent')}

----- INFO CLIENT -----
Nom Client    : ${selectedClient?.nom || formData.nom} ${selectedClient?.prenom || formData.prenom}
Téléphone     : ${selectedClient?.telephone || formData.telephone}
N° Carte      : ${numeroCarte}

----- OPÉRATION -----
${lastDepot.isNewClient ? 'Montant Ouverture' : 'Montant'}        : ${montantOperation.toLocaleString('fr-FR')} ${deviseOperation}
Devise         : ${deviseOperation}
Solde Avant    : ${soldeAvant.toLocaleString('fr-FR')} ${deviseOperation}
Nouveau Solde  : ${nouveauSolde.toLocaleString('fr-FR')} ${deviseOperation}

Justification  : ${lastDepot.isNewClient ? 'Ouverture de compte épargne' : (formData.type === 'depot' ? 'Dépôt d\'épargne' : 'Retrait d\'épargne')}

============================
   Merci pour votre confiance
       Ararat projet shop
============================
      </pre>
      <script>window.print();</script>
    `);
    printWindow.document.close();
  };

  const handleCreateClient = async (clientData) => {
    try {
      console.log('DEBUG: Création client avec shopId:', clientData.shopId);
      console.log('DEBUG: Utilisateur connecté shopId:', currentUser?.shopId);
      
      // Création directe dans Firestore
      const docRef = await addDoc(collection(db, 'clients'), clientData);
      
      console.log('DEBUG: Client créé avec ID:', docRef.id);
      
      // Rafraîchir la liste des clients après création
      const fetchClients = async () => {
        try {
          if (!currentUser) return;
          
          let clientList = [];
          if (currentUser.role === 'admin') {
            // Admin voit tous les clients
            const clientsSnapshot = await getDocs(collection(db, 'clients'));
            clientList = clientsSnapshot.docs.map(doc => ({ 
              id: doc.id, 
              ...doc.data() 
            }));
          } else {
            // User voit seulement les clients de son shop
            const clientsSnapshot = await getDocs(collection(db, 'clients'));
            clientList = clientsSnapshot.docs
              .map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
              }))
              .filter(client => client.shopId === currentUser.shopId);
          }
          console.log('DEBUG: Clients chargés:', clientList.length);
          console.log('DEBUG: Clients shopId:', clientList.map(c => ({ id: c.id, shopId: c.shopId })));
          setClients(clientList);
        } catch (error) {
          console.error('Erreur lors de la récupération des clients:', error);
        }
      };
      fetchClients();
      
      return docRef.id;
    } catch (error) {
      console.error('Erreur lors de la création du client:', error);
      throw error;
    }
  };

  return (
    <div className="space-y-4">
      {/* Messages de succès et d'erreur */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle size={20} className="text-green-600 mr-3" />
            <p className="text-sm text-green-800">Dépôt de carte enregistré avec succès !</p>
          </div>
        </div>
      )}

      {showError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle size={20} className="text-red-600 mr-3" />
            <p className="text-sm text-red-800">{errorMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <CreditCard size={24} className="text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">Dépôts de carte (épargne)</h2>
        </div>

        {/* Type de client */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Type de client</h3>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="clientType"
                value="nouveau"
                checked={clientType === 'nouveau'}
                onChange={(e) => setClientType(e.target.value as 'nouveau' | 'existant')}
                className="mr-2"
              />
              Nouveau client
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="clientType"
                value="existant"
                checked={clientType === 'existant'}
                onChange={(e) => setClientType(e.target.value as 'nouveau' | 'existant')}
                className="mr-2"
              />
              Client existant
            </label>
          </div>
        </div>

        {/* Logique pour client existant */}
        {clientType === 'existant' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rechercher un client
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tapez le nom, prénom ou téléphone du client..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {selectedClient && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClient(null);
                      setClientId('');
                      setSearchTerm('');
                      setSoldeCDF(0);
                      setSoldeUSD(0);
                    }}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Résultats de recherche */}
            {isSearching && searchResults.length > 0 && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Résultats de recherche :</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {searchResults.map(client => (
                    <div 
                      key={client.id} 
                      className="flex items-center justify-between p-2 bg-white rounded border hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleClientSelection(client.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="clientId"
                          value={client.id}
                          checked={clientId === client.id}
                          onChange={() => handleClientSelection(client.id)}
                          className="text-purple-600"
                        />
                        <div>
                          <div className="font-medium text-gray-900">
                            {client.nom} {client.prenom}
                          </div>
                          <div className="text-sm text-gray-500">
                            {client.telephone}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isSearching && searchResults.length === 0 && searchTerm.trim().length >= 2 && !selectedClient && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Aucun client trouvé avec "{searchTerm}". Vérifiez l'orthographe ou créez un nouveau client.
                </p>
              </div>
            )}

            {/* Affichage du solde - DÉPLACÉ ICI */}
            {clientId && (
              <div className="p-4 bg-gray-50 rounded-lg border">
                <h4 className="text-md font-medium text-gray-800 mb-2">Solde du Client</h4>
                {soldeLoading ? (
                  <div className="flex items-center space-x-2 text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                    <span>Calcul du solde...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex space-x-6">
                      <p className="text-lg font-semibold text-green-600">
                        {soldeCDF.toLocaleString('fr-FR')} <span className="text-sm font-normal text-gray-600">CDF</span>
                      </p>
                      <p className="text-lg font-semibold text-blue-600">
                        {soldeUSD.toLocaleString('en-US')} <span className="text-sm font-normal text-gray-600">USD</span>
                      </p>
                    </div>
                    {soldeCDF === 0 && soldeUSD === 0 && !soldeLoading && (
                      <p className="text-sm text-gray-500 italic">
                        Aucune opération trouvée pour ce client.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Logique pour nouveau client */}
        {clientType === 'nouveau' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informations Client</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom
                </label>
                <input
                  type="text"
                  required
                  value={formData.nom}
                  onChange={(e) => setFormData({...formData, nom: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prénom
                </label>
                <input
                  type="text"
                  required
                  value={formData.prenom}
                  onChange={(e) => setFormData({...formData, prenom: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Sexe</label>
                <select
                  value={formData.sexe}
                  onChange={(e) => setFormData({ ...formData, sexe: e.target.value as 'M' | 'F' })}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-md"
                >
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Postnom</label>
                <input
                  type="text"
                  value={formData.poste}
                  onChange={(e) => setFormData({ ...formData, poste: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  placeholder="Postnom du client"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  required
                  value={formData.telephone}
                  onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant d'ouverture
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.montantOuverture}
                  onChange={e => setFormData({ ...formData, montantOuverture: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Montant d'ouverture (ex: 1000)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Devise d'ouverture
                </label>
                <select
                  value={formData.deviseOuverture}
                  onChange={e => setFormData({ ...formData, deviseOuverture: e.target.value as 'CDF' | 'USD' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CDF">Franc Congolais (CDF)</option>
                  <option value="USD">Dollar (USD)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Transaction */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type de transaction
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as 'depot' | 'retrait'})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="depot">Dépôt</option>
                <option value="retrait">Retrait</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Devise
              </label>
              <select
                value={devise}
                onChange={e => setDevise(e.target.value as 'CDF' | 'USD')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="CDF">Franc Congolais (CDF)</option>
                <option value="USD">Dollar (USD)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Montant
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.montant}
                  onChange={(e) => setFormData({...formData, montant: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {soldeLoading ? 'Solde...' : devise === 'CDF' ? `Solde : ${soldeCDF.toFixed(2)} CDF` : `Solde : ${soldeUSD.toFixed(2)} USD`}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Enregistrement...</span>
            </>
          ) : (
            <>
              <Save size={20} />
              <span>Enregistrer le Dépôt</span>
            </>
          )}
        </button>

        <button
          type="button"
          className="w-full bg-blue-700 text-white px-4 py-2 rounded mt-2 disabled:opacity-50"
          onClick={handlePrint}
          disabled={!lastDepot}
        >
          Imprimer la facture
        </button>
      </form>
    </div>
  );
};