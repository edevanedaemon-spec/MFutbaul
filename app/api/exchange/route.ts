import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Usamos ExchangeRate-API (v6 es gratuita y muy estable)
    // Esta URL devuelve los pares de moneda para el Dólar (USD)
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      method: 'GET',
      next: { revalidate: 3600 } // Cacheamos por 1 hora para no saturar
    });

    if (!response.ok) {
      throw new Error(`Error de red: ${response.status}`);
    }

    const data = await response.json();

    if (data.result === "success") {
      // Extraemos el valor de Paraguay (PYG)
      const rate = data.rates.PYG;
      
      // Devolvemos un formato simple para que tu frontend lo procese fácil
      return NextResponse.json({ 
        provider: "ExchangeRate-API",
        rate: Math.round(rate) 
      });
    } else {
      throw new Error("La API no devolvió un resultado exitoso");
    }

  } catch (error: any) {
    console.error("DETALLE DEL ERROR:", error.message);
    return NextResponse.json(
      { error: 'Error al obtener divisas', details: error.message }, 
      { status: 500 }
    );
  }
}