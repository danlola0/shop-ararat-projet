import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';

const RapportsCaissePage: React.FC = () => {
  const [rapports, setRapports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterShop, setFilterShop] = useState('ALL');
  const [filterUser, setFilterUser] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');
  const [shops, setShops] = useState<string[]>([]);
  const [users, setUsers] = useState<string[]>([]);

  useEffect(() => {
    const fetchRapports = async () => {
      setLoading(true);
      const q = query(collection(db, 'rapports_caisse'), orderBy('date', 'desc'));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRapports(data);
      setShops(Array.from(new Set(data.map(r => r.shopName))));
      setUsers(Array.from(new Set(data.map(r => r.userNom))));
      setLoading(false);
    };
    fetchRapports();
  }, []);

  const filteredRapports = rapports.filter(r => {
    if (filterShop !== 'ALL' && r.shopName !== filterShop) return false;
    if (filterUser !== 'ALL' && r.userNom !== filterUser) return false;
    if (filterDate && !r.date.startsWith(filterDate)) return false;
    return true;
  });

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Rapports de caisse reçus</h1>
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Shop</label>
          <select value={filterShop} onChange={e => setFilterShop(e.target.value)} className="px-2 py-1 border rounded">
            <option value="ALL">Tous</option>
            {shops.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">User</label>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="px-2 py-1 border rounded">
            <option value="ALL">Tous</option>
            {users.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="px-2 py-1 border rounded" />
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        {loading ? (
          <div className="text-gray-500">Chargement...</div>
        ) : filteredRapports.length === 0 ? (
          <div className="text-gray-400">Aucun rapport trouvé</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Shop</th>
                <th className="px-3 py-2 text-left">User</th>
                <th className="px-3 py-2 text-left">Observations</th>
                <th className="px-3 py-2 text-left">PDF</th>
              </tr>
            </thead>
            <tbody>
              {filteredRapports.map(r => (
                <tr key={r.id}>
                  <td className="px-3 py-2 whitespace-nowrap">{r.date ? new Date(r.date).toLocaleDateString() : '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.shopName}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.userNom}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.observation || '-'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.pdfUrl ? (
                      <button
                        onClick={() => window.open(r.pdfUrl, '_blank')}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                        title="Télécharger le rapport PDF"
                      >
                        📄 Télécharger
                      </button>
                    ) : '-' }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default RapportsCaissePage; 