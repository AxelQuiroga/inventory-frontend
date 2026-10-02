# Frontend Rules — Inventory ERP

Estas reglas son obligatorias para todo desarrollo, refactor o nueva funcionalidad del frontend.

## 1. Objetivo del frontend

Este frontend pertenece a un **ERP de inventario profesional**.

No debe parecer:

* un proyecto tutorial;
* un CRUD académico;
* una demo de Vite;
* una colección de páginas independientes.

Debe transmitir:

* claridad;
* consistencia;
* simplicidad;
* sensación de producto real;
* buena jerarquía visual;
* facilidad de uso.

La prioridad es construir una base sólida y reutilizable, no agregar features rápidamente.

---

## 2. Backend como fuente de verdad

El backend existente define:

* endpoints;
* payloads;
* respuestas;
* errores;
* autenticación;
* autorización;
* reglas de negocio;
* estados de las entidades.

### Reglas

* NO inventar endpoints.
* NO inventar campos.
* NO duplicar reglas de negocio innecesariamente en el frontend.
* NO modificar contratos del backend para solucionar problemas visuales.
* Ante una duda sobre el comportamiento de una funcionalidad, inspeccionar primero el backend existente.
* El frontend debe adaptarse al contrato real del backend.

El frontend puede mejorar la experiencia de usuario, pero **el backend sigue siendo la autoridad final**.

---

## 3. Arquitectura

Mantener una arquitectura clara y escalable.

Separar:

```text
src/
├── app/
├── pages/
├── features/
├── shared/
│   ├── ui/
│   ├── api/
│   ├── hooks/
│   ├── utils/
│   └── types/
└── ...
```

La estructura concreta puede variar si el proyecto existente justifica otra decisión, pero debe mantenerse una separación clara entre:

* UI reutilizable;
* páginas;
* lógica de features;
* acceso a API;
* utilidades;
* estado/sesión.

### Prohibido

No crear componentes gigantes que mezclen:

* fetching;
* lógica de negocio;
* presentación;
* formularios;
* modales;
* tablas;
* estilos;

todo dentro de un único archivo.

Si un componente comienza a crecer demasiado, dividirlo.

---

## 4. Design System

El frontend debe utilizar componentes UI reutilizables.

Como mínimo, evaluar y reutilizar:

```text
shared/ui/
├── Button
├── Input
├── Select
├── Checkbox
├── Textarea
├── Card
├── Badge
├── Table
├── Alert
├── EmptyState
├── Loading/Spinner
├── PageHeader
├── Modal/Dialog
└── ConfirmDialog
```

No crear botones, inputs, badges o cards visualmente diferentes para cada página sin una razón concreta.

### Regla

Antes de crear un nuevo componente visual:

1. Buscar si ya existe uno reutilizable.
2. Si existe, reutilizarlo.
3. Si no existe y probablemente será reutilizable, crearlo en `shared/ui`.
4. Solo mantenerlo local si realmente pertenece exclusivamente a una feature.

---

## 5. Diseño visual

Eliminar progresivamente cualquier resto del template inicial de Vite.

El frontend debe tener:

* sistema consistente de spacing;
* tipografía consistente;
* tamaños consistentes;
* bordes y radios consistentes;
* estados hover/focus/disabled;
* colores semánticos;
* jerarquía visual clara;
* tablas legibles;
* formularios profesionales;
* feedback visual claro.

Evitar estilos inline salvo casos excepcionales.

Preferir CSS organizado y reutilizable.

No introducir estilos arbitrarios página por página.

---

## 6. Layout

El Layout principal debe establecer una estructura consistente:

```text
┌──────────────────────────────────────────────┐
│ Header / Topbar                              │
├───────────────┬──────────────────────────────┤
│ Sidebar       │                              │
│               │      Page Content            │
│ Dashboard     │                              │
│ Products      │                              │
│ Inventory     │                              │
│ ...           │                              │
└───────────────┴──────────────────────────────┘
```

Las páginas no deben reinventar su estructura.

Todas deben respetar:

* PageHeader;
* contenido principal;
* spacing consistente;
* estados de loading/error/empty;
* responsive behavior.

---

## 7. Tablas

Las tablas son una parte central del ERP.

Deben priorizar:

* lectura rápida;
* alineación;
* columnas importantes visibles;
* acciones claras;
* estados mediante badges;
* números correctamente alineados;
* responsive behavior razonable.

