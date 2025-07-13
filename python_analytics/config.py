import os
import json
from firebase_admin import credentials, initialize_app, storage, firestore

# Configuration Firebase - Utilise les variables d'environnement
def get_firebase_config():
    """Récupère la configuration Firebase depuis les variables d'environnement"""
    # Essayer de récupérer depuis une variable d'environnement
    firebase_config_json = os.environ.get('FIREBASE_CONFIG')
    if firebase_config_json:
        try:
            return json.loads(firebase_config_json)
        except json.JSONDecodeError:
            print("❌ Erreur parsing FIREBASE_CONFIG JSON")
    
    # Fallback: essayer de charger depuis un fichier
    return load_firebase_config_from_file()

# Alternative : Charger depuis un fichier JSON
def load_firebase_config_from_file(file_path="firebase-credentials.json"):
    """Charge la configuration depuis un fichier JSON"""
    try:
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                return json.load(f)
        else:
            print(f"⚠️ Fichier {file_path} non trouvé")
            print("💡 Veuillez configurer FIREBASE_CONFIG dans les variables d'environnement")
            return None
    except Exception as e:
        print(f"❌ Erreur lecture fichier config: {e}")
        return None

# Initialiser Firebase
def initialize_firebase():
    """Initialise la connexion Firebase"""
    try:
        # Récupérer la configuration
        firebase_config = get_firebase_config()
        if not firebase_config:
            print("❌ Impossible de récupérer la configuration Firebase")
            return False
            
        cred = credentials.Certificate(firebase_config)
        initialize_app(cred, {
            'storageBucket': 'shop-ararat-projet.firebasestorage.app'
        })
        print("✅ Firebase initialisé avec succès")
        return True
    except Exception as e:
        print(f"❌ Erreur d'initialisation Firebase: {e}")
        print("💡 Vérifiez que vos credentials sont corrects")
        return False

# Obtenir les instances
def get_firestore_client():
    """Retourne le client Firestore"""
    return firestore.client()

def get_storage_client():
    """Retourne le bucket Storage - Version corrigée"""
    return storage.bucket()

# Instructions pour l'utilisateur
print("🔧 Configuration Firebase")
print("=" * 40)
print("Pour configurer Firebase :")
print("1. Configurez la variable d'environnement FIREBASE_CONFIG avec votre JSON")
print("2. Ou placez le fichier JSON dans ce dossier sous le nom 'firebase-credentials.json'")
print("3. Relancez le script")
print("=" * 40) 