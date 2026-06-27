"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Procesando...');

    if (isRegistering) {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { full_name: fullName, whatsapp: whatsapp }
        }
      });
      
      if (error) {
        setMessage(error.message);
      } else {
        await supabase.from('profiles').insert([
          { id: data.user?.id, email, full_name: fullName, whatsapp: whatsapp }
        ]);
        setMessage('¡Registro exitoso! Ya puedes iniciar sesión.');
        setIsRegistering(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else {
        router.push('/'); 
        router.refresh();
      }
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 p-8 rounded-[2.5rem] shadow-2xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-white uppercase tracking-widest">
            {isRegistering ? 'Crear Cuenta' : 'Mochi Football'}
          </h2>
          <p className="text-gray-500 text-xs uppercase tracking-[0.2em] mt-2">
            {isRegistering ? 'Únete a la comunidad' : 'Bienvenido de nuevo'}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleAuth}>
          {isRegistering && (
            <>
              <input
                type="text"
                required
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white outline-none focus:border-emerald-500 transition-all text-sm"
                placeholder="Nombre Completo"
                onChange={(e) => setFullName(e.target.value)}
              />
              <input
                type="tel"
                required
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white outline-none focus:border-emerald-500 transition-all text-sm"
                placeholder="WhatsApp (+595...)"
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </>
          )}
          <input
            type="email"
            required
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white outline-none focus:border-emerald-500 transition-all text-sm"
            placeholder="Tu Email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            className="w-full bg-black border border-white/10 rounded-xl px-4 py-4 text-white outline-none focus:border-emerald-500 transition-all text-sm"
            placeholder="Contraseña"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button 
            type="submit" 
            className="w-full bg-emerald-500 text-black font-black py-4 uppercase tracking-widest rounded-2xl hover:bg-emerald-400 transition-all active:scale-95 mt-4"
          >
            {isRegistering ? 'Registrarse' : 'Entrar'}
          </button>
        </form>

        <div className="text-center mt-6">
          <button 
            onClick={() => setIsRegistering(!isRegistering)} 
            className="text-xs text-gray-500 hover:text-emerald-500 transition-colors uppercase font-bold tracking-widest"
          >
            {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
          
          {message && (
            <p className="mt-6 text-xs font-bold text-emerald-500 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
