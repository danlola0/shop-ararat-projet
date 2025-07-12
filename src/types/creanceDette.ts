export type CreanceDetteType = 'creance' | 'dette';
export type CreanceDetteStatut = 'en_cours' | 'rembourse' | 'annule';

export interface CreanceDette {
  id?: string;
  montant: number;
  shopSource: string;
  shopCible?: string;
  userCible?: string;
  type: CreanceDetteType;
  raison: string;
  statut: CreanceDetteStatut;
  date: string; // ISO string
  justification?: string;
  createdAt?: string;
  updatedAt?: string;
} 