Evitar tablas visualmente cargadas.

No utilizar texto crudo como:

```text
(inactivo)
(stock bajo)
```

si existe un componente `Badge` que pueda representar esos estados.

---

## 8. Formularios

Todos los formularios deben:

* tener labels claros;
* indicar campos obligatorios;
* mostrar errores cerca del campo correspondiente;
* mostrar estado de submitting;
* evitar doble submit;
* conservar los datos introducidos cuando sea posible;
* mostrar feedback después de una operación exitosa;
* ser accesibles mediante teclado.

No utilizar únicamente `alert()` para comunicar errores de negocio o validación.

---

## 9. Estados obligatorios

Toda pantalla que dependa de API debe contemplar explícitamente:

### Loading

Mientras se obtiene información:

```text
Loading...
```

pero preferentemente mediante un componente visual consistente.

### Error

Mostrar un mensaje comprensible para el usuario.

No mostrar únicamente:

```text
Error 500
```

### Empty

Si no existen registros:

```text
No hay productos registrados.
```

acompañado, cuando corresponda, por una acción.

### Success

Después de operaciones como:

* crear;
* editar;
* registrar movimiento;
* activar;
* desactivar;

debe existir feedback claro.

---

## 10. Accesibilidad

Utilizar HTML semántico.

Obligatorio:

* labels asociados a inputs;
* botones reales para acciones;
* links reales para navegación;
* estados de focus visibles;
* navegación mediante teclado;
* `aria-*` únicamente cuando sea necesario;
* no utilizar `div` como botón.

Los componentes interactivos deben tener nombres accesibles.

---

## 11. Responsive

El frontend debe funcionar correctamente al menos en:

* desktop;
* laptop;
* tablet;
* mobile razonable.

No asumir que el usuario siempre tendrá una pantalla grande.

Las tablas pueden necesitar:

* scroll horizontal;
* columnas prioritarias;
* adaptación de acciones.

No romper el layout para intentar hacer todo responsive.

---

## 12. UX

No agregar funcionalidades únicamente porque "quedan bien".

Antes de implementar una interacción, preguntarse:

1. ¿Qué intenta hacer el usuario?
2. ¿Cuál es la acción principal?
3. ¿Qué información necesita?
4. ¿Qué puede salir mal?
5. ¿Qué feedback necesita después?

Priorizar workflows simples.

Ejemplo:

```text
Productos
   ↓
Seleccionar producto
   ↓
Ver stock
   ↓
Registrar entrada/salida
   ↓
Confirmación
   ↓
Stock actualizado
```

La interfaz debe hacer evidente ese flujo.

---

## 13. Roles y permisos

Los permisos deben respetar el contrato real del backend.

Nunca asumir permisos.

Antes de modificar visibilidad de acciones según rol:

1. inspeccionar el backend;
2. verificar middleware/authorization;
3. verificar tests;
4. reflejar exactamente esos permisos en la UI.

El frontend puede ocultar acciones no permitidas para mejorar UX, pero **no debe considerarse una capa de seguridad**.

El backend siempre debe validar permisos.

---

## 14. API

Mantener el acceso HTTP centralizado.

Las páginas no deberían hacer:

```ts
fetch(...)
```

directamente salvo que exista una razón explícita.

Preferir:

```text
productsApi
movementsApi
authApi
...
```

Los componentes deben trabajar con funciones de dominio/features y no preocuparse por detalles HTTP innecesarios.

---

## 15. Performance

Evitar:

* requests duplicados;
* renders innecesarios;
* refetches innecesarios;
* cálculos repetidos;
* cargar información que no se utiliza.

Antes de realizar un nuevo request:

**preguntarse si la información ya está disponible.**

No hacer requests adicionales simplemente por comodidad.

---

## 16. Código

Preferir:

* TypeScript estricto;
* funciones pequeñas;
* componentes pequeños;
* nombres descriptivos;
* early returns;
* composición;
* reutilización;
* dependencias mínimas.

Evitar:

* `any`;
* duplicación;
* componentes gigantes;
* lógica duplicada;
* comentarios que explican código obvio;
* abstracciones innecesarias.

No sobre-ingenierizar.

---

## 17. TDD

Las funcionalidades importantes deben desarrollarse siguiendo:

```text
Test
  ↓
Implementación
  ↓
Refactor
```

Los tests deben comprobar comportamiento observable.

Priorizar:

