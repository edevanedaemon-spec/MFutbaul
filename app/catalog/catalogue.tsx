"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Search, Sparkles, LayoutGrid, ChevronRight, ChevronDown, Store, ShoppingBag } from 'lucide-react';

interface CategoryNode {
  name: string;
  fullName: string;
  children: Record<string, CategoryNode>;
}

export default function CatalogPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [rawCategories, setRawCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(0);
  const [exchangeRate, setExchangeRate] = useState<number>(7500);

  // NUEVO: Pestaña activa para dividir la visualización en el catálogo público
  const [activeTab, setActiveTab] = useState<'all' | 'scraping' | 'local'>('all');

  const [config, setConfig] = useState({
    price_fan: 270000,
    price_player: 300000,
    price_retro: 320000
  });
  
  const ITEMS_PER_PAGE = 24;

  useEffect(() => { 
    fetchActiveCategories(); 
    fetchSettingsAndExchange();
  }, []);

  // CORREGIDO: Se añade activeTab a las dependencias para refrescar al cambiar de pestaña
  useEffect(() => { 
    fetchProducts(); 
  }, [selectedCategory, page, search, activeTab]);

  const categoryTree = useMemo(() => {
    const root: Record<string, CategoryNode> = {};
    rawCategories.forEach(fullPathFromDB => {
      const parts = fullPathFromDB.split('>').map(p => p.trim()).filter(Boolean);
      let currentLevel = root;
      parts.forEach((part, index) => {
        if (!currentLevel[part]) {
          currentLevel[part] = {
            name: part,
            fullName: index === parts.length - 1 ? fullPathFromDB : parts.slice(0, index + 1).join(' > '),
            children: {}
          };
        }
        currentLevel = currentLevel[part].children;
      });
    });
    return root;
  }, [rawCategories]);

  async function fetchActiveCategories() {
    const { data } = await supabase.from('products').select('category').eq('is_visible', true);
    if (data) {
      const unique = Array.from(new Set(data.map(p => p.category).filter(Boolean))) as string[];
      setRawCategories(unique);
    }
  }

  async function fetchProducts() {
    setLoading(true);
    
    let matchedCategories: string[] = [];

    if (search && search.trim().length > 2) {
      const cleanSearch = search.trim().toLowerCase();

      const { data: teamMatches, error: teamError } = await supabase
        .from('team_metadata')
        .select('category_raw_match')
        .or(`canonical_name.ilike.%${cleanSearch}%, search_keywords.to_string.ilike.%${cleanSearch}%`);

      if (!teamError && teamMatches && teamMatches.length > 0) {
        matchedCategories = teamMatches.map(m => m.category_raw_match);
      }
    }

    // 1. QUERY CORREGIDA: Traemos productos visibles. 
    // La condición de descarte de basura sin precio original se aplica únicamente a los productos de scraping.
    let query = supabase.from('products').select('*').eq('is_visible', true);
    
    if (activeTab === 'local') {
      query = query.eq('is_local', true);
    } else if (activeTab === 'scraping') {
      query = query.or('is_local.is.null,is_local.eq.false').gt('price_original', 0);
    } else {
      // Pestaña 'all': Trae locales OR (de scraping AND con precio original válido)
      query = query.or('is_local.eq.true,and(price_original.gt.0,or(is_local.is.null,is_local.eq.false))');
    }
    
    // Filtro de Categoría Lateral (Solo se aplica si no estamos filtrando exclusivamente locales)
    if (selectedCategory !== "All" && activeTab !== 'local') {
      const searchPattern = selectedCategory.split('>').map(s => s.trim()).join('%>%');
      query = query.or(`category.ilike.%${searchPattern}%, category.eq.${selectedCategory}`);
    }
    
    // Filtro combinado de Búsqueda
    if (search && search.trim() !== "") {
      const cleanSearch = search.trim();
      if (matchedCategories.length > 0) {
        const categoryFilters = matchedCategories.map(cat => `category.ilike.%${cat}%`).join(',');
        query = query.or(`name.ilike.%${cleanSearch}%,${categoryFilters}`);
      } else {
        query = query.ilike('name', `%${cleanSearch}%`);
      }
    }
    
    const from = page * ITEMS_PER_PAGE;
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(from, from + ITEMS_PER_PAGE - 1);
    
    if (!error && data) {
      setProducts(data);
    } else {
      setProducts([]);
    }
    setLoading(false);
  }

  async function fetchSettingsAndExchange() {
    const { data } = await supabase.from('settings').select('*');
    if (data) {
      const sObj = data.reduce((acc: any, curr) => ({ ...acc, [curr.key]: curr.value }), {});
      if (sObj.exchange_rate) setExchangeRate(Number(sObj.exchange_rate));
      setConfig({
        price_fan: Number(sObj.price_fan) || 270000,
        price_player: Number(sObj.price_player) || 300000,
        price_retro: Number(sObj.price_retro) || 320000,
      });
    }
  }

  const getProductFallbackPrice = (name: string) => {
    const upperName = name.toUpperCase();
    if (upperName.includes("RETRO")) return config.price_retro;
    if (upperName.includes("PLAYER") || upperName.includes("JUGADOR")) return config.price_player;
    return config.price_fan;
  };

  const getProductThumbnail = (imageUrlsRaw: string | string[]) => {
    try {
      if (Array.isArray(imageUrlsRaw)) return imageUrlsRaw[0] || "/placeholder.png";
      const images = typeof imageUrlsRaw === 'string' ? JSON.parse(imageUrlsRaw) : imageUrlsRaw;
      if (!Array.isArray(images) || images.length === 0) return "/placeholder.png";
      return images[0] || "/placeholder.png";
    } catch (e) {
      // Fallback si viene una URL de imagen plana como string directo
      if (typeof imageUrlsRaw === 'string' && imageUrlsRaw.startsWith('http')) return imageUrlsRaw;
      return "/placeholder.png";
    }
  };

  const getCleanSizes = (sizesRaw: any) => {
    try {
      const allSizes = Array.isArray(sizesRaw) ? sizesRaw : JSON.parse(sizesRaw);
      const standardSizes = ["S", "M", "L", "XL", "XXL", "XXXL", "3XL", "4XL"];
      return allSizes.filter((s: string) => standardSizes.includes(s.trim().toUpperCase()));
    } catch (e) {
      return [];
    }
  };

  const formatPYG = (guaranies: number) => {
    return new Intl.NumberFormat('es-PY', { 
      style: 'currency', currency: 'PYG', maximumFractionDigits: 0 
    }).format(guaranies);
  };

  const toggleExpand = (name: string) => {
    setExpandedCats(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const RenderCategory = ({ node, level = 0 }: { node: CategoryNode, level: number }) => {
    const hasChildren = Object.keys(node.children).length > 0;
    const isExpanded = expandedCats[node.name];
    const isSelected = selectedCategory === node.fullName;

    return (
      <div className="flex flex-col">
        <div 
          className={`flex items-center group py-1.5 cursor-pointer transition-colors ${isSelected ? 'text-emerald-500' : 'text-gray-400 hover:text-white'}`}
          style={{ paddingLeft: `${level * 12}px` }}
        >
          <div onClick={(e) => { e.stopPropagation(); toggleExpand(node.name); }} className="p-1 hover:bg-white/5 rounded">
            {hasChildren ? (isExpanded ? <ChevronDown size={12}/> : <ChevronRight size={12}/>) : <div className="w-3"/>}
          </div>
          <span 
            className="text-[11px] font-bold uppercase tracking-wider flex-1 ml-1"
            onClick={() => { 
              if (activeTab === 'local') setActiveTab('all');
              setSelectedCategory(node.fullName); 
              setPage(0); 
            }}
          >
            {node.name}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div className="border-l border-white/10 ml-2">
            {Object.values(node.children).map(child => (
              <RenderCategory key={child.fullName} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#030303] text-white">
      <header className="relative pt-32 pb-16 px-6 border-b border-b-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-500">
              <Sparkles size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Season 2026</span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">
              Mochi <span className="text-emerald-500">Catalog</span>
            </h1>
          </div>
          <div className="w-full md:w-80 space-y-4">
            <div className="relative group">
              <input 
                type="text"
                placeholder="BUSCAR PRODUCTO..."
                className="w-full bg-white/5 border-b border-white/20 py-3 pr-8 text-xs outline-none focus:border-emerald-500 uppercase font-bold transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row gap-12">
        <aside className="w-full md:w-64 flex-shrink-0">
          {/* MODIFICADO: Añadido selector de pestañas limpio y premium para separar secciones */}
          <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
            Sección
          </h3>
          <div className="flex flex-col gap-1.5 mb-8 bg-white/5 p-1 rounded-xl border border-white/5">
            {[
              { id: 'all', label: 'Todos los Productos', icon: null},
              { id: 'local', label: 'Stock Inmediato', icon: null},
              { id: 'scraping', label: 'Bajo Pedido', icon: null }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setPage(0); }}
                className={`flex items-center gap-2 w-full text-left px-4 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${activeTab === tab.id ? 'bg-emerald-500 text-black' : 'text-gray-400 hover:text-white'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
            <LayoutGrid size={12}/> Filtros
          </h3>
          <div className="space-y-1">
            <button 
              onClick={() => { setSelectedCategory("All"); setPage(0); }}
              className={`text-[11px] font-bold uppercase tracking-wider py-2 w-full text-left transition-colors ${selectedCategory === "All" && activeTab !== 'local' ? 'text-emerald-500' : 'text-gray-400 hover:text-white'}`}
            >
              TODOS LOS ARTÍCULOS
            </button>
            <div className="pt-2 border-t border-white/5 mt-2">
              {Object.values(categoryTree).map(node => (
                <RenderCategory key={node.fullName} node={node} level={0} />
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => <div key={i} className="aspect-[4/5] bg-white/5 animate-pulse rounded-sm" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
              {products.map((product) => {
                const thumbnail = getProductThumbnail(product.image_urls);
                const sizes = getCleanSizes(product.sizes);

                const finalPriceInGs = (product.price_custom && product.price_custom > 0) 
                  ? product.price_custom 
                  : getProductFallbackPrice(product.name);

                return (
                  <Link href={`/products/${product.id}`} key={product.id} className="group relative">
                    <div className="relative aspect-[4/5] overflow-hidden bg-[#0a0a0a] border border-white/5 group-hover:border-emerald-500/30 transition-all duration-500">
                      
                      {/* Badge flotante para distinguir los de Stock Local */}
                      {product.is_local && (
                        <div className="absolute top-3 left-3 z-10 bg-amber-500 text-black text-[8px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded shadow-lg flex items-center gap-1">
                          <Store size={9} /> Stock Local ({product.stock_quantity ?? 0})
                        </div>
                      )}

                      <img 
                        src={thumbnail} 
                        alt={product.name} 
                        className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-1000"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                    
                    <div className="mt-6 space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="text-[8px] text-emerald-500 font-black uppercase tracking-widest">
                          {product.category?.split('>').pop()?.trim() || "Local / Entrega Inmediata"}
                        </span>
                      </div>
                      <h2 className="text-[12px] font-bold uppercase text-white/80 group-hover:text-white transition-colors line-clamp-2">
                        {product.name}
                      </h2>
                      
                      <div className="flex gap-1 mt-2">
                        {sizes.map((s: string) => (
                          <span key={s} className="text-[7px] border border-white/10 px-1 text-gray-500">{s}</span>
                        ))}
                      </div>

                      <div className="pt-2 flex flex-col">
                        <span className="text-sm font-black text-white italic tracking-tighter">
                          {formatPYG(finalPriceInGs)}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {products.length === 0 && !loading && (
            <div className="text-center py-24 border border-dashed border-white/5 rounded-2xl">
              <p className="text-gray-500 text-xs uppercase tracking-widest font-mono">No se encontraron artículos en esta sección</p>
            </div>
          )}

          {products.length > 0 && (
            <div className="mt-32 pt-8 border-t border-white/5 flex justify-between items-center">
              <button 
                disabled={page === 0}
                onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="px-8 py-3 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-black hover:border-emerald-500 transition-all disabled:opacity-10"
              >
                Anterior
              </button>
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Pág {page + 1}</span>
              <button 
                disabled={products.length < ITEMS_PER_PAGE}
                onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="px-8 py-3 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-black hover:border-emerald-500 transition-all disabled:opacity-10"
              >
                Siguiente
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}