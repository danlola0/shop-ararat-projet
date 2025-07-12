import pandas as pd
from datetime import datetime, timedelta
from config import get_firestore_client

class DataExtractor:
    """Classe pour extraire les données depuis Firebase"""
    
    def __init__(self):
        self.db = get_firestore_client()
    
    def get_operations_data(self, start_date=None, end_date=None, shop_id=None):
        """Extrait les données d'opérations"""
        try:
            # Construire la requête
            query = self.db.collection('operations')
            
            if shop_id and shop_id != 'all':
                query = query.where('shopId', '==', shop_id)
            
            if start_date:
                query = query.where('date', '>=', start_date)
            
            if end_date:
                query = query.where('date', '<=', end_date)
            
            # Exécuter la requête
            docs = query.stream()
            
            # Convertir en DataFrame
            operations_data = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                operations_data.append(data)
            
            df = pd.DataFrame(operations_data)
            
            if not df.empty:
                # Convertir les dates
                df['date'] = pd.to_datetime(df['date'])
                df['createdAt'] = pd.to_datetime(df['createdAt'])
                
                # Trier par date
                df = df.sort_values('date')
            
            print(f"✅ {len(df)} opérations extraites")
            return df
            
        except Exception as e:
            print(f"❌ Erreur extraction opérations: {e}")
            return pd.DataFrame()
    
    def get_depots_data(self, start_date=None, end_date=None, shop_id=None):
        """Extrait les données de dépôts"""
        try:
            query = self.db.collection('depots')
            
            if shop_id and shop_id != 'all':
                query = query.where('shopId', '==', shop_id)
            
            if start_date:
                query = query.where('date', '>=', start_date)
            
            if end_date:
                query = query.where('date', '<=', end_date)
            
            docs = query.stream()
            
            depots_data = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                depots_data.append(data)
            
            df = pd.DataFrame(depots_data)
            
            if not df.empty:
                df['date'] = pd.to_datetime(df['date'])
                df['createdAt'] = pd.to_datetime(df['createdAt'])
                df = df.sort_values('date')
            
            print(f"✅ {len(df)} dépôts extraits")
            return df
            
        except Exception as e:
            print(f"❌ Erreur extraction dépôts: {e}")
            return pd.DataFrame()
    
    def get_clients_data(self, shop_id=None):
        """Extrait les données de clients"""
        try:
            query = self.db.collection('clients')
            
            if shop_id and shop_id != 'all':
                query = query.where('shopId', '==', shop_id)
            
            docs = query.stream()
            
            clients_data = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                clients_data.append(data)
            
            df = pd.DataFrame(clients_data)
            
            if not df.empty and 'createdAt' in df.columns:
                df['createdAt'] = pd.to_datetime(df['createdAt'])
            
            print(f"✅ {len(df)} clients extraits")
            return df
            
        except Exception as e:
            print(f"❌ Erreur extraction clients: {e}")
            return pd.DataFrame()
    
    def get_mouvements_data(self, start_date=None, end_date=None, shop_id=None):
        """Extrait les données de mouvements"""
        try:
            query = self.db.collection('mouvements')
            
            if shop_id and shop_id != 'all':
                query = query.where('shopId', '==', shop_id)
            
            if start_date:
                query = query.where('date', '>=', start_date)
            
            if end_date:
                query = query.where('date', '<=', end_date)
            
            docs = query.stream()
            
            mouvements_data = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                mouvements_data.append(data)
            
            df = pd.DataFrame(mouvements_data)
            
            if not df.empty:
                df['date'] = pd.to_datetime(df['date'])
                df['createdAt'] = pd.to_datetime(df['createdAt'])
                df = df.sort_values('date')
            
            print(f"✅ {len(df)} mouvements extraits")
            return df
            
        except Exception as e:
            print(f"❌ Erreur extraction mouvements: {e}")
            return pd.DataFrame()
    
    def get_shops_data(self):
        """Extrait les données des shops"""
        try:
            docs = self.db.collection('shops').stream()
            
            shops_data = []
            for doc in docs:
                data = doc.to_dict()
                data['id'] = doc.id
                shops_data.append(data)
            
            df = pd.DataFrame(shops_data)
            print(f"✅ {len(df)} shops extraits")
            return df
            
        except Exception as e:
            print(f"❌ Erreur extraction shops: {e}")
            return pd.DataFrame() 