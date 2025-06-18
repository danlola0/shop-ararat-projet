# Configuration Firebase pour Shop Ararat Projet

## 🚀 Étapes de configuration

### 1. Créer un projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur "Créer un projet"
3. Nommez votre projet : `shop-ararat-projet`
4. Suivez les étapes de configuration

### 2. Activer les services Firebase

#### Authentication
1. Dans la console Firebase, allez dans "Authentication"
2. Cliquez sur "Commencer"
3. Dans l'onglet "Sign-in method", activez "Email/Password"
4. Cliquez sur "Activer" et "Enregistrer"

#### Firestore Database
1. Allez dans "Firestore Database"
2. Cliquez sur "Créer une base de données"
3. Choisissez "Mode production" ou "Mode test" (vous pourrez changer plus tard)
4. Sélectionnez l'emplacement de votre base de données (préférablement proche de vos utilisateurs)

### 3. Obtenir les clés de configuration

1. Dans la console Firebase, cliquez sur l'icône ⚙️ (Paramètres) à côté de "Vue d'ensemble du projet"
2. Sélectionnez "Paramètres du projet"
3. Allez dans l'onglet "Général"
4. Faites défiler jusqu'à "Vos applications"
5. Cliquez sur l'icône Web (</>) pour ajouter une application web
6. Nommez votre application : `shop-ararat-web`
7. Copiez la configuration Firebase

### 4. Configurer l'application

1. Ouvrez le fichier `src/firebase/config.ts`
2. Remplacez la configuration par défaut par vos vraies clés :

```typescript
const firebaseConfig = {
  apiKey: "votre-vraie-api-key",
  authDomain: "shop-ararat-projet.firebaseapp.com",
  projectId: "shop-ararat-projet",
  storageBucket: "shop-ararat-projet.appspot.com",
  messagingSenderId: "votre-messaging-sender-id",
  appId: "votre-app-id"
};
```

### 5. Configurer les règles Firestore

Dans la console Firebase, allez dans "Firestore Database" > "Règles" et remplacez les règles par :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Fonction pour vérifier si l'utilisateur est admin global
    function isGlobalAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.shopId == 'ALL_SHOPS';
    }
    
    // Fonction pour vérifier si l'utilisateur appartient au même shop
    function isSameShop(shopId) {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.shopId == shopId;
    }
    
    // Utilisateurs peuvent lire/écrire leurs propres données
    match /users/{userId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == userId || isGlobalAdmin());
    }
    
    // Collection shops - seulement les admins globaux peuvent gérer
    match /shops/{shopId} {
      allow read, write: if request.auth != null && isGlobalAdmin();
    }
    
    // Données du shop - utilisateurs du même shop ou admin global peuvent accéder
    match /echanges/{docId} {
      allow read, write: if request.auth != null && 
        (isGlobalAdmin() || isSameShop(resource.data.shopId));
    }
    
    match /ventes_credit/{docId} {
      allow read, write: if request.auth != null && 
        (isGlobalAdmin() || isSameShop(resource.data.shopId));
    }
    
    match /clients/{docId} {
      allow read, write: if request.auth != null && 
        (isGlobalAdmin() || isSameShop(resource.data.shopId));
    }
    
    match /depots/{docId} {
      allow read, write: if request.auth != null && 
        (isGlobalAdmin() || isSameShop(resource.data.shopId));
    }
    
    match /transactions/{docId} {
      allow read, write: if request.auth != null && 
        (isGlobalAdmin() || isSameShop(resource.data.shopId));
    }
    
    match /messages/{docId} {
      allow read, write: if request.auth != null && 
        (isGlobalAdmin() || 
         isSameShop(resource.data.shopId) ||
         resource.data.senderId == request.auth.uid ||
         resource.data.receiverId == request.auth.uid);
    }
  }
}
```

### 6. Créer les index Firestore

Pour les requêtes complexes, vous devrez créer des index. Firebase vous guidera automatiquement, mais voici les index recommandés :

1. Collection `echanges` : `shopId` (Ascending) + `date` (Descending)
2. Collection `ventes_credit` : `shopId` (Ascending) + `date` (Descending)
3. Collection `depots` : `shopId` (Ascending) + `date` (Descending)
4. Collection `transactions` : `shopId` (Ascending) + `date` (Descending)
5. Collection `messages` : `shopId` (Ascending) + `date` (Descending)

### 7. Tester l'application

1. Lancez l'application : `npm run dev`
2. Créez un premier compte administrateur
3. Testez la connexion/déconnexion
4. Vérifiez que les données sont bien sauvegardées dans Firestore

## 🔧 Fonctionnalités Firebase implémentées

### Authentication
- ✅ Connexion par email/mot de passe
- ✅ Inscription avec données utilisateur
- ✅ Déconnexion
- ✅ Persistance de session
- ✅ Protection des routes

### Firestore Database
- ✅ CRUD pour tous les types de données
- ✅ Requêtes par shop
- ✅ Requêtes par date
- ✅ Règles de sécurité
- ✅ Index optimisés

### Services disponibles
- `userService` : Gestion des utilisateurs
- `echangeService` : Échanges de monnaie
- `venteCreditService` : Ventes de crédit
- `clientService` : Gestion des clients
- `depotService` : Dépôts de cartes
- `transactionService` : Transactions électroniques
- `messageService` : Système de messagerie

## 🛡️ Sécurité

- Authentification requise pour toutes les opérations
- Isolation des données par shop
- Validation des données côté client et serveur
- Règles Firestore restrictives

## 📱 Responsive

L'application est entièrement responsive et fonctionne sur :
- 📱 Téléphones mobiles
- 📱 Tablettes
- 💻 Ordinateurs de bureau

## 🚀 Déploiement

Pour déployer l'application :

1. Build : `npm run build`
2. Déployez le dossier `dist` sur votre hébergeur préféré
3. Configurez les domaines autorisés dans Firebase Console

## 📞 Support

En cas de problème :
1. Vérifiez la configuration Firebase
2. Consultez les logs de la console
3. Vérifiez les règles Firestore
4. Testez avec un compte de test

## 👑 **Création du Compte Administrateur**

### 🎯 **Stratégie Recommandée**

L'administrateur doit créer son compte avec des **paramètres spéciaux** qui lui donnent accès à tous les shops :

#### **1. Configuration du Compte Admin**

```typescript
// Données pour l'administrateur principal
const adminData = {
  email: "admin@shopararat.com",
  password: "MotDePasseSecurise123!",
  nom: "Admin",
  prenom: "Principal",
  sexe: "M",
  poste: "Administrateur Principal",
  telephone: "+243 000 000 000",
  shopId: "ALL_SHOPS", // Clé spéciale pour accès global
  shopName: "Tous les Shops", // Nom descriptif
  role: "admin" // Rôle administrateur
};
```

#### **2. Logique d'Accès dans l'Application**

Je vais modifier le système pour reconnaître les administrateurs globaux :

```typescript
// Dans les services Firestore
export const isGlobalAdmin = (user: User) => {
  return user.role === 'admin' && user.shopId === 'ALL_SHOPS';
};

// Requêtes adaptées pour les admins
export const getDataForUser = async (user: User) => {
  if (isGlobalAdmin(user)) {
    // Admin voit toutes les données de tous les shops
    return getAllData();
  } else {
    // Utilisateur normal voit seulement son shop
    return getDataByShop(user.shopId);
  }
};
```

### **Modifications Nécessaires**

Je vais maintenant implémenter cette logique dans votre application : 