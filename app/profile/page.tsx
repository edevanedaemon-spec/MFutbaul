"use client";
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  User, Package, AlertCircle, LayoutDashboard, LogOut, Clock, ChevronRight,
  Sparkles, Accessibility, Ruler, X, MapPin, CreditCard, ShoppingBag, 
  CheckCircle2, Truck, RefreshCw, Info, Copy
} from 'lucide-react';
import Link from 'next/link';
import { getRecommendedSize, ProductVersion } from '@/lib/sizingEngine';

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES Y TIPOS
// ─────────────────────────────────────────────────────────────────────────────
interface OrderItem {
  id: string;
  name: string;
  price_at_purchase: number;
  quantity: number;
  image?: string;
  size?: string;
}

interface OrderData {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  address: string;
  items: {
    products: OrderItem[];
  };
}


// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'details'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);
  const [sizeCategory, setSizeCategory] = useState<'masculino' | 'femenino' | 'infantil'>('masculino');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);


  const [formData, setFormData] = useState({
    full_name: '',
    city: '',
    address: '',
	whatsapp: '',        // <--- Nuevo
    avatar_url: '',      // <--- Nuevo
    sizing_profile: {
      masculino: { height: '', weight: '' },
      femenino: { height: '', weight: '' },
      infantil: { height: '', weight: '', age: '' }
    }
  });


