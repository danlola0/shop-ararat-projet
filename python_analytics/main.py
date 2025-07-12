#!/usr/bin/env python3
"""
Script principal pour l'analyse et l'export des données Shop Ararat
"""

import sys
import argparse
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

# Import des modules locaux
from config import initialize_firebase
from data_extractor import DataExtractor
from data_analyzer import DataAnalyzer
from excel_generator import ExcelGenerator

def main():
    """Fonction principale"""
    
    # Parser les arguments de ligne de commande
    parser = argparse.ArgumentParser(description='Analyse et export des données Shop Ararat')
    parser.add_argument('--period', choices=['day', 'week', 'month', 'year', 'all'], 
                       default='month', help='Période d\'analyse')
    parser.add_argument('--shop', type=str, default='all', 
                       help='ID du shop (ou "all" pour tous)')
    parser.add_argument('--start-date', type=str, 
                       help='Date de début (YYYY-MM-DD)')
    parser.add_argument('--end-date', type=str, 
                       help='Date de fin (YYYY-MM-DD)')
    parser.add_argument('--upload', action='store_true', 
                       help='Upload le fichier vers Firebase Storage')
    parser.add_argument('--month-year', type=str, 
                       help='Mois/Année pour rapport mensuel (YYYY-MM)')
    parser.add_argument('--all-data', action='store_true',
                       help='Extraire toutes les données sans filtre de date')
    
    args = parser.parse_args()
    
    print("🚀 Démarrage de l'analyse Shop Ararat")
    print("=" * 50)
    
    # Initialiser Firebase
    if not initialize_firebase():
        print("❌ Impossible d'initialiser Firebase. Arrêt.")
        sys.exit(1)
    
    # Initialiser les classes
    extractor = DataExtractor()
    analyzer = DataAnalyzer()
    excel_gen = ExcelGenerator()
    
    # Définir les dates
    if args.all_data:
        # Extraire toutes les données sans filtre de date
        start_date = None
        end_date = None
        print("📅 Extraction de TOUTES les données (sans filtre de date)")
    elif args.start_date and args.end_date:
        start_date = args.start_date
        end_date = args.end_date
    elif args.month_year:
        start_date = f"{args.month_year}-01"
        end_date = (datetime.strptime(start_date, "%Y-%m-%d") + relativedelta(months=1, days=-1)).strftime("%Y-%m-%d")
    else:
        # Par défaut: dernier mois
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - relativedelta(months=1)).strftime("%Y-%m-%d")
    
    print(f"📅 Période d'analyse: {start_date} à {end_date}")
    print(f"🏪 Shop: {args.shop}")
    print(f"📊 Période: {args.period}")
    
    # Extraire les données
    print("\n📥 Extraction des données...")
    
    operations_df = extractor.get_operations_data(
        start_date=start_date, 
        end_date=end_date, 
        shop_id=args.shop
    )
    
    depots_df = extractor.get_depots_data(
        start_date=start_date, 
        end_date=end_date, 
        shop_id=args.shop
    )
    
    clients_df = extractor.get_clients_data(shop_id=args.shop)
    
    mouvements_df = extractor.get_mouvements_data(
        start_date=start_date, 
        end_date=end_date, 
        shop_id=args.shop
    )
    
    shops_df = extractor.get_shops_data()
    
    # Afficher un aperçu des données trouvées
    print(f"\n📊 Aperçu des données trouvées:")
    print(f"  - Opérations: {len(operations_df)}")
    print(f"  - Dépôts: {len(depots_df)}")
    print(f"  - Clients: {len(clients_df)}")
    print(f"  - Mouvements: {len(mouvements_df)}")
    print(f"  - Shops: {len(shops_df)}")
    
    # Si des opérations existent, afficher les dates
    if not operations_df.empty:
        print(f"\n📅 Période des opérations:")
        print(f"  - Plus ancienne: {operations_df['date'].min()}")
        print(f"  - Plus récente: {operations_df['date'].max()}")
    
    # Vérifier si nous avons des données
    if operations_df.empty and depots_df.empty and mouvements_df.empty:
        print("\n⚠️ Aucune donnée trouvée pour la période spécifiée")
        print("💡 Essayez avec --all-data pour voir toutes les données")
        return
    
    # Analyser les données
    print("\n📈 Analyse des données...")
    
    # Statistiques récapitulatives
    summary_stats = analyzer.generate_summary_stats(
        operations_df, depots_df, clients_df, mouvements_df
    )
    
    if summary_stats:
        print("\n📊 Statistiques récapitulatives:")
        for key, value in summary_stats.items():
            print(f"  {key}: {value}")
    
    # Analyser les performances de vente
    if not operations_df.empty:
        sales_analysis = analyzer.analyze_sales_performance(operations_df, args.period)
        if not sales_analysis.empty:
            print(f"\n💰 Analyse des ventes par {args.period}:")
            print(sales_analysis.tail())
    
    # Analyser les mouvements de stock
    if not mouvements_df.empty:
        stock_analysis = analyzer.analyze_stock_movements(mouvements_df, operations_df)
        if stock_analysis:
            print(f"\n📦 Analyse des mouvements de stock:")
            if 'by_type' in stock_analysis and not stock_analysis['by_type'].empty:
                print(stock_analysis['by_type'])
    
    # Analyser le comportement client
    if not clients_df.empty and not depots_df.empty:
        client_analysis = analyzer.analyze_client_behavior(clients_df, depots_df)
        if client_analysis:
            print(f"\n👥 Analyse du comportement client:")
            if 'top_clients' in client_analysis and not client_analysis['top_clients'].empty:
                print("Top 5 clients:")
                print(client_analysis['top_clients'].head())
    
    # Calculer les bénéfices
    if not operations_df.empty:
        benefits_analysis = analyzer.calculate_benefits(operations_df, mouvements_df)
        if benefits_analysis:
            print(f"\n💵 Analyse des bénéfices:")
            if 'shop_benefits' in benefits_analysis and not benefits_analysis['shop_benefits'].empty:
                print(benefits_analysis['shop_benefits'])
    
    # Générer le rapport Excel
    print("\n📄 Génération du rapport Excel...")
    
    if args.month_year:
        filename = excel_gen.create_monthly_report(
            operations_df, depots_df, clients_df, mouvements_df, 
            args.month_year
        )
    else:
        filename = excel_gen.create_sales_report(
            operations_df, depots_df, clients_df, mouvements_df
        )
    
    if filename:
        print(f"✅ Rapport Excel créé: {filename}")
        
        # Upload vers Firebase si demandé
        if args.upload:
            print("\n☁️ Upload vers Firebase Storage...")
            download_url = excel_gen.upload_to_firebase(filename)
            if download_url:
                print(f"✅ Fichier disponible à: {download_url}")
            else:
                print("❌ Échec de l'upload")
        
        print(f"\n🎉 Analyse terminée avec succès!")
        print(f"📁 Fichier local: {filename}")
        
    else:
        print("❌ Échec de la génération du rapport Excel")

