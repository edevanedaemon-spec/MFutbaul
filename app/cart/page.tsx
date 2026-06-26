"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, ShoppingBag, Loader2, MessageCircle, UserCheck } from 'lucide-react';
import Link from 'next/link';

export default function CartPage() {
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [orderCompleted, setOrderCompleted] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(7500); 

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem('mochi_cart') || '[]');
    setCart(savedCart);

    async function loadInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(data);
      }

      const { data: settingsData } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'exchange_rate')
        .single();
      
      if (settingsData) {
        setExchangeRate(Number(settingsData.value));
      }
    }
    loadInitialData();
  }, []);

  // Formateador directo ya que los precios en localStorage vienen guardados en PYG
  const formatPYG = (amountInGs: number) => {
    return new Intl.NumberFormat('es-PY', { 
      style: 'currency', 
      currency: 'PYG', 
      maximumFractionDigits: 0 
    }).format(amountInGs);
  };

  // CÁLCULO TOTAL DIRECTO EN GUARANÍES
  const totalPYG = cart.reduce((acc, item) => {
    const itemPrice = item.price_custom || item.price || 0;
    return acc + (itemPrice * (item.quantity || 1));
  }, 0);

  // Equivalencia a USD informativa para el resumen
  const totalUSD = totalPYG / exchangeRate;

  const removeItem = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
    localStorage.setItem('mochi_cart', JSON.stringify(newCart));
  };

  const finishOrder = async () => {
    if (!profile) return alert("Inicia sesión por favor.");
    if (cart.length === 0) return alert("El carrito está vacío.");
    setLoading(true);

    try {
      // 1. Obtención de costos reales de la DB para control interno
      const productIds = cart.map(item => item.id);
      const { data: dbProducts, error: dbError } = await supabase
        .from('products')
        .select('id, price_original, url_original')
        .in('id', productIds);

      if (dbError) throw dbError;

      // 2. Construcción del Snapshot con toda la personalización de la remera
      const itemsSnapshot = {
        products: cart.map(item => {
          const dbProd = dbProducts?.find(p => p.id === item.id);
          
          return {
            id: item.id,
            name: item.name,
            image: item.image,
            size: item.size,
            patch: item.patch || "Sin Parche",
            dorsal: item.dorsal || "Sin Estampado",
            custom_name: item.custom_name || null,
            custom_number: item.custom_number || null,
            quantity: item.quantity || 1,
            price_at_purchase: item.price_custom || item.price, // Precio en PYG cobrado
            cost_at_purchase: dbProd?.price_original || 0,     // Costo para balance
            url_original: dbProd?.url_original || null
          };
        }),
        applied_exchange_rate: exchangeRate 
      };

      // 3. Inserción de la orden en Supabase (Guardando el total del carrito)
      const { data, error } = await supabase.from('orders').insert([{
        user_id: profile.id,
        customer_name: profile.full_name,
        whatsapp_number: profile.whatsapp,
        items: itemsSnapshot,
        total_amount: totalPYG, // Guardado nativo en Guaraníes
        status: 'pending'
      }]).select().single();

      if (error) throw error;
      
      localStorage.removeItem('mochi_cart');
      setOrderCompleted(data.id);

      // 4. Redacción del Mensaje de WhatsApp ultra detallado para producción
      const orderLink = `${window.location.origin}/order/${data.id}`;
      
      let productsDetailsText = "";
      cart.forEach((item, index) => {
        productsDetailsText += `\n*${index + 1}. ${item.name}*`;
        productsDetailsText += `\n   - Talle: ${item.size.replace("Adult Size ", "")}`;
        productsDetailsText += `\n   - Parche: ${item.patch}`;
        productsDetailsText += `\n   - Estampado: ${item.dorsal}`;
        if (item.custom_name && item.custom_number) {
          productsDetailsText += `\n   - -> Dorsal Personalizado: [${item.custom_number}] ${item.custom_name}`;
        }
        productsDetailsText += `\n   - Cantidad: ${item.quantity} x ${formatPYG(item.price_custom || item.price)}\n`;
      });
      
      const message = `¡Hola! Soy ${profile.full_name}. Realicé un nuevo pedido en Mochi Football.\n\n` +
                      `*ID de Orden:* ${data.id}\n` +
                      `*Detalles del Pedido:*${productsDetailsText}\n` +
                      `*Total a Pagar:* ${formatPYG(totalPYG)}\n\n` +
                      `*Ver detalle online:* ${orderLink}\n\n` +
                      `¿Me confirmarías el pedido y el método/QR de pago para agilizar?`;

      window.open(`https://wa.me/595992717588?text=${encodeURIComponent(message)}`, '_blank');
    } catch (err) {
      console.error("Error detallado:", err);
      alert("Error al procesar el pedido");
    } finally {
      loading && setLoading(false);
    }
  };

  if (cart.length === 0 && !orderCompleted) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white">
        <ShoppingBag size={48} className="opacity-20 mb-4" />
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Carrito Vacío</p>
        <Link href="/" className="mt-6 text-emerald-500 text-[10px] font-black uppercase border-b border-emerald-500">Volver a la tienda</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 px-6 pb-20">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* LISTADO DE ITEMS */}
        <div className="lg:col-span-2 space-y-6">
          <h1 className="text-3xl font-black uppercase italic">Tu Selección</h1>
          {cart.map((item, i) => (
            <div key={i} className="bg-white/5 border border-white/5 p-5 rounded-[2rem] flex flex-col sm:flex-row sm:items-center gap-6 relative group">
              <img src={item.image} className="w-20 h-20 object-contain rounded-2xl bg-white/5 p-2 self-center sm:self-auto" alt="" />
              
              <div className="flex-1 space-y-1">
                <h3 className="text-xs font-black uppercase tracking-tight pr-8">{item.name}</h3>
                
                <div className="text-[10px] text-gray-400 font-bold uppercase space-y-1">
                  <p>
                    <span className="text-gray-600">Talle:</span> <span className="text-white">{item.size.replace("Adult Size ", "")}</span> 
                    <span className="mx-2 text-gray-700">|</span> 
                    <span className="text-gray-600">Cant:</span> <span className="text-white">{item.quantity}</span>
                  </p>
                  
                  <p>
                    <span className="text-gray-600">Parche:</span>{' '}
                    <span className={item.patch && item.patch !== 'Sin Parche' ? 'text-emerald-400' : 'text-gray-500'}>
                      {item.patch || "Sin Parche"}
                    </span>
                  </p>

                  <p>
                    <span className="text-gray-600">Estampado:</span>{' '}
                    <span className={item.dorsal && item.dorsal !== 'Sin Estampado' ? 'text-emerald-400' : 'text-gray-500'}>
                      {item.dorsal || "Sin Estampado"}
                    </span>
                  </p>
                </div>

                {/* Badge para datos de personalización de Dorsal */}
                {item.custom_name && item.custom_number && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg animate-in fade-in duration-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[9px] font-black uppercase tracking-wider text-emerald-400">
                      Personalizado: <span className="text-white font-mono bg-black/40 px-1.5 py-0.5 rounded">#{item.custom_number}</span> <span className="text-white">{item.custom_name}</span>
                    </p>
                  </div>
                )}

                <p className="text-sm font-black text-emerald-500 pt-2">
                  {formatPYG((item.price_custom || item.price) * (item.quantity || 1))}
                </p>
              </div>

              <button onClick={() => removeItem(i)} className="absolute top-4 right-4 sm:relative sm:top-0 sm:right-0 p-3 text-red-500/30 hover:text-red-500 transition-colors">
                <Trash2 size={16}/>
              </button>
            </div>
          ))}
        </div>

        {/* SIDEBAR RESUMEN */}
        <div className="lg:col-span-1">
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] sticky top-24">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-8">Resumen Final</h2>
            
            {profile && (
              <div className="mb-8 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center gap-3">
                <UserCheck className="text-emerald-500" size={16}/>
                <div>
                  <p className="text-[10px] font-black uppercase">{profile.full_name}</p>
                  <p className="text-[9px] text-gray-500 italic">Envío listo para coordinar</p>
                </div>
              </div>
            )}

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-end border-t border-white/5 pt-4">
                <span className="text-[10px] font-black uppercase text-emerald-500">Total Neto</span>
                <span className="text-2xl font-black italic">{formatPYG(totalPYG)}</span>
              </div>
            </div>

            <button onClick={finishOrder} disabled={loading || !profile} className="w-full h-16 bg-white text-black rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-40">
              {loading ? <Loader2 className="animate-spin"/> : <><MessageCircle size={20}/> Confirmar Pedido</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}