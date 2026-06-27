"use client";
import { 
  History, 
  Target, 
  Users2, 
  Globe2, 
  Search, 
  CheckCircle,
  Camera, // Usaremos Camera para Instagram
  Share2,  // Usaremos Share2 para redes en general
  MessageSquare
} from 'lucide-react';
import Image from 'next/image';

export default function AboutPage() {
  return (
    <div className="bg-[#050505] text-white min-h-screen">
      
      {/* 1. HERO: La Misión */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-end justify-between gap-8 mb-16">
            <div className="max-w-2xl">
              <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none mb-6">
                MÁS QUE UN <span className="text-emerald-500 italic">JERSEY</span>,<br />
                ES TU IDENTIDAD.
              </h1>
              <p className="text-gray-400 text-lg font-medium leading-relaxed">
                Nacimos en el corazón de la Triple Frontera con un objetivo claro: elevar el estándar de las prendas deportivas en Paraguay.
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 p-6 rounded-3xl">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Fundado en 2026</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. LA HISTORIA DEL FUNDADOR */}
	<section className="py-24 px-6 bg-[#080808] border-y border-white/5">
	  <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
		
		{/* Contenedor de la imagen */}
		{/* Contenedor de la imagen */}
		{/* He añadido h-[300px] para móviles y h-auto para desktops */}
		<div className="relative h-[300px] sm:h-[400px] lg:h-auto lg:aspect-square max-w-md w-full mx-auto lg:mx-0">
		  
		  {/* Capa decorativa (ajustada para que no estorbe si es necesario) */}
		  <div className="absolute inset-0 border-2 border-emerald-500 rounded-[3rem] translate-x-4 translate-y-4" />
		  
		  <div className="relative w-full h-full rounded-[3rem] overflow-hidden border border-white/10">
			<Image
			  src="https://hnyznuojbnohzkwjraxt.supabase.co/storage/v1/object/public/assets/MoisesBento.png"
			  alt="Moisés Bento - Fundador de Mochi Football"
			  fill
			  className="object-cover"
			  priority
			  sizes="(max-width: 768px) 100vw, 50vw" // Importante para rendimiento con 'fill'
			/>
		  </div>
		</div>
		
		{/* Contenido de texto */}
		<div className="space-y-8">
		  <div className="inline-block px-4 py-1 bg-emerald-500 text-black text-[10px] font-black uppercase tracking-widest rounded-full">
			The Founder
		  </div>
		  <h2 className="text-4xl font-black uppercase tracking-tight">Moisés Bento</h2>
		  <div className="space-y-6 text-gray-400 leading-relaxed">
			<p>
			  Nacido en 1997 y movido por una pasión inagotable por el deporte, Moisés Bento fundó Mochi Football tras identificar una brecha en el mercado paraguayo: la falta de acceso a indumentaria deportiva de élite con atención personalizada.
			</p>
			<p>
			  Como amante de la estética retro y el alto rendimiento, Moisés transformó su visión en una plataforma que no solo vende productos, sino que gestiona deseos. "No se trata de vender una remera, se trata de que el cliente sienta que tiene en sus manos una pieza de colección".
			</p>
		  </div>
		</div>
	  </div>
	</section>

      {/* 3. NUESTROS TRES PILARES (Diferenciador) */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-500 mb-4">Nuestra Especialidad</h2>
            <p className="text-3xl font-black uppercase tracking-tight">¿Qué nos hace diferentes?</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Pilar 1 */}
            <div className="space-y-6 p-8 rounded-[2rem] bg-white/5 border border-white/5">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                <CheckCircle size={28} />
              </div>
              <h3 className="text-xl font-black uppercase">Personalización Total</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Desde nombres y números con tipografía oficial hasta parches de competiciones específicas. Tu jersey, tus reglas.
              </p>
            </div>

            {/* Pilar 2 */}
            <div className="space-y-6 p-8 rounded-[2rem] bg-white/5 border border-white/5">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
                <History size={28} />
              </div>
              <h3 className="text-xl font-black uppercase">Curaduría Retro</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Revivimos las épocas doradas del fútbol. Especialistas en localizar y traer esas piezas históricas que son difíciles de encontrar.
              </p>
            </div>

            {/* Pilar 3 */}
            <div className="space-y-6 p-8 rounded-[2rem] bg-emerald-500 text-black">
              <div className="w-14 h-14 bg-black/10 rounded-2xl flex items-center justify-center">
                <Search size={28} />
              </div>
              <h3 className="text-xl font-black uppercase">Personal Shopper</h3>
              <p className="text-sm font-bold opacity-80 leading-relaxed">
                ¿No está en nuestro catálogo? Nosotros lo buscamos por vos. Gestionamos pedidos especiales de jerseys exclusivos a nivel global.
              </p>
            </div>
          </div>
        </div>
      </section>

	{/* 4. CALL TO ACTION: Conecta */}
      <section className="py-32 px-6 bg-gradient-to-b from-[#050505] to-emerald-950/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-10">
            UNITE A LA COMUNIDAD <br />
            <span className="italic text-emerald-500">#MOCHIFOOTBALL</span>
          </h2>
          <div className="flex justify-center gap-6">
            <a href="https://www.instagram.com/mochifootball/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-emerald-500 transition-colors">
              <Camera size={20} /> Instagram
            </a>
			<a 
			  href="https://wa.me/595992717588" 
			  target="_blank" 
			  rel="noopener noreferrer" 
			  className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-emerald-500 transition-colors"
			>
			  <MessageSquare size={20} /> WhatsApp
			</a>
          </div>
        </div>
      </section>
    </div>
  );
}
