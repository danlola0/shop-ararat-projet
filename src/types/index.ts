export interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  sexe: 'M' | 'F';
  poste: string;
  telephone: string;
  shopId: string;
  shopName: string;
  role: 'user' | 'admin';
  docId?: string;
}

export interface Shop {
  id: string;
  name: string;
  location: string;
  phone?: string;
  manager?: string;
  description?: string;
  createdAt: string;
}

export interface EchangeMonnaie {
  id: string;
  montantInitialFrancs: number;
  montantInitialDollars: number;
  tauxJour: number;
  billetsEchangesFrancs: number;
  billetsEchangesDollars: number;
  argentRecuFournisseur: number;
  date: string;
  shopId: string;
  userId: string;
}

export interface VenteCredit {
  id: string;
  stockInitial: number;
  stockVendu: {
    vodacom: number;
    orange: number;
    airtel: number;
    africell: number;
  };
  fournisseur: string;
  stockFinal: number;
  date: string;
  shopId: string;
  userId: string;
}

export interface Client {
  id: string;
  nom: string;
  prenom: string;
  sexe: 'M' | 'F';
  poste: string;
  telephone: string;
  solde: number;
  shopId: string;
  montantOuverture: number;
  deviseOuverture: 'CDF' | 'USD';
}

export interface DepotCarte {
  id: string;
  clientId: string;
  montant: number;
  type: 'depot' | 'retrait';
  date: string;
  shopId: string;
  userId: string;
}

export interface TransactionElectronique {
  id: string;
  reseau: 'mpesa' | 'airtel' | 'orange' | 'africell';
  stockInitialFrancs: number;
  stockInitialDollars: number;
  montantEnvoye: number;
  montantRecu: number;
  stockFinalFrancs: number;
  stockFinalDollars: number;
  date: string;
  shopId: string;
  userId: string;
}

export interface Message {
  id: string;
  sender: string;
  senderId: string;
  recipient: string;
  recipientId: string;
  subject: string;
  content: string;
  status: 'lu' | 'non-lu';
  date: string;
  shopId: string;
  shopName: string;
}

export interface EmpruntSociete {
  id: string;
  shopId: string;
  shopName: string;
  montant: number;
  devise: 'CDF' | 'USD';
  type: 'emprunt' | 'remboursement';
  source: string;
  motif?: string;
  date: string;
  userId: string;
  userName: string;
}