import React from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#9DC183', '#4B3621', '#E8E2DC', '#F9F7F5', '#D4A574'];

export function OrdersChart({ data }) {
  const chartData = data?.orders_by_day?.map(d => ({
    date: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    commandes: d.count
  })) || [];

  return (
    <div className="bg-white rounded-[32px] border border-[#E8E2DC] p-6 shadow-sm">
      <h3 className="font-black text-[#4B3621] uppercase text-xs tracking-widest mb-4">
        Évolution des commandes (30 jours)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E2DC" />
          <XAxis dataKey="date" stroke="#4B3621" />
          <YAxis stroke="#4B3621" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#4B3621', 
              color: '#fff',
              borderRadius: '12px',
              border: 'none'
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="commandes" 
            stroke="#9DC183" 
            strokeWidth={3}
            dot={{ fill: '#9DC183', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function UserActivityChart({ data }) {
  const chartData = data?.user_activity?.map(d => ({
    date: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    actions: d.count
  })) || [];

  return (
    <div className="bg-white rounded-[32px] border border-[#E8E2DC] p-6 shadow-sm">
      <h3 className="font-black text-[#4B3621] uppercase text-xs tracking-widest mb-4">
        Activité utilisateurs (30 jours)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E2DC" />
          <XAxis dataKey="date" stroke="#4B3621" />
          <YAxis stroke="#4B3621" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#4B3621', 
              color: '#fff',
              borderRadius: '12px',
              border: 'none'
            }}
          />
          <Legend />
          <Bar dataKey="actions" fill="#D4A574" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopSalespeopleChart({ data }) {
  const chartData = data?.top_salespeople?.slice(0, 5).map(s => ({
    name: s.username,
    commandes: s.commandes_count
  })) || [];

  return (
    <div className="bg-white rounded-[32px] border border-[#E8E2DC] p-6 shadow-sm">
      <h3 className="font-black text-[#4B3621] uppercase text-xs tracking-widest mb-4">
        Top Commerciaux
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E2DC" />
          <XAxis type="number" stroke="#4B3621" />
          <YAxis dataKey="name" type="category" width={100} stroke="#4B3621" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#4B3621', 
              color: '#fff',
              borderRadius: '12px',
              border: 'none'
            }}
          />
          <Bar dataKey="commandes" fill="#9DC183" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CriticalStockChart({ data }) {
  const chartData = data?.critical_stock?.slice(0, 10).map(s => ({
    name: s.nom_produit?.substring(0, 20) + '...',
    quantite: s.quantite
  })) || [];

  return (
    <div className="bg-white rounded-[32px] border border-[#E8E2DC] p-6 shadow-sm">
      <h3 className="font-black text-[#4B3621] uppercase text-xs tracking-widest mb-4">
        Stock Critique (≤10 unités)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E2DC" />
          <XAxis dataKey="name" stroke="#4B3621" angle={-45} textAnchor="end" height={80} />
          <YAxis stroke="#4B3621" />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#4B3621', 
              color: '#fff',
              borderRadius: '12px',
              border: 'none'
            }}
          />
          <Bar dataKey="quantite" fill="#EF4444" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ServerMetricsChart({ data }) {
  const memData = [
    { name: 'RAM', value: data?.memory?.usage_percent || 0, color: '#9DC183' },
    { name: 'Disponible', value: 100 - (data?.memory?.usage_percent || 0), color: '#E8E2DC' }
  ];

  return (
    <div className="bg-white rounded-[32px] border border-[#E8E2DC] p-6 shadow-sm">
      <h3 className="font-black text-[#4B3621] uppercase text-xs tracking-widest mb-4">
        Consommation Serveur
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2">Utilisation RAM</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={memData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {memData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#4B3621', 
                  color: '#fff',
                  borderRadius: '12px',
                  border: 'none'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-center font-bold text-[#4B3621] mt-2">
            {data?.memory?.usage_percent || 0}%
          </p>
        </div>
        <div className="space-y-4">
          <div className="bg-[#F9F7F5] rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase text-gray-400">CPU Cores</p>
            <p className="text-2xl font-black text-[#4B3621]">{data?.cpu?.cores || '—'}</p>
          </div>
          <div className="bg-[#F9F7F5] rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase text-gray-400">RAM Total</p>
            <p className="text-2xl font-black text-[#4B3621]">{data?.memory?.total || '—'} Go</p>
          </div>
          <div className="bg-[#F9F7F5] rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase text-gray-400">RAM Utilisée</p>
            <p className="text-2xl font-black text-[#4B3621]">{data?.memory?.used || '—'} Go</p>
          </div>
        </div>
      </div>
    </div>
  );
}
