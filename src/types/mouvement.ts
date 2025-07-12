export type MouvementType =
  | 'vente'
  | 'depot'
  | 'transfert_entree'
  | 'transfert_sortie'
  | 'emprunt'
  | 'remboursement'
  | 'achat'
  | 'autre';

export interface Mouvement {
  id?: string;
  date: string; // ISO string
  shopId: string;
  userId: string;
  type: MouvementType;
  montant: number;
  unites?: number; // pour les ventes de crédits
  prixUnitaire?: number; // prix de vente du jour
  shopCible?: string; // pour les transferts
  userCible?: string; // pour les prêts entre personnes
  libelle?: string;
  statut?: 'valide' | 'en_attente' | 'annule';
  justification?: string;
  createdAt?: string;
  updatedAt?: string;
} 