def run_daily_report():
    """Génère un rapport quotidien automatique"""
    print("📅 Génération du rapport quotidien...")
    
    # Initialiser Firebase
    if not initialize_firebase():
        return
    
    # Initialiser les classes
    extractor = DataExtractor()
    analyzer = DataAnalyzer()
    excel_gen = ExcelGenerator()
    
    # Date d'hier
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    # Extraire les données d'hier
    operations_df = extractor.get_operations_data(
        start_date=yesterday, 
        end_date=yesterday
    )
    
    depots_df = extractor.get_depots_data(
        start_date=yesterday, 
        end_date=yesterday
    )
    
    clients_df = extractor.get_clients_data()
    
    mouvements_df = extractor.get_mouvements_data(
        start_date=yesterday, 
        end_date=yesterday
    )
    
    # Générer le rapport
    filename = excel_gen.create_sales_report(
        operations_df, depots_df, clients_df, mouvements_df,
        f"rapport_quotidien_{yesterday}.xlsx"
    )
    
    if filename:
        # Upload automatique
        download_url = excel_gen.upload_to_firebase(filename, "daily_reports")
        print(f"✅ Rapport quotidien généré et uploadé: {download_url}")

def run_monthly_report():
    """Génère un rapport mensuel automatique"""
    print("📅 Génération du rapport mensuel...")
    
    # Initialiser Firebase
    if not initialize_firebase():
        return
    
    # Initialiser les classes
    extractor = DataExtractor()
    analyzer = DataAnalyzer()
    excel_gen = ExcelGenerator()
    
    # Mois précédent
    last_month = (datetime.now() - relativedelta(months=1)).strftime("%Y-%m")
    
    # Extraire toutes les données (pas de filtre de date pour avoir le contexte)
    operations_df = extractor.get_operations_data()
    depots_df = extractor.get_depots_data()
    clients_df = extractor.get_clients_data()
    mouvements_df = extractor.get_mouvements_data()
    
    # Générer le rapport mensuel
    filename = excel_gen.create_monthly_report(
        operations_df, depots_df, clients_df, mouvements_df, last_month
    )
    
    if filename:
        # Upload automatique
        download_url = excel_gen.upload_to_firebase(filename, "monthly_reports")
        print(f"✅ Rapport mensuel généré et uploadé: {download_url}")

if __name__ == "__main__":
    # Vérifier les arguments pour les rapports automatiques
    if len(sys.argv) > 1:
        if sys.argv[1] == "daily":
            run_daily_report()
        elif sys.argv[1] == "monthly":
            run_monthly_report()
        else:
            main()
    else:
        main() 