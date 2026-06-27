"use client";
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ShoppingCart, 
  ChevronRight, 
  Loader2, 
  ShieldCheck,
  Truck,
  CheckCircle2,
  Check,
  User,
  Hash,
  Maximize2,
  X,
  Scale,
  Sparkles,
  Store,
  Plus,
  Minus,
  Star,
  Upload,
  MessageSquare,
  Award
} from 'lucide-react';
import Link from 'next/link';

export default function ProductPage() {
  const params = useParams();
  const id = params.id;
  const searchParams = useSearchParams();

  const [product, setProduct] = useState<any>(null);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState<number>(7500);
  
  // Estados para las selecciones principales
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedPatch, setSelectedPatch] = useState("");
  const [selectedDorsal, setSelectedDorsal] = useState("");

  // Estados específicos para los textos de personalización de dorsal
  const [customName, setCustomName] = useState("");
  const [customNumber, setCustomNumber] = useState("");

  const [quantity, setQuantity] = useState(1);
  const [activeImg, setActiveImg] = useState("");
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // Estado para el visor de imágenes grande (Modal)
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // --- ESTADOS PARA AUTENTICACIÓN Y PERFIL ---
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLogged, setIsLogged] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Estados para el Recomendador de Talles
  const [showRecommender, setShowRecommender] = useState(false);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [recommendedSize, setRecommendedSize] = useState("");

  // Estado local dinámico para controlar el Stock disponible en tiempo de render
  const [localStock, setLocalStock] = useState<number | null>(null);

  // --- NUEVOS ESTADOS PARA EL SISTEMA DE RESEÑAS ---
  const [reviews, setReviews] = useState<any[]>([]);
  const [canReview, setCanReview] = useState(false); // Flag dinámico de compra verificada disponible
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewImages, setReviewImages] = useState<File[]>([]);
  const [reviewPreviews, setReviewPreviews] = useState<string[]>([]);
  const [submittingReview, setSubmittingReview] = useState(false);

  // --- NUEVOS ESTADOS PARA MODALES DE ALERTA DINÁMICOS ---
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'confirm' }>({
    isOpen: false,
    title: "",
    message: "",
    type: "confirm"
  });

  const [config, setConfig] = useState({
    price_fan: 270000,
    price_player: 300000,
    price_retro: 320000,
    patch_price: 10000,  
    dorsal_price: 20000  
  });

  // Modal Component local reusable sin alterar lógica global
  const DynamicAlertModal = () => {
    if (!modalConfig.isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-[#141414] border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-[0_0_50px_-12px_rgba(16,185,129,0.2)]">
          <div className="flex items-center gap-4 mb-6">
            <div className={`p-3 rounded-2xl ${modalConfig.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
              {modalConfig.type === 'error' ? <X size={24} /> : <CheckCircle2 size={24} />}
            </div>
            <h3 className="font-black text-xl italic tracking-tight uppercase text-white">{modalConfig.title}</h3>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed mb-8">{modalConfig.message}</p>
          <button 
            onClick={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
            className="w-full bg-emerald-500 text-black font-black py-4 rounded-xl hover:bg-emerald-400 transition-all active:scale-95 text-xs tracking-wider"
          >
            ENTENDIDO
          </button>
        </div>
      </div>
    );
  };

  const showDynamicModal = (title: string, message: string, type: 'success' | 'error') => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      type
    });
  };

  const getProductFallbackPrice = (name: string) => {
    const upperName = name.toUpperCase();
    if (upperName.includes("RETRO")) return config.price_retro;
    if (upperName.includes("PLAYER") || upperName.includes("JUGADOR")) return config.price_player;
    return config.price_fan;
  };

  const calculateSizeFromMetrics = (h: number, w: number, productData: any) => {
    if (!h || !w) return "";

    const isPlayerVersion = productData?.name?.toUpperCase().includes("PLAYER") || productData?.name?.toUpperCase().includes("JUGADOR");
    let calculated = "M";

    if (w < 63) {
      calculated = h < 168 ? "S" : "M";
    } else if (w >= 63 && w < 73) {
      calculated = h < 175 ? "M" : "L";
    } else if (w >= 73 && w < 83) {
      calculated = h < 180 ? "L" : "XL";
    } else if (w >= 83 && w < 93) {
      calculated = h < 185 ? "XL" : "XXL";
    } else if (w >= 93 && w < 103) {
      calculated = "3XL";
    } else {
      calculated = "4XL";
    }

    if (isPlayerVersion) {
      const sizeOrder = ["S", "M", "L", "XL", "XXL", "3XL", "4XL"];
      const currentIndex = sizeOrder.indexOf(calculated);
      if (currentIndex !== -1 && currentIndex < sizeOrder.length - 1) {
        calculated = sizeOrder[currentIndex + 1];
      }
    }

    const rawOptions = parseSizesField(productData?.sizes);
    const sizesOpts = rawOptions.filter((opt: string) => {
      return opt.startsWith("Adult Size") || /^\d+$/.test(opt) || /^(S|M|L|XL|XXL|3XL|4XL)$/i.test(opt);
    });

    const match = sizesOpts.find((opt: string) => {
      const cleanOpt = opt.replace("Adult Size ", "").toUpperCase().trim();
      return cleanOpt === calculated;
    });

    if (match) {
      return match;
    } else {
      const directFallback = sizesOpts.find((opt: string) => opt.toUpperCase().includes(calculated));
      return directFallback || "";
    }
  };

  const parseSizesField = (sizesField: any): string[] => {
    if (!sizesField) return [];
    if (Array.isArray(sizesField)) return sizesField;
    try {
      return JSON.parse(sizesField);
    } catch (e) {
      return [];
    }
  };

  const fetchReviews = async (productId: string) => {
    // Corregido: Solicitamos explícitamente traer la columna full_name vinculada de la tabla profiles
    const { data, error } = await supabase
      .from('reviews')
      .select('*, profiles(full_name, avatar_url)')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setReviews(data);
    }
  };

const checkPurchaseVerification = async (userId: string, productId: string) => {
  try {
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select('items, status')
      .eq('user_id', userId)
      .eq('status', 'delivered');

    if (ordersError) throw ordersError;

    console.log("Pedidos encontrados:", ordersData?.length);
    let totalPurchasedUnits = 0;

    if (ordersData && ordersData.length > 0) {
      ordersData.forEach((order: any, index: number) => {
        let itemsObj = order.items;
        
        // Diagnóstico: ¿Qué es items realmente?
        console.log(`Pedido ${index} - Tipo de items:`, typeof itemsObj);

        // Intentar parsear de forma recursiva (por si está doblemente stringificado)
        if (typeof itemsObj === 'string') {
          try {
            itemsObj = JSON.parse(itemsObj);
          } catch (e) {
            console.error("Error al parsear items:", e);
          }
        }

        // Si después de parsear sigue siendo string (caso raro), intentar parsear de nuevo
        if (typeof itemsObj === 'string') {
           itemsObj = JSON.parse(itemsObj);
        }

        console.log("itemsObj procesado:", itemsObj);

        const productsInside = itemsObj?.products || [];
        
        productsInside.forEach((item: any) => {
          const idInItem = String(item.id || item.product_id || "");
          const targetId = String(productId);
          
          // Diagnóstico: ¿Coinciden los IDs?
          const match = idInItem === targetId;
          console.log(`Comparando: ${idInItem} vs ${targetId} -> ¿Match?: ${match}`);
          
          if (match) {
            totalPurchasedUnits += (item.quantity || 1);
          }
        });
      });
    }

    console.log("Total unidades compradas encontradas:", totalPurchasedUnits);

    const { count: existingReviewsCount, error: countError } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('user_id', userId);

    if (countError) throw countError;

    const reviewsSubmitted = existingReviewsCount || 0;
    console.log("Reseñas enviadas previamente:", reviewsSubmitted);

    if (totalPurchasedUnits > reviewsSubmitted) {
      console.log("Acceso concedido: canReview = true");
      setCanReview(true);
    } else {
      console.log("Acceso denegado: canReview = false");
      setCanReview(false);
    }
  } catch (err) {
    console.error("Error fatal en checkPurchaseVerification:", err);
    setCanReview(false);
  }
};

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setLoading(true);

      const { data: settingsData } = await supabase
        .from('settings')
        .select('key, value');
      
      let currentConfig = { ...config };
      if (settingsData) {
        const sObj = settingsData.reduce((acc: any, curr) => ({ ...acc, [curr.key]: curr.value }), {});
        if (sObj.exchange_rate) setExchangeRate(Number(sObj.exchange_rate));
        
        currentConfig = {
          price_fan: Number(sObj.price_fan) || 270000,
          price_player: Number(sObj.price_player) || 300000,
          price_retro: Number(sObj.price_retro) || 320000,
          patch_price: Number(sObj.patch_price) || 10000,
          dorsal_price: Number(sObj.dorsal_price) || 20000
        };
        setConfig(currentConfig);
      }

     const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      let targetProduct = null;
      if (productData) {
        // ─── PARSEO SEGURO DE IMAGE_URLS ───────────────────────────────────
        let parsedImages: string[] = [];
        if (productData.image_urls) {
          if (Array.isArray(productData.image_urls)) {
            // Si ya es un array nativo, lo usamos directamente
            parsedImages = productData.image_urls;
          } else {
            try {
              // Intentamos el primer parseo JSON
              let p = JSON.parse(productData.image_urls);
              // Si el resultado sigue siendo un string (por el doble stringify), lo parseamos una segunda vez
              if (typeof p === 'string') {
                p = JSON.parse(p);
              }
              parsedImages = Array.isArray(p) ? p : [];
            } catch (e) {
              // Si no era un JSON válido pero es un string común, lo guardamos como único elemento
              parsedImages = typeof productData.image_urls === 'string' ? [productData.image_urls] : [];
            }
          }
        }
        // Sobrescribimos la propiedad con el array nativo limpio de JS
        productData.image_urls = parsedImages;
        // ───────────────────────────────────────────────────────────────────

        setProduct(productData);
        targetProduct = productData;
        
        // Ahora sí, apuntará a la URL real y no al carácter "["
        if (productData.image_urls.length > 0) setActiveImg(productData.image_urls[0]);

        if (productData.is_local) {
          setLocalStock(productData.stock_quantity ?? 0);
        }

        await fetchReviews(productData.id);

        const { data: suggestions } = await supabase
          .from('products')
          .select('*')
          .eq('category', productData.category)
          .eq('is_visible', true)
          .neq('id', id)
          .limit(4);
        
        setSuggested(suggestions || []);
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setIsLogged(true);
        setCurrentUserId(session.user.id);
        
        if (targetProduct) {
          await checkPurchaseVerification(session.user.id, targetProduct.id);
        }

        const { data: profileData } = await supabase
          .from('profiles') 
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileData) {
          setUserProfile(profileData);

          let sizing = profileData.sizing_profile;
          if (typeof sizing === 'string') {
            try { sizing = JSON.parse(sizing); } catch(e) { sizing = null; }
          }

          const metrics = sizing?.masculino?.height ? sizing.masculino : sizing?.femenino?.height ? sizing.femenino : null;
          
          if (metrics && metrics.height && metrics.weight) {
            setHeight(metrics.height.toString());
            setWeight(metrics.weight.toString());

            if (targetProduct) {
              const autoRecommended = calculateSizeFromMetrics(Number(metrics.height), Number(metrics.weight), targetProduct);
              if (autoRecommended) {
                setSelectedSize(autoRecommended);
                setRecommendedSize(autoRecommended);
              }
            }
          }
        }
      }

      setLoading(false);
    }
    loadData();
  }, [id]);

  useEffect(() => {
    if (!loading && searchParams.get('review') === 'true') {
      const section = document.getElementById('review-form-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [loading, searchParams]);

  const formatPYG = (amountInGs: number) => {
    return new Intl.NumberFormat('es-PY', { 
      style: 'currency', 
      currency: 'PYG', 
      maximumFractionDigits: 0 
    }).format(amountInGs || 0);
  };

  const getBasePrice = (prod: any) => {
    if (!prod) return 0;
    return (prod.price_custom && prod.price_custom > 0) 
      ? prod.price_custom 
      : getProductFallbackPrice(prod.name);
  };

  const getExtraCost = () => {
    let extra = 0;
    if (selectedPatch) {
      const lowerPatch = selectedPatch.toLowerCase();
      const isNoPatch = lowerPatch.includes('no badge') || lowerPatch.includes('no patch') || lowerPatch.includes('sin');
      if (!isNoPatch) {
        extra += config.patch_price;
      }
    }
    if (selectedDorsal && requiresCustomText(selectedDorsal)) {
      extra += config.dorsal_price;
    }
    return extra;
  };

  const getFinalPrice = (prod: any) => {
    return getBasePrice(prod) + getExtraCost();
  };
  
// ============================================================================
// TRADUCTOR INTELIGENTE DE OPCIONES (CHINO A ESPAÑOL)
// Colocar este bloque al final del archivo, COMPLEMENTAMENTE FUERA de ProductPage
// ============================================================================

// Matriz ordenada estrictamente por longitud de caracteres (de mayor a menor).
// Esto es vital para que las palabras compuestas se traduzcan antes que sus partes individuales.
const CHINESE_TRANSLATION_MAP: [string, string][] = [
  ["上带广告-名在号下", "Con Publicidad Superior (Nombre bajo el dorsal)"],
  ["13RFEF+Supercopa2026", "13 RFEF + Supercopa 2026"],
  ["15RFEF+Supercopa2026", "15 RFEF + Supercopa 2026"],
  ["铁娘子IMX专用号", "Número Especial Iron Maiden IMX"],
  ["World Champions", "Campeón del Mundo"],
  ["World Chammpions", "Campeón del Mundo"],
  ["BXR特别字体", "Tipografía Especial BXR"],
  ["女足世界杯盾", "Parche Mundial Femenino FWC"],
  ["世界杯胸前盾", "Parche Campeón del Mundo Pecho"],
  ["世俱胸前冠", "Parche Campeón Mundial de Clubes"],
  ["Winners #25", "Ganadores #25"],
  ["0.Demmbélé", "O. Dembélé"],
  ["印3处广告", "Estampado de 3 Publicidades"],
  ["印5处广告", "Estampado de 5 Publicidades"],
  ["周年纪念章", "Parche Aniversario"],
  ["女足欧国联", "UEFA Nations League Femenina"],
  ["欧冠字体", "Tipografía Champions League"],
  ["特别字体", "Tipografía Especial"],
  ["左袖广告", "Publicidad Manga Izquierda"],
  ["右袖广告", "Publicidad Manga Derecha"],
  ["背下广告", "Publicidad Inferior Trasera"],
  ["背上广告", "Publicidad Superior Trasera"],
  ["胸前广告", "Publicidad Pecho"],
  ["青下广告", "Publicidad Inferior"],
  ["名在号下", "Nombre bajo el número"],
  ["联赛带吼", "Tipografía de Liga"],
  ["红标冠军", "Parche Campeón Rojo"],
  ["常规号码", "Dorsal Estándar"],
  ["铁娘子", "Iron Maiden"],
  ["专用号", "Número Especial"],
  ["世预赛", "Clasificatorias Mundial"],
  ["球星号", "Dorsal de Jugador"],
  ["带号码", "Con Número"],
  ["西甲章", "Parche LaLiga"],
  ["德甲普", "Parche Bundesliga"],
  ["德普章", "Parche Bundesliga"],
  ["新平条", "Líneas UCL"],
  ["法甲冠", "Campeón Ligue 1"],
  ["超级杯", "Supercopa"],
  ["常规号", "Dorsal Regular"],
  ["右袖", "Manga Derecha"],
  ["左袖", "Manga Izquierda"],
  ["胸前", "Pecho"],
  ["冠军", "Campeón"],
  ["西甲", "LaLiga"],
  ["德甲", "Bundesliga"],
  ["法甲", "Ligue 1"],
  ["意甲", "Serie A"],
  ["英超", "Premier League"],
  ["欧冠", "Champions League"],
  ["联赛", "Liga"],
  ["右标", "Parche Derecho"],
  ["左标", "Parche Izquierdo"],
  ["白色", "Blanco"],
  ["黑色", "Negro"],
  ["黄色", "Amarillo"],
  ["蓝色", "Azul"],
  ["红色", "Rojo"],
  ["带旧款章", "Parche Retro"],
  ["印", "Estampado "]
];

/**
 * Procesa una cadena que contiene caracteres chinos y la traduce al español
 * basándose en la matriz de sustitución por componentes.
 */
const translateChinesePatchesAndFonts = (text: string): string => {
  if (!text) return "";
  let translated = text;

  // Recorremos la matriz aplicando los reemplazos de manera segura
  CHINESE_TRANSLATION_MAP.forEach(([chineseWord, spanishTranslation]) => {
    translated = translated.split(chineseWord).join(spanishTranslation);
  });

  // Limpieza estética final para remover espaciados rotos o conectores sueltos
  return translated
    .replace(/\(\s*\)/g, "")       // Remueve paréntesis vacíos "()"
    .replace(/\(\s*\+/g, "(")      // Remueve aperturas con signos raros "(+"
    .replace(/\+\s*\)/g, ")")      // Remueve cierres con signos raros "+)"
    .replace(/\s+/g, " ")          // Normaliza espacios dobles a un solo espacio
    .trim();
};

/**
 * Función principal encargada de unificar las traducciones de la interfaz
 */
const translateOption = (text: string): string => {
  if (!text) return "";
  const lower = text.toLowerCase().trim();
  
  // 1. Reglas directas globales de limpieza
  if (lower === 'no badge' || lower === 'no patch' || lower.includes('sin')) return 'Sin Parches';
  if (lower === 'no name no number' || lower.includes('no name')) return 'Sin Estampado (Liso)';
  
  // 2. Interceptador de Nombres/Números genéricos
  if (lower.includes('name') && lower.includes('number')) {
    let tipoFont = '';
    if (lower.includes('ucl') || lower.includes('欧冠')) {
      tipoFont = ' (Tipografía Champions)';
    } else if (lower.includes('f-l') || lower.includes('联赛') || lower.includes('fans')) {
      tipoFont = ' (Tipografía de Liga)';
    }
    return `Nombre / Número Personalizado${tipoFont}`;
  }

  // 3. Si se detecta cualquier carácter Unicode perteneciente al alfabeto Chino
  if (/[\u4e00-\u9fa5]/.test(text)) {
    return translateChinesePatchesAndFonts(text);
  }

  return text;
};

  const handleCalculateSize = (e: React.FormEvent) => {
    e.preventDefault();
    const h = parseFloat(height);
    const w = parseFloat(weight);

    if (!h || !w) return;

    const result = calculateSizeFromMetrics(h, w, product);
    if (result) {
      setSelectedSize(result);
      setRecommendedSize(result);
    }
    setShowRecommender(false);
  };

 //   CÓDIGO NUEVO CORREGIDO:
const rawOptions = parseSizesField(product?.sizes);
// 1. Parseamos de forma segura la columna dedicada a los parches
const rawPatches = parseSizesField(product?.patches);

const sizesOptions = rawOptions.filter((opt: string) => {
  const isAdultSizeStr = opt.startsWith("Adult Size");
  const isNumberSize = /^\d+$/.test(opt); 
  const isStandardLetter = /^(S|M|L|XL|XXL|3XL|4XL)$/i.test(opt);
  return isAdultSizeStr || isNumberSize || isStandardLetter;
});

// 2. Control de Parches: Busca en la columna dedicada; si está vacía, busca en sizes por retrocompatibilidad
const patchesOptions = rawPatches.length > 0 
  ? rawPatches 
  : rawOptions.filter((opt: string) => {
      const lower = opt.toLowerCase();
      return lower.includes("liga") || lower.includes("ucl") || lower.includes("badge") || lower.includes("patch") || lower.includes("广告") || lower.includes("章");
    });

// 3. Control de Dorsal: Busca en sizes, pero si viene vacío y 'allow_dorsal' es true, inyecta las opciones estándar
let dorsalOptions = rawOptions.filter((opt: string) => {
  const lower = opt.toLowerCase();
  return lower.includes("name") || lower.includes("number") || lower.includes("font") || lower.includes("字体");
});

if (dorsalOptions.length === 0 && product?.allow_dorsal) {
  // Inyectamos textos clave que tu función 'translateOption' ya sabe traducir perfectamente
  dorsalOptions = ["no name no number", "name and number custom"];
}

  const handlePatchClick = (patch: string) => {
    if (selectedPatch === patch) setSelectedPatch(""); 
    else setSelectedPatch(patch);
  };

  const requiresCustomText = (dorsalOpt: string) => {
    const lower = dorsalOpt.toLowerCase();
    return (lower.includes("name") || lower.includes("number")) && !lower.includes("no name");
  };

  const incrementQuantity = () => {
    if (product?.is_local && localStock !== null) {
      if (quantity >= localStock) return; 
    }
    setQuantity(prev => prev + 1);
  };

  const decrementQuantity = () => {
    setQuantity(prev => (prev > 1 ? prev - 1 : 1));
  };

  const handleReviewImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setReviewImages(prev => [...prev, ...filesArray]);

      const previews = filesArray.map(file => URL.createObjectURL(file));
      setReviewPreviews(prev => [...prev, ...previews]);
    }
  };

  const removeReviewImagePreview = (index: number) => {
    setReviewImages(prev => prev.filter((_, i) => i !== index));
    setReviewPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !product) return;
    if (!reviewComment.trim()) {
      showDynamicModal("Campo Vacío", "Por favor ingresa un comentario para tu reseña.", "error");
      return;
    }

    setSubmittingReview(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of reviewImages) {
        const fileExt = file.name.split('.').pop();
        const pathName = `${product.id}/${currentUserId}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('review-images')
          .upload(pathName, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('review-images')
          .getPublicUrl(pathName);

        if (publicUrlData?.publicUrl) {
          uploadedUrls.push(publicUrlData.publicUrl);
        }
      }

      const { error: insertError } = await supabase.from('reviews').insert([
        {
          product_id: product.id,
          user_id: currentUserId,
          rating: reviewRating,
          comment: reviewComment,
          image_urls: JSON.stringify(uploadedUrls)
        }
      ]);

      if (insertError) throw insertError;

      setReviewComment("");
      setReviewRating(5);
      setReviewImages([]);
      setReviewPreviews([]);

      await fetchReviews(product.id);
      await checkPurchaseVerification(currentUserId, product.id);
      
      showDynamicModal("¡Gracias!", "¡Reseña publicada con éxito! Muchas gracias por tu feedback.", "success");

    } catch (err: any) {
      console.error(err);
      showDynamicModal("Error", `Error al guardar la reseña: ${err.message}`, "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  const addToCart = () => {
    if (sizesOptions.length > 0 && !selectedSize) {
      showDynamicModal("Talle Faltante", "Por favor, selecciona un talle.", "error");
      return;
    }
    if (dorsalOptions.length > 0 && !selectedDorsal) {
      showDynamicModal("Estampado Faltante", "Por favor, selecciona una opción de estampado.", "error");
      return;
    }
    if (selectedDorsal && requiresCustomText(selectedDorsal)) {
      if (!customName.trim()) {
        showDynamicModal("Falta Nombre", "Por favor, ingresa el Nombre para el dorsal.", "error");
        return;
      }
      if (!customNumber.trim()) {
        showDynamicModal("Falta Número", "Por favor, ingresa el Número para el dorsal.", "error");
        return;
      }
    }

    if (product?.is_local && localStock !== null) {
      if (localStock <= 0) {
        showDynamicModal("Agotado", "Este producto se encuentra agotado de forma local.", "error");
        return;
      }
      if (quantity > localStock) {
        showDynamicModal("Stock Insuficiente", `No puedes añadir más unidades. Solo quedan ${localStock} unidades disponibles.`, "error");
        return;
      }
    }

    setAdding(true);
    const finalPrice = getFinalPrice(product);

    const cartItem = {
      id: product.id,
      name: product.name,
      price_custom: finalPrice,
      size: selectedSize || "N/A",
      patch: selectedPatch || "Sin Parche",
      patch_es: selectedPatch ? translateOption(selectedPatch) : "Sin Parche",
      dorsal: selectedDorsal || "Sin Estampado",
      dorsal_es: selectedDorsal ? translateOption(selectedDorsal) : "Sin Estampado",
      custom_name: requiresCustomText(selectedDorsal) ? customName.toUpperCase().trim() : null,
      custom_number: requiresCustomText(selectedDorsal) ? customNumber.trim() : null,
      quantity: quantity,
      image: activeImg,
      is_local: product.is_local ?? false
    };

    const currentCart = JSON.parse(localStorage.getItem('mochi_cart') || '[]');
    const existingIndex = currentCart.findIndex((item: any) => 
      item.id === cartItem.id &&
      item.size === cartItem.size &&
      item.patch === cartItem.patch &&
      item.dorsal === cartItem.dorsal &&
      item.custom_name === cartItem.custom_name &&
      item.custom_number === cartItem.custom_number
    );

    if (existingIndex > -1) currentCart[existingIndex].quantity += quantity;
    else currentCart.push(cartItem);

    localStorage.setItem('mochi_cart', JSON.stringify(currentCart));
    window.dispatchEvent(new Event('cartUpdated'));

    setTimeout(() => {
      if (product?.is_local && localStock !== null) {
        setLocalStock(prev => (prev !== null ? prev - quantity : 0));
      }
      setAdding(false);
      setAdded(true);
      setQuantity(1);
      setTimeout(() => setAdded(false), 3000);
    }, 800);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white">
      <Loader2 className="animate-spin text-emerald-500 mb-4" size={40} />
      <p className="text-[10px] tracking-[0.3em] uppercase font-black opacity-40">MochiFootball buscando...</p>
    </div>
  );

  const currentPriceGs = getFinalPrice(product);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <DynamicAlertModal />

      <nav className="max-w-7xl mx-auto px-6 pt-24 pb-8 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">
          <Link href="/catalog" className="hover:text-emerald-500 transition-colors">Colección</Link>
          <ChevronRight size={12} />
          <span className="text-emerald-500">{product?.name}</span>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Lado Izquierdo: Imágenes */}
          <div className="lg:col-span-7">
            <div className="sticky top-24 space-y-6">
              <div className="relative aspect-[4/5] bg-white/5 rounded-[3rem] border border-white/5 overflow-hidden group">
                <img src={activeImg} className="w-full h-full object-contain p-12 group-hover:scale-105 transition-transform duration-700" alt="" />
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {product?.image_urls?.map((url: string, i: number) => (
                  <button 
                    key={i} 
                    onClick={() => setActiveImg(url)} 
                    className={`flex-shrink-0 w-24 h-24 rounded-2xl border-2 transition-all ${activeImg === url ? 'border-emerald-500 bg-white/10' : 'border-white/5 bg-white/5 opacity-50'}`}
                  >
                    <img src={url} className="w-full h-full object-contain p-2" alt="" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Lado Derecho: Info y Compra */}
          <div className="lg:col-span-5">
            <div className="space-y-8">
              <div>
                {product?.is_local && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black tracking-wider bg-emerald-500 text-black uppercase mb-3">
                    <Store size={10} /> Stock Local Inmediato
                  </span>
                )}
                <h1 className="text-3xl md:text-4xl font-black italic tracking-tight uppercase leading-none">{product?.name}</h1>
                <p className="text-2xl font-black text-emerald-500 italic mt-4">{formatPYG(currentPriceGs)}</p>
              </div>

              {/* Talles */}
              {sizesOptions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black tracking-widest text-gray-400 uppercase">Selecciona tu Talle</h3>
                    {isLogged && (
                      <button 
                        onClick={() => setShowRecommender(true)}
                        className="text-[10px] font-black tracking-wider text-emerald-500 hover:underline uppercase flex items-center gap-1"
                      >
                        <Scale size={12} /> Asistente Smart Fit
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {sizesOptions.map((size: string, idx: number) => {
                      const cleanLabel = size.replace("Adult Size ", "").toUpperCase();
                      const isRecommended = cleanLabel === recommendedSize?.replace("Adult Size ", "").toUpperCase();
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedSize(size)}
                          className={`px-5 py-3.5 rounded-xl font-bold text-xs tracking-wider border transition-all flex items-center gap-2 ${
                            selectedSize === size 
                              ? 'bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20' 
                              : 'bg-white/5 border-white/5 text-white hover:bg-white/10'
                          }`}
                        >
                          {cleanLabel}
                          {isRecommended && <Sparkles size={12} className={selectedSize === size ? 'text-black' : 'text-emerald-500'} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Parches */}
              {patchesOptions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black tracking-widest text-gray-400 uppercase">Opciones de Parches</h3>
                  <div className="grid grid-cols-1 gap-2.5">
                    {patchesOptions.map((patch: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => handlePatchClick(patch)}
                        className={`w-full p-4 rounded-xl text-left font-bold text-xs border transition-all flex items-center justify-between ${
                          selectedPatch === patch 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        <span>{translateOption(patch)}</span>
                        <span className="opacity-60">+{formatPYG(config.patch_price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Estampado */}
              {dorsalOptions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-black tracking-widest text-gray-400 uppercase">Estampado / Dorsal</h3>
                  <div className="grid grid-cols-1 gap-2.5">
                    {dorsalOptions.map((dorsal: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedDorsal(dorsal)}
                        className={`w-full p-4 rounded-xl text-left font-bold text-xs border transition-all flex items-center justify-between ${
                          selectedDorsal === dorsal 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                            : 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                      >
                        <span>{translateOption(dorsal)}</span>
                        {requiresCustomText(dorsal) && <span className="opacity-60">+{formatPYG(config.dorsal_price)}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Inputs Personalización Dorsal */}
              {selectedDorsal && requiresCustomText(selectedDorsal) && (
                <div className="p-6 bg-white/5 border border-white/5 rounded-2xl space-y-4 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider mb-2">
                    <User size={14} /> Personalización del Dorsal
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Nombre (Ej: MESSI)</label>
                      <input 
                        type="text" 
                        maxLength={15}
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="INGRESÁ EL NOMBRE" 
                        className="w-full bg-[#0f0f0f] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold tracking-wider focus:outline-none focus:border-emerald-500 transition-colors uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Número (Ej: 10)</label>
                      <input 
                        type="text" 
                        maxLength={3}
                        value={customNumber}
                        onChange={(e) => setCustomNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="NÚMERO" 
                        className="w-full bg-[#0f0f0f] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold tracking-wider focus:outline-none focus:border-emerald-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Cantidad y Agregar al Carrito */}
              <div className="pt-4 flex items-center gap-4">
                <div className="flex items-center bg-white/5 border border-white/5 rounded-2xl p-1">
                  <button 
                    onClick={decrementQuantity}
                    className="p-3 text-gray-400 hover:text-white transition-colors"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-10 text-center font-black text-sm italic">{quantity}</span>
                  <button 
                    onClick={incrementQuantity}
                    className="p-3 text-gray-400 hover:text-white transition-colors"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <button
                  onClick={addToCart}
                  disabled={adding || added}
                  className={`flex-1 font-black py-4 rounded-2xl text-xs tracking-widest uppercase transition-all shadow-xl active:scale-95 ${
                    added 
                      ? 'bg-emerald-500 text-black shadow-emerald-500/20' 
                      : 'bg-white text-black hover:bg-gray-100'
                  }`}
                >
                  {adding ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin" size={16} /> AÑADIENDO...
                    </div>
                  ) : added ? (
                    <div className="flex items-center justify-center gap-2">
                      <Check size={16} /> ¡AÑADIDO AL CARRO!
                    </div>
                  ) : (
                    "AÑADIR AL CARRITO"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
		
		{/* Descripción del producto */}
		{product?.description && (
		  <div className="mt-8 p-6 bg-white/[0.02] border border-white/10 rounded-3xl space-y-4">
			<div className="flex items-center gap-3">
			  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
				<ShieldCheck size={18} />
			  </div>
			  <h3 className="text-xs font-black tracking-widest text-white uppercase">
				Detalles del producto
			  </h3>
			</div>
			
			{/* LA CLAVE: whitespace-pre-line respeta los saltos de línea (\n) del texto plano */}
			<p className="text-sm text-gray-400 leading-relaxed pl-1 whitespace-pre-line">
			  {product.description}
			</p>
		  </div>
		)}

        {/* --- NUEVA SECCIÓN DE COMENTARIOS Y RESEÑAS --- */}
        <section id="review-form-section" className="mt-24 pt-16 border-t border-white/5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            
            {/* Formulario para dejar reseña (Si cumple condiciones de compra) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center gap-3">
                <MessageSquare className="text-emerald-500" size={24} />
                <h2 className="text-xl font-black italic uppercase tracking-tight">Dejar Reseña</h2>
              </div>

              {isLogged && canReview ? (
                <form onSubmit={handleSubmitReview} className="p-8 bg-white/5 border border-white/5 rounded-[2.5rem] space-y-6">
                  <div>
                    <label className="text-[10px] uppercase font-black tracking-wider text-gray-400 block mb-2">Calificación del producto</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => setReviewRating(star)}
                          className="text-gray-600 hover:text-emerald-400 transition-colors"
                        >
                          <Star 
                            size={28} 
                            fill={star <= reviewRating ? "#10b981" : "none"} 
                            className={star <= reviewRating ? "text-emerald-500" : "text-gray-600"}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black tracking-wider text-gray-400 block mb-2">Tu Comentario</label>
                    <textarea
                      rows={4}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Escribe tu opinión sobre el talle, calidad del tejido, parches..."
                      className="w-full bg-[#0f0f0f] border border-white/10 rounded-2xl p-4 text-xs font-bold leading-relaxed focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black tracking-wider text-gray-400 block mb-2">Fotos del producto (Opcional)</label>
                    <div className="grid grid-cols-3 gap-4">
                      {reviewPreviews.map((preview, index) => (
                        <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/10">
                          <img src={preview} className="w-full h-full object-cover" alt="" />
                          <button
                            type="button"
                            onClick={() => removeReviewImagePreview(index)}
                            className="absolute top-1.5 right-1.5 p-1 bg-black/80 text-white rounded-full border border-white/10 hover:bg-red-500 hover:text-white transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      
                      {reviewImages.length < 3 && (
                        <label className="aspect-square rounded-xl border border-dashed border-white/20 bg-white/5 hover:bg-white/10 transition-colors flex flex-col items-center justify-center cursor-pointer gap-2">
                          <Upload size={18} className="text-gray-400" />
                          <span className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Subir Foto</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            multiple 
                            onChange={handleReviewImagesChange} 
                            className="hidden" 
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="w-full bg-emerald-500 text-black font-black py-4 rounded-2xl text-xs tracking-widest uppercase hover:bg-emerald-400 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {submittingReview ? (
                      <>
                        <Loader2 className="animate-spin" size={16} /> PUBLICANDO RESEÑA...
                      </>
                    ) : (
                      "PUBLICAR RESEÑA VERIFICADA"
                    )}
                  </button>
                </form>
              ) : (
                <div className="p-8 bg-white/5 border border-white/5 rounded-[2.5rem] flex flex-col items-center text-center justify-center p-12 min-h-[250px]">
                  <Award size={36} className="text-gray-600 mb-4" />
                  <h4 className="font-bold uppercase text-xs tracking-wider text-gray-300">Reseñas Exclusivas Clientes</h4>
                  <p className="text-[11px] text-gray-500 max-w-xs mt-2 leading-relaxed">
                    Solo los usuarios autenticados que hayan comprado y recibido esta camiseta de Mochi Football pueden redactar una resume verdadera.
                  </p>
                </div>
              )}
            </div>

            {/* Listado de reseñas existentes */}
            <div className="lg:col-span-7 space-y-6">
              <h2 className="text-xl font-black italic uppercase tracking-tight">Comentarios de la Comunidad ({reviews.length})</h2>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
                {reviews.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">Aún no hay reseñas para este artículo. ¡Sé el primero en dejar la tuya!</p>
                ) : (
                  reviews.map((item: any, idx: number) => {
                    let parsedImages: string[] = [];
                    if (item.image_urls) {
                      try {
                        parsedImages = typeof item.image_urls === 'string' ? JSON.parse(item.image_urls) : item.image_urls;
                      } catch (e) {
                        parsedImages = [];
                      }
                    }

                    return (
                      <div key={idx} className="p-6 bg-white/5 border border-white/5 rounded-3xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {item.profiles?.avatar_url ? (
							  <img 
								src={item.profiles.avatar_url} 
								className="w-8 h-8 rounded-full object-cover border border-white/10" 
								alt={item.profiles?.full_name || "User"} 
							  />
							) : (
							  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center uppercase">
								{item.profiles?.full_name ? item.profiles.full_name.substring(0, 2) : <User size={14} />}
							  </div>
							)}
                            <div>
                              <h4 className="text-xs font-black uppercase text-gray-200">
                                {/* Corregido: Se mapea full_name en lugar de un campo de username inexistente */}
                                {item.profiles?.full_name || "Comprador Mochi"}
                              </h4>
                              <p className="text-[9px] text-gray-500 font-bold">{new Date(item.created_at).toLocaleDateString('es-PY')}</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star 
                                key={s} 
                                size={12} 
                                fill={s <= item.rating ? "#10b981" : "none"} 
                                className={s <= item.rating ? "text-emerald-500" : "text-gray-700"}
                              />
                            ))}
                          </div>
                        </div>

                        <p className="text-xs text-gray-300 leading-relaxed font-medium">{item.comment}</p>

                        {/* Render seguro de imágenes adjuntas en la reseña */}
                        {Array.isArray(parsedImages) && parsedImages.length > 0 && (
                          <div className="flex gap-3 pt-1">
                            {parsedImages.map((img: string, i: number) => (
                              <div 
                                key={i} 
                                onClick={() => setPreviewImage(img)}
                                className="w-16 h-16 rounded-xl border border-white/10 bg-black overflow-hidden cursor-pointer hover:border-emerald-500 transition-colors"
                              >
                                <img src={img} className="w-full h-full object-cover" alt="" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </section>

        {/* Sugerencias */}
        {suggested.length > 0 && (
          <section className="mt-32">
            <h3 className="text-sm font-black tracking-widest text-gray-500 uppercase mb-8">Productos Relacionados</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {suggested.map((item: any) => {
                const itemPriceGs = item.price_custom && item.price_custom > 0 ? item.price_custom : getProductFallbackPrice(item.name);
                return (
                  <Link href={`/catalog/${item.id}`} key={item.id} className="group bg-white/5 border border-white/5 rounded-[2rem] p-6 hover:border-white/10 transition-all flex flex-col justify-between">
                    <div className="aspect-square bg-white/5 rounded-2xl overflow-hidden p-6 mb-4 flex items-center justify-center relative">
                      <img src={item.image_urls?.[0]} className="max-h-full object-contain group-hover:scale-105 transition-transform duration-500" alt="" />
                    </div>
                    <h4 className="text-[10px] font-black uppercase tracking-tight text-gray-400 group-hover:text-emerald-500 transition-colors">{item.name}</h4>
                    <p className="text-sm font-black italic">{formatPYG(itemPriceGs)}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* MODAL GLOBAL DE VISTA PREVIA (Compartido para fotos de reseñas) */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-3xl max-h-[80vh] aspect-square p-6 bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] flex items-center justify-center m-4 animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setPreviewImage(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/5 border border-white/10 text-white hover:bg-emerald-500 hover:text-white transition-all"
            >
              <X size={18} />
            </button>
            <img 
              src={previewImage} 
              alt="Asset Preview Large" 
              className="max-w-full max-h-[70vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* MODAL DE SMART FIT (RECOMENDADOR) */}
      {showRecommender && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#141414] border border-white/10 p-8 rounded-[2.5rem] max-w-sm w-full relative">
            <button 
              onClick={() => setShowRecommender(false)}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white rounded-xl bg-white/5 border border-white/5"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <Scale className="text-emerald-500" size={20} />
              <h3 className="font-black text-lg italic tracking-tight uppercase">Smart Fit</h3>
            </div>
            <form onSubmit={handleCalculateSize} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Tu Altura (cm)</label>
                <input 
                  type="number" 
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="Ej: 178"
                  className="w-full bg-[#0f0f0f] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold tracking-wider focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Tu Peso (kg)</label>
                <input 
                  type="number" 
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Ej: 75"
                  className="w-full bg-[#0f0f0f] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold tracking-wider focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-gray-100 transition-all text-xs tracking-wider uppercase"
              >
                CALCULAR TALLE IDEAL
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
