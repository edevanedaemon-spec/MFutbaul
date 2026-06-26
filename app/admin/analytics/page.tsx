"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  TrendingUp, DollarSign, Package, ShoppingCart, ArrowLeft, 
  Calendar, BarChart3, PieChart as PieIcon, Activity 
} from 'lucide-react';
import Link from 'next/link';

// Colores para gráficos
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('all');

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error fetching analytics:", error);
      } else {
        setOrders(data || []);
      }
      setLoading(false);
    }
    fetchAnalytics();
  }, []);

  // --- Lógica de Procesamiento de Datos (Optimizado) ---
  const stats = useMemo(() => {
    const now = new Date();
    const filteredOrders = orders.filter(order => {
      if (timeRange === 'all') return true;
      const orderDate = new Date(order.created_at);
      const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
      return timeRange === '7d' ? diffDays <= 7 : diffDays <= 30;
    });

    let salesAcc = 0;
    let profitAcc = 0;
    const itemCount: Record<string, number> = {};
    const statusCount: Record<string, number> = {};
    const history: Record<string, number> = {};

    filteredOrders.forEach(order => {
      // Ventas
      salesAcc += Number(order.total_amount);
      
      // Estado para gráfico de pastel
      statusCount[order.status] = (statusCount[order.status] || 0) + 1;

      // Historial
      const date = new Date(order.created_at).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit' });
      history[date] = (history[date] || 0) + Number(order.total_amount);

      // Productos
      const productsInOrder = order.items?.products || [];
      productsInOrder.forEach((item: any) => {
        itemCount[item.name] = (itemCount[item.name] || 0) + (item.quantity || 1);
        const venta = Number(item.price_at_purchase || 0);
        const costo = Number(item.cost_at_purchase || 0);
        profitAcc += (venta - costo) * Number(item.quantity || 1);
      });
    });

    const topItemsArray = Object.keys(itemCount).map(name => ({
      name,
      sales: itemCount[name]
    })).sort((a, b) => b.sales - a.sales).slice(0, 5);

    const statusArray = Object.keys(statusCount).map(status => ({
      name: status,
      value: statusCount[status]
    }));

    const historyArray = Object.keys(history).map(date => ({
      date,
      amount: history[date]
    }));

    return {
      totalSales: salesAcc,
      totalProfit: profitAcc,
      totalOrders: filteredOrders.length,
      avgOrderValue: filteredOrders.length ? salesAcc / filteredOrders.length : 0,
      topItems: topItemsArray,
      salesHistory: historyArray,
      statusDistribution: statusArray
    };
  }, [orders, timeRange]);

  const formatPYG = (amount: number) => {
    return new Intl.NumberFormat('es-PY', { 
      style: 'currency', 
      currency: 'PYG', 
      maximumFractionDigits: 0 
    }).format(amount);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] text-emerald-500">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <Activity size={48} />
        <p className="font-black uppercase tracking-widest text-sm">Procesando Inteligencia Logística...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <Link href="/admin" className="flex items-center gap-2 text-gray-500 hover:text-emerald-500 mb-4 transition-colors text-[10px] font-black uppercase tracking-widest">
              <ArrowLeft size={16} /> Volver al Panel
            </Link>
            <h1 className="text-4xl md:text-5xl font-black italic uppercase">Rendimiento <span className="text-emerald-500 text-not-italic">Logístico</span></h1>
          </div>
          
          <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
            {(['7d', '30d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === range ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}`}
              >
                {range === '7d' ? '7 Días' : range === '30d' ? '30 Días' : 'Histórico'}
              </button>
            ))}
          </div>
        </div>

        {/* Métricas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Ingresos Totales', value: formatPYG(stats.totalSales), icon: DollarSign, color: 'text-white' },
            { label: 'Ganancia Neta', value: formatPYG(stats.totalProfit), icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'Total Pedidos', value: stats.totalOrders.toString(), icon: Package, color: 'text-white' },
            { label: 'Ticket Promedio', value: formatPYG(stats.avgOrderValue), icon: ShoppingCart, color: 'text-white' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-[2rem] hover:border-emerald-500/30 transition-all">
              <div className="flex justify-between items-start mb-4">
                <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">{stat.label}</p>
                <stat.icon className="text-emerald-500" size={20} />
              </div>
              <h2 className={`text-2xl font-black ${stat.color}`}>{stat.value}</h2>
            </div>
          ))}
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Gráfico de Líneas Principal */}
          <div className="lg:col-span-2 bg-white/5 border border-white/5 p-8 rounded-[2.5rem]">
            <div className="flex items-center gap-2 mb-8">
              <BarChart3 className="text-emerald-500" size={18} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Flujo de Ingresos (Gs.)</h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.salesHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="date" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${(val/1000).toFixed(0)}k`} />
                  <Tooltip 
                    formatter={(value: number) => [formatPYG(value), 'Ingresos']}
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: '15px' }}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={4} dot={{ r: 4, fill: '#10b981' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico de Pie (Distribución) */}
          <div className="bg-white/5 border border-white/5 p-8 rounded-[2.5rem]">
            <div className="flex items-center gap-2 mb-8">
              <PieIcon className="text-emerald-500" size={18} />
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Estado de Órdenes</h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.statusDistribution} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {stats.statusDistribution.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #222' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sección de Productos Detallados */}
        <div className="bg-white/5 border border-white/5 p-8 rounded-[2.5rem]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 text-gray-400">Top Productos (Demanda)</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topItems} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#666" fontSize={9} width={120} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'rgba(255,255,255,0.02)'}} contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #222' }}/>
                  <Bar dataKey="sales" fill="#10b981" radius={[0, 10, 10, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-4">
              {stats.topItems.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500 font-black text-xs">
                      #{idx + 1}
                    </div>
                    <p className="text-xs font-bold text-white max-w-[200px] truncate">{item.name}</p>
                  </div>
                  <span className="text-emerald-500 font-black text-sm">{item.sales} und.</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}