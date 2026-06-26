"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
  Eye, EyeOff, Search, RefreshCw,
  ChevronRight, ChevronLeft, CheckCircle2, AlertCircle,
  Save, Zap, BarChart3, LayoutGrid, ChevronDown, Settings2,
  ShoppingBag, PlusCircle, Upload, X, Store, FolderPlus, Trash2,
  ExternalLink, Link2, FolderTree,Pencil 
} from 'lucide-react';
import { ProductPreview } from '@/components/ProductPreview'; // Asegúrate de que la ruta sea correcta

const ITEMS_PER_PAGE = 24;

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface CategoryNode {
  id: string; // ¡CRÍTICO!
  name: string;
  fullName: string;
  children: Record<string, CategoryNode>;
}
// ─── Modal genérico ───────────────────────────────────────────────────────────
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
            <button onClick={onClose} className="px-6 py-3 rounded-xl hover:bg-white/5 transition-colors font-medium text-white">
              Cancelar
            </button>
          )}
          <button
            onClick={onConfirm}
            className="bg-emerald-500 text-black font-bold px-8 py-3 rounded-xl hover:bg-emerald-400 transition-transform active:scale-95 shadow-lg shadow-emerald-500/20"
          >
            {type === 'confirm' ? 'Confirmar' : 'Continuar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Sidebar: nodo de categoría recursivo ────────────────────────────────────
const SidebarCategoryNode = ({
  node, level, selectedCategory, expandedCats, toggleExpand, onSelect,
}: {
  node: CategoryNode; level: number; selectedCategory: string;
  expandedCats: Record<string, boolean>; toggleExpand: (n: string) => void;
  onSelect: (fullName: string) => void;
}) => {
  const hasChildren = Object.keys(node.children).length > 0;
  const isExpanded = expandedCats[node.fullName];
  const isSelected = selectedCategory === node.fullName;
  return (
    <div className="flex flex-col">
      <div
        className={`flex items-center group py-2 cursor-pointer transition-colors rounded-lg ${isSelected ? 'text-emerald-500 bg-emerald-500/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        <div onClick={(e) => { e.stopPropagation(); toggleExpand(node.fullName); }} className="p-1">
          {hasChildren ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : <div className="w-4" />}
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider flex-1 ml-1" onClick={() => onSelect(node.fullName)}>
          {node.name}
        </span>
      </div>
      {hasChildren && isExpanded && (
        <div className="border-l border-white/10 ml-4 mt-1">
          {Object.values(node.children).map(child => (
            <SidebarCategoryNode key={child.fullName} node={child} level={level + 1}
              selectedCategory={selectedCategory} expandedCats={expandedCats}
              toggleExpand={toggleExpand} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Selector de categoría en formulario (dropdown tree) ─────────────────────
const CategoryTreeSelector = ({
  tree, selected, onSelect, expandedState, setExpandedState, level = 0,
}: {
  tree: Record<string, CategoryNode>; selected: string; onSelect: (v: string) => void;
  expandedState: Record<string, boolean>;
  setExpandedState: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  level?: number;
}) => (
  <div className={level > 0 ? 'border-l border-white/10 ml-4' : ''}>
    {Object.values(tree).map(node => {
      const hasChildren = Object.keys(node.children).length > 0;
      const isExpanded = expandedState[node.fullName];
      const isSelected = selected === node.fullName;
      return (
        <div key={node.fullName}>
          <div
            className={`flex items-center gap-2 py-2 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-emerald-500 text-black' : 'hover:bg-white/5 text-gray-300'}`}
            style={{ paddingLeft: `${level * 14 + 10}px` }}
          >
            <div className="p-0.5 flex-shrink-0" onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) setExpandedState(prev => ({ ...prev, [node.fullName]: !prev[node.fullName] }));
            }}>
              {hasChildren ? (isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : <div className="w-3" />}
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider flex-1" onClick={() => onSelect(node.fullName)}>
              {node.name}
            </span>
            {isSelected && <CheckCircle2 size={13} className="flex-shrink-0" />}
          </div>
          {hasChildren && isExpanded && (
            <CategoryTreeSelector tree={node.children} selected={selected} onSelect={onSelect}
              expandedState={expandedState} setExpandedState={setExpandedState} level={level + 1} />
          )}
        </div>
      );
    })}
  </div>
);

