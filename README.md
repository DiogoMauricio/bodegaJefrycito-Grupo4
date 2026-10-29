# Gestock · Sistema de Gestión de Inventario de Bodega Jefrysito

Proyecto EQ04 — Diseño e Implementación de Sistemas (USMP, 2026-II).

Este repositorio contiene la **base del Sprint 1**. Sobre ella se construyen el Sprint 2 y el Sprint 3.

## Cómo correrlo

```bash
npm install
npm run dev
```

Abrir http://localhost:3000. Credenciales demo: usuario `admin` / contraseña `gestock123`.

## Sprint 1 — Gestión Básica de Inventario (EP1) ✅

| HU | Nombre | Dónde está |
|---|---|---|
| HU-01 | Iniciar sesión de administrador | `app/login/page.tsx`, `lib/store.tsx` (login) |
| HU-02 | Registrar producto | `app/admin/productos`, `components/admin/product-form-dialog.tsx` |
| HU-03 | Gestionar información y estado del producto | `app/admin/productos` (editar / activar / inactivar) |
| HU-04 | Registrar entrada de mercadería | `app/admin/entradas`, `lib/store.tsx` (`registerEntry`) |
| HU-07 | Consultar stock actual | `app/admin/inventario`, `lib/store.tsx` (`getStock`) |

## Sprint 2 — Control y Seguimiento de Inventario (EP2) ⏳

| HU | Nombre | Sugerencia |
|---|---|---|
| HU-05 | Registrar venta en tienda | Nueva página `app/admin/ventas`. Validar stock **disponible**, bloquear vencidos/inactivos y descontar por **FEFO**. Usar `buildMovement` con tipo `venta`. |
| HU-06 | Consultar Kardex de movimientos | `app/admin/kardex` (Historial con filtros por producto, tipo y fechas, detalle de origen) |
| HU-08 | Gestionar alertas de stock mínimo | `app/admin/alertas` (Alertas dinámicas agotado/bajo y enlace directo a reposición) |
| HU-09 | Productos próximos a vencer y vencidos | Página `app/admin/vencimientos`. Ya existe `lotExpiryState` (umbral 30 días). |
| HU-10 | Dashboard de inventario | Reemplazar `app/admin/page.tsx` por el Dashboard con indicadores. |

Al agregar una página nueva, registrarla en el menú: `components/admin/admin-shell.tsx` → arreglo `NAV`.

## Sprint 3 — Gestión de Reservas Web (EP3) ⏳

HU-11 Catálogo web · HU-12 Carrito de reserva · HU-13 Ajuste de inventario · HU-14 Registrar reserva web · HU-15 Notificaciones de reservas.

## Estructura

```
app/
  login/            HU-01
  admin/
    page.tsx        Inicio del panel (en Sprint 2 → Dashboard HU-10)
    productos/      HU-02, HU-03
    entradas/       HU-04
    inventario/     HU-07
components/
  admin/            Menú lateral, encabezados, formulario de producto
  ui/               Componentes base (shadcn/ui)
lib/
  store.tsx         Estado y reglas de negocio
  types.ts          Tipos (Producto, Lote, Movimiento, Stock)
  mock-data.ts      Datos de prueba
data/               Historias de usuario (documento)
```

## Notas

- Stack: Next.js + React + TypeScript + Tailwind + shadcn/ui.
- Por ahora los datos viven **en memoria** (`lib/store.tsx`) y se reinician al recargar la página. La conexión a base de datos se hace reemplazando las funciones del store.
- El build ya **no ignora errores de TypeScript**: si `npm run build` falla, hay que corregir el tipo antes de subir.
- Trabajar en una rama por HU (por ejemplo `hu-05-ventas`) y abrir un Pull Request hacia `main`.
