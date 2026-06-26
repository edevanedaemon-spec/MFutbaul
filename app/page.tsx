"use client";
import Link from 'next/link';
import { 
  Trophy, 
  ShieldCheck, 
  Zap, 
  Truck, 
  ArrowRight, 
  Star,
  ChevronDown
} from 'lucide-react';
import NextImage from 'next/image';

export default function HomePage() {
  return (
    <div className="bg-[#050505] text-white overflow-x-hidden">
      
      {/* 1. HERO SECTION: Impacto Visual */}
      <section className="relative min-h-[90vh] flex items-center justify-center pt-20 px-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent opacity-50" />
        
        <div className="relative z-10 max-w-5xl text-center">
  
		  {/* Logo añadido aquí */}
		  <div className="mb-6 flex justify-center">
			  <NextImage 
				src="https://hnyznuojbnohzkwjraxt.supabase.co/storage/v1/object/public/assets/MochiLogo.png"
				alt="Mochi Football Logo"
				width={120}
				height={120}
				className="object-contain"
			  />
			</div>

		  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
			<span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
			<span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
			  Calidad G5 Player Edition • Importación Directa
			</span>
		  </div>
		  
		  <h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-8">
			VIVE LA <span className="text-emerald-500 italic">PASIÓN</span><br />
			SIN LÍMITES
		  </h1>
		  
		  <p className="max-w-2xl mx-auto text-gray-400 text-sm md:text-base leading-relaxed mb-12">
			Entregamos la misma tecnología que usan los profesionales en el campo. Tejidos Dri-FIT Pro, escudos termosellados y el ajuste perfecto para el hincha más exigente de Paraguay.
		  </p>

		  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
			<Link href="/catalog" className="w-full sm:w-auto h-16 px-10 bg-white text-black font-black uppercase text-xs tracking-widest rounded-2xl flex items-center justify-center gap-3 hover:bg-emerald-500 hover:text-white transition-all duration-300">
			  Explorar Catálogo <ArrowRight size={16} />
			</Link>
			<Link href="#values" className="w-full sm:w-auto h-16 px-10 border border-white/10 text-gray-400 font-black uppercase text-xs tracking-widest rounded-2xl flex items-center justify-center hover:bg-white/5 transition-all">
			  Nuestra Calidad
			</Link>
		  </div>
		</div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-20">
          <ChevronDown size={32} />
        </div>
      </section>

      {/* 2. VALUE PROPOSITION: ¿Por qué Mochi? */}
      <section id="values" className="py-32 px-6 bg-[#080808]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Trophy className="text-emerald-500" size={32} />,
                title: "Calidad G5",
                desc: "Telas de alta tecnología con microperforaciones láser y detalles idénticos a los usados en competencia oficial."
              },
              {
                icon: <Truck className="text-emerald-500" size={32} />,
                title: "Envíos a todo el país",
                desc: "Logística eficiente para que tu pedido llegue a cualquier rincón de Paraguay con seguridad garantizada."
              },
              {
                icon: <ShieldCheck className="text-emerald-500" size={32} />,
                title: "Compra Protegida",
                desc: "Garantía de satisfacción. Revisamos cada costura antes de enviarte tu nueva piel."
              }
            ].map((feature, i) => (
              <div key={i} className="group p-8 rounded-[2.5rem] bg-white/5 border border-white/5 hover:border-emerald-500/30 transition-all duration-500">
                <div className="mb-6 group-hover:scale-110 transition-transform duration-500">{feature.icon}</div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-4">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. CTA & BRAND FOCUS: La especialidad de la casa */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-8 leading-none">
            ¿Buscas una versión <br />
            <span className="text-emerald-500 italic">específica?</span>
          </h2>
          <p className="text-gray-400 mb-12 italic font-medium">
            "Para los coleccionistas deportivos que buscan la misma perfección en sus indumentarias."
          </p>
          <div className="inline-block p-1 bg-white/5 rounded-3xl border border-white/10">
            <div className="bg-[#0a0a0a] rounded-[1.4rem] p-8 md:p-12 border border-white/5">
              <p className="text-sm md:text-lg text-gray-300 leading-relaxed mb-0">
                Somos especialistas en gestionar pedidos de jerseys retro, ediciones de jugador y lanzamientos exclusivos. Si no lo ves en el catálogo, lo conseguimos para vos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FOOTER SIMPLE */}
      <footer className="py-12 px-6 border-t border-white/5 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-600">
          © 2026 Mochi Football — Basado en Ciudad del Este, Paraguay
        </p>
      </footer>
    </div>
  );
}