* render;
* interacción;
* navegación;
* permisos;
* estados loading/error/empty;
* formularios;
* integración con API mockeada.

Evitar tests excesivamente acoplados a:

* clases CSS;
* estructura interna;
* implementación privada;
* detalles irrelevantes.

Los tests existentes no deben romperse innecesariamente.

---

## 18. Antes de modificar una feature

El agente debe:

1. Inspeccionar la implementación actual.
2. Revisar los tests existentes.
3. Revisar las APIs utilizadas.
4. Revisar componentes reutilizables existentes.
5. Identificar qué puede reutilizarse.
6. Definir el cambio mínimo necesario.
7. Implementar.
8. Ejecutar tests.
9. Ejecutar typecheck.
10. Ejecutar build.
11. Ejecutar lint si está configurado.

No comenzar creando archivos o reestructurando carpetas sin haber inspeccionado primero el estado actual.

---

## 19. Regla anti-overengineering

No agregar:

* Redux;
* Zustand;
* React Query;
* UI frameworks;
* nuevas librerías;
* patrones complejos;
* abstracciones innecesarias;

sin justificar previamente por qué el proyecto realmente las necesita.

Primero utilizar las herramientas y arquitectura existentes.

---

## 20. Regla anti-rewrite

No reescribir una feature completa simplemente porque podría hacerse "más lindo".

Si algo funciona:

```text
preservar → refactorizar → mejorar
```

No:

```text
borrar → rehacer desde cero
```

Una reescritura completa requiere una razón técnica clara.

---

## 21. Regla de consistencia

Una decisión visual o arquitectónica nueva debe ser reutilizable.

Si se introduce:

```text
Button variant="primary"
```

las demás páginas deben poder utilizar el mismo componente.

Si se introduce un patrón para:

```text
loading
```

debe utilizarse de manera consistente.

El objetivo es que el frontend parezca construido por **un único sistema**, no por diferentes agentes en diferentes momentos.

---

## 22. Regla de cambios pequeños

Trabajar por slices.

Cada slice debe tener:

```text
Objetivo
↓
Inspección
↓
Implementación
↓
Tests
↓
Typecheck
↓
Build
↓
Review
↓
Commit
```

No mezclar en un mismo slice:

* rediseño;
* nueva feature;
* cambio de API;
* refactor arquitectónico;
* cambio de autenticación;

salvo que estén directamente relacionados.

---

## 23. Regla de decisión

Cuando exista más de una solución razonable:

* elegir la más simple;
* compatible con la arquitectura actual;
* reutilizable;
* fácil de mantener;
* coherente con el resto del frontend.

No introducir complejidad para resolver problemas que todavía no existen.

---

## 24. Prohibiciones absolutas

NO:

* inventar endpoints;
* inventar datos;
* inventar permisos;
* duplicar reglas de negocio;
* romper contratos existentes;
* borrar tests para hacer pasar el build;
* desactivar TypeScript para evitar errores;
* utilizar `any` como solución rápida;
* agregar librerías sin necesidad;
* crear componentes visuales duplicados;
* rehacer todo sin justificarlo;
* modificar backend durante una tarea exclusivamente frontend;
* sacrificar UX por velocidad;
* sacrificar arquitectura por una demo rápida.

---

## 25. Definition of Done

Una tarea frontend solamente está terminada cuando:

* [ ] La funcionalidad cumple el objetivo.
* [ ] Respeta el contrato real del backend.
* [ ] Respeta los permisos reales.
* [ ] Reutiliza componentes existentes.
* [ ] No introduce duplicación innecesaria.
* [ ] Tiene loading/error/empty cuando corresponde.
* [ ] Tiene feedback de acciones.
* [ ] Es razonablemente responsive.
* [ ] Es accesible.
* [ ] Los tests pasan.
* [ ] TypeScript pasa.
* [ ] Build pasa.
* [ ] Lint pasa si está configurado.
* [ ] No quedan archivos o código muerto.
* [ ] El cambio está limitado al scope de la tarea.
* [ ] El resultado visual mantiene coherencia con el resto del ERP.

---

# Regla principal

**No queremos simplemente un frontend que funcione.

Queremos un frontend de ERP que pueda crecer durante meses sin convertirse en un conjunto de páginas improvisadas.**

Ante cualquier decisión, priorizar:

```text
Correctitud
    ↓
Consistencia
    ↓
Reutilización
    ↓
UX
    ↓
Mantenibilidad
    ↓
Velocidad
```
