# 🎾 Liga Vibe 2026 - Tournament Management

Sistema profesional para la gestión de torneos de Padel, desarrollado para la **Liga Vibe 2026 by Netxtrust**.

## 🚀 Despliegue en Vercel

Este proyecto está optimizado para desplegarse en [Vercel](https://vercel.com). Sigue estos pasos:

1.  **Conecta tu Repo**: Importa este repositorio en el Dashboard de Vercel (https://github.com/Pedro-IA-Netxtrust/LigaVibe).
2.  **Configura Variables de Entorno**: Agrega estas dos variables en los ajustes del proyecto:
    *   `VITE_SUPABASE_URL`: Su URL de Supabase.
    *   `VITE_SUPABASE_ANON_KEY`: Su clave anónima de Supabase.
3.  **Configuración Automática**: Vercel detectará Vite y usará `npm run build` automáticamente. El archivo `vercel.json` incluido maneja las rutas de Single Page Application (SPA).

## ✨ Características

- ✅ **Fixture Dinámico**: Generación de grupos y ligas tipo Round Robin.
- ✅ **Gestión de Resultados**: Carga flexible con sets opcionales (modo rápido) o detallado.
- ✅ **Tabla de Posiciones**: Cálculo automático basado en puntos (3-2-1-0) y diferencia de sets/games.
- ✅ **Zona de Peligro**: Reset completo de categorías para administradores.
- ✅ **Exportación**: Compatible con WhatsApp y descarga de reportes en CSV.

## 🛠️ Tecnologías

- **React 19** + **TypeScript**
- **Vite 6** (Build ultra rápido)
- **Tailwind CSS v4** (Diseño premium y moderno)
- **Lucide React** (Iconografía)
- **Supabase** (Backend as a Service)

---
*Desarrollado con ❤️ para Liga Vibe 2026*
