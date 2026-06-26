// app/api/admin/map-team/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Usamos Service Role para saltar RLS en tareas administrativas
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { category_raw_match, canonical_name, search_keywords } = body;

    if (!category_raw_match || !canonical_name) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('team_metadata')
      .upsert({ 
        category_raw_match, 
        canonical_name, 
        search_keywords 
      }, {
        // Esto requiere que category_raw_match sea UNIQUE en la DB
        onConflict: 'category_raw_match' 
      })
      .select();

    if (error) {
      // Si el error es el 42P10, devolvemos un mensaje más claro
      if (error.code === '42P10') {
        return NextResponse.json({ 
          error: "La columna 'category_raw_match' debe ser marcada como UNIQUE en Supabase." 
        }, { status: 500 });
      }
      
      console.error("Supabase Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error("Critical Error map-team:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}