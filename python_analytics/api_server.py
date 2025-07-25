#!/usr/bin/env python3
"""
Serveur API simple pour connecter React à Python
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import sys
from datetime import datetime
import threading
import time

# Import des modules locaux
from config import initialize_firebase
from data_extractor import DataExtractor
from data_analyzer import DataAnalyzer
from excel_generator import ExcelGenerator

app = Flask(__name__)
CORS(app)  # Permettre les requêtes depuis React

# Initialiser Firebase
initialize_firebase()

# Dossier pour les rapports générés
REPORTS_FOLDER = "/tmp/generated_reports"  # Utiliser /tmp sur Render
if not os.path.exists(REPORTS_FOLDER):
    os.makedirs(REPORTS_FOLDER)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Vérification de l'état du serveur"""
    return jsonify({
        "status": "ok",
        "message": "API Python Shop Ararat fonctionnelle",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/generate-report', methods=['POST'])
def generate_report():
    """Générer un rapport Excel"""
    try:
        data = request.json
        report_type = data.get('type', 'custom')  # React envoie 'type'
        shop_id = data.get('shopId', 'all')
        start_date = data.get('startDate')
        end_date = data.get('endDate')
        
        print(f"📊 Données reçues: type={report_type}, shop={shop_id}, dates={start_date} à {end_date}")
        
        print(f"Génération rapport: {report_type} pour shop {shop_id}")
        
        # Initialiser les classes
        extractor = DataExtractor()
        analyzer = DataAnalyzer()
        excel_gen = ExcelGenerator()
        
        # Définir les dates selon le type de rapport
        today = datetime.now().strftime("%Y-%m-%d")
        current_year = datetime.now().year
        
        if report_type == 'daily':
            # Rapport quotidien - données d'aujourd'hui
            start_date = today
            end_date = today
        elif report_type == 'monthly':
            # Rapport mensuel - données du mois en cours
            if not start_date:
                start_date = datetime.now().replace(day=1).strftime("%Y-%m-%d")
            if not end_date:
                end_date = today
        elif report_type == 'yearly':
            # Rapport annuel - données de l'année en cours
            start_date = f"{current_year}-01-01"
            end_date = today
        else:
            # Rapport personnalisé - utiliser les dates fournies ou toutes les données
            if not start_date and not end_date:
                start_date = None
                end_date = None
        
        print(f"📅 Extraction données: {start_date} à {end_date}")
        
        # Extraire les données
        operations_df = extractor.get_operations_data(
            start_date=start_date,
            end_date=end_date,
            shop_id=shop_id
        )
        
        depots_df = extractor.get_depots_data(
            start_date=start_date,
            end_date=end_date,
            shop_id=shop_id
        )
        
        clients_df = extractor.get_clients_data(shop_id=shop_id)
        
        mouvements_df = extractor.get_mouvements_data(
            start_date=start_date,
            end_date=end_date,
            shop_id=shop_id
        )
        
        # Générer le nom du fichier
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"rapport_{report_type}_{timestamp}.xlsx"
        filepath = os.path.join(REPORTS_FOLDER, filename)
        
        print(f"📁 Création fichier: {filepath}")
        
        # Créer le rapport Excel selon le type
        if report_type == 'monthly' and start_date:
            month_year = start_date[:7]  # YYYY-MM
            excel_gen.create_monthly_report(
                operations_df, depots_df, clients_df, mouvements_df,
                month_year, filepath
            )
        elif report_type == 'daily':
            # Rapport quotidien - données du jour actuel
            today = datetime.now().strftime("%Y-%m-%d")
            excel_gen.create_sales_report(
                operations_df, depots_df, clients_df, mouvements_df,
                filepath
            )
        elif report_type == 'yearly':
            # Rapport annuel - données de l'année en cours
            current_year = datetime.now().year
            excel_gen.create_sales_report(
                operations_df, depots_df, clients_df, mouvements_df,
                filepath
            )
        else:
            # Rapport personnalisé ou par défaut
            excel_gen.create_sales_report(
                operations_df, depots_df, clients_df, mouvements_df,
                filepath
            )
        
        # Vérifier si le fichier a été créé
        if os.path.exists(filepath):
            file_size = os.path.getsize(filepath)
            print(f"✅ Fichier créé: {filepath} ({file_size} bytes)")
        else:
            print(f"❌ Fichier non créé: {filepath}")
            raise Exception(f"Le fichier {filepath} n'a pas été créé")
        
        # Upload vers Firebase Storage
        download_url = excel_gen.upload_to_firebase(filename, "reports")
        
        if not download_url:
            print("⚠️ Échec de l'upload vers Firebase Storage")
            # Créer une URL temporaire pour le fichier local
            download_url = f"/api/download-report/{filename}"
        else:
            print(f"✅ Fichier uploadé vers Firebase: {download_url}")
        
        return jsonify({
            "success": True,
            "filename": filename,
            "downloadUrl": download_url,
            "localPath": filepath,
            "message": f"Rapport {report_type} généré avec succès"
        })
        
    except Exception as e:
        print(f"Erreur génération rapport: {e}")
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Erreur lors de la génération du rapport"
        }), 500

@app.route('/api/download-report/<filename>', methods=['GET'])
def download_report(filename):
    """Télécharger un rapport généré"""
    try:
        filepath = os.path.join(REPORTS_FOLDER, filename)
        if os.path.exists(filepath):
            return send_file(
                filepath,
                as_attachment=True,
                download_name=filename,
                mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
        else:
            return jsonify({
                "success": False,
                "error": "Fichier non trouvé"
            }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/list-reports', methods=['GET'])
def list_reports():
    """Lister tous les rapports disponibles depuis Firebase Storage"""
    try:
        from config import get_storage_client
        
        bucket = get_storage_client()
        
        reports = []
        blobs = bucket.list_blobs(prefix='reports/')
        
        for blob in blobs:
            if blob.name.endswith('.xlsx'):
                filename = blob.name.split('/')[-1]
                reports.append({
                    "filename": filename,
                    "size": f"{blob.size / 1024 / 1024:.1f} MB",
                    "createdAt": blob.time_created.isoformat(),
                    "downloadUrl": blob.generate_signed_url(
                        version="v4",
                        expiration=3600,  # 1 heure
                        method="GET"
                    ),
                    "shopName": "Shop"  # Par défaut
                })
        
        # Trier par date de création (plus récent en premier)
        reports.sort(key=lambda x: x['createdAt'], reverse=True)
        
        return jsonify({
            "success": True,
            "reports": reports
        })
        
    except Exception as e:
        print(f"Erreur list-reports: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/test-connection', methods=['GET'])
def test_connection():
    """Tester la connexion Firebase"""
    try:
        extractor = DataExtractor()
        
        # Tester l'extraction de quelques données
        operations_count = len(extractor.get_operations_data())
        shops_count = len(extractor.get_shops_data())
        
        return jsonify({
            "success": True,
            "message": "Connexion Firebase réussie",
            "data": {
                "operations": operations_count,
                "shops": shops_count
            }
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "message": "Erreur de connexion Firebase"
        }), 500

if __name__ == '__main__':
    print("🚀 Démarrage du serveur API Python Shop Ararat")
    print("📡 API disponible sur: http://localhost:5000")
    print("🔗 Endpoints disponibles:")
    print("  - GET  /api/health")
    print("  - POST /api/generate-report")
    print("  - GET  /api/download-report/<filename>")
    print("  - GET  /api/list-reports")
    print("  - GET  /api/test-connection")
    print("=" * 50)
    
    # Configuration pour Render
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    
    app.run(host='0.0.0.0', port=port, debug=debug) 