export const ProductPreview = ({ data }: { data: any }) => {
  return (
    <div className="bg-[#111] p-8 rounded-3xl border border-white/10 sticky top-10 shadow-2xl">
      <h3 className="text-emerald-500 font-black uppercase tracking-[0.2em] text-[10px] mb-6 border-b border-white/5 pb-4">Vista Previa</h3>
      
      {/* Imagen */}
      <div className="aspect-square bg-gray-900 rounded-2xl mb-6 overflow-hidden border border-white/5">
        {data.image_url ? (
          <img src={data.image_url} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-700 font-black">SIN IMAGEN</div>
        )}
      </div>

      {/* Info */}
      <h2 className="text-2xl font-black uppercase tracking-tight leading-none mb-2">{data.name || "Nombre del Producto"}</h2>
      <p className="text-emerald-500 font-black text-xl mb-6">{data.price_custom ? `₲ ${Number(data.price_custom).toLocaleString()}` : "₲ 0"}</p>
      
      <div className="space-y-4 text-xs text-gray-500 font-bold uppercase tracking-wider">
        <p>Categoría: <span className="text-white">{data.category || "No asignada"}</span></p>
        <p>Tallas: <span className="text-white">{data.sizes?.join(', ') || "Ninguna"}</span></p>
        {data.patches?.length > 0 && <p>Parches: <span className="text-white">{data.patches.join(', ')}</span></p>}
      </div>
    </div>
  );
};