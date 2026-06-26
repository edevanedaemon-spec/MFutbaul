"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; 
import { 
  Eye, EyeOff, Search, Package, RefreshCw, 
  ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, 
  Save, Zap, BarChart3, LayoutGrid, ChevronDown, Settings2, ShoppingBag, PlusCircle, Upload, X, Store
} from 'lucide-react';

const ITEMS_PER_PAGE = 24;

interface CategoryNode {
  name: string;
  fullName: string;
  children: Record<string, CategoryNode>;
}

interface TeamMetadata {
  idx: number;
  id: string;
  canonical_name: string;
  search_keywords: string[];
  category_raw_match: string;
}

const Modal = ({ isOpen, onClose, onConfirm, title, message, type = 'confirm' }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-[#141414] border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-[0_0_50px_-12px_rgba(16,185,129,0.2)]">
        <div className="flex items-center gap-4 mb-6">
          <div className={`p-3 rounded-2xl ${type === 'confirm' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
            {type === 'confirm' ? <AlertCircle size={28} /> : <CheckCircle2 size={28} />}
          </div>
          <h3 className="text-2xl font-bold tracking-tight text-white">{title}</h3>
        </div>
        <p className="text-gray-400 leading-relaxed mb-8">{message}</p>
        <div className="flex justify-end gap-4">
          {type === 'confirm' && (
            <button onClick={onClose} className="px-6 py-3 rounded-xl hover:bg-white/5 transition-colors font-medium text-white">Cancelar</button>
          )}
          <button onClick={onConfirm} className="bg-emerald-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-emerald-400 transition-transform active:scale-95 shadow-lg shadow-emerald-500/20">
            {type === 'confirm' ? 'Confirmar y Aplicar' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function AdminPanel() {
  const router = useRouter(); 
  const [view, setView] = useState<'catalog' | 'settings' | 'create'>('catalog');
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive' | 'scraping' | 'local'>('all');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const [rawCategories, setRawCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [teamsList, setTeamsList] = useState<TeamMetadata[]>([]);

  const [config, setConfig] = useState({
    patch_price: 10000,
    dorsal_price: 20000,
    price_fan: 270000,
    price_player: 300000,
    price_retro: 320000,
    price_default: 250000 
  });

  const [newProduct, setNewProduct] = useState({
    name: '',
    price_custom: '',
    team_id: '',
    stock_quantity: 0,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'] as string[], // Tallas seleccionadas por defecto
    description: ''
  });
  const [uploadingImages, setUploadingImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [modal, setModal] = useState({ open: false, title: "", message: "", action: () => {}, type: 'confirm' });

  // Listado total de tallas disponibles para la tienda
  const AVAILABLE_SIZES = ["S", "M", "L", "XL", "XXL", "XXXL", "4XL"];

  const getProductClassification = (name: string) => {
    const upperName = name ? name.toUpperCase() : "";
    const tags = [
      { keys: ["RETRO"], type: "RETRO", price: config.price_retro, color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
      { keys: ["PLAYER", "JUGADOR"], type: "PLAYER", price: config.price_player, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
      { keys: ["FAN", "FANS"], type: "FAN", price: config.price_fan, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" }
    ];
    const match = tags.find(tag => tag.keys.some(key => upperName.includes(key)));
    if (match) return { type: match.type, price: match.price, color: match.color };
    return { type: "OTRO", price: config.price_default, color: "text-gray-400 bg-white/5 border-white/10" };
  };

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

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchAllCategories = async () => {
    const { data } = await supabase.from('products').select('category'); 
    if (data) {
      const unique = Array.from(new Set(data.map(p => p.category).filter(Boolean))) as string[];
      setRawCategories(unique);
    }
  };

  const fetchTeamsMetadata = async () => {
    const { data, error } = await supabase
      .from('team_metadata')
      .select('*')
      .order('canonical_name', { ascending: true });
    if (data && !error) setTeamsList(data);
  };

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from('settings').select('*');
      if (data) {
        const sObj = data.reduce((acc: any, curr) => ({ ...acc, [curr.key]: curr.value }), {});
        setConfig({
          patch_price: Number(sObj.patch_price) || 10000,
          dorsal_price: Number(sObj.dorsal_price) || 20000,
          price_fan: Number(sObj.price_fan) || 270000,
          price_player: Number(sObj.price_player) || 300000,
          price_retro: Number(sObj.price_retro) || 320000,
          price_default: Number(sObj.price_default) || 250000,
        });
      }
    }
    fetchSettings();
    fetchAllCategories();
    fetchTeamsMetadata();
  }, []);

  const fetchProducts = useCallback(async () => {
    if(view !== 'catalog') return;
    setLoading(true);
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let highPriorityCategories: string[] = [];
    let lowPriorityCategories: string[] = [];

    if (debouncedSearch && debouncedSearch.trim().length > 2) {
      const cleanSearch = debouncedSearch.trim().toLowerCase();
      const { data: allMetadata } = await supabase.from('team_metadata').select('category_raw_match, canonical_name, search_keywords');

      if (allMetadata) {
        allMetadata.forEach(team => {
          const canonical = (team.canonical_name || '').toLowerCase();
          const rawMatch = team.category_raw_match;
          if (canonical.includes(cleanSearch)) {
            highPriorityCategories.push(rawMatch);
          } else {
            const hasExactKeyword = team.search_keywords?.some((kw: string) => kw.toLowerCase() === cleanSearch);
            const hasPartialKeyword = team.search_keywords?.some((kw: string) => kw.toLowerCase().includes(cleanSearch));
            if (hasExactKeyword) highPriorityCategories.push(rawMatch);
            else if (hasPartialKeyword) lowPriorityCategories.push(rawMatch);
          }
        });
        highPriorityCategories = Array.from(new Set(highPriorityCategories));
        lowPriorityCategories = Array.from(new Set(lowPriorityCategories)).filter(cat => !highPriorityCategories.includes(cat));
      }
    }

    const combinedMatchedCategories = [...highPriorityCategories, ...lowPriorityCategories];
    let query = supabase.from('products').select('*', { count: 'exact' }); 
    
    if (activeTab === 'active') query = query.eq('is_visible', true);
    if (activeTab === 'inactive') query = query.eq('is_visible', false);
    if (activeTab === 'local') query = query.eq('is_local', true); 
    if (activeTab === 'scraping') query = query.or('is_local.is.null,is_local.eq.false'); 

    if (selectedCategory !== "All" && activeTab !== 'local') {
      const searchPattern = selectedCategory.split('>').map(s => s.trim()).join('%>%');
      query = query.or(`category.ilike.%${searchPattern}%, category.eq.${selectedCategory}`);
    }

    if (debouncedSearch && debouncedSearch.trim() !== "") {
      const cleanSearch = debouncedSearch.trim();
      if (combinedMatchedCategories.length > 0) {
        const categoryFilters = combinedMatchedCategories.map(cat => `category.ilike.%${cat}%`).join(',');
        query = query.or(`name.ilike.%${cleanSearch}%,${categoryFilters}`);
      } else {
        query = query.ilike('name', `%${cleanSearch}%`);
      }
    }

    const { data, count, error } = await query.range(from, to);

    if (!error && data) {
      let sortedData = [...data];
      if (debouncedSearch && debouncedSearch.trim() !== "") {
        sortedData.sort((a: any, b: any) => {
          const aCat = a.category || ''; const bCat = b.category || '';
          let weightA = 0;
          if (highPriorityCategories.some(cat => aCat.toLowerCase().includes(cat.toLowerCase()))) weightA = 3;
          else if (lowPriorityCategories.some(cat => aCat.toLowerCase().includes(cat.toLowerCase()))) weightA = 2;
          else if (a.name.toLowerCase().includes(debouncedSearch.toLowerCase().trim())) weightA = 1;

          let weightB = 0;
          if (highPriorityCategories.some(cat => bCat.toLowerCase().includes(cat.toLowerCase()))) weightB = 3;
          else if (lowPriorityCategories.some(cat => bCat.toLowerCase().includes(cat.toLowerCase()))) weightB = 2;
          else if (b.name.toLowerCase().includes(debouncedSearch.toLowerCase().trim())) weightB = 1;

          if (weightB !== weightA) return weightB - weightA;
          return a.name.localeCompare(b.name);
        });
      } else {
        sortedData.sort((a: any, b: any) => a.name.localeCompare(b.name));
      }
      setProducts(sortedData);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [currentPage, debouncedSearch, activeTab, selectedCategory, view]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const handleSaveConfig = async () => {
    setLoading(true);
    const updates = Object.entries(config).map(([key, value]) => ({ key, value }));
    await supabase.from('settings').upsert(updates, { onConflict: 'key' });
    setLoading(false);
    setModal({
      open: true,
      title: "Configuración Guardada",
      message: "Los precios base han sido actualizados.",
      type: 'success',
      action: () => {}
    });
  };

  const handleApplyBulkPrices = () => {
    setModal({
      open: true,
      title: "Aplicar Precios Masivos",
      message: `¿Deseas sobreescribir y actualizar TODOS los productos con los nuevos precios?`,
      type: 'confirm',
      action: async () => {
        setLoading(true);
        const { error } = await supabase.rpc('apply_bulk_prices_v2', {
          p_price_fan: config.price_fan,
          p_price_player: config.price_player,
          p_price_retro: config.price_retro,
          p_price_default: config.price_default
        });
        if (error) alert("Hubo un error al aplicar los precios masivos.");
        await fetchProducts();
        setLoading(false);
      }
    });
  };

  const toggleVisibility = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    const { error } = await supabase.from('products').update({ is_visible: newStatus }).eq('id', id);
    if (!error) setProducts(prev => prev.map(p => p.id === id ? { ...p, is_visible: newStatus } : p));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setUploadingImages(prev => [...prev, ...filesArray]);
      
      const previewsArray = filesArray.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...previewsArray]);
    }
  };

  const removeImageFromSelection = (index: number) => {
    setUploadingImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // NUEVO: Alternar selección interactiva de tallas en el formulario
  const handleToggleSize = (size: string) => {
    setNewProduct(prev => {
      const isSelected = prev.sizes.includes(size);
      const updatedSizes = isSelected 
        ? prev.sizes.filter(s => s !== size) 
        : [...prev.sizes, size];
      return { ...prev, sizes: updatedSizes };
    });
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.team_id || uploadingImages.length === 0) {
      alert("Por favor rellena el Nombre, selecciona un Equipo y sube al menos una imagen.");
      return;
    }
    if (newProduct.sizes.length === 0) {
      alert("Debes seleccionar al menos una talla disponible para este producto local.");
      return;
    }

    setLoading(true);
    const uploadedUrls: string[] = [];

    try {
      const selectedTeam = teamsList.find(t => t.id === newProduct.team_id);
      if (!selectedTeam) throw new Error("El equipo seleccionado no es válido.");

      for (const file of uploadingImages) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${newProduct.team_id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('local-images') 
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('local-images')
          .getPublicUrl(fileName);

        if (publicUrlData?.publicUrl) {
          uploadedUrls.push(publicUrlData.publicUrl);
        }
      }

      // MODIFICADO: Guardamos 'sizes' aplicando estrictamente JSON.stringify() para evitar fallos de lectura en el catálogo
      const { error: insertError } = await supabase.from('products').insert([{
        name: newProduct.name,
        price_custom: Number(newProduct.price_custom) || null,
        category: selectedTeam.category_raw_match, 
        team_id: selectedTeam.id,                  
        image_urls: uploadedUrls,                  
        sizes: JSON.stringify(newProduct.sizes), 
        description: newProduct.description ? `<div>${newProduct.description}</div>` : null,
        is_visible: true,
        is_local: true,
        stock_quantity: Number(newProduct.stock_quantity) || 0,
        full_scraped: true
      }]);

      if (insertError) throw insertError;

      setModal({
        open: true,
        title: "¡Producto Creado!",
        message: `El producto se ha guardado en el Inventario Local con éxito.`,
        type: 'success',
        action: () => {
          setNewProduct({ name: '', price_custom: '', team_id: '', stock_quantity: 0, sizes: ['S', 'M', 'L', 'XL', 'XXL'], description: '' });
          setUploadingImages([]);
          setImagePreviews([]);
          fetchAllCategories();
          setActiveTab('local');
          setView('catalog');
        }
      });

    } catch (error: any) {
      console.error(error);
      alert(`Error al guardar producto: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const RenderCategory = ({ node, level = 0 }: { node: CategoryNode, level: number }) => {
    const hasChildren = Object.keys(node.children).length > 0;
    const isExpanded = expandedCats[node.name];
    const isSelected = selectedCategory === node.fullName;

    return (
      <div className="flex flex-col">
        <div 
          className={`flex items-center group py-2 cursor-pointer transition-colors ${isSelected ? 'text-emerald-500 bg-emerald-500/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          style={{ paddingLeft: `${level * 12 + 8}px`, borderRadius: '8px' }}
        >
          <div onClick={(e) => { e.stopPropagation(); toggleExpand(node.name); }} className="p-1">
            {hasChildren ? (isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>) : <div className="w-4"/>}
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider flex-1 ml-1" onClick={() => {
            if(activeTab === 'local') setActiveTab('all'); 
            setSelectedCategory(node.fullName);
          }}>
            {node.name}
          </span>
        </div>
        {hasChildren && isExpanded && (
          <div className="border-l border-white/10 ml-4 mt-1">
            {Object.values(node.children).map(child => <RenderCategory key={child.fullName} node={child} level={level + 1} />)}
          </div>
        )}
      </div>
    );
  };

  const toggleExpand = (name: string) => setExpandedCats(prev => ({ ...prev, [name]: !prev[name] }));

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-10">
      <Modal 
        isOpen={modal.open} 
        onClose={() => setModal({ ...modal, open: false })} 
        onConfirm={() => { modal.action(); setModal({ ...modal, open: false }); }}
        {...modal}
      />

      <div className="max-w-[1800px] mx-auto">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
          <div>
            <h1 className="text-5xl md:text-6xl font-serif font-black tracking-tighter italic bg-gradient-to-r from-white via-white to-emerald-500 bg-clip-text text-transparent">
              Mochi<span className="text-emerald-500">Admin</span>
            </h1>
            <p className="text-gray-500 mt-3 text-[10px] tracking-[0.4em] uppercase font-medium italic">Gestión de Catálogo Masivo</p>
          </div>

          <div className="flex bg-[#111] p-2 rounded-[2rem] border border-white/5 shadow-2xl overflow-x-auto max-w-full">
            <button 
              onClick={() => setView('catalog')}
              className={`flex items-center gap-3 px-6 md:px-8 py-4 rounded-2xl font-bold transition-all ${view === 'catalog' ? 'bg-emerald-500 text-black' : 'text-gray-500 hover:text-white'}`}
            >
              <ShoppingBag size={18} />
              <span className="text-xs uppercase tracking-widest whitespace-nowrap">Catálogo</span>
            </button>
            <button 
              onClick={() => setView('create')}
              className={`flex items-center gap-3 px-6 md:px-8 py-4 rounded-2xl font-bold transition-all ${view === 'create' ? 'bg-emerald-500 text-black' : 'text-gray-500 hover:text-white'}`}
            >
              <PlusCircle size={18} />
              <span className="text-xs uppercase tracking-widest whitespace-nowrap">Nuevo Local</span>
            </button>
            <button 
              onClick={() => setView('settings')}
              className={`flex items-center gap-3 px-6 md:px-8 py-4 rounded-2xl font-bold transition-all ${view === 'settings' ? 'bg-emerald-500 text-black' : 'text-gray-500 hover:text-white'}`}
            >
              <Settings2 size={18} />
              <span className="text-xs uppercase tracking-widest whitespace-nowrap">Precios Base</span>
            </button>
          </div>
        </header>

        {view === 'catalog' && (
          <>
            <div className="flex flex-col xl:flex-row gap-6 mb-12 items-center">
              <div className="relative flex-1 group w-full">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="text"
                  placeholder="Buscar productos..."
                  className="w-full bg-[#111] border border-white/5 py-5 pl-16 pr-8 rounded-[2rem] outline-none focus:border-emerald-500/40 text-lg"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="flex bg-[#111] p-1.5 rounded-2xl border border-white/5 w-full xl:w-auto overflow-x-auto custom-scrollbar">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'active', label: 'Activos' },
                  { id: 'inactive', label: 'Ocultos' },
                  { id: 'scraping', label: 'Motios6' },
                  { id: 'local', label: 'Stock Local' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`px-6 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === t.id ? 'bg-emerald-500 text-black' : 'text-gray-500 hover:text-white'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-10">
              <aside className="w-full md:w-72 flex-shrink-0">
                <div className="sticky top-10 flex flex-col max-h-[calc(100vh-120px)]">
                  <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                    <LayoutGrid size={12}/> Categorías
                  </h3>
                  <button 
                    onClick={() => setSelectedCategory("All")}
                    className={`text-[11px] font-bold uppercase tracking-wider py-3 px-4 w-full text-left transition-colors rounded-xl ${selectedCategory === "All" && activeTab !== 'local' ? 'text-emerald-500 bg-emerald-500/10' : 'text-gray-400 hover:text-white'}`}
                  >
                    TODOS LOS PRODUCTOS
                  </button>
                  <div className="pt-4 border-t border-white/5 space-y-1 overflow-y-auto pr-2 custom-scrollbar">
                    {Object.values(categoryTree).map(node => <RenderCategory key={node.fullName} node={node} level={0} />)}
                  </div>
                </div>
              </aside>

              <main className="flex-1">
                <div className="mb-6 flex items-center justify-between text-gray-500 text-xs px-2">
                  <span className="uppercase tracking-widest font-mono">
                    Vista: {activeTab === 'local' ? 'Solo Inventario Local' : activeTab === 'scraping' ? 'Solo Importados (Scraping)' : 'Catálogo General'}
                  </span>
                  <span className="font-bold text-white bg-white/5 px-3 py-1 rounded-full">{totalCount} items</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {products.map((p: any) => {
                    const classification = getProductClassification(p.name);
                    const displayPrice = (p.price_custom && p.price_custom > 0) ? p.price_custom : classification.price;
                    const hasCustomPrice = p.price_custom && p.price_custom > 0;

                    return (
                      <div key={p.id} className="bg-[#111] rounded-[2.5rem] border border-white/5 p-5 group hover:border-emerald-500/30 transition-all relative">
                        {p.is_local && (
                          <span className="absolute top-8 left-8 z-10 text-[9px] bg-amber-500 text-black px-3 py-1.5 font-black rounded-xl shadow-lg flex items-center gap-1.5">
                            <Store size={10} /> STOCK LOCAL ({p.stock_quantity ?? 0})
                          </span>
                        )}
                        <div className="relative aspect-square rounded-[2rem] overflow-hidden mb-6 bg-black">
                          <img 
                            src={p.image_urls?.[0] || '/placeholder-jersey.png'} 
                            className={`object-cover w-full h-full transition-all ${p.is_visible ? 'opacity-100' : 'opacity-20 grayscale'}`} 
                            alt={p.name} 
                          />
                          <button 
                            onClick={() => toggleVisibility(p.id, p.is_visible)}
                            className={`absolute top-4 right-4 p-4 rounded-2xl backdrop-blur-xl transition-all ${p.is_visible ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/40' : 'bg-white/10 text-white'}`}
                          >
                            {p.is_visible ? <Eye size={20} /> : <EyeOff size={20} />}
                          </button>
                        </div>
                        <div className="px-2">
                          <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest block mb-1">
                            {p.category?.split('>').pop()?.trim() || "Local / Otros"}
                          </span>
                          <h3 className="font-bold text-sm line-clamp-1 mb-5 text-white/90">{p.name}</h3>
                          <div className="grid grid-cols-2 gap-4 bg-black/60 rounded-3xl p-5 border border-white/5 items-center">
                            <div>
                              <p className="text-[9px] text-gray-500 uppercase font-black mb-1">PRECIO (Gs.)</p>
                              <input 
                                type="number"
                                value={displayPrice || ""}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setProducts(prev => prev.map(prod => prod.id === p.id ? { ...prod, price_custom: val } : prod));
                                }}
                                onBlur={async (e) => {
                                  await supabase.from('products').update({ price_custom: Number(e.target.value) }).eq('id', p.id);
                                }}
                                className={`bg-transparent font-black w-full outline-none text-lg ${hasCustomPrice ? 'text-emerald-400' : 'text-gray-400'}`}
                              />
                            </div>
                            <div className="text-right border-l border-white/10 pl-4">
                              <span className={`text-[10px] font-black tracking-widest px-3 py-1.5 rounded-xl border ${classification.color}`}>
                                {classification.type}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex justify-center gap-4 mt-12">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="p-4 rounded-2xl bg-[#111] border border-white/5 disabled:opacity-20 hover:border-emerald-500/50 transition-all"
                  >
                    <ChevronLeft />
                  </button>
                  <span className="flex items-center px-6 font-mono text-sm tracking-widest">
                    PÁGINA {currentPage} DE {Math.ceil(totalCount / ITEMS_PER_PAGE) || 1}
                  </span>
                  <button 
                    disabled={currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="p-4 rounded-2xl bg-[#111] border border-white/5 disabled:opacity-20 hover:border-emerald-500/50 transition-all"
                  >
                    <ChevronRight />
                  </button>
                </div>
              </main>
            </div>
          </>
        )}

        {view === 'create' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#111] rounded-[3rem] border border-white/5 p-10 md:p-16 shadow-2xl">
              <h2 className="text-3xl font-serif font-bold mb-2 italic">Añadir Jersey Local</h2>
              <p className="text-amber-500 text-sm uppercase tracking-widest mb-10 font-bold">Configuración de Inventario Local / Stock Fijo</p>

              <form onSubmit={handleCreateProduct} className="space-y-8">
                
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Imágenes del Producto (Permite Múltiples)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    {imagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group">
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => removeImageFromSelection(idx)}
                          className="absolute top-2 right-2 p-1.5 bg-black/80 rounded-lg text-red-500 hover:bg-red-500 hover:text-black transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-emerald-500/40 rounded-2xl cursor-pointer bg-black/40 text-gray-500 hover:text-white transition-all group">
                      <Upload size={28} className="group-hover:scale-110 transition-transform mb-2" />
                      <span className="text-[10px] uppercase font-black tracking-widest text-center px-2">Subir Fotos</span>
                      <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="group">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Nombre Completo (ej: 26-27 RMA Home Fans)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="Escribe el nombre del jersey"
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-md font-bold focus:border-emerald-500/50 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Equipo Relacionado</label>
                    <select
                      required
                      value={newProduct.team_id}
                      onChange={e => setNewProduct({...newProduct, team_id: e.target.value})}
                      className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-md font-bold focus:border-emerald-500/50 outline-none transition-all text-white"
                    >
                      <option value="" disabled className="text-gray-600">-- Selecciona un Club/Equipo --</option>
                      {teamsList.map((team) => (
                        <option key={team.id} value={team.id} className="bg-[#111]">
                          {team.canonical_name} ({team.category_raw_match})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* MODIFICADO / AGREGADO: SECTOR DE SELECCIÓN DE TALLAS DISPONIBLES EN UI */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Tallas Disponibles en Stock</label>
                  <div className="flex flex-wrap gap-3">
                    {AVAILABLE_SIZES.map((size) => {
                      const isSelected = newProduct.sizes.includes(size);
                      return (
                        <button
                          type="button"
                          key={size}
                          onClick={() => handleToggleSize(size)}
                          className={`w-14 h-14 rounded-xl border text-xs font-black transition-all flex items-center justify-center active:scale-95 ${
                            isSelected 
                              ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20' 
                              : 'bg-black border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                          }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-gray-600 text-[10px] uppercase tracking-wider mt-2 italic">Haz clic para marcar o desmarcar las tallas físicas que tienes para este jersey.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Precio de Venta Fijo (Gs.)</label>
                    <input 
                      type="number"
                      required
                      placeholder="ej: 270000"
                      value={newProduct.price_custom}
                      onChange={e => setNewProduct({...newProduct, price_custom: e.target.value})}
                      className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xl font-black text-emerald-400 focus:border-emerald-500/50 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Cantidad Disponible en Stock Fijo</label>
                    <input 
                      type="number"
                      min="0"
                      required
                      placeholder="ej: 12"
                      value={newProduct.stock_quantity}
                      onChange={e => setNewProduct({...newProduct, stock_quantity: Number(e.target.value)})}
                      className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xl font-black text-amber-500 focus:border-emerald-500/50 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Descripción o Notas de Producto</label>
                  <textarea 
                    rows={3}
                    placeholder="Detalles adicionales sobre el stock, calidad 1:1, etc."
                    value={newProduct.description}
                    onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-md focus:border-emerald-500/50 outline-none transition-all resize-none"
                  />
                </div>

                <div className="pt-6">
                  <button 
                    type="submit"
                    className="w-full flex items-center justify-center gap-4 bg-emerald-500 text-black font-black py-5 rounded-2xl hover:bg-emerald-400 transition-all active:scale-95 shadow-xl shadow-emerald-500/10"
                  >
                    <Save size={20} />
                    PUBLICAR PRODUCTO EN EL CATÁLOGO
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#111] rounded-[3rem] border border-white/5 p-10 md:p-16 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <Settings2 size={200} />
              </div>

              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-2">Configuración Global</h2>
                <p className="text-gray-500 mb-12 text-sm uppercase tracking-widest">Define los precios que se aplicarán por defecto</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
                  <div className="space-y-8">
                    <h3 className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] border-b border-white/5 pb-4">Precios por Tipo</h3>
                    {[
                      { label: 'Jersey FAN / FANS (Gs)', key: 'price_fan' },
                      { label: 'Jersey PLAYER (Gs)', key: 'price_player' },
                      { label: 'Jersey RETRO (Gs)', key: 'price_retro' },
                      { label: 'Jersey OTROS / DEFAULT (Gs)', key: 'price_default' }, 
                    ].map((item) => (
                      <div key={item.key} className="group">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">{item.label}</label>
                        <input 
                          type="number"
                          value={(config as any)[item.key]}
                          onChange={(e) => setConfig({ ...config, [item.key]: Number(e.target.value) })}
                          className="w-full bg-black border border-white/10 rounded-2xl py-5 px-8 text-2xl font-black text-white focus:border-emerald-500/50 outline-none transition-all group-hover:border-white/20"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-8">
                    <h3 className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] border-b border-white/5 pb-4">Personalizaciones</h3>
                    {[
                      { label: 'Costo Parche (Gs)', key: 'patch_price' },
                      { label: 'Costo Dorsal (Gs)', key: 'dorsal_price' },
                    ].map((item) => (
                      <div key={item.key} className="group">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">{item.label}</label>
                        <input 
                          type="number"
                          value={(config as any)[item.key]}
                          onChange={(e) => setConfig({ ...config, [item.key]: Number(e.target.value) })}
                          className="w-full bg-black border border-white/10 rounded-2xl py-5 px-8 text-2xl font-black text-white focus:border-emerald-500/50 outline-none transition-all group-hover:border-white/20"
                        />
                      </div>
                    ))}
                    
                    <div className="pt-10">
                       <button 
                        onClick={handleSaveConfig}
                        className="w-full flex items-center justify-center gap-4 bg-white text-black font-black py-6 rounded-3xl hover:bg-emerald-500 transition-all active:scale-95 shadow-xl"
                      >
                        <Save size={24} />
                        GUARDAR CONFIGURACIÓN
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-emerald-500 text-black rounded-2xl">
                      <Zap size={32} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xl italic">Acción Masiva de Precios</h4>
                      <p className="text-gray-500 text-sm max-w-md">Actualiza el precio de venta de todos tus productos activos en base a las reglas de tipo.</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleApplyBulkPrices}
                    className="whitespace-nowrap bg-emerald-500 text-black font-black px-10 py-5 rounded-2xl hover:bg-emerald-400 transition-all shadow-lg active:scale-95"
                  >
                    APLICAR A TODO EL CATÁLOGO
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="fixed bottom-6 right-6 flex items-center gap-4 bg-emerald-500 text-black px-8 py-5 rounded-3xl font-black shadow-2xl z-50 animate-bounce">
          <RefreshCw className="animate-spin" size={20} /> 
          <span className="text-xs uppercase tracking-[0.2em]">Sincronizando...</span>
        </div>
      )}
    </div>
  );
}