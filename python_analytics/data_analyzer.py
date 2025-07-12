import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

class DataAnalyzer:
    """Classe pour analyser les données extraites"""
    
    def __init__(self):
        pass
    
    def analyze_sales_performance(self, operations_df, period='month'):
        """Analyse les performances de vente"""
        if operations_df.empty:
            return pd.DataFrame()
        
        try:
            # Grouper par période
            if period == 'day':
                operations_df['period'] = operations_df['date'].dt.date
            elif period == 'week':
                operations_df['period'] = operations_df['date'].dt.to_period('W')
            elif period == 'month':
                operations_df['period'] = operations_df['date'].dt.to_period('M')
            elif period == 'year':
                operations_df['period'] = operations_df['date'].dt.to_period('Y')
            
            # Calculer les métriques
            analysis = operations_df.groupby('period').agg({
                'total_general': ['sum', 'mean', 'count'],
                'shopId': 'nunique'
            }).round(2)
            
            # Renommer les colonnes
            analysis.columns = ['total_ventes', 'moyenne_ventes', 'nombre_operations', 'nombre_shops']
            
            # Calculer les variations
            analysis['variation_ventes'] = analysis['total_ventes'].pct_change() * 100
            
            # Ajouter des métriques supplémentaires
            analysis['benefice_estime'] = analysis['total_ventes'] * 0.15  # 15% de marge estimée
            
            print(f"✅ Analyse des ventes par {period} terminée")
            return analysis
            
        except Exception as e:
            print(f"❌ Erreur analyse ventes: {e}")
            return pd.DataFrame()
    
    def analyze_stock_movements(self, mouvements_df, operations_df):
        """Analyse les mouvements de stock"""
        if mouvements_df.empty:
            return pd.DataFrame()
        
        try:
            # Analyser les mouvements par type
            mouvements_analysis = mouvements_df.groupby(['type', 'devise']).agg({
                'montant': ['sum', 'count', 'mean']
            }).round(2)
            
            mouvements_analysis.columns = ['total_montant', 'nombre_mouvements', 'moyenne_montant']
            
            # Analyser par shop
            mouvements_by_shop = mouvements_df.groupby('shopId').agg({
                'montant': ['sum', 'count'],
                'type': 'nunique'
            }).round(2)
            
            mouvements_by_shop.columns = ['total_montant', 'nombre_mouvements', 'types_differents']
            
            # Analyser les tendances temporelles
            mouvements_df['month'] = mouvements_df['date'].dt.to_period('M')
            mouvements_trend = mouvements_df.groupby('month').agg({
                'montant': 'sum',
                'type': 'count'
            }).round(2)
            
            mouvements_trend.columns = ['total_montant_mensuel', 'nombre_mouvements_mensuel']
            
            result = {
                'by_type': mouvements_analysis,
                'by_shop': mouvements_by_shop,
                'trend': mouvements_trend
            }
            
            print("✅ Analyse des mouvements de stock terminée")
            return result
            
        except Exception as e:
            print(f"❌ Erreur analyse mouvements: {e}")
            return {}
    
    def analyze_client_behavior(self, clients_df, depots_df):
        """Analyse le comportement des clients"""
        if clients_df.empty or depots_df.empty:
            return pd.DataFrame()
        
        try:
            # Analyser les dépôts par client
            client_analysis = depots_df.groupby('clientId').agg({
                'montant': ['sum', 'count', 'mean'],
                'date': ['min', 'max']
            }).round(2)
            
            client_analysis.columns = [
                'total_depots', 'nombre_depots', 'moyenne_depot',
                'premier_depot', 'dernier_depot'
            ]
            
            # Calculer la fréquence des dépôts
            client_analysis['frequence_depots'] = (
                client_analysis['dernier_depot'] - client_analysis['premier_depot']
            ).dt.days / client_analysis['nombre_depots']
            
            # Analyser par shop
            client_by_shop = depots_df.groupby('shopId').agg({
                'clientId': 'nunique',
                'montant': ['sum', 'mean'],
                'date': 'count'
            }).round(2)
            
            client_by_shop.columns = [
                'nombre_clients_uniques', 'total_depots', 'moyenne_depot', 'nombre_transactions'
            ]
            
            # Top clients
            top_clients = client_analysis.nlargest(10, 'total_depots')
            
            result = {
                'client_analysis': client_analysis,
                'by_shop': client_by_shop,
                'top_clients': top_clients
            }
            
            print("✅ Analyse du comportement client terminée")
            return result
            
        except Exception as e:
            print(f"❌ Erreur analyse clients: {e}")
            return {}
    
    def calculate_benefits(self, operations_df, mouvements_df):
        """Calcule les bénéfices"""
        if operations_df.empty:
            return pd.DataFrame()
        
        try:
            # Calculer les bénéfices par jour
            daily_benefits = operations_df.groupby(operations_df['date'].dt.date).agg({
                'total_general': 'sum'
            }).round(2)
            
            daily_benefits.columns = ['total_ventes_jour']
            
            # Calculer les bénéfices (estimation 15% de marge)
            daily_benefits['benefice_estime'] = daily_benefits['total_ventes_jour'] * 0.15
            
            # Calculer les variations
            daily_benefits['variation_ventes'] = daily_benefits['total_ventes_jour'].pct_change() * 100
            daily_benefits['variation_benefice'] = daily_benefits['benefice_estime'].pct_change() * 100
            
            # Analyser par shop
            shop_benefits = operations_df.groupby('shopId').agg({
                'total_general': ['sum', 'mean', 'count']
            }).round(2)
            
            shop_benefits.columns = ['total_ventes', 'moyenne_ventes', 'nombre_operations']
            shop_benefits['benefice_estime'] = shop_benefits['total_ventes'] * 0.15
            
            result = {
                'daily_benefits': daily_benefits,
                'shop_benefits': shop_benefits
            }
            
            print("✅ Calcul des bénéfices terminé")
            return result
            
        except Exception as e:
            print(f"❌ Erreur calcul bénéfices: {e}")
            return {}
    
    def generate_summary_stats(self, operations_df, depots_df, clients_df, mouvements_df):
        """Génère des statistiques récapitulatives"""
        try:
            summary = {}
            
            # Statistiques générales
            summary['total_operations'] = len(operations_df)
            summary['total_depots'] = len(depots_df)
            summary['total_clients'] = len(clients_df)
            summary['total_mouvements'] = len(mouvements_df)
            
            # Montants totaux
            if not operations_df.empty:
                summary['total_ventes'] = operations_df['total_general'].sum()
                summary['moyenne_ventes'] = operations_df['total_general'].mean()
                summary['benefice_estime'] = summary['total_ventes'] * 0.15
            
            if not depots_df.empty:
                summary['total_depots_montant'] = depots_df['montant'].sum()
                summary['moyenne_depot'] = depots_df['montant'].mean()
            
            if not mouvements_df.empty:
                summary['total_mouvements_montant'] = mouvements_df['montant'].sum()
            
            # Périodes
            if not operations_df.empty:
                summary['periode_debut'] = operations_df['date'].min()
                summary['periode_fin'] = operations_df['date'].max()
                summary['nombre_jours'] = (summary['periode_fin'] - summary['periode_debut']).days
            
            # Shops
            if not operations_df.empty:
                summary['nombre_shops'] = operations_df['shopId'].nunique()
            
            print("✅ Statistiques récapitulatives générées")
            return summary
            
        except Exception as e:
            print(f"❌ Erreur génération statistiques: {e}")
            return {} 