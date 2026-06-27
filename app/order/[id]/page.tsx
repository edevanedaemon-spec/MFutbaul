"use client";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Package, Calendar, User, Hash, 
  CheckCircle2, XCircle, Loader2, 
  ShieldCheck as AdminIcon, TrendingUp,
  Truck, ArrowRight, MessageSquare
} from 'lucide-react';
import Link from 'next/link';

/**
 * OrdenDetail Component
 * 
 * Este componente es responsable de mostrar el detalle de una orden específica,
 * permitir la gestión del estado de la orden por parte del administrador y 
 * calcular las ganancias netas en Guaraníes.
 */
export default function OrderDetail() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  // Estados para la gestión de datos de la orden
  const [order, setOrder] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  /**
   * Efecto para cargar los datos cuando cambia el ID de la URL
   */
  useEffect(() => {
    if (id) {
      fetchOrderAndRole();
    }
  }, [id]);

  /**
   * Obtiene la información de la orden y verifica el rol del usuario actual.
   * Utiliza Supabase para consultar las tablas 'orders' y 'profiles'.
   */
  async function fetchOrderAndRole() {
    try {
      setLoading(true);
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();
      
      if (orderError) throw orderError;
      setOrder(orderData);

      // Verificación de permisos de administrador
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        
        if (profile?.role === 'admin') setIsAdmin(true);
      }
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Actualiza el estado de la orden en la base de datos de manera optimista.
   * @param newStatus El nuevo estado de la orden (pending, confirmed, etc.)
   */
  const updateStatus = async (newStatus: 'pending' | 'confirmed' | 'arrived' | 'delivered') => {
    if (!id) return;
    
    const previousStatus = order?.status;
    
    setOrder((prev: any) => prev ? { ...prev, status: newStatus } : null);
    setUpdating(true);
    
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', id)
        .select('*')
        .single();

      if (!error && data) {
        setOrder(data);
      } else {
        console.error("Supabase update error:", error);
        alert("Error al actualizar el estado del pedido");
        setOrder((prev: any) => prev ? { ...prev, status: previousStatus } : null);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("Ocurrió un error inesperado");
      setOrder((prev: any) => prev ? { ...prev, status: previousStatus } : null);
    } finally {
      setUpdating(false);
    }
  };

  /**
   * Elimina la orden de la base de datos previa confirmación.
   */
  const deleteOrder = async () => {
    if (!id) return;
    
    const confirmDelete = confirm("¿Estás completamente seguro de que deseas cancelar este pedido? Se eliminará definitivamente de la base de datos.");
    if (!confirmDelete) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (!error) {
        alert("Pedido cancelado y eliminado correctamente.");
        window.location.href = "/admin/orders";
      } else {
        console.error("Supabase delete error:", error);
        alert("Error al eliminar el pedido de la base de datos");
      }
    } catch (err) {
      console.error("Unexpected error on delete:", err);
      alert("Ocurrió un error inesperado al eliminar");
    } finally {
      setUpdating(false);
    }
  };

  /**
   * Formateador de moneda para Guaraníes (PYG).
   * @param amountInGs El monto en números.
   */
  const formatPYG = (amountInGs: number) => {
    return new Intl.NumberFormat('es-PY', { 
      style: 'currency', currency: 'PYG', maximumFractionDigits: 0 
    }).format(amountInGs || 0);
  };

  // Renderizado de carga
  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500" size={32} />
    </div>
  );

  // Manejo de error si no existe la orden
  if (!order) return <div className="text-white p-20 text-center uppercase font-black">Pedido no encontrado</div>;

  // Lógica de cálculo de costos y ganancias (sin tasas de cambio)
  const productList = order.items?.products || [];
  const totalAmountNum = Number(order.total_amount) || 0;

  /**
   * Cálculo del costo total.
   * Se asume que item.cost_at_purchase ya está en la moneda local (PYG).
   */
  const totalCostPYG = isAdmin 
    ? productList.reduce((acc: number, item: any) => acc + ((item.cost_at_purchase || 0) * (item.quantity || 1)), 0) 
    : 0;
  
  const totalProfitPYG = isAdmin ? (totalAmountNum - totalCostPYG) : 0;

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-20 px-4 md:px-6 pb-20">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER DEL PEDIDO - Responsivo */}
        <div className="bg-[#111] border border-white/5 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] mb-8 relative overflow-hidden">
          {isAdmin && (
            <div className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-2 bg-emerald-500/10 text-emerald-500 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-emerald-500/20">
              <AdminIcon size={14}/>
              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-tighter">Admin</span>
            </div>
          )}
          
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 md:p-4 bg-white/5 rounded-2xl text-emerald-500">
              <Package size={28} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter">Resumen del Pedido</h1>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Orden #{order.id?.slice(0,8)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-6 border-t border-white/5">
            <div className="flex items-center gap-3">
              <User className="text-gray-600" size={16}/>
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-bold">Cliente</p>
                <p className="text-sm font-bold uppercase">{order.customer_name || 'Sin nombre'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="text-gray-600" size={16}/>
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-bold">Fecha</p>
                <p className="text-sm font-bold">{order.created_at ? new Date(order.created_at).toLocaleDateString('es-PY') : '---'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Hash className="text-gray-600" size={16}/>
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-bold">Estado</p>
                <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase transition-all duration-300 ${
                  order.status === 'confirmed' ? 'bg-emerald-500 text-black' : 
                  order.status === 'arrived' ? 'bg-cyan-500 text-black' :
                  order.status === 'delivered' ? 'bg-blue-500 text-white' : 'bg-yellow-500 text-black'
                }`}>
                  {order.status === 'pending' ? 'Pendiente' : 
                   order.status === 'confirmed' ? 'Confirmado' : 
                   order.status === 'arrived' ? 'Arribado' :
                   order.status === 'delivered' ? 'Entregado' : order.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* TABLA DE PRODUCTOS - Optimizada para Móviles */}
        <div className="bg-[#111] border border-white/5 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px] md:min-w-full">
              <thead>
                <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="p-6 text-emerald-500">Detalles del Ítem</th>
                  <th className="p-6 text-center">Cant.</th>
                  <th className="p-6 text-right">Total Venta</th>
                  {isAdmin && <th className="p-6 text-right text-red-400">Costo Base</th>}
                  {isAdmin && <th className="p-6 text-right text-cyan-400">Ganancia</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
				  {productList.map((item: any, idx: number) => {
					const quantity = item.quantity || 1;
					const itemTotalPYG = (item.price_at_purchase || 0) * quantity;
					
					// Cálculo directo sin tasas de cambio
					const itemCostPYG = (item.cost_at_purchase || 0) * quantity;
					const itemProfitPYG = itemTotalPYG - itemCostPYG;

					return (
					  <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
						<td className="p-6 flex items-start gap-4">
						  <div className="w-14 h-14 md:w-16 md:h-16 bg-white/5 border border-white/5 rounded-2xl overflow-hidden flex-shrink-0 p-2">
							{item.image ? (
							  <img src={item.image} className="w-full h-full object-contain" alt="" />
							) : (
							  <div className="w-full h-full flex items-center justify-center text-gray-700 font-black text-xs">N/A</div>
							)}
						  </div>
						  <div className="space-y-1">
							<p className="text-xs font-black uppercase tracking-tight">{item.name}</p>
							<div className="text-[10px] text-gray-400 font-bold uppercase space-y-0.5">
							  <p><span className="text-gray-600">Talle:</span> <span className="text-white">{item.size?.replace("Adult Size ", "") || 'Único'}</span></p>
							  <p><span className="text-gray-600">Parche:</span> <span className="text-emerald-500/80">{item.patch || 'Sin Parche'}</span></p>
							  <p><span className="text-gray-600">Estampado:</span> <span className="text-emerald-500/80">{item.dorsal || 'Sin Estampado'}</span></p>
							</div>
							
							{item.custom_name && item.custom_number && (
							  <div className="mt-1 inline-block px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded">
								<p className="text-[9px] font-black uppercase tracking-wider text-emerald-400">
								  Dorsal: <span className="text-white">#{item.custom_number} {item.custom_name}</span>
								</p>
							  </div>
							)}

							{order.status === 'delivered' && (
							  <div className="pt-2">
								<Link 
								  href={`/products/${item.id || item.product_id}?review=true`}
								  className="inline-flex items-center gap-1.5 text-[10px] bg-emerald-500 text-black px-3 py-1.5 rounded-xl font-black uppercase tracking-tight hover:bg-emerald-400 transition-all shadow-md"
								>
								  <MessageSquare size={12} />
								  Dejar Reseña
								</Link>
							  </div>
							)}
						  </div>
						</td>

						<td className="p-6 text-center font-black text-sm">{quantity}</td>

						<td className="p-6 text-right whitespace-nowrap">
						  <p className="text-sm font-black text-white">{formatPYG(itemTotalPYG)}</p>
						</td>

						{isAdmin && (
						  <td className="p-6 text-right bg-red-500/5 whitespace-nowrap">
							<p className="text-sm font-bold text-red-400">
							  {itemCostPYG > 0 ? formatPYG(itemCostPYG) : '---'}
							</p>
						  </td>
						)}

						{isAdmin && (
						  <td className="p-6 text-right bg-cyan-500/5 whitespace-nowrap">
							<p className="text-sm font-black text-cyan-400">
							  {formatPYG(itemProfitPYG)}
							</p>
						  </td>
						)}
					  </tr>
					);
				  })}
				</tbody>
            </table>
          </div>
        </div>

        {/* ACCIONES Y RESUMEN INFERIOR */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* PANEL DE CONTROL LOGÍSTICO */}
          {isAdmin && (
            <div className="bg-[#111] border-2 border-dashed border-white/10 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem]">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-6 text-center">Gestión de Logística Avanzada</p>
              <div className="flex flex-col gap-3">
                
                <button 
                  onClick={() => updateStatus('confirmed')}
                  disabled={updating}
                  className={`w-full h-12 rounded-2xl font-black uppercase text-[10px] flex items-center justify-between px-6 transition-all border ${
                    order.status === 'confirmed' 
                      ? 'bg-emerald-500 text-black border-transparent shadow-lg shadow-emerald-500/10' 
                      : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-2"><CheckCircle2 size={16}/> 1. Confirmar</span>
                </button>

                <button 
                  onClick={() => updateStatus('arrived')}
                  disabled={updating}
                  className={`w-full h-12 rounded-2xl font-black uppercase text-[10px] flex items-center justify-between px-6 transition-all border ${
                    order.status === 'arrived' 
                      ? 'bg-cyan-500 text-black border-transparent shadow-lg shadow-cyan-500/10' 
                      : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-2"><Truck size={16}/> 2. Arribado (CDE)</span>
                </button>

                <button 
                  onClick={() => updateStatus('delivered')}
                  disabled={updating}
                  className={`w-full h-12 rounded-2xl font-black uppercase text-[10px] flex items-center justify-between px-6 transition-all border ${
                    order.status === 'delivered' 
                      ? 'bg-blue-500 text-white border-transparent shadow-lg shadow-blue-500/10' 
                      : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="flex items-center gap-2"><ArrowRight size={16}/> 3. Entregado</span>
                </button>

                <button 
                  onClick={deleteOrder}
                  disabled={updating}
                  className="w-full h-14 bg-white/5 text-red-500 border border-red-500/20 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-red-500/10 transition-all disabled:opacity-30 mt-4"
                >
                  <XCircle size={16}/> Cancelar Pedido
                </button>
              </div>
            </div>
          )}

          {/* TOTALES DE LA ORDEN - Panel derecho */}
          <div className={`space-y-4 ${!isAdmin ? 'md:col-start-2' : ''}`}>
            {isAdmin && (
              <div className="bg-cyan-500/10 border border-cyan-500/20 p-6 rounded-[2rem] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-cyan-500/20 rounded-xl text-cyan-400">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] text-cyan-500 font-black uppercase tracking-wider">Margen Neto</p>
                    <p className="text-xl font-black text-cyan-400 italic">{formatPYG(totalProfitPYG)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-emerald-500 p-8 rounded-[2rem] md:rounded-[2.5rem] text-black shadow-[0_20px_50px_-12px_rgba(16,185,129,0.4)]">
              <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Total a Pagar (Guaraníes)</p>
              <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter">
                {formatPYG(totalAmountNum)}
            </h2>
              <p className="text-[9px] font-bold uppercase mt-4 border-t border-black/10 pt-4 opacity-50">
                Mochi Football - Resumen Final
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
