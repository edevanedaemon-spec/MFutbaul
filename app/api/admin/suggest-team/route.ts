import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Falta API Key" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const { rawName } = await req.json();

    // 1. OBTENER MODELOS DISPONIBLES DINÁMICAMENTE
    // Usamos el método nativo para no adivinar nombres
    const responseModels = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    const modelsData = await responseModels.json();

    if (!modelsData.models) {
      throw new Error("No se pudieron listar los modelos de la API.");
    }

    // 2. FILTRAR EL MEJOR MODELO DISPONIBLE
    // Buscamos modelos que soporten 'generateContent' y priorizamos 'flash' por velocidad/gratuidad
    const availableModels = modelsData.models.filter((m: any) => 
      m.supportedGenerationMethods.includes("generateContent")
    );

    // Intentamos encontrar un flash, si no el primero disponible que sirva
    const selectedModel = 
      availableModels.find((m: any) => m.name.includes("flash"))?.name || 
      availableModels[0]?.name;

    if (!selectedModel) {
      throw new Error("No hay modelos de generación de contenido disponibles para esta cuenta.");
    }

    // El nombre viene como "models/gemini-1.5-flash", necesitamos quitar el prefijo para el SDK
    const cleanModelName = selectedModel.split('/').pop();

    console.log(`Utilizando modelo detectado: ${cleanModelName}`);

    const model = genAI.getGenerativeModel({ model: cleanModelName });

    const prompt = `Eres un experto en fútbol. Analiza este nombre extraído de un scraper: "${rawName}".
    Identifica el club real y devuelve un JSON estrictamente con este formato:
    {
      "canonical": "Nombre Oficial del Club",
      "keywords": "apodo, ciudad, siglas, variaciones"
    }`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("La IA no devolvió un JSON válido");
    
    return NextResponse.json(JSON.parse(jsonMatch[0]));

  } catch (error: any) {
    console.error("Error en detección de modelo o generación:", error);
    
    return NextResponse.json({ 
      error: error.message,
      canonical: "Error de detección", 
      keywords: "Revisa consola del servidor" 
    }, { status: 500 });
  }
}