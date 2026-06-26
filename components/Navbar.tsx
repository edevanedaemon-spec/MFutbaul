"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  ShoppingCart, 
  User, 
  LogOut, 
  Menu, 
  X, 
  UserCircle2,
  LayoutDashboard
} from 'lucide-react';

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [cartCount, setCartCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // 1. Verificar sesión inicial
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    checkUser();

    // 2. Escuchar cambios en la autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // 3. Escuchar cambios en el carrito (localStorage)
    const updateCartCount = () => {
      const savedCart = JSON.parse(localStorage.getItem('mochi_cart') || '[]');
      const totalItems = savedCart.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0);
      setCartCount(totalItems);
    };

    updateCartCount();
    window.addEventListener('storage', updateCartCount);
    window.addEventListener('cartUpdated', updateCartCount);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cartUpdated', updateCartCount);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] bg-[#050505]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg rotate-3 flex items-center justify-center">
            <span className="text-black font-black text-xl italic">M</span>
          </div>
          <span className="font-black uppercase tracking-tighter text-xl hidden sm:block text-white">
            Mochi <span className="text-emerald-500 italic">Football</span>
          </span>
        </Link>

        {/* NAVEGACIÓN DESKTOP */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors">Inicio</Link>
          <Link href="/catalog" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors">Catálogo</Link>
          <Link href="/about" className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors">Nosotros</Link>
        </div>

        {/* ACCIONES (Carrito / Perfil) */}
        <div className="flex items-center gap-4">
          
          {/* BOTÓN CARRITO */}
          <Link href="/cart" className="relative p-2.5 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all group">
            <ShoppingCart size={18} className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-black text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#050505] animate-in zoom-in">
                {cartCount}
              </span>
            )}
          </Link>

          {/* ESTADO DE USUARIO */}
          <div className="h-8 w-[1px] bg-white/10 mx-2 hidden sm:block"></div>

          {user ? (
            <div className="flex items-center gap-3">
              <Link 
                href="/profile" 
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all"
              >
                <UserCircle2 size={16} className="text-emerald-500" />
                <span className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Mi Perfil</span>
              </Link>
              
              <button 
                onClick={handleLogout}
                className="p-2.5 text-gray-500 hover:text-red-500 transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <Link 
              href="/login" 
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-xl hover:bg-emerald-500 hover:text-white transition-all group"
            >
              <User size={16} className="group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-widest">Ingresar</span>
            </Link>
          )}

          {/* MENU MOVIL (Toggle) */}
          <button 
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#0a0a0a] border-b border-white/5 p-6 flex flex-col gap-2 animate-in slide-in-from-top duration-300">
          <Link href="/" onClick={() => setIsMenuOpen(false)} className="text-xs font-black uppercase tracking-widest py-4 border-b border-white/5 text-gray-400 hover:text-emerald-500 transition-colors">
            Inicio
          </Link>
          <Link href="/catalog" onClick={() => setIsMenuOpen(false)} className="text-xs font-black uppercase tracking-widest py-4 border-b border-white/5 text-gray-400 hover:text-emerald-500 transition-colors">
            Catálogo
          </Link>
          {/* AHORA INCLUYE NOSOTROS */}
          <Link href="/about" onClick={() => setIsMenuOpen(false)} className="text-xs font-black uppercase tracking-widest py-4 border-b border-white/5 text-gray-400 hover:text-emerald-500 transition-colors">
            Nosotros
          </Link>
          
          {user ? (
            <Link href="/profile" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest py-4 text-emerald-500">
              <UserCircle2 size={16} />
              Mi Perfil
            </Link>
          ) : (
            <Link href="/login" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest py-4 text-white">
              <User size={16} />
              Ingresar a mi cuenta
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}