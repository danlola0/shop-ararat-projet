import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { 
  User, 
  Shop, 
  EchangeMonnaie, 
  VenteCredit, 
  Client, 
  DepotCarte, 
  TransactionElectronique, 
  Message 
} from '../types';

// Collection names
const COLLECTIONS = {
  USERS: 'users',
  SHOPS: 'shops',
  ECHANGES: 'echanges',
  VENTES_CREDIT: 'ventes_credit',
  CLIENTS: 'clients',
  DEPOTS: 'depots',
  TRANSACTIONS: 'transactions',
  MESSAGES: 'messages'
};

// Fonction utilitaire pour vérifier si un utilisateur est admin global
export const isGlobalAdmin = (user: User | null) => {
  return user ? (user.role === 'admin' && user.shopId === 'ALL_SHOPS') : false;
};

// Services pour les utilisateurs
export const userService = {
  async getAll(): Promise<User[]> {
    const snapshot = await getDocs(collection(db, COLLECTIONS.USERS));
    return snapshot.docs.map(doc => doc.data() as User);
  },

  async getById(id: string): Promise<User | null> {
    const docRef = doc(db, COLLECTIONS.USERS, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as User : null;
  },

  async getByShop(shopId: string): Promise<User[]> {
    const q = query(
      collection(db, COLLECTIONS.USERS),
      where('shopId', '==', shopId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as User);
  },

  async getAllUsersForAdmin(adminUser: User): Promise<User[]> {
    if (isGlobalAdmin(adminUser)) {
      // Admin global voit tous les utilisateurs
      return this.getAll();
    } else {
      // Admin de shop voit seulement les utilisateurs de son shop
      return this.getByShop(adminUser.shopId);
    }
  },

  async update(id: string, data: Partial<User>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.USERS, id);
    await updateDoc(docRef, data);
  }
};

// Services pour les shops
export const shopService = {
  async getAll(): Promise<Shop[]> {
    const snapshot = await getDocs(collection(db, COLLECTIONS.SHOPS));
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Shop));
  },

  async getById(id: string): Promise<Shop | null> {
    const docRef = doc(db, COLLECTIONS.SHOPS, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { ...docSnap.data(), id: docSnap.id } as Shop : null;
  },

  async create(data: Omit<Shop, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.SHOPS), {
      ...data,
      createdAt: Timestamp.fromDate(new Date(data.createdAt))
    });
    return docRef.id;
  },

  async update(id: string, data: Partial<Shop>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SHOPS, id);
    await updateDoc(docRef, data);
  },

  async delete(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.SHOPS, id);
    await deleteDoc(docRef);
  }
};

// Services pour les échanges de monnaie
export const echangeService = {
  async create(data: Omit<EchangeMonnaie, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.ECHANGES), {
      ...data,
      date: Timestamp.fromDate(new Date(data.date))
    });
    return docRef.id;
  },

  async getByShop(shopId: string): Promise<EchangeMonnaie[]> {
    const q = query(
      collection(db, COLLECTIONS.ECHANGES),
      where('shopId', '==', shopId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      date: doc.data().date.toDate().toISOString().split('T')[0]
    } as EchangeMonnaie));
  },

  async getAllForAdmin(adminUser: User): Promise<EchangeMonnaie[]> {
    if (isGlobalAdmin(adminUser)) {
      // Admin global voit tous les échanges
      const q = query(
        collection(db, COLLECTIONS.ECHANGES),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        date: doc.data().date.toDate().toISOString().split('T')[0]
      } as EchangeMonnaie));
    } else {
      // Admin de shop voit seulement les échanges de son shop
      return this.getByShop(adminUser.shopId);
    }
  },

  async getByDateRange(shopId: string, startDate: string, endDate: string): Promise<EchangeMonnaie[]> {
    const q = query(
      collection(db, COLLECTIONS.ECHANGES),
      where('shopId', '==', shopId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      date: doc.data().date.toDate().toISOString().split('T')[0]
    } as EchangeMonnaie));
  }
};

// Services pour les ventes de crédit
export const venteCreditService = {
  async create(data: Omit<VenteCredit, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.VENTES_CREDIT), {
      ...data,
      date: Timestamp.fromDate(new Date(data.date))
    });
    return docRef.id;
  },

  async getByShop(shopId: string): Promise<VenteCredit[]> {
    const q = query(
      collection(db, COLLECTIONS.VENTES_CREDIT),
      where('shopId', '==', shopId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      date: doc.data().date.toDate().toISOString().split('T')[0]
    } as VenteCredit));
  },

  async getAllForAdmin(adminUser: User): Promise<VenteCredit[]> {
    if (isGlobalAdmin(adminUser)) {
      // Admin global voit toutes les ventes
      const q = query(
        collection(db, COLLECTIONS.VENTES_CREDIT),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        date: doc.data().date.toDate().toISOString().split('T')[0]
      } as VenteCredit));
    } else {
      // Admin de shop voit seulement les ventes de son shop
      return this.getByShop(adminUser.shopId);
    }
  }
};