const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  try {
    setUploadingAvatar(true);
    
    // Crear un nombre de archivo único
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // 1. Subir a Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 2. Obtener la URL pública
    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // 3. Actualizar el estado del formulario con la nueva URL
    setFormData(prev => ({ ...prev, avatar_url: publicUrlData.publicUrl }));
    
    // Opcional: Guardar directamente en la base de datos sin esperar a presionar "Guardar Cambios"
    // await supabase.from('profiles').update({ avatar_url: publicUrlData.publicUrl }).eq('id', user.id);

  } catch (error) {
    console.error("Error subiendo la imagen:", error);
    alert("Error al subir la imagen");
  } finally {
    setUploadingAvatar(false);
  }
};

  const router = useRouter();

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      router.push('/login');
      return;
    }

    setUser(authUser);

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileData) {
      setProfile(profileData);
      let dbSizing = typeof profileData.sizing_profile === 'string' 
        ? JSON.parse(profileData.sizing_profile || '{}') 
        : (profileData.sizing_profile || {});

      setFormData({
        full_name: profileData.full_name || '',
        city: profileData.city || '',
        address: profileData.address || '',
		whatsapp: profileData.whatsapp || '',      // <--- Nuevo
		avatar_url: profileData.avatar_url || '',  // <--- Nuevo
        sizing_profile: {
          masculino: { height: dbSizing.masculino?.height ?? '', weight: dbSizing.masculino?.weight ?? '' },
          femenino: { height: dbSizing.femenino?.height ?? '', weight: dbSizing.femenino?.weight ?? '' },
          infantil: { height: dbSizing.infantil?.height ?? '', weight: dbSizing.infantil?.weight ?? '', age: dbSizing.infantil?.age ?? '' }
        }
      });
    }

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', authUser.id)
      .order('created_at', { ascending: false });

    setOrders(ordersData || []);
    setLoading(false);
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setUpdating(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          city: formData.city,
          address: formData.address,
		  whatsapp: formData.whatsapp,      // <--- Nuevo
		  avatar_url: formData.avatar_url,  // <--- Nuevo
          sizing_profile: formData.sizing_profile
        })
        .eq('id', user.id);

      if (!error) {
        alert("¡Datos actualizados con éxito!");
        await fetchUserData();
      } else {
        throw error;
      }
    } catch (err) {
      console.error(err);
      alert("Error al guardar cambios");
    } finally {
      setUpdating(false);
    }
  };

  const handleSizingChange = (category: 'masculino' | 'femenino' | 'infantil', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      sizing_profile: {
        ...prev.sizing_profile,
        [category]: {
          ...(prev.sizing_profile[category] || {}),
          [field]: value
        }
      }
    }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white pt-24 pb-24 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER PERFIL */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16 bg-[#0a0a0a] p-8 rounded-[3rem] border border-white/5">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 rounded-[2rem] border border-emerald-500/20 flex items-center justify-center text-emerald-500 overflow-hidden">
			  {profile?.avatar_url ? (
				<img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
			  ) : (
				<User size={40} />
			  )}
			</div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-tighter italic">{profile?.full_name || 'Usuario'}</h1>
              <p className="text-gray-500 font-mono text-sm">{user?.email}</p>
			  {profile?.whatsapp && (
				<p className="text-emerald-500 font-bold text-xs mt-1 flex items-center gap-2">
				  <span className="text-gray-500">WhatsApp:</span> {profile.whatsapp}
				</p>
			  )}
            </div>
          </div>
		  {/* Botón de Dashboard - Solo para Admins */}
			{profile?.role === 'admin' && (
			  <Link 
				href="/admin" 
				className="h-12 px-6 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center gap-2"
			  >
				<LayoutDashboard size={16} /> 
				Dashboard
			  </Link>
			)}
          <div className="flex gap-4">
             <button onClick={handleLogout} className="h-14 px-8 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center gap-3">
              <LogOut size={16} /> Salir
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN */}
        <div className="flex gap-8 border-b border-white/10 mb-12 overflow-x-auto">
          {['orders', 'details'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-6 px-2 text-sm font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-gray-500 hover:text-white'}`}
            >
              {tab === 'orders' ? 'Mis Pedidos' : 'Perfil y Medidas'}
            </button>
          ))}
        </div>

        {/* CONTENIDO PEDIDOS */}
        {activeTab === 'orders' && (
          <div className="grid gap-6">
            {orders.length > 0 ? orders.map((order) => (
              <div key={order.id} className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 hover:border-emerald-500/20 transition-all">
                <div className="flex items-center gap-6 w-full">
                  <div className={`p-4 rounded-2xl ${order.status === 'concretado' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    <Package size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Pedido ID: {order.id.slice(0,8).toUpperCase()}</p>
                    <p className="text-lg font-black">{Number(order.total_amount).toLocaleString()} Gs.</p>
                    <div className="flex gap-4 mt-2">
                       <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase"><Clock size={12} /> {new Date(order.created_at).toLocaleDateString()}</span>
                       <span className="text-[10px] uppercase font-black bg-white/5 px-3 py-1 rounded-full">{order.status}</span>
                    </div>
                  </div>
                </div>
				<Link 
				  href={`/order/${order.id}`}
				  className="flex items-center justify-center w-full md:w-auto h-14 px-8 bg-white/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-all"
				>
				  Ver Detalles
				</Link>
              </div>
            )) : (
              <div className="text-center py-24 bg-[#0a0a0a] rounded-[3rem] border border-dashed border-white/10">
                <ShoppingBag className="mx-auto text-gray-700 mb-6" size={48} />
                <h3 className="font-black text-xl mb-2">Sin pedidos todavía</h3>
                <p className="text-gray-500 text-sm">Explora el catálogo y realiza tu primer pedido.</p>
              </div>
            )}
          </div>
        )}

        {/* CONTENIDO PERFIL */}
        {activeTab === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              <form onSubmit={handleSaveChanges} className="space-y-8">
                <div className="bg-[#0a0a0a] p-8 md:p-10 rounded-[2.5rem] border border-white/5 space-y-6">
                  <h3 className="font-black text-lg text-emerald-500 uppercase tracking-wider flex items-center gap-3">
                    <User size={20} /> Datos Personales
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
						<label className="text-[10px] font-black uppercase text-gray-500">Nombre</label>
						<input type="text" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-6 text-sm outline-none focus:border-emerald-500" />
					  </div>
					  
					  {/* NUEVO CAMPO: WHATSAPP */}
					  <div className="space-y-2">
						<label className="text-[10px] font-black uppercase text-gray-500">WhatsApp</label>
						<input type="text" value={formData.whatsapp} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-6 text-sm outline-none focus:border-emerald-500" placeholder="Ej: 0992717588" />
					  </div>

					  <div className="space-y-2">
						<label className="text-[10px] font-black uppercase text-gray-500">Ciudad</label>
						<input type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-6 text-sm outline-none focus:border-emerald-500" />
					  </div>

					  {/* NUEVO CAMPO: AVATAR URL */}
					  <div className="space-y-2">
						  <label className="text-[10px] font-black uppercase text-gray-500">Foto de Perfil</label>
						  <div className="flex items-center gap-4">
							{/* Vista previa pequeña */}
							<div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
							  {formData.avatar_url ? (
								<img src={formData.avatar_url} className="w-full h-full object-cover" alt="Preview" />
							  ) : (
								<User size={20} className="text-gray-500" />
							  )}
							</div>
							
							{/* Input de archivo oculto */}
							<input 
							  type="file" 
							  id="avatar-upload" 
							  accept="image/*" 
							  className="hidden" 
							  onChange={handleAvatarUpload} 
							/>
							
							<label 
							  htmlFor="avatar-upload" 
							  className="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-4 rounded-2xl text-xs font-black uppercase transition-all"
							>
							  {uploadingAvatar ? 'Subiendo...' : 'Seleccionar Imagen'}
							</label>
						  </div>
						</div>

					  <div className="space-y-2 md:col-span-2">
						<label className="text-[10px] font-black uppercase text-gray-500">Dirección</label>
						<input type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl h-14 px-6 text-sm outline-none focus:border-emerald-500" />
					  </div>
                  </div>
                </div>

                <div className="bg-[#0a0a0a] p-8 md:p-10 rounded-[2.5rem] border border-white/5 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="font-black text-lg text-emerald-500 uppercase tracking-wider flex items-center gap-3">
                      <Ruler size={20} /> Mis Medidas
                    </h3>
                    <div className="flex bg-white/5 rounded-xl p-1">
                      {['masculino', 'femenino', 'infantil'].map((cat) => (
                        <button key={cat} type="button" onClick={() => setSizeCategory(cat as any)} className={`px-4 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${sizeCategory === cat ? 'bg-emerald-500 text-black' : 'text-gray-500'}`}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/[0.02] p-6 rounded-2xl">
                    {/* Campos dinámicos según categoría */}
                    {(['height', 'weight', 'age'] as const).map((field) => {
                       // Ocultar edad si no es infantil
                       if (field === 'age' && sizeCategory !== 'infantil') return null;
                       // Ocultar peso/altura según corresponda
                       return (
                         <div key={field} className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-500">{field === 'age' ? 'Edad' : field === 'height' ? 'Estatura (cm)' : 'Peso (kg)'}</label>
                            <input type="number" value={formData.sizing_profile[sizeCategory][field as any] || ''} onChange={(e) => handleSizingChange(sizeCategory, field, e.target.value)} className="w-full bg-black border border-white/10 rounded-xl h-12 px-4 text-sm outline-none focus:border-emerald-500" />
                         </div>
                       )
                    })}
                  </div>
                </div>

                <button type="submit" disabled={updating} className="w-full h-16 bg-emerald-500 text-black font-black uppercase text-xs tracking-[0.2em] rounded-2xl hover:bg-emerald-400 transition-all flex items-center justify-center gap-2">
                   {updating ? <><RefreshCw className="animate-spin" size={16}/> Guardando...</> : 'Guardar Cambios'}
                </button>
              </form>
            </div>

            {/* SIDEBAR SUGERENCIAS */}
            <div className="space-y-6">
              <div className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] p-8 sticky top-28">
                <h3 className="font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2 mb-6">
                  <Sparkles size={16} /> Talles Sugeridos
                </h3>
                <div className="space-y-6 text-[11px]">
                  {/* Adultos */}
                  <div className="space-y-4">
                    <p className="text-gray-500 uppercase font-bold border-b border-white/5 pb-2">Línea Adultos</p>
                    <div className="flex justify-between"><span className="text-gray-400">Fan:</span><span className="font-bold text-emerald-400">{getRecommendedSize('fans', formData.sizing_profile.masculino)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Player:</span><span className="font-bold text-emerald-400">{getRecommendedSize('player', formData.sizing_profile.masculino)}</span></div>
                  </div>
                  {/* Femenino */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <p className="text-gray-500 uppercase font-bold border-b border-white/5 pb-2">Línea Femenina</p>
                    <div className="flex justify-between"><span className="text-gray-400">Talle:</span><span className="font-bold text-emerald-400">{getRecommendedSize('women', formData.sizing_profile.femenino)}</span></div>
                  </div>
                  {/* Infantil */}
                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <p className="text-gray-500 uppercase font-bold border-b border-white/5 pb-2">Línea Kids / Infantiles</p>
                    <div className="flex justify-between"><span className="text-gray-400">Conjunto:</span><span className="font-bold text-emerald-400">{getRecommendedSize('kids_jersey', formData.sizing_profile.infantil)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Tracksuit:</span><span className="font-bold text-emerald-400">{getRecommendedSize('kids_tracksuit', formData.sizing_profile.infantil)}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}