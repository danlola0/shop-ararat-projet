import os
import json
from firebase_admin import credentials, initialize_app, storage, firestore

# Configuration Firebase - Credentials réels
FIREBASE_CONFIG = {
  "type": "service_account",
  "project_id": "shop-ararat-projet",
  "private_key_id": "62f81536ebb8cb24e5c230cb0b374109ba75e42e",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCxnYvseMisG4qL\nWLDuvy6BMGc5VnwHIpZ+G0RjHI2mwp4ekN/KHELKfAH8tAkrsKJjtE6P5XKjMLxJ\nhSnqmqPExLDtMBuQKHWgfCmZJzLZryvpyzqKWOhZ8t/4SQKU+QP8rq+4KABnOnfK\nBvtHinGhhV+gqg3z0ofr5A5pLDz1wKogudZXVSsPican/KODnxGpnauKAYaqFwH1\nkwACh3ZO1VvI4z6/DvwEj/H4/Ju/m87S9OOIVti/2bQpj6C4KzthTH7sBe/2bEVt\ncWQ/4aYgHMSxyaafR/MBtlrkxRySt6Gs3tSbvKNxMHNVN9mkqDld2t2tfNW5uy5W\nYLKIrOQnAgMBAAECggEAIi3apM1TdIcyQIF3PuJMbTDm1EpXwLm/sxHFNbtjaOFP\nszsWzZplofh+G2Z700wA2+XxLlCtoEi7GvzEpbBPboiZMXOOAk4+4Hy0NpQr/Wbv\nsORaZhAY2mJaBjnqhMdspH3rM6mC9lpyfc6dIVW7ayUy00SWPcLYRCUVPtjz/Chd\n+pQAd05dS6ncCkARcXk2aSYY6unu2C84omicqMBIYEAtLiNiVOqLq2WjEbPmC3JL\nA3TiYxsDBFZrq/KWoBFeB48q7G4LEjaPoc8wYEp/iV6g2FYPUwGxRF2CbggyXea+\nTzV1wb64BH42BXgsvnnIdDtfPu5nV1Nc6bUNP/E0EQKBgQDyBD988A/YRa3qxCzA\nhyRRfKhz+D3mWlE8PyViP/5vV1BznZnFxay98l9FbRZ5/eLSGV/6/5fEq8MWAjDG\nCMFysZMCo1UHwBP9ZsFkX7sRah2bfjwPuJ3/EIH5x/T5FwtwtL5h170yMkkTa8+a\nXtox0TKan6jq5n1VRwlMtgvB9wKBgQC74Lff2N34JJ9SyeX1NCVqk+yO58N9MSuq\nnvzyFZ62y6mJqThkQMR3nqRzHSilfWO46+Ju4gNUw5q2gUoeDd/cYLzGNe99GYm4\n+NZMwhnGmSYKCHh0e5tiAxJ7+jNnBps/X0+X4Mg+hkfGJMcRvTZ1cpOg5mTjAWMX\ncoCdmB5jUQKBgQC7CL1n+L7GDVOTE3jicY6HyycEONzdoP8W6FYj0AD6Wyg5sZqd\nVV9ijGVEakHslWEtrZ6Xg9/uhi+GWrsG0M1vrfxHFaMpEjBgrYDX6YPQuYmYGb6h\nB7RS4pcQSo/v0PduasCXLPtyR5ph//e4/YTy6xGIncsVfntt5DAzsJz1kQKBgBLi\n2BkMd+PF6q4r1Y38m/ZGwHTtH12qX7VbHhpHyhieCIDqHd0WFangrK9VswxPuoKQ\nU8bJuYP/1cGa5ZR32JUStGdIbLaqpomNmh1FNcodAxHnIBS1iD0mCemkkR4+L8UD\nE8E0u2xtmzFz6P8DgkH0LpryDhozvX5R6FPvQr7BAoGAAfnha4gZlXzY0F6aWiDn\n174/IyO87qDqVPWwmKGDQBq43jeqmqpsoIfJGMG9l0bcvcaYeqH57k0XOb/u14yv\ndUqeYQx3OiIsL2hWb1RhgTs77CcZydumolTaMGq+CVAzgYWNty4j1HPMS3kBBrV1\nVTO1wc/z6X0+hiOo5o5MBYg=\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@shop-ararat-projet.iam.gserviceaccount.com",
  "client_id": "104655528005642383344",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40shop-ararat-projet.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}

# Alternative : Charger depuis un fichier JSON
def load_firebase_config_from_file(file_path="firebase-credentials.json"):
    """Charge la configuration depuis un fichier JSON"""
    try:
        if os.path.exists(file_path):
            with open(file_path, 'r') as f:
                return json.load(f)
        else:
            print(f"⚠️ Fichier {file_path} non trouvé, utilisation de la configuration par défaut")
            return FIREBASE_CONFIG
    except Exception as e:
        print(f"❌ Erreur lecture fichier config: {e}")
        return FIREBASE_CONFIG

# Initialiser Firebase
def initialize_firebase():
    """Initialise la connexion Firebase"""
    try:
        # Utiliser directement la configuration
        cred = credentials.Certificate(FIREBASE_CONFIG)
        initialize_app(cred, {
            'storageBucket': 'shop-ararat-projet.appspot.com'
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
    """Retourne le client Storage"""
    return storage.bucket()

# Instructions pour l'utilisateur
print("🔧 Configuration Firebase")
print("=" * 40)
print("Pour configurer Firebase :")
print("1. Ouvrez le fichier JSON téléchargé")
print("2. Copiez le contenu dans FIREBASE_CONFIG ci-dessus")
print("3. Ou placez le fichier JSON dans ce dossier sous le nom 'firebase-credentials.json'")
print("4. Relancez le script")
print("=" * 40) 