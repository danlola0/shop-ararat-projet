const admin = require('firebase-admin');

// Initialiser Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Fonction pour attribuer le rôle admin
async function setAdminRole(email) {
  try {
    // Trouver l'utilisateur par email
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log('Utilisateur trouvé:', userRecord.uid, userRecord.email);
    
    // Attribuer le rôle admin
    await admin.auth().setCustomUserClaims(userRecord.uid, { 
      role: 'admin',
      shopId: 'ALL_SHOPS',
      shopName: 'Tous les shops'
    });
    
    console.log(`✅ Rôle admin attribué avec succès à ${email} (UID: ${userRecord.uid})`);
    console.log('🔑 Custom claims mis à jour. L\'utilisateur doit se déconnecter puis se reconnecter.');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'attribution du rôle admin:', error.message);
  }
}

// Fonction pour lister tous les utilisateurs avec leurs claims
async function listUsersWithClaims() {
  try {
    const listUsersResult = await admin.auth().listUsers();
    console.log('\n📋 Liste des utilisateurs et leurs custom claims:');
    console.log('='.repeat(60));
    
    listUsersResult.users.forEach(user => {
      console.log(`\n👤 ${user.email} (UID: ${user.uid})`);
      console.log(`   Claims:`, user.customClaims || 'Aucun claim');
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des utilisateurs:', error.message);
  }
}

// Exécution du script
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📖 Usage:');
    console.log('  node setAdminRole.js <email>     - Attribuer le rôle admin');
    console.log('  node setAdminRole.js --list      - Lister tous les utilisateurs');
    console.log('\n💡 Exemple: node setAdminRole.js admin@example.com');
    return;
  }
  
  if (args[0] === '--list') {
    await listUsersWithClaims();
  } else {
    const email = args[0];
    console.log(`🔧 Attribution du rôle admin à: ${email}`);
    await setAdminRole(email);
  }
  
  process.exit(0);
}

main().catch(console.error); 