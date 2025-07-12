/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const functions = require("firebase-functions");

admin.initializeApp();

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

exports.deleteUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
  }

  const uid = request.data.uid;
  if (!(typeof uid === 'string') || uid.length === 0) {
    throw new HttpsError('invalid-argument', 'The function must be called with a "uid" argument.');
  }

  logger.info(`Request from ${request.auth.uid} to delete user ${uid}`);

  try {
    // Supprimer l'utilisateur de Firebase Authentication
    await admin.auth().deleteUser(uid);
    logger.info(`Successfully deleted user ${uid} from Auth.`);

    // Supprimer le document de l'utilisateur depuis Firestore
    const userDoc = admin.firestore().collection('users').doc(uid);
    await userDoc.delete();
    logger.info(`Successfully deleted user document ${uid} from Firestore.`);
    
    return { success: true, message: `User ${uid} deleted.` };
  } catch (error) {
    logger.error(`Error deleting user ${uid}:`, error);
    throw new HttpsError('internal', `Failed to delete user: ${error.message}`);
  }
});

exports.createUserWithFirestore = functions.https.onCall(async (data, context) => {
  // Vérifie que l'appelant est authentifié et admin global
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Vous devez être authentifié.");
  }
  const callerUid = context.auth.uid;
  const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "globalAdmin") {
    throw new functions.https.HttpsError("permission-denied", "Seul un administrateur global peut créer un utilisateur.");
  }

  // Crée l'utilisateur dans Auth
  const { email, password, nom, prenom, sexe, poste, telephone, shopId, shopName, role } = data;
  let userRecord;
  try {
    userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${prenom} ${nom}`,
      phoneNumber: telephone || undefined,
    });
  } catch (error) {
    throw new functions.https.HttpsError("already-exists", error.message);
  }

  // Crée le document Firestore
  const userData = {
    id: userRecord.uid,
    email,
    nom,
    prenom,
    sexe,
    poste,
    telephone,
    shopId,
    shopName,
    role,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  await admin.firestore().collection("users").doc(userRecord.uid).set(userData);

  return { uid: userRecord.uid };
});
