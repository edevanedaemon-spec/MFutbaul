"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // Nuevo
  const [whatsapp, setWhatsapp] = useState(''); // Nuevo
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Procesando...');

    if (isRegistering) {
      // Registrar en Auth
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { // Guardamos estos datos en metadata para usarlos luego
            full_name: fullName,
            whatsapp: whatsapp
          }
        }
      });
      
      if (error) {
        setMessage(error.message);
      } else {
        // Insertar en la tabla de perfiles manualmente si no tienes un Trigger
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8 bg-white p-10 rounded-xl shadow-lg border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl font-serif font-bold uppercase tracking-tighter text-gray-900">
            {isRegistering ? 'Crear Cuenta' : 'Mochi Football'}
          </h2>
        </div>

        <form className="mt-8 space-y-4" onSubmit={handleAuth}>
          {isRegistering && (
            <>
              <input
                type="text"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-3 text-sm focus:border-black outline-none"
                placeholder="Nombre Completo"
                onChange={(e) => setFullName(e.target.value)}
              />
              <input
                type="tel"
                required
                className="w-full rounded-md border border-gray-300 px-3 py-3 text-sm focus:border-black outline-none"
                placeholder="WhatsApp (Ej: +595...)"
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </>
          )}
          <input
            type="email"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-3 text-sm focus:border-black outline-none"
            placeholder="Tu Email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-3 text-sm focus:border-black outline-none"
            placeholder="Contraseña"
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" className="w-full bg-black py-4 text-xs font-bold uppercase tracking-widest text-white rounded-sm">
            {isRegistering ? 'Registrarse' : 'Entrar'}
          </button>
        </form>

        <div className="text-center">
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-xs text-gray-400 hover:text-black underline">
            {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
          {message && <p className="mt-4 text-xs font-medium text-red-500">{message}</p>}
        </div>
      </div>
    </div>
  );
}