# 🍻 AppBirras

App móvil para llevar la cuenta de cuántas bebidas se toma cada persona en
una fiesta. Sin apps que instalar: es una página web que se abre desde el
móvil (y se puede "Añadir a pantalla de inicio" para que parezca una app).

Todos los que abran el enlace ven los mismos datos en tiempo real (usa
Firebase Firestore como base de datos gratuita).

## Cómo se usa

- **Inicio**: lista de personas. Toca una para ver su resumen.
- **Detalle de persona**: resumen (nº de bebidas, gramos de alcohol puro,
  UBEs, ritmo), desglose por tipo de bebida y las últimas bebidas (con botón
  ✕ para deshacer un toque accidental).
- **Botón ＋**:
  - Toque rápido → abre una lista simple para elegir la bebida.
  - **Mantener pulsado** → aparece un menú radial con todas las bebidas;
    desliza el dedo hasta la que quieras y suelta para añadirla.
- **⚙️ Ajustes**: añade o elimina personas y bebidas (nombre, emoji, ml y
  % de alcohol) sobre la marcha, en cualquier momento.

Los gramos de alcohol se calculan como `ml × %vol × 0.8 / 100` y 1 UBE
(Unidad de Bebida Estándar) equivale a 10 g de alcohol puro — es una
estimación orientativa, no un dato médico.

## Puesta en marcha (una sola vez)

### 1. Crear el proyecto de Firebase (gratis)

1. Ve a [console.firebase.google.com](https://console.firebase.google.com) y
   crea un proyecto nuevo (puedes desactivar Google Analytics, no hace falta).
2. Dentro del proyecto, entra en **Compilación → Firestore Database** →
   **Crear base de datos** → elige una región cercana → empieza en **modo de
   producción**.
3. Ve a la pestaña **Reglas** de Firestore y pega el contenido de
   [`firestore.rules`](firestore.rules) de este proyecto, sustituyendo lo que
   haya. Publica los cambios.
4. Vuelve a **Configuración del proyecto** (icono del engranaje) → baja hasta
   "Tus apps" → pulsa el icono `</>` (Web) → dale un nombre → **Registrar
   app**. Te mostrará un objeto `firebaseConfig`.
5. Copia esos valores en [`js/firebase-config.js`](js/firebase-config.js),
   sustituyendo los `"TU_..."` por los tuyos reales.

> Nota de seguridad: como la app no tiene login (se comparte el enlace entre
> amigos), cualquiera con el enlace puede leer/escribir los datos. Es la
> configuración más simple posible para una noche de fiesta; no metas datos
> sensibles.

### 2. Subir el proyecto a GitHub

```bash
git init
git add .
git commit -m "AppBirras: primera versión"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/appbirras.git
git push -u origin main
```

(Crea antes el repositorio vacío en GitHub, o hazlo con `gh repo create`.)

### 3. Activar GitHub Pages

1. En el repositorio de GitHub, ve a **Settings → Pages**.
2. En "Build and deployment" → **Source**, elige **Deploy from a branch**.
3. Selecciona la rama **main** y la carpeta **/(root)** → **Save**.
4. En 1-2 minutos tu app estará en
   `https://TU_USUARIO.github.io/appbirras/`.

Comparte ese enlace con el grupo — todo el que lo abra en su móvil verá y
sumará bebidas en tiempo real.

## Notas técnicas

- Sin build step: HTML/CSS/JS puro con módulos ES, cargados directamente por
  el navegador. El SDK de Firebase se importa desde el CDN oficial de Google.
- Estructura de datos en Firestore: colecciones `people`, `drinks` y `logs`
  (cada trago es un documento `{personId, drinkId, createdAt}`), así que las
  estadísticas siempre reflejan el historial completo y en tiempo real.
- Si abres `index.html` sin configurar Firebase, verás un aviso indicando
  que falta rellenar `js/firebase-config.js`.
