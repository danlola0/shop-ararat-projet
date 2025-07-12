import pandas as pd
import xlsxwriter
from datetime import datetime
from config import get_storage_client

class ExcelGenerator:
    """Classe pour générer des fichiers Excel avec analyses"""
    
    def __init__(self):
        self.storage_bucket = get_storage_client()
    
    def create_sales_report(self, operations_df, depots_df, clients_df, mouvements_df, filename=None):
        """Crée un rapport de ventes complet en Excel"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"rapport_ventes_{timestamp}.xlsx"
        
        try:
            # Créer le fichier Excel
            with pd.ExcelWriter(filename, engine='xlsxwriter') as writer:
                workbook = writer.book
                
                # Formats
                header_format = workbook.add_format({
                    'bold': True,
                    'text_wrap': True,
                    'valign': 'top',
                    'fg_color': '#D7E4BC',
                    'border': 1
                })
                
                number_format = workbook.add_format({
                    'num_format': '#,##0.00',
                    'border': 1
                })
                
                percent_format = workbook.add_format({
                    'num_format': '0.00%',
                    'border': 1
                })
                
                # Onglet 1: Résumé général
                if not operations_df.empty:
                    summary_data = {
                        'Métrique': [
                            'Total des ventes',
                            'Nombre d\'opérations',
                            'Moyenne des ventes',
                            'Bénéfice estimé (15%)',
                            'Nombre de shops',
                            'Période de début',
                            'Période de fin'
                        ],
                        'Valeur': [
                            operations_df['total_general'].sum(),
                            len(operations_df),
                            operations_df['total_general'].mean(),
                            operations_df['total_general'].sum() * 0.15,
                            operations_df['shopId'].nunique(),
                            operations_df['date'].min().strftime('%Y-%m-%d'),
                            operations_df['date'].max().strftime('%Y-%m-%d')
                        ]
                    }
                    
                    summary_df = pd.DataFrame(summary_data)
                    summary_df.to_excel(writer, sheet_name='Résumé', index=False)
                    
                    # Formater l'onglet Résumé
                    worksheet = writer.sheets['Résumé']
                    worksheet.set_column('A:A', 25)
                    worksheet.set_column('B:B', 20, number_format)
                    worksheet.write(0, 0, 'Métrique', header_format)
                    worksheet.write(0, 1, 'Valeur', header_format)
                
                # Onglet 2: Ventes par jour
                if not operations_df.empty:
                    daily_sales = operations_df.groupby(operations_df['date'].dt.date).agg({
                        'total_general': 'sum',
                        'shopId': 'nunique'
                    }).reset_index()
                    
                    daily_sales.columns = ['Date', 'Total Ventes', 'Nombre Shops']
                    daily_sales['Bénéfice Estimé'] = daily_sales['Total Ventes'] * 0.15
                    
                    daily_sales.to_excel(writer, sheet_name='Ventes par Jour', index=False)
                    
                    # Formater l'onglet Ventes par Jour
                    worksheet = writer.sheets['Ventes par Jour']
                    worksheet.set_column('A:A', 15)
                    worksheet.set_column('B:D', 20, number_format)
                    for col_num, value in enumerate(daily_sales.columns.values):
                        worksheet.write(0, col_num, value, header_format)
                
                # Onglet 3: Ventes par shop
                if not operations_df.empty:
                    shop_sales = operations_df.groupby('shopId').agg({
                        'total_general': ['sum', 'mean', 'count']
                    }).round(2)
                    
                    shop_sales.columns = ['Total Ventes', 'Moyenne Ventes', 'Nombre Opérations']
                    shop_sales['Bénéfice Estimé'] = shop_sales['Total Ventes'] * 0.15
                    shop_sales = shop_sales.reset_index()
                    
                    shop_sales.to_excel(writer, sheet_name='Ventes par Shop', index=False)
                    
                    # Formater l'onglet Ventes par Shop
                    worksheet = writer.sheets['Ventes par Shop']
                    worksheet.set_column('A:A', 20)
                    worksheet.set_column('B:E', 20, number_format)
                    for col_num, value in enumerate(shop_sales.columns.values):
                        worksheet.write(0, col_num, value, header_format)
                
                # Onglet 4: Dépôts clients
                if not depots_df.empty:
                    client_deposits = depots_df.groupby('clientId').agg({
                        'montant': ['sum', 'count', 'mean'],
                        'date': ['min', 'max']
                    }).round(2)
                    
                    client_deposits.columns = [
                        'Total Dépôts', 'Nombre Dépôts', 'Moyenne Dépôt',
                        'Premier Dépôt', 'Dernier Dépôt'
                    ]
                    client_deposits = client_deposits.reset_index()
                    
                    client_deposits.to_excel(writer, sheet_name='Dépôts Clients', index=False)
                    
                    # Formater l'onglet Dépôts Clients
                    worksheet = writer.sheets['Dépôts Clients']
                    worksheet.set_column('A:A', 20)
                    worksheet.set_column('B:D', 20, number_format)
                    worksheet.set_column('E:F', 15)
                    for col_num, value in enumerate(client_deposits.columns.values):
                        worksheet.write(0, col_num, value, header_format)
                
                # Onglet 5: Mouvements de stock
                if not mouvements_df.empty:
                    stock_movements = mouvements_df.groupby(['type', 'devise']).agg({
                        'montant': ['sum', 'count', 'mean']
                    }).round(2)
                    
                    stock_movements.columns = ['Total Montant', 'Nombre Mouvements', 'Moyenne Montant']
                    stock_movements = stock_movements.reset_index()
                    
                    stock_movements.to_excel(writer, sheet_name='Mouvements Stock', index=False)
                    
                    # Formater l'onglet Mouvements Stock
                    worksheet = writer.sheets['Mouvements Stock']
                    worksheet.set_column('A:B', 15)
                    worksheet.set_column('C:E', 20, number_format)
                    for col_num, value in enumerate(stock_movements.columns.values):
                        worksheet.write(0, col_num, value, header_format)
                
                # Onglet 6: Données brutes - Opérations
                if not operations_df.empty:
                    operations_export = operations_df.copy()
                    operations_export['date'] = operations_export['date'].dt.strftime('%Y-%m-%d')
                    operations_export['createdAt'] = operations_export['createdAt'].dt.strftime('%Y-%m-%d %H:%M:%S')
                    
                    operations_export.to_excel(writer, sheet_name='Données Opérations', index=False)
                
                # Onglet 7: Données brutes - Dépôts
                if not depots_df.empty:
                    depots_export = depots_df.copy()
                    depots_export['date'] = depots_export['date'].dt.strftime('%Y-%m-%d')
                    depots_export['createdAt'] = depots_export['createdAt'].dt.strftime('%Y-%m-%d %H:%M:%S')
                    
                    depots_export.to_excel(writer, sheet_name='Données Dépôts', index=False)
            
            print(f"✅ Rapport Excel créé: {filename}")
            return filename
            
        except Exception as e:
            print(f"❌ Erreur création rapport Excel: {e}")
            return None
    
    def create_monthly_report(self, operations_df, depots_df, clients_df, mouvements_df, month_year, filename=None):
        """Crée un rapport mensuel spécifique"""
        if filename is None:
            filename = f"rapport_mensuel_{month_year}.xlsx"
        
        try:
            # Filtrer les données pour le mois spécifique
            month_start = pd.to_datetime(f"{month_year}-01")
            month_end = month_start + pd.offsets.MonthEnd(1)
            
            operations_month = operations_df[
                (operations_df['date'] >= month_start) & 
                (operations_df['date'] <= month_end)
            ]
            
            depots_month = depots_df[
                (depots_df['date'] >= month_start) & 
                (depots_df['date'] <= month_end)
            ]
            
            mouvements_month = mouvements_df[
                (mouvements_df['date'] >= month_start) & 
                (mouvements_df['date'] <= month_end)
            ]
            
            # Créer le rapport
            return self.create_sales_report(
                operations_month, depots_month, clients_df, mouvements_month, filename
            )
            
        except Exception as e:
            print(f"❌ Erreur création rapport mensuel: {e}")
            return None
    
    def upload_to_firebase(self, filename, folder="reports"):
        """Upload le fichier Excel vers Firebase Storage"""
        try:
            blob_name = f"{folder}/{filename}"
            blob = self.storage_bucket.blob(blob_name)
            
            blob.upload_from_filename(filename)
            
            # Rendre le fichier public
            blob.make_public()
            
            download_url = blob.public_url
            
            print(f"✅ Fichier uploadé vers Firebase: {download_url}")
            return download_url
            
        except Exception as e:
            print(f"❌ Erreur upload Firebase: {e}")
            return None 