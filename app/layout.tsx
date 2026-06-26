// app/layout.tsx
import Navbar from '@/components/Navbar';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-[#050505] text-white">
        <Navbar />
        {/* El padding-top (pt-20) evita que el contenido quede oculto bajo el navbar fixed */}
        <main className="pt-20">
          {children}
        </main>
      </body>
    </html>
  );
}