// Services pour les clients
export const clientService = {
  async create(data: Omit<Client, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.CLIENTS), data);
    return docRef.id;
  },

  async getByShop(shopId: string): Promise<Client[]> {
    const q = query(
      collection(db, COLLECTIONS.CLIENTS),
      where('shopId', '==', shopId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id
    } as Client));
  },

  async getAllForAdmin(adminUser: User): Promise<Client[]> {
    if (isGlobalAdmin(adminUser)) {
      // Admin global voit tous les clients
      const snapshot = await getDocs(collection(db, COLLECTIONS.CLIENTS));
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Client));
    } else {
      // Admin de shop voit seulement les clients de son shop
      return this.getByShop(adminUser.shopId);
    }
  },

  async update(id: string, data: Partial<Client>): Promise<void> {
    const docRef = doc(db, COLLECTIONS.CLIENTS, id);
    await updateDoc(docRef, data);
  }
};

// Services pour les dépôts de cartes
export const depotService = {
  async create(data: Omit<DepotCarte, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.DEPOTS), {
      ...data,
      date: Timestamp.fromDate(new Date(data.date))
    });
    return docRef.id;
  },

  async getByShop(shopId: string): Promise<DepotCarte[]> {
    const q = query(
      collection(db, COLLECTIONS.DEPOTS),
      where('shopId', '==', shopId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      date: doc.data().date.toDate().toISOString().split('T')[0]
    } as DepotCarte));
  },

  async getAllForAdmin(adminUser: User): Promise<DepotCarte[]> {
    if (isGlobalAdmin(adminUser)) {
      // Admin global voit tous les dépôts
      const q = query(
        collection(db, COLLECTIONS.DEPOTS),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        date: doc.data().date.toDate().toISOString().split('T')[0]
      } as DepotCarte));
    } else {
      // Admin de shop voit seulement les dépôts de son shop
      return this.getByShop(adminUser.shopId);
    }
  }
};

// Services pour les transactions électroniques
export const transactionService = {
  async create(data: Omit<TransactionElectronique, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), {
      ...data,
      date: Timestamp.fromDate(new Date(data.date))
    });
    return docRef.id;
  },

  async getByShop(shopId: string): Promise<TransactionElectronique[]> {
    const q = query(
      collection(db, COLLECTIONS.TRANSACTIONS),
      where('shopId', '==', shopId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      date: doc.data().date.toDate().toISOString().split('T')[0]
    } as TransactionElectronique));
  },

  async getAllForAdmin(adminUser: User): Promise<TransactionElectronique[]> {
    if (isGlobalAdmin(adminUser)) {
      // Admin global voit toutes les transactions
      const q = query(
        collection(db, COLLECTIONS.TRANSACTIONS),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        date: doc.data().date.toDate().toISOString().split('T')[0]
      } as TransactionElectronique));
    } else {
      // Admin de shop voit seulement les transactions de son shop
      return this.getByShop(adminUser.shopId);
    }
  }
};

// Services pour les messages
export const messageService = {
  async create(data: Omit<Message, 'id'>): Promise<string> {
    const docRef = await addDoc(collection(db, COLLECTIONS.MESSAGES), {
      ...data,
      date: Timestamp.fromDate(new Date(data.date))
    });
    return docRef.id;
  },

  async getByShop(shopId: string): Promise<Message[]> {
    const q = query(
      collection(db, COLLECTIONS.MESSAGES),
      where('shopId', '==', shopId),
      orderBy('date', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      date: doc.data().date.toDate().toISOString()
    } as Message));
  },

  async getAllForAdmin(adminUser: User): Promise<Message[]> {
    if (isGlobalAdmin(adminUser)) {
      // Admin global voit tous les messages
      const q = query(
        collection(db, COLLECTIONS.MESSAGES),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        date: doc.data().date.toDate().toISOString()
      } as Message));
    } else {
      // Admin de shop voit seulement les messages de son shop
      return this.getByShop(adminUser.shopId);
    }
  },

  async getByUser(userId: string): Promise<Message[]> {
    // Récupérer les messages reçus par l'utilisateur
    const receivedQuery = query(
      collection(db, COLLECTIONS.MESSAGES),
      where('recipientId', '==', userId),
      orderBy('date', 'desc')
    );
    
    // Récupérer les messages envoyés par l'utilisateur
    const sentQuery = query(
      collection(db, COLLECTIONS.MESSAGES),
      where('senderId', '==', userId),
      orderBy('date', 'desc')
    );

    const [receivedSnapshot, sentSnapshot] = await Promise.all([
      getDocs(receivedQuery),
      getDocs(sentQuery)
    ]);

    const receivedMessages = receivedSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      date: doc.data().date.toDate().toISOString()
    } as Message));

    const sentMessages = sentSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      date: doc.data().date.toDate().toISOString()
    } as Message));

    // Combiner et trier par date
    const allMessages = [...receivedMessages, ...sentMessages];
    return allMessages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async markAsRead(id: string): Promise<void> {
    const docRef = doc(db, COLLECTIONS.MESSAGES, id);
    await updateDoc(docRef, { status: 'lu' });
  }
}; 