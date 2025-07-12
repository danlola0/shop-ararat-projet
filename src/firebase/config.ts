import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { getFunctions } from 'firebase/functions';

// Configuration Firebase - Clés réelles du projet
const firebaseConfig = {
  apiKey: "AIzaSyBN8Lk8tB0rQLsUuIwzrOTnaMYVTvoQNps",
  authDomain: "shop-ararat-projet.firebaseapp.com",
  projectId: "shop-ararat-projet",
  storageBucket: "shop-ararat-projet.firebasestorage.app",
  messagingSenderId: "952820320764",
  appId: "1:952820320764:web:a5ac7810f09297f0ea8a79",
  measurementId: "G-02D2LXT0QZ"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser les services Firebase
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);
export const functions = getFunctions(app);

export default app; 