// ─── Panel inline de gestión de categorías (dentro del formulario) ─────────────
const InlineCategoryManager = ({
  categoryTree, onRefresh,
}: {
  categoryTree: Record<string, CategoryNode>;
  onRefresh: () => Promise<void>;
}) => {
  const [parentCategory, setParentCategory] = useState<{ id: string; name: string } | null>(null);
  const [childName, setChildName] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [expandedMgr, setExpandedMgr] = useState<Record<string, boolean>>({});
  
  // Estados para el Modal personalizado de eliminación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<CategoryNode | null>(null);

  const handleAdd = async () => {
    if (!childName.trim()) return;
    setSaving(true);
    setFeedback('');

    // SOLUCIÓN AL SLUG: Si tiene padre, combinamos los nombres para evitar colisiones UNIQUE
    const sanitizedChild = childName.trim().toLowerCase().replace(/\s+/g, '-');
    const generatedSlug = parentCategory
      ? `${parentCategory.name.toLowerCase().replace(/\s+/g, '-')}-${sanitizedChild}`
      : sanitizedChild;

    const { error } = await supabase
      .from('categories')
      .insert([{
        name: childName.trim(),
        slug: generatedSlug,
        parent_id: parentCategory?.id || null 
      }]);

    if (error) {
      if (error.code === '23505') {
        setFeedback(`❌ Ya existe una ruta idéntica para esta categoría.`);
      } else {
        setFeedback(`❌ Error: ${error.message}`);
      }
    } else {
      setFeedback(`✨ "${childName}" creada con éxito`);
      setChildName('');
      setParentCategory(null);
      await onRefresh();
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!nodeToDelete || !nodeToDelete.id) return;
    setIsModalOpen(false);
    
    const { error } = await supabase.from('categories').delete().eq('id', nodeToDelete.id); 
    
    if (error) {
      setFeedback(`❌ Error al eliminar: ${error.message}`);
    } else {
      setFeedback(`🗑️ Categoría "${nodeToDelete.name}" eliminada de forma permanente`);
      setParentCategory(null);
      await onRefresh();
    }
    setNodeToDelete(null);
  };

  const MgrNode = ({ node, level = 0 }: { node: CategoryNode; level?: number }) => {
    const childrenNodes = node.children ? Object.values(node.children) : [];
    const hasChildren = childrenNodes.length > 0;
    const isExp = expandedMgr[node.id];
    
    return (
      <div className="select-none">
        <div className={`flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-white/[0.03] group transition-all my-0.5 ${parentCategory?.id === node.id ? 'bg-emerald-500/5 border border-emerald-500/20' : 'border border-transparent'}`}
          style={{ paddingLeft: `${level * 16 + 12}px` }}>
          
          <div className="cursor-pointer p-1 rounded-md hover:bg-white/5 transition-colors" 
               onClick={() => setExpandedMgr(p => ({ ...p, [node.id]: !p[node.id] }))}>
            {hasChildren ? (
              isExp ? <ChevronDown size={14} className="text-emerald-500" /> : <ChevronRight size={14} className="text-gray-500" />
            ) : (
              // Codo estético para guiar visualmente los nodos finales
              <div className="w-3.5 h-3.5 border-t border-l border-white/10 rounded-tl-md -mr-1 mt-1.5 ml-1" />
            )}
          </div>
          
          <span className={`text-xs font-bold tracking-wide flex-1 truncate ${parentCategory?.id === node.id ? 'text-emerald-400 font-black' : 'text-gray-300'}`}>
            {node.name}
          </span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => setParentCategory({ id: node.id, name: node.name })}
              title="Asignar como categoría padre"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-gray-400 hover:text-emerald-400 transition-all"
            >
              <FolderPlus size={13} />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setNodeToDelete(node);
                setIsModalOpen(true);
              }}
              title="Eliminar categoría"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        
        {hasChildren && isExp && (
          // Línea guía vertical para subcategorías estructuradas
          <div className="relative before:absolute before:left-[21px] before:top-0 before:bottom-3 before:w-[1px] before:bg-white/10">
            {childrenNodes.map((c) => (
              <MgrNode key={c.id} node={c} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#111] border border-white/10 rounded-[2rem] p-6 space-y-6 shadow-2xl relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <FolderTree size={18} />
          </div>
          <div>
            <h4 className="font-bold text-sm tracking-wide text-white">Estructura del Catálogo</h4>
            <p className="text-[10px] text-gray-500">Administra las jerarquías de categorías sin límites</p>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`p-3 rounded-xl text-xs font-medium border animate-in fade-in slide-in-from-top-2 duration-200 ${feedback.includes('❌') ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
          {feedback}
        </div>
      )}

      <div className="space-y-4 bg-black/40 p-5 rounded-2xl border border-white/5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Ubicación Destino</label>
            <div 
              onClick={() => setParentCategory(null)}
              className={`group flex items-center justify-between bg-[#0a0a0a] border rounded-xl py-2.5 px-4 h-11 transition-all cursor-pointer ${parentCategory ? 'border-emerald-500/30 bg-emerald-500/[0.02]' : 'border-white/10 hover:border-white/20'}`}
            >
              <span className={`text-xs font-mono truncate ${parentCategory ? 'text-emerald-400 font-bold' : 'text-gray-500'}`}>
                {parentCategory ? `📁 ${parentCategory.name}` : "📁 RAÍZ (Categoría Principal)"}
              </span>
              {parentCategory && (
                <X size={14} className="text-gray-500 group-hover:text-red-400 transition-colors ml-2" />
              )}
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Nombre del Nodo</label>
            <input 
              type="text" 
              placeholder="Ej: Remeras, Shorts, Camperas..."
              value={childName} 
              onChange={e => setChildName(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl py-2.5 px-4 text-xs font-bold focus:border-emerald-500/40 focus:bg-black outline-none h-11 text-white transition-all" 
            />
          </div>
        </div>
        
        <button 
          onClick={handleAdd} 
          disabled={saving || !childName.trim()}
          className="w-full bg-emerald-500 text-black disabled:bg-emerald-500/20 disabled:text-emerald-500/40 font-black py-3 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/10 hover:bg-emerald-400 transition-all active:scale-[0.99]"
        >
          {saving ? "Guardando..." : parentCategory ? `Añadir Subcategoría a "${parentCategory.name}"` : "Crear Nueva Categoría Raíz"}
        </button>
      </div>

      <div className="pt-2 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
        {Object.values(categoryTree).length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-500 italic border border-dashed border-white/5 rounded-xl">
            No hay categorías creadas todavía.
          </div>
        ) : (
          Object.values(categoryTree).map((n) => (
            <MgrNode key={n.id} node={n} level={0} />
          ))
        )}
      </div>

      {/* Modal de confirmación estilizado e integrado */}
      <Modal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setNodeToDelete(null); }}
        onConfirm={confirmDelete}
        title="¿Eliminar Categoría?"
        message={`¿Estás completamente seguro de que deseas eliminar "${nodeToDelete?.name}"? Al hacerlo, todas las subcategorías que dependan de ella también se borrarán permanentemente.`}
        type="confirm"
      />
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═════════════════════════════════════════════════════════════════════════════
export default function AdminPanel() {
  const [view, setView] = useState<'catalog' | 'settings' | 'create'>('catalog');
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'inactive'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [categoryTree, setcategoryTree] = useState<Record<string, CategoryNode>>({});


  const [rawCategories, setRawCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [EditingProductId, setEditingProductId] = useState<string | null>(null);

  const [config, setConfig] = useState({
    patch_price: 10000,
    dorsal_price: 20000,
    price_fan: 270000,
    price_player: 300000,
    price_retro: 320000,
    price_default: 250000,
  });

// Lista de parches estándar que puedes seleccionar (puedes agregar los que quieras aquí)
  const AVAILABLE_PATCHES = [
    'La Liga', 
    'Champions League', 
    'Premier League', 
    'Serie A', 
    'Copa Libertadores', 
    'Mundial de Clubes', 
    'Parche de Campeón (Oro)'
  ];
	


  // ── Estado del formulario de nuevo producto modificado ───────────────────
  const [newProduct, setNewProduct] = useState({
    name: '',
    price_original: '', // Guardará el precio de costo de compra
    price_custom: '',   // Precio de venta al público
    category: '',
    stock_quantity: 0,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'] as string[],
    description: '',
    url_original: '',
    allow_dorsal: false, // ¿Se le puede colocar nombre y número?
    patches: [] as string[], // Lista de parches seleccionados para este producto
  });
  const [catSelectorExpanded, setCatSelectorExpanded] = useState<Record<string, boolean>>({});
  const [showCatDropdown, setShowCatDropdown] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [modal, setModal] = useState({ open: false, title: '', message: '', action: () => {}, type: 'confirm' });

  const AVAILABLE_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', '4XL'];

  // ── Clasificación automática por nombre ───────────────────────────────────
  const getProductClassification = (name: string) => {
    const u = (name || '').toUpperCase();
    const tags = [
      { keys: ['RETRO'], type: 'RETRO', price: config.price_retro, color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
      { keys: ['PLAYER', 'JUGADOR'], type: 'PLAYER', price: config.price_player, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
      { keys: ['FAN', 'FANS'], type: 'FAN', price: config.price_fan, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
    ];
    const match = tags.find(t => t.keys.some(k => u.includes(k)));
    return match ?? { type: 'OTRO', price: config.price_default, color: 'text-gray-400 bg-white/5 border-white/10' };
  };


  // ── Debounce ───────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  // ── Cargar categorías ──────────────────────────────────────────────────
// ── Cargar categorías con Ruta Jerárquica Completa ──────────────────────────
const fetchAllCategories = async () => {
  // 1. Traemos los datos completos de la tabla de categorías
  const { data } = await supabase.from('categories').select('id, name, parent_id');
  
  if (data) {
    const map: Record<string, any> = {};
    const tree: Record<string, any> = {};

    // Primero inicializamos el mapa básico con todos los registros
    data.forEach(item => {
      map[item.id] = { 
        id: item.id, 
        name: item.name, 
        parent_id: item.parent_id,
        fullName: item.name, 
        children: {} 
      };
    });

    // Función auxiliar recursiva para construir el camino "Padre > Hijo > Subhijo"
    const buildFullCategoryPath = (catId: string): string => {
      const item = map[catId];
      if (!item) return '';
      // Si no tiene padre, su ruta es simplemente su propio nombre
      if (!item.parent_id) return item.name;
      
      // Si tiene padre, buscamos recursivamente el nombre del padre
      const parentPath = buildFullCategoryPath(item.parent_id);
      return parentPath ? `${parentPath} > ${item.name}` : item.name;
    };

    // Asignamos a cada nodo su "fullName" real e inequívoco
    data.forEach(item => {
      map[item.id].fullName = buildFullCategoryPath(item.id);
    });

    // Por último, conectamos los hijos dentro de sus respectivos padres para el árbol visual
    data.forEach(item => {
      if (item.parent_id && map[item.parent_id]) {
        map[item.parent_id].children[item.id] = map[item.id];
      } else if (!item.parent_id) {
        tree[item.id] = map[item.id];
      }
    });

    // Guardamos el árbol en tu estado local
    setcategoryTree(tree); 
  }
};

  // ── Settings iniciales ─────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('settings').select('*');
      if (data) {
        const s = data.reduce((acc: any, cur: any) => ({ ...acc, [cur.key]: cur.value }), {});
        setConfig({
          patch_price:   Number(s.patch_price)   || 10000,
          dorsal_price:  Number(s.dorsal_price)  || 20000,
          price_fan:     Number(s.price_fan)     || 270000,
          price_player:  Number(s.price_player)  || 300000,
          price_retro:   Number(s.price_retro)   || 320000,
          price_default: Number(s.price_default) || 250000,
        });
      }
    })();
    fetchAllCategories();
  }, []);

  // ── Fetch productos ────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    if (view !== 'catalog') return;
    setLoading(true);
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to   = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .not('name', 'like', '__CAT__%');

    if (activeTab === 'active')   query = query.eq('is_visible', true);
    if (activeTab === 'inactive') query = query.eq('is_visible', false);

    if (selectedCategory !== 'All') {
      const pat = selectedCategory.split('>').map(s => s.trim()).join('%>%');
      query = query.or(`category.ilike.%${pat}%,category.eq.${selectedCategory}`);
    }

    if (debouncedSearch.trim()) {
      query = query.ilike('name', `%${debouncedSearch.trim()}%`);
    }

    const { data, count, error } = await query.range(from, to);

    if (!error && data) {
      const sorted = [...data].sort((a: any, b: any) => a.name.localeCompare(b.name));
      setProducts(sorted);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [currentPage, debouncedSearch, activeTab, selectedCategory, view]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { setCurrentPage(1); }, [activeTab, selectedCategory]);

// Genera el árbol de nombres para saber exactamente qué categoría seleccionas
const getCategoryBreadcrumb = (catId: string): string => {
  const cat = rawCategories.find(c => c.id === catId);
  if (!cat) return '';
  if (!cat.parent_id) return cat.name;
  return `${getCategoryBreadcrumb(cat.parent_id)} > ${cat.name}`;
};


  // ── Guardar configuración ──────────────────────────────────────────────
  const handleSaveConfig = async () => {
    setLoading(true);
    const updates = Object.entries(config).map(([key, value]) => ({ key, value }));
    await supabase.from('settings').upsert(updates, { onConflict: 'key' });
    setLoading(false);
    setModal({ open: true, title: 'Configuración Guardada', message: 'Los precios base fueron actualizados correctamente.', type: 'success', action: () => {} });
  };

  // ── Precios masivos ────────────────────────────────────────────────────
  const handleApplyBulkPrices = () => {
    setModal({
      open: true,
      title: 'Aplicar Precios Masivos',
      message: '¿Sobreescribir el precio de TODOS los productos activos según las reglas de tipo?',
      type: 'confirm',
      action: async () => {
        setLoading(true);
        const { error } = await supabase.rpc('apply_bulk_prices_v2', {
          p_price_fan:     config.price_fan,
          p_price_player:  config.price_player,
          p_price_retro:   config.price_retro,
          p_price_default: config.price_default,
        });
        if (error) alert('Hubo un error al aplicar los precios masivos.');
        await fetchProducts();
        setLoading(false);
      },
    });
  };

  // ── Toggle visibilidad ─────────────────────────────────────────────────

  
const toggleVisibility = async (id: string, currentVisibility: boolean) => {
  try {
    const nuevoEstadoVisibilidad = !currentVisibility;

    // 1. Actualizar en la base de datos usando el ID directo
    const { error } = await supabase
      .from('products')
      .update({ is_visible: nuevoEstadoVisibilidad })
      .eq('id', id); // <--- Ahora sí será un UUID válido

    if (error) throw error;

    // 2. Actualizar el estado local de React buscando por ID
    setProducts(prevProducts => 
      prevProducts.map(p => p.id === id ? { ...p, is_visible: nuevoEstadoVisibilidad } : p)
    );
  } catch (error) {
    console.error("❌ Error al cambiar la visibilidad del producto:", error);
    alert("No se pudo actualizar la visibilidad en Supabase.");
  }
};

const handleEditProduct = (product: any) => {
  // 1. Guardamos el ID para saber que estamos editando
  setEditingProductId(product.id);

  // 2. Llenamos el estado del formulario con los datos actuales del producto
  setNewProduct({
    name: product.name || '',
    price_original: product.price_original?.toString() || '',
    price_custom: product.price_custom?.toString() || '',
    category: product.category || '',
    stock_quantity: product.stock_quantity || 0,
    sizes: product.sizes || ['S', 'M', 'L', 'XL', 'XXL'],
    description: product.description || '',
    url_original: product.url_original || '',
    allow_dorsal: !!product.allow_dorsal,
    patches: product.patches || [],
  });

  // 3. Cargamos las imágenes existentes en la vista previa (asumiendo que tu tabla tiene 'images')
  if (product.images && Array.isArray(product.images)) {
    setImagePreviews(product.images);
  } else if (product.image_url) {
    setImagePreviews([product.image_url]);
  } else {
    setImagePreviews([]);
  }

  // 4. Cambiamos la vista del panel al formulario de creación/edición
  // (Modifica 'create' por el nombre exacto de la vista que uses para tu formulario)
  setView('create'); 
  
  // Opcional: Hacer scroll hacia arriba si el formulario está arriba
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const handleStartEdit = (product: any) => {
  setEditingProductId(product);
  
  // Parsear tallas de forma segura por si vienen como string escapado
  let parsedSizes = ['S', 'M', 'L', 'XL', 'XXL'];
  if (product.sizes) {
    try {
      parsedSizes = typeof product.sizes === 'string' ? JSON.parse(product.sizes) : product.sizes;
      if (typeof parsedSizes === 'string') parsedSizes = JSON.parse(parsedSizes); // Doble escape check
    } catch (e) { console.error("Error parseando tallas", e); }
  }

  // Parsear parches de forma segura
  let parsedPatches = [];
  if (product.patches) {
    try {
      parsedPatches = typeof product.patches === 'string' ? JSON.parse(product.patches) : product.patches;
      if (typeof parsedPatches === 'string') parsedPatches = JSON.parse(parsedPatches);
    } catch (e) { console.error("Error parseando parches", e); }
  }

  // Cargar los datos actuales en el estado del formulario
  setNewProduct({
    name: product.name || '',
    price_original: product.price_original || '',
    price_custom: product.price_custom || '',
    category: product.category || '',
    stock_quantity: product.stock_quantity || 0,
    sizes: parsedSizes,
    description: product.description ? product.description.replace(/<\/?div>/g, '') : '', // Limpiar etiquetas HTML básicas
    url_original: product.url_original || '',
    allow_dorsal: product.allow_dorsal || false,
    patches: parsedPatches
  });

  setView('edit'); // Cambiamos la vista a 'edit'
};

const handleUpdateProduct = async (e?: React.FormEvent) => {
  if (e) e.preventDefault(); // Evita que la página se recargue
  if (!newProduct.name)     { alert('Escribe el nombre del producto.'); return; }
  if (!newProduct.category) { alert('Selecciona una categoría.'); return; }
  if (newProduct.sizes.length === 0) { alert('Selecciona al menos una talla.'); return; }
  
  // 🔍 VALIDACIÓN INTELIGENTE: Debe haber imágenes en la vista previa (sean viejas o nuevas)
  if (imagePreviews.length === 0) {
    alert('El producto debe tener al menos una imagen.');
    return;
  }

  setLoading(true);
  const finalImageUrls: string[] = [];

  try {
    // 1. Filtrar imágenes existentes que ya son URLs de Supabase
    for (const preview of imagePreviews) {
      if (preview.startsWith('http://') || preview.startsWith('https://')) {
        finalImageUrls.push(preview); // Mantenemos las fotos que ya existían
      }
    }

    // 2. Subir AL STORAGE solo los archivos nuevos (si es que el usuario agregó más)
    for (const file of uploadingImages) {
      const ext      = file.name.split('.').pop();
      const slug     = newProduct.category.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const fileName = `${slug}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

      const { error: upErr } = await supabase.storage.from('local-images').upload(fileName, file);
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('local-images').getPublicUrl(fileName);
      if (urlData?.publicUrl) {
        finalImageUrls.push(urlData.publicUrl); // Añadimos la nueva URL generada
      }
    }

    // 3. Preparamos el objeto final con las imágenes procesadas juntas
    const productData = {
      name:           newProduct.name,
      price_original: newProduct.price_original.trim() || '0',
      price_custom:   Number(newProduct.price_custom) || null,
      category:       newProduct.category,
      sizes:          JSON.stringify(newProduct.sizes),
      description:    newProduct.description ? `<div>${newProduct.description}</div>` : null,
      url_original:   newProduct.url_original.trim() || null,
      stock_quantity: Number(newProduct.stock_quantity) || 0,
      allow_dorsal:   newProduct.allow_dorsal || false,
      patches:        JSON.stringify(newProduct.patches),
      image_urls:     JSON.stringify(finalImageUrls) // Guardamos el array completo en formato JSON
    };

    // 4. Evaluamos si estamos editando o creando un nuevo producto usando tu estado
    if (EditingProductId && EditingProductId.id) {
      // 📝 MODO EDICIÓN: Actualizar registro existente filtrando por su ID
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', EditingProductId.id);

      if (error) throw error;
      alert("✨ ¡Producto actualizado con éxito!");
      
    } else {
      // ➕ MODO CREACIÓN: Insertar un registro completamente nuevo
      const { error } = await supabase
        .from('products')
        .insert([productData]);

      if (error) throw error;
      alert("✨ ¡Producto guardado con éxito!");
    }

    // 🔄 LIMPIEZA GENERAL DEL FORMULARIO
    setNewProduct({
      name: '',
      price_original: '',
      price_custom: '',
      category: '',
      stock_quantity: 0,
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      description: '',
      url_original: '',
      allow_dorsal: false,
      patches: [],
    });
    
    setImagePreviews([]);        // Limpiamos el carrusel de imágenes
    setUploadingImages([]);      // Limpiamos los archivos cargados pendientes
    setEditingProductId(null);   // Reseteamos el modo edición
    await fetchProducts();       // Refrescamos el catálogo real
    setView('catalog');          // Regresamos al catálogo

  } catch (err: any) {
    console.error("Error al guardar el producto:", err);
    alert(`Error al guardar: ${err.message || err}`);
  } finally {
    setLoading(false);
  }
};

const handleEditClick = (product: any) => {
  // 1. Guardamos el producto completo en el estado
  setEditingProductId(product);

  // 2. Deserializamos tallas, parches e imágenes de forma segura
  let parsedSizes = ['S', 'M', 'L', 'XL', 'XXL'];
  let parsedPatches = [];
  let parsedImages = []; // <-- Variable para almacenar las imágenes existentes

  try {
    if (product.sizes) {
      parsedSizes = typeof product.sizes === 'string' ? JSON.parse(product.sizes) : product.sizes;
    }
    if (product.patches) {
      parsedPatches = typeof product.patches === 'string' ? JSON.parse(product.patches) : product.patches;
    }
    
    // 🔍 ¡AQUÍ ESTABA EL DETALLE! Tu columna real de Supabase es image_urls
    if (product.image_urls) {
      parsedImages = typeof product.image_urls === 'string' ? JSON.parse(product.image_urls) : product.image_urls;
    }
  } catch (e) {
    console.error("Error parseando propiedades del producto:", e);
  }

  // 3. Limpiamos las etiquetas <div> de la descripción
  let cleanDescription = product.description || '';
  if (cleanDescription.startsWith('<div>') && cleanDescription.endsWith('</div>')) {
    cleanDescription = cleanDescription.slice(5, -6);
  }

  // 4. Rellenamos el formulario con los datos de texto
  setNewProduct({
    name: product.name || '',
    price_original: product.price_original?.toString() || '',
    price_custom: product.price_custom?.toString() || '',
    category: product.category || '',
    stock_quantity: product.stock_quantity || 0,
    sizes: parsedSizes,
    description: cleanDescription,
    url_original: product.url_original || '',
    allow_dorsal: !!product.allow_dorsal,
    patches: parsedPatches,
  });

  // 5. Cargamos las imágenes reales en el carrusel de previsualización
  setImagePreviews(Array.isArray(parsedImages) ? parsedImages : []);

  // 6. Cambiamos la vista a 'create' (o 'edit', dependiendo de tu renderizado)
  setView('create');
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const resetForm = () => {
  setEditingProductId(null); // Fundamental volverlo a null
  setNewProduct({
    name: '',
    price_original: '',
    price_custom: '',
    category: '',
    stock_quantity: 0,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    description: '',
    url_original: '',
    allow_dorsal: false,
    patches: [],
  });
  setImagePreviews([]);
  setUploadingImages([]);
};


  // ── Imágenes ───────────────────────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setUploadingImages(prev => [...prev, ...files]);
    setImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeImage = (i: number) => {
    setUploadingImages(prev => prev.filter((_, idx) => idx !== i));
    setImagePreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  // ── Toggle tallas ──────────────────────────────────────────────────────
  const handleToggleSize = (size: string) => {
    setNewProduct(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size) ? prev.sizes.filter(s => s !== size) : [...prev.sizes, size],
    }));
  };
  
  // Toggle para selección múltiple de parches
  const handleTogglePatch = (patch: string) => {
    setNewProduct(prev => ({
      ...prev,
      patches: prev.patches.includes(patch) 
        ? prev.patches.filter(p => p !== patch) 
        : [...prev.patches, patch],
    }));
  };

  // ── Crear producto ─────────────────────────────────────────────────────
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name)     { alert('Escribe el nombre del producto.'); return; }
    if (!newProduct.category) { alert('Selecciona una categoría.'); return; }
    if (newProduct.sizes.length === 0) { alert('Selecciona al menos una talla.'); return; }
    if (uploadingImages.length === 0)  { alert('Sube al menos una imagen.'); return; }

    setLoading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of uploadingImages) {
        const ext     = file.name.split('.').pop();
        const slug    = newProduct.category.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        const fileName = `${slug}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

        const { error: upErr } = await supabase.storage.from('local-images').upload(fileName, file);
        if (upErr) throw upErr;

        const { data: urlData } = supabase.storage.from('local-images').getPublicUrl(fileName);
        if (urlData?.publicUrl) uploadedUrls.push(urlData.publicUrl);
      }

      const { error: insertErr } = await supabase.from('products').insert([{
        name:           newProduct.name,
        price_original: newProduct.price_original.trim() || '0', // Guardamos costo
        price_custom:   Number(newProduct.price_custom) || null,  // Venta
        category:       newProduct.category,
        image_urls:     JSON.stringify(uploadedUrls),
        sizes:          JSON.stringify(newProduct.sizes),
        description:    newProduct.description ? `<div>${newProduct.description}</div>` : null,
        url_original:   newProduct.url_original.trim() || null,
        is_visible:     true,
        is_local:       true,
        stock_quantity: Number(newProduct.stock_quantity) || 0,
        full_scraped:   true,
        allow_dorsal:   newProduct.allow_dorsal, // Nuevo string/boolean
        patches:        JSON.stringify(newProduct.patches), // Array de parches en formato JSON
      }]);

      if (insertErr) throw insertErr;

      setModal({
        open: true,
        title: '¡Producto Publicado!',
        message: `"${newProduct.name}" fue añadido al catálogo con éxito.`,
        type: 'success',
        action: () => {
          setNewProduct({ name: '', price_custom: '', category: '', stock_quantity: 0, sizes: ['S', 'M', 'L', 'XL', 'XXL'], description: '', url_original: '' });
          setUploadingImages([]); setImagePreviews([]);
          fetchAllCategories();
          setView('catalog');
        },
      });
    } catch (err: any) {
      console.error(err);
      alert(`Error al guardar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (key: string) => setExpandedCats(prev => ({ ...prev, [key]: !prev[key] }));

  // ══════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-10">
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ ...modal, open: false })}
        onConfirm={() => { modal.action(); setModal({ ...modal, open: false }); }}
        {...modal}
      />

      <div className="max-w-[1800px] mx-auto">

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
          <div>
            <h1 className="text-5xl md:text-6xl font-serif font-black tracking-tighter italic bg-gradient-to-r from-white via-white to-emerald-500 bg-clip-text text-transparent">
              Mochi<span className="text-emerald-500">Admin</span>
            </h1>
            <p className="text-gray-500 mt-3 text-[10px] tracking-[0.4em] uppercase font-medium italic">
              Gestión de Inventario Local
            </p>
          </div>

          <div className="flex flex-wrap bg-[#111] p-2 rounded-[2rem] border border-white/5 shadow-2xl gap-1">
            {[
              { id: 'catalog',  icon: <ShoppingBag size={16} />, label: 'Catálogo' },
              { id: 'create',   icon: <PlusCircle  size={16} />, label: 'Nuevo Producto' },
              { id: 'settings', icon: <Settings2   size={16} />, label: 'Precios Base' },
            ].map(btn => (
              <button key={btn.id} onClick={() => setView(btn.id as any)}
                className={`flex items-center gap-2.5 px-5 md:px-7 py-3.5 rounded-2xl font-bold transition-all text-xs uppercase tracking-widest whitespace-nowrap ${view === btn.id ? 'bg-emerald-500 text-black' : 'text-gray-500 hover:text-white'}`}>
                {btn.icon}
                <span className="hidden sm:inline">{btn.label}</span>
              </button>
            ))}
            <Link href="/admin/analytics"
              className="flex items-center gap-2.5 px-5 md:px-7 py-3.5 rounded-2xl font-bold transition-all text-xs uppercase tracking-widest whitespace-nowrap text-gray-500 hover:text-white hover:bg-white/5">
              <BarChart3 size={16} />
              <span className="hidden sm:inline">Analytics</span>
              <ExternalLink size={10} className="opacity-40 hidden sm:inline" />
            </Link>
          </div>
        </header>

        {/* ── CATÁLOGO ────────────────────────────────────────────────────── */}
        {view === 'catalog' && (
          <>
            {/* Buscador + tabs */}
            <div className="flex flex-col xl:flex-row gap-6 mb-12 items-center">
              <div className="relative flex-1 group w-full">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-500" />
                <input type="text" placeholder="Buscar productos..."
                  className="w-full bg-[#111] border border-white/5 py-5 pl-16 pr-8 rounded-[2rem] outline-none focus:border-emerald-500/40 text-lg"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex bg-[#111] p-1.5 rounded-2xl border border-white/5 w-full xl:w-auto overflow-x-auto">
                {[
                  { id: 'all',      label: 'Todos' },
                  { id: 'active',   label: 'Activos' },
                  { id: 'inactive', label: 'Ocultos' },
                ].map(t => (
                  <button key={t.id} onClick={() => setActiveTab(t.id as any)}
                    className={`px-6 py-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === t.id ? 'bg-emerald-500 text-black' : 'text-gray-500 hover:text-white'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-10">
              {/* Sidebar categorías */}
              <aside className="w-full md:w-64 flex-shrink-0">
                <div className="sticky top-10 flex flex-col max-h-[calc(100vh-120px)]">
                  <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                    <LayoutGrid size={12} /> Categorías
                  </h3>
                  <button onClick={() => setSelectedCategory('All')}
                    className={`text-[11px] font-bold uppercase tracking-wider py-3 px-4 w-full text-left transition-colors rounded-xl ${selectedCategory === 'All' ? 'text-emerald-500 bg-emerald-500/10' : 'text-gray-400 hover:text-white'}`}>
                    TODOS
                  </button>
                  <div className="pt-4 border-t border-white/5 space-y-0.5 overflow-y-auto pr-1">
                    {Object.values(categoryTree).map(node => (
                      <SidebarCategoryNode key={node.fullName} node={node} level={0}
                        selectedCategory={selectedCategory} expandedCats={expandedCats}
                        toggleExpand={toggleExpand} onSelect={setSelectedCategory} />
                    ))}
                  </div>
                </div>
              </aside>

              {/* Grid productos */}
              <main className="flex-1">
                <div className="mb-6 flex items-center justify-between text-gray-500 text-xs px-2">
                  <span className="uppercase tracking-widest font-mono">Inventario Local</span>
                  <span className="font-bold text-white bg-white/5 px-3 py-1 rounded-full">{totalCount} productos</span>
                </div>

                {products.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center py-32 text-gray-700">
                    <ShoppingBag size={48} className="mb-4 opacity-30" />
                    <p className="text-sm uppercase tracking-widest font-bold">Sin productos</p>
                    <p className="text-xs mt-2 opacity-60">Crea tu primer producto desde "Nuevo Producto"</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {products.map((p: any) => {
                    const cls = getProductClassification(p.name);
                    const displayPrice = (p.price_custom && p.price_custom > 0) ? p.price_custom : cls.price;
                    const hasCustom = p.price_custom && p.price_custom > 0;
                    const images: string[] = (() => {
                      try {
                        if (Array.isArray(p.image_urls)) return p.image_urls;
                        if (typeof p.image_urls === 'string') return JSON.parse(p.image_urls);
                      } catch {}
                      return [];
                    })();

                    return (
                      <div key={p.id} className="bg-[#111] rounded-[2.5rem] border border-white/5 p-5 group hover:border-emerald-500/30 transition-all relative">
                        <span className="absolute top-8 left-8 z-10 text-[9px] bg-amber-500 text-black px-3 py-1.5 font-black rounded-xl shadow-lg flex items-center gap-1.5">
                          <Store size={10} /> STOCK ({p.stock_quantity ?? 0})
                        </span>

                        {/* Contenedor de la Imagen */}
						<div className="relative aspect-square rounded-[2rem] overflow-hidden mb-6 bg-black">
						  <img src={images[0] || '/placeholder-jersey.png'}
							className={`object-cover w-full h-full transition-all ${p.is_visible ? 'opacity-100' : 'opacity-20 grayscale'}`}
							alt={p.name} />
						  
						  {/* Botón de visibilidad (Ojo) */}
						  <button onClick={() => toggleVisibility(p.id, p.is_visible)}
							className={`absolute top-4 right-4 p-4 rounded-2xl backdrop-blur-xl transition-all z-10 ${p.is_visible ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/40' : 'bg-white/10 text-white'}`}>
							{p.is_visible ? <Eye size={20} /> : <EyeOff size={20} />}
						  </button>

						  {/* ✏️ BOTÓN DE EDITAR (LÁPIZ) - CORREGIDO Y SEGURO */}
						  {/* Usamos absolute y right-20 para colocarlo flotando a la izquierda del ojo sin que overflow-hidden lo corte */}
						  <button
							onClick={() => handleEditClick(p)} // <-- CORREGIDO: Cambiado 'product' por 'p'
							className="absolute top-4 right-20 p-4 rounded-2xl backdrop-blur-xl bg-white/10 text-white hover:bg-amber-500 hover:text-black hover:shadow-lg hover:shadow-amber-500/40 transition-all z-10"
							title="Editar producto"
						  >
							<Pencil size={20} />
						  </button>
						</div>

                        {/* URL original badge */}
                        {p.url_original && (
                          <a href={p.url_original} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 mb-3 text-[9px] font-bold text-blue-400 hover:text-blue-300 transition-colors truncate px-2"
                            title={p.url_original}>
                            <Link2 size={10} className="flex-shrink-0" />
                            <span className="truncate">{new URL(p.url_original).hostname}</span>
                          </a>
                        )}

                        <div className="px-2">
                          <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest block mb-1">
                            {p.category?.split('>').pop()?.trim() || '—'}
                          </span>
                          <h3 className="font-bold text-sm line-clamp-1 mb-5 text-white/90">{p.name}</h3>
                          <div className="grid grid-cols-2 gap-4 bg-black/60 rounded-3xl p-5 border border-white/5 items-center">
                            <div>
                              <p className="text-[9px] text-gray-500 uppercase font-black mb-1">PRECIO (Gs.)</p>
                              <input type="number" value={displayPrice || ''}
                                placeholder="0"
                                onChange={e => {
                                  const val = Number(e.target.value);
                                  setProducts(prev => prev.map(prod => prod.id === p.id ? { ...prod, price_custom: val } : prod));
                                }}
                                onBlur={async e => {
                                  await supabase.from('products').update({ price_custom: Number(e.target.value) }).eq('id', p.id);
                                }}
                                className={`bg-transparent font-black w-full outline-none text-lg ${hasCustom ? 'text-emerald-400' : 'text-gray-400'}`} />
                            </div>
                            <div className="text-right border-l border-white/10 pl-4">
                              <span className={`text-[10px] font-black tracking-widest px-3 py-1.5 rounded-xl border ${cls.color}`}>
                                {cls.type}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Paginación */}
                <div className="flex justify-center gap-4 mt-12">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
                    className="p-4 rounded-2xl bg-[#111] border border-white/5 disabled:opacity-20 hover:border-emerald-500/50 transition-all">
                    <ChevronLeft />
                  </button>
                  <span className="flex items-center px-6 font-mono text-sm tracking-widest">
                    PÁGINA {currentPage} DE {Math.ceil(totalCount / ITEMS_PER_PAGE) || 1}
                  </span>
                  <button disabled={currentPage >= Math.ceil(totalCount / ITEMS_PER_PAGE)} onClick={() => setCurrentPage(p => p + 1)}
                    className="p-4 rounded-2xl bg-[#111] border border-white/5 disabled:opacity-20 hover:border-emerald-500/50 transition-all">
                    <ChevronRight />
                  </button>
                </div>
              </main>
            </div>
          </>
        )}

        {/* ── CREAR PRODUCTO ───────────────────────────────────────────────── */}
        {/* ── CREAR PRODUCTO ───────────────────────────────────────────────── */}
		{(view === 'create' || view === 'edit') && (
		  <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
			<div className="bg-[#111] rounded-[3rem] border border-white/5 p-10 md:p-16 shadow-2xl">
			  <h2 className="text-3xl font-serif font-bold mb-2 italic">
				{EditingProductId ? 'Editar Producto' : 'Nuevo Producto'}
			  </h2>
			  <p className="text-emerald-500 text-sm uppercase tracking-widest mb-10 font-bold">
				{EditingProductId ? 'Modificar datos del producto local' : 'Añadir producto al inventario local'}
			  </p>

			  {/* ── GRID ESTRUCTURAL: FORMULARIO (2/3) + PREVIEW (1/3) ── */}
			  <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
				
				{/* COLUMNA FORMULARIO */}
				<div className="lg:col-span-2">
				  <form onSubmit={handleUpdateProduct} className="space-y-8">
					
					{/* ── Imágenes ── */}
					<div>
					  <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">
						Imágenes del producto (múltiples)
					  </label>
					  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
						{imagePreviews.map((preview, idx) => (
						  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group">
							<img src={preview} alt="preview" className="w-full h-full object-cover" />
							<button type="button" onClick={() => removeImage(idx)}
							  className="absolute top-2 right-2 p-1.5 bg-black/80 rounded-lg text-red-500 hover:bg-red-500 hover:text-black transition-colors">
							  <X size={16} />
							</button>
						  </div>
						))}
						<label className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-white/10 hover:border-emerald-500/40 rounded-2xl cursor-pointer bg-black/40 text-gray-500 hover:text-white transition-all group">
						  <Upload size={26} className="group-hover:scale-110 transition-transform mb-2" />
						  <span className="text-[10px] uppercase font-black tracking-widest text-center px-2">Subir Fotos</span>
						  <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
						</label>
					  </div>
					</div>

					{/* ── Nombre ── */}
					<div>
					  <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">
						Nombre del producto
					  </label>
					  <input type="text" required placeholder="ej: Barcelona 25/26 Player Edition"
						value={newProduct.name}
						onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
						className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-md font-bold focus:border-emerald-500/50 outline-none transition-all" />
					</div>

					{/* ── URL original ── */}
					<div>
					  <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">
						URL del producto — ¿De qué página lo pedirás?
					  </label>
					  <div className="relative">
						<Link2 className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
						<input type="url" placeholder="https://proveedor.com/producto/..."
						  value={newProduct.url_original}
						  onChange={e => setNewProduct({ ...newProduct, url_original: e.target.value })}
						  className="w-full bg-black border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-blue-400 placeholder:text-gray-700 focus:border-blue-500/40 outline-none transition-all" />
					  </div>
					  <p className="text-[10px] text-gray-700 mt-2 italic">Opcional. Se guarda como referencia de proveedor.</p>
					</div>

					{/* ── Categoría + gestor anidado ── */}
					<div className="space-y-3">
					  <div className="flex items-center justify-between">
						<label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
						  Categoría
						</label>
						<button type="button" onClick={() => setShowCatManager(p => !p)}
						  className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${showCatManager ? 'text-emerald-400' : 'text-gray-600 hover:text-gray-400'}`}>
						  <FolderTree size={12} />
						  {showCatManager ? 'Ocultar gestor' : 'Gestionar categorías'}
						</button>
					  </div>

					  <div className="relative">
						<button type="button" onClick={() => setShowCatDropdown(p => !p)}
						  className={`w-full bg-black border rounded-2xl py-4 px-6 text-left flex items-center justify-between transition-all ${newProduct.category ? 'border-emerald-500/50 text-emerald-400' : 'border-white/10 text-gray-600'}`}>
						  <span className="text-sm font-bold truncate">
							{newProduct.category || '— Selecciona una categoría —'}
						  </span>
						  <ChevronDown size={16} className={`flex-shrink-0 transition-transform ${showCatDropdown ? 'rotate-180' : ''}`} />
						</button>

						{showCatDropdown && (
						  <div className="absolute top-full left-0 right-0 mt-2 z-30 bg-[#141414] border border-white/10 rounded-2xl shadow-2xl p-4 max-h-64 overflow-y-auto">
							{Object.values(categoryTree).length === 0
							  ? <p className="text-gray-700 text-xs italic text-center py-4">Sin categorías — usa el gestor de abajo para crear.</p>
							  : <CategoryTreeSelector tree={categoryTree} selected={newProduct.category}
								  onSelect={fullName => { setNewProduct({ ...newProduct, category: fullName }); setShowCatDropdown(false); }}
								  expandedState={catSelectorExpanded} setExpandedState={setCatSelectorExpanded} />
							}
						  </div>
						)}
					  </div>

					  {newProduct.category && (
						<p className="text-[10px] text-emerald-500/60 font-mono px-2">{newProduct.category}</p>
					  )}

					  {showCatManager && (
						<InlineCategoryManager
						  categoryTree={categoryTree}
						  onRefresh={fetchAllCategories}
						  onSelectCategory={fullName => {
							setNewProduct({ ...newProduct, category: fullName });
							setShowCatManager(false);
						  }}
						/>
					  )}
					</div>

					{/* ── Tallas ── */}
					<div>
					  <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">
						Tallas disponibles en stock
					  </label>
					  <div className="flex flex-wrap gap-3">
						{AVAILABLE_SIZES.map(size => {
						  const isSel = newProduct.sizes.includes(size);
						  return (
							<button key={size} type="button" onClick={() => handleToggleSize(size)}
							  className={`w-14 h-14 rounded-xl border text-xs font-black transition-all flex items-center justify-center active:scale-95 ${isSel ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-black border-white/10 text-gray-400 hover:border-white/30 hover:text-white'}`}>
							  {size}
							</button>
						  );
						})}
					  </div>
					  <p className="text-gray-700 text-[10px] uppercase tracking-wider mt-2 italic">
						Haz clic para marcar o desmarcar las tallas físicas disponibles.
					  </p>
					</div>

					{/* ── Personalización ── */}
					<div className="bg-black/30 border border-white/5 rounded-[2rem] p-6 md:p-8 space-y-6">
					  <h3 className="text-xs font-black text-emerald-500 uppercase tracking-widest border-b border-white/5 pb-3">
						Opciones de Personalización Avanzada
					  </h3>
					  
					  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
						<div>
						  <p className="text-xs font-bold text-white uppercase tracking-wider">Estampado de Dorsal</p>
						  <p className="text-[10px] text-gray-500 italic mt-1">Habilita si la remera permite añadir Nombre y Número personalizado.</p>
						</div>
						<button type="button" 
						  onClick={() => setNewProduct(prev => ({ ...prev, allow_dorsal: !prev.allow_dorsal }))}
						  className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newProduct.allow_dorsal ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'}`}>
						  {newProduct.allow_dorsal ? '✓ Permitido' : '✕ No Permitido'}
						</button>
					  </div>

					  <div>
						<label className="block text-[11px] font-bold text-gray-400 uppercase mb-3 tracking-wider">
						  Parches Disponibles para Selección
						</label>
						<div className="flex flex-wrap gap-2">
						  {AVAILABLE_PATCHES.map(patch => {
							const isSelected = newProduct.patches.includes(patch);
							return (
							  <button key={patch} type="button" onClick={() => handleTogglePatch(patch)}
								className={`px-4 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${isSelected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-md' : 'bg-black border-white/5 text-gray-500 hover:border-white/20 hover:text-gray-300'}`}>
								{patch} {isSelected && '✓'}
							  </button>
							);
						  })}
						</div>
						<p className="text-[9px] text-gray-600 mt-2 italic">Selecciona múltiples parches oficiales.</p>
					  </div>
					</div>

					{/* ── Finanzas (Costo + Venta + Stock) ── */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					  <div>
						<label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Precio de Costo (Gs. o USD)</label>
						<input type="text" required placeholder="ej: 14.50 ó 105000"
						  value={newProduct.price_original}
						  onChange={e => setNewProduct({ ...newProduct, price_original: e.target.value })}
						  className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xl font-black text-amber-500 focus:border-amber-500/50 outline-none transition-all" />
					  </div>
					  <div>
						<label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Precio de Venta (Gs.)</label>
						<input type="number" required placeholder="ej: 270000"
						  value={newProduct.price_custom}
						  onChange={e => setNewProduct({ ...newProduct, price_custom: e.target.value })}
						  className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xl font-black text-emerald-400 focus:border-emerald-500/50 outline-none transition-all" />
					  </div>
					  <div>
						<label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Cantidad en stock</label>
						<input type="number" min="0" required placeholder="ej: 12"
						  value={newProduct.stock_quantity}
						  onChange={e => setNewProduct({ ...newProduct, stock_quantity: Number(e.target.value) })}
						  className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-xl font-black text-blue-400 focus:border-emerald-500/50 outline-none transition-all" />
					  </div>
					</div>

					{/* ── Descripción ── */}
					<div>
					  <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Descripción / Notas</label>
					  <textarea rows={3} placeholder="Calidad 1:1, detalles de tejido, etc."
						value={newProduct.description}
						onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
						className="w-full bg-black border border-white/10 rounded-2xl py-4 px-6 text-md focus:border-emerald-500/50 outline-none transition-all resize-none" />
					</div>

					{/* ── Preview clasificación ── */}
					{newProduct.name && (
					  <div className="bg-black/40 border border-white/5 rounded-2xl p-5 flex items-center gap-4">
						<p className="text-[10px] text-gray-600 uppercase tracking-widest flex-1">Clasificación automática:</p>
						<span className={`text-[11px] font-black tracking-widest px-4 py-2 rounded-xl border ${getProductClassification(newProduct.name).color}`}>
						  {getProductClassification(newProduct.name).type}
						</span>
						<span className="text-emerald-400 font-black text-sm">
						  Gs. {(Number(newProduct.price_custom) || getProductClassification(newProduct.name).price).toLocaleString('es-PY')}
						</span>
					  </div>
					)}

					{/* ── Submit ── */}
					<div className="pt-4">
					  <button type="submit"
						className="w-full flex items-center justify-center gap-4 bg-emerald-500 text-black font-black py-5 rounded-2xl hover:bg-emerald-400 transition-all active:scale-95 shadow-xl shadow-emerald-500/10 text-sm uppercase tracking-widest">
						<Save size={20} />
						{EditingProductId ? 'Guardar Cambios del Producto' : 'Publicar producto en el catálogo'}
					  </button>
					</div>
				  </form>
				</div>

				{/* COLUMNA VISTA PREVIA (1/3) */}
				<div className="lg:col-span-1">
				  <ProductPreview 
					data={{
					  name: newProduct.name,
					  price_custom: newProduct.price_custom,
					  category: newProduct.category,
					  sizes: newProduct.sizes,
					  patches: newProduct.patches,
					  image_url: imagePreviews[0] // Muestra la primera imagen subida automáticamente
					}} 
				  />
				</div>

			  </div>
			</div>
		  </div>
		)}			

        {/* ── CONFIGURACIÓN DE PRECIOS ──────────────────────────────────────── */}
        {view === 'settings' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#111] rounded-[3rem] border border-white/5 p-10 md:p-16 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <Settings2 size={200} />
              </div>
              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-2">Configuración Global</h2>
                <p className="text-gray-500 mb-12 text-sm uppercase tracking-widest">
                  Precios base que se aplican por tipo de producto
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
                  <div className="space-y-8">
                    <h3 className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] border-b border-white/5 pb-4">
                      Precios por Tipo
                    </h3>
                    {[
                      { label: 'Jersey FAN / FANS (Gs)', key: 'price_fan' },
                      { label: 'Jersey PLAYER (Gs)',     key: 'price_player' },
                      { label: 'Jersey RETRO (Gs)',      key: 'price_retro' },
                      { label: 'Precio DEFAULT (Gs)',    key: 'price_default' },
                    ].map(item => (
                      <div key={item.key} className="group">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">{item.label}</label>
                        <input type="number" value={(config as any)[item.key]}
                          onChange={e => setConfig({ ...config, [item.key]: Number(e.target.value) })}
                          className="w-full bg-black border border-white/10 rounded-2xl py-5 px-8 text-2xl font-black text-white focus:border-emerald-500/50 outline-none transition-all group-hover:border-white/20" />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-8">
                    <h3 className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em] border-b border-white/5 pb-4">
                      Personalizaciones
                    </h3>
                    {[
                      { label: 'Costo Parche (Gs)',  key: 'patch_price' },
                      { label: 'Costo Dorsal (Gs)', key: 'dorsal_price' },
                    ].map(item => (
                      <div key={item.key} className="group">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">{item.label}</label>
                        <input type="number" value={(config as any)[item.key]}
                          onChange={e => setConfig({ ...config, [item.key]: Number(e.target.value) })}
                          className="w-full bg-black border border-white/10 rounded-2xl py-5 px-8 text-2xl font-black text-white focus:border-emerald-500/50 outline-none transition-all group-hover:border-white/20" />
                      </div>
                    ))}

                    <div className="pt-10">
                      <button onClick={handleSaveConfig}
                        className="w-full flex items-center justify-center gap-4 bg-white text-black font-black py-6 rounded-3xl hover:bg-emerald-500 transition-all active:scale-95 shadow-xl">
                        <Save size={24} /> GUARDAR CONFIGURACIÓN
                      </button>
                    </div>
                  </div>
                </div>

                {/* Acción masiva */}
                <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-emerald-500 text-black rounded-2xl">
                      <Zap size={32} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xl italic">Acción Masiva de Precios</h4>
                      <p className="text-gray-500 text-sm max-w-md">
                        Actualiza el precio de todos los productos activos según las reglas de tipo.
                      </p>
                    </div>
                  </div>
                  <button onClick={handleApplyBulkPrices}
                    className="whitespace-nowrap bg-emerald-500 text-black font-black px-10 py-5 rounded-2xl hover:bg-emerald-400 transition-all shadow-lg active:scale-95">
                    APLICAR A TODO EL CATÁLOGO
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="fixed bottom-6 right-6 flex items-center gap-4 bg-emerald-500 text-black px-8 py-5 rounded-3xl font-black shadow-2xl z-50 animate-bounce">
          <RefreshCw className="animate-spin" size={20} />
          <span className="text-xs uppercase tracking-[0.2em]">Guardando...</span>
        </div>
      )}
    </div>
  );
}
