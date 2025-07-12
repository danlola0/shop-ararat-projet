# 🐍 Système d'Analyse Python - Shop Ararat

Ce système Python permet d'analyser les données de votre application Shop Ararat et de générer des rapports Excel automatiquement.

## 📁 Structure du Projet

```
python_analytics/
├── config.py              # Configuration Firebase
├── data_extractor.py      # Extraction des données depuis Firebase
├── data_analyzer.py       # Analyse des données avec pandas
├── excel_generator.py     # Génération des rapports Excel
├── main.py               # Script principal
├── requirements.txt      # Dépendances Python
└── README.md            # Ce fichier
```

## 🚀 Installation

### 1. Installer Python 3.8+

### 2. Installer les dépendances
```bash
cd python_analytics
pip install -r requirements.txt
```

### 3. Configurer Firebase
Modifiez `config.py` avec vos credentials Firebase :

```python
FIREBASE_CONFIG = {
    "type": "service_account",
    "project_id": "shop-ararat-projet",
    "private_key_id": "VOTRE_PRIVATE_KEY_ID",
    "private_key": "VOTRE_PRIVATE_KEY",
    "client_email": "VOTRE_CLIENT_EMAIL",
    "client_id": "VOTRE_CLIENT_ID",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "VOTRE_CERT_URL"
}
```

## 📊 Utilisation

### Rapport Général
```bash
python main.py
```

### Rapport avec Options
```bash
# Rapport du dernier mois pour un shop spécifique
python main.py --shop shop1 --period month

# Rapport pour une période spécifique
python main.py --start-date 2024-01-01 --end-date 2024-01-31

# Rapport mensuel spécifique
python main.py --month-year 2024-01

# Upload automatique vers Firebase Storage
python main.py --upload
```

### Rapports Automatiques
```bash
# Rapport quotidien (hier)
python main.py daily

# Rapport mensuel (mois précédent)
python main.py monthly
```

## 📈 Fonctionnalités

### 🔍 Extraction de Données
- **Opérations** : Ventes, rapports de fin de journée
- **Dépôts** : Transactions clients
- **Clients** : Informations clients
- **Mouvements** : Mouvements de stock/caisse
- **Shops** : Informations des boutiques

### 📊 Analyses Disponibles
- **Performances de vente** par jour/semaine/mois/année
- **Mouvements de stock** par type et devise
- **Comportement client** et top clients
- **Calcul des bénéfices** (estimation 15% de marge)
- **Statistiques récapitulatives**

### 📄 Rapports Excel
Le fichier Excel généré contient :

1. **Résumé** : Statistiques générales
2. **Ventes par Jour** : Évolution quotidienne
3. **Ventes par Shop** : Performance par boutique
4. **Dépôts Clients** : Analyse client
5. **Mouvements Stock** : Mouvements de caisse
6. **Données Opérations** : Données brutes
7. **Données Dépôts** : Données brutes

## 🔧 Configuration Avancée

### Automatisation avec Cron (Linux/Mac)
```bash
# Éditer le crontab
crontab -e

# Rapport quotidien à 6h du matin
0 6 * * * cd /chemin/vers/python_analytics && python main.py daily

# Rapport mensuel le 1er du mois à 7h
0 7 1 * * cd /chemin/vers/python_analytics && python main.py monthly
```

### Automatisation avec Task Scheduler (Windows)
1. Ouvrir "Planificateur de tâches"
2. Créer une tâche de base
3. Programmer l'exécution de `python main.py daily`

## 📁 Stockage Firebase

Les rapports sont automatiquement uploadés vers Firebase Storage dans :
- `reports/` : Rapports généraux
- `daily_reports/` : Rapports quotidiens
- `monthly_reports/` : Rapports mensuels

## 🛠️ Personnalisation

### Ajouter de Nouvelles Analyses
Modifiez `data_analyzer.py` pour ajouter vos propres analyses :

```python
def analyze_custom_metric(self, data_df):
    """Votre analyse personnalisée"""
    # Votre logique d'analyse
    return result
```

### Modifier les Rapports Excel
Modifiez `excel_generator.py` pour personnaliser les rapports :

```python
def create_custom_report(self, data_df, filename):
    """Votre rapport personnalisé"""
    # Votre logique de génération
    return filename
```

## 🔍 Dépannage

### Erreur de Connexion Firebase
- Vérifiez vos credentials dans `config.py`
- Assurez-vous que le service account a les bonnes permissions

### Erreur de Dépendances
```bash
pip install --upgrade -r requirements.txt
```

### Pas de Données
- Vérifiez que les dates sont correctes
- Assurez-vous que le shop_id existe

## 📞 Support

Pour toute question ou problème :
1. Vérifiez les logs dans la console
2. Testez avec une période plus courte
3. Vérifiez la connexion Firebase

## 🔄 Intégration avec l'App React

Ce système Python fonctionne indépendamment de votre application React. Il :
- Lit les mêmes données Firebase
- Génère des rapports Excel
- Les stocke dans Firebase Storage
- Ne perturbe pas votre application existante

Vous pouvez ensuite afficher les liens de téléchargement dans votre app React si nécessaire. 