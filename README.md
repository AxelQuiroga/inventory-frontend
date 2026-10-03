# Inventory Frontend

Frontend del sistema web de gestión de inventario (Full-Stack End-to-End).
Consume la API REST de `inventory-backend` y cubre las features del dominio:
autenticación, dashboard, productos, movimientos, ventas y gestión de usuarios.

## 👥 Demo y roles

Este proyecto es una **demo pública** de portfolio. El acceso de demostración es
de **solo lectura**, con rol **VIEWER ("Lector")**:

* Email: `demo@inventory.com`
* Password: `demo1234` *(pública a propósito: es la cuenta de vitrina)*

Los roles **ADMIN** y **OPERATOR** forman parte del sistema, pero **requieren
autenticación y permisos propios**: sus credenciales no son públicas. El admin
se crea a partir de la variable `SEED_ADMIN_PASSWORD` (ver el README de
`inventory-backend`).

| Rol | Alcance |
| --- | --- |
| **VIEWER** ("Lector") | Solo lectura: ve dashboard, productos, movimientos y ventas, pero no crea ni modifica nada. Es el rol de la demo pública. |
| **OPERATOR** | Opera el día a día: registra entradas/salidas de stock y ventas. No gestiona productos ni usuarios. |
| **ADMIN** | Control total: productos (alta/edición/desactivación), usuarios y configuración. |

## 🛠️ Stack

* React 19 + TypeScript (strict)
* Vite 8
* React Router 8
* Vitest + Testing Library (unit) · MSW (mocking HTTP)
* Playwright Test (e2e contra backend real y TEST DB)
* Oxlint

## 🏗️ Estructura

```text
src/
├── features/            # Una carpeta por feature del dominio
│   ├── auth/            #   login, sesión, rutas protegidas (tokenStore, session)
│   ├── dashboard/
│   ├── products/
│   ├── movements/
│   ├── sales/
│   └── users/           #   gestión de usuarios + generador de passwords
├── shared/
│   ├── api/             # Cliente HTTP + tipos de paginación (contrato data/total)
│   ├── layout/          # Layout autenticado + navegación
│   └── ui/              # Design tokens (CSS) + componentes base
├── test/                # Setup de vitest + handlers de MSW
├── App.tsx              # Router (cableado de todas las páginas)
└── main.tsx
```

Reglas de la casa: las features NO se importan entre sí (solo `shared/`); los
matchers de rol (`ProtectedRoute`, `RoleRoute`) encierran las rutas; el 401
global limpia la sesión y redirige a `/login`.

## 🎨 CSS — convención del design system

* `shared/ui/tokens.css` es la **única fuente de valores visuales** (colores, spacing, radios, tipografía, sombras, focus). No existen valores mágicos fuera de ahí.
* Los componentes de `shared/ui` llevan su estilo **co-locado como CSS Module** (`Component.module.css`): scoping real por archivo, sin prefijos manuales de feature.
* Las vistas/features también usan `.module.css`: si la vista solo posiciona, el archivo es chico — el estilo de los controles vive en `shared/ui`.
* **Regla de oro: un patrón que se repite 2 veces es de `shared/ui`.** Filtros, paginación, estados vacíos, etc. nunca se copian entre features.
* Los controles nativos (select, input, textarea, checkbox…) **no se usan crudos**: pasan por el componente del design system (`Input`, `Select`, `Textarea`, `Checkbox`).
* Los componentes legacy en `ui.css` (clases planas globales) se migran a módulos cuando se tocan: no se agranda `ui.css`.

## 🚀 Instalación

```bash
npm install
cp .env.example .env   # VITE_API_URL apunta al backend (default http://localhost:3000)
```

## ▶️ Desarrollo

```bash
npm run dev            # Vite dev (http://localhost:5173)
```

Requiere el backend corriendo (`npm run dev` en inventory-backend).

## 🧪 Testing

```bash
npm test               # Unit: Vitest + Testing Library (203 tests)
npm run test:e2e       # E2E: Playwright contra backend real + TEST DB
                       # (levanta vite en 4310 y el backend e2e en 3210; TEST DB arriba)
npm run typecheck:e2e  # Typecheck del dir e2e/
npx tsc -b             # Typecheck de la app
npm run lint           # Oxlint
```

## 🔧 Scripts

| Script              | Qué hace                                  |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Servidor de desarrollo (vite)             |
| `npm run build`     | Typecheck + build de producción           |
| `npm run preview`   | Sirve el build localmente                 |
| `npm test`          | Suite unitaria (Vitest)                   |
| `npm run test:e2e`  | Suite e2e (Playwright)                    |
| `npm run lint`      | Oxlint                                    |
