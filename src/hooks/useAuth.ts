import { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { User } from '../types';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Écouter les changements d'état d'authentification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // Récupérer les custom claims du token
          const token = await firebaseUser.getIdTokenResult();
          const customClaims = token.claims;
          
          console.log('Custom claims récupérés:', customClaims);
          
        // Récupérer les données utilisateur depuis Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as Omit<User, 'id'>;
            
            // Fusionner les données Firestore avec les custom claims
          setCurrentUser({
            id: firebaseUser.uid,
              ...userData,
              // Priorité aux custom claims pour role et shopId
              role: customClaims.role || userData.role || 'user',
              shopId: customClaims.shopId || userData.shopId || '',
              shopName: customClaims.shopName || userData.shopName || ''
          });
        } else {
            // Si pas de document Firestore, utiliser seulement les custom claims
          console.warn(`Aucun document Firestore trouvé pour l'utilisateur authentifié (${firebaseUser.email}, ${firebaseUser.uid})`);
            setCurrentUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              nom: '',
              prenom: '',
              sexe: 'M',
              poste: '',
              telephone: '',
              role: customClaims.role || 'user',
              shopId: customClaims.shopId || '',
              shopName: customClaims.shopName || '',
              createdAt: new Date().toISOString()
            });
          }
        } catch (error) {
          console.error('Erreur lors de la récupération des données utilisateur:', error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Connexion
  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      throw error;
    }
  };

  // Inscription
  const register = async (email: string, password: string, userData: Omit<User, 'id'>) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Créer le document utilisateur dans Firestore
      const newUser: User = {
        id: user.uid,
        ...userData
      };
      
      await setDoc(doc(db, 'users', user.uid), newUser);
      return user;
    } catch (error: any) {
      console.error('Erreur lors de l’inscription Firebase Auth:', error);
      alert(error.message || JSON.stringify(error));
      throw error;
    }
  };

  // Déconnexion
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  return {
    currentUser,
    loading,
    login,
    register,
    logout
  };
};