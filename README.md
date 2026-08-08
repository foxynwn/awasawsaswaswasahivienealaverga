# X Region Blocker MX

**Chrome Extension para filtrar y bloquear tweets por región en México**

## Características

✅ **Filtrado por Estados MX**
- Selecciona qué estados permitir
- Bloquea automáticamente tweets de otras regiones
- Detección heurística por palabras clave

✅ **Detector de Cuenta & Ubicación**
- Información de usuario (verificación, seguidores)
- Ubicación estimada de la cuenta
- Info del dispositivo (OS, navegador, idioma)

✅ **Filtros Personalizados**
- Palabras clave propias
- Engagement mínimo (likes, retweets)
- Solo cuentas verificadas

✅ **Estadísticas en Tiempo Real**
- Tweets bloqueados/permitidos
- Desglose por estado
- Score de engagement

✅ **Import/Export**
- Exportar estadísticas como JSON
- Guardar/restaurar configuración
- Límite de retención de datos

## Instalación

1. Clona el repositorio
2. Ve a `chrome://extensions/`
3. Activa "Modo de desarrollador" (esquina superior derecha)
4. Click en "Cargar extensión sin empaquetar"
5. Selecciona la carpeta de la extensión

## Uso

### Tab Filtro
- Selecciona estados permitidos (los demás se bloquean)
- Añade palabras clave para filtrar tweets
- Configura engagement mínimo

### Tab Detector
- Detecta información de la cuenta actual
- Estima ubicación
- Muestra datos del dispositivo

### Tab Estadísticas
- Ve tweets bloqueados/permitidos en tiempo real
- Desglose por estado
- Exporta datos como JSON

### Tab Ajustes
- Bloqueo automático on/off
- Destacar tweets encontrados
- Notificaciones
- Retención de datos

## Estructura

```
.
├── manifest.json       # Configuración de la extensión
├── popup.html          # UI del popup
├── popup.js            # Lógica del popup
├── popup.css           # Estilos
├── content.js          # Script que se ejecuta en X/Twitter
├── background.js       # Service worker
└── icons/              # Iconos de la extensión
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## Estados Configurados

- 🏙️ CDMX (Cuidad de México)
- 🌳 Jalisco
- 🏔️ Chiapas
- 🌊 Veracruz
- 🏖️ Yucatán
- 🌾 Guanajuato
- ⛰️ Oaxaca
- 🏖️ Guerrero

## Nota Importante

Esta extensión es con propósitos educativos. Respeta los términos de servicio de X/Twitter.
