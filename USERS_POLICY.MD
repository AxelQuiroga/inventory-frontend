# USERS_POLICY.MD — Contrato de producto del módulo Usuarios

> Estado: **DEFINIDA** — pendiente de implementación (slice futuro "Usuarios").
> Fuente: diagnóstico RBAC del 2026-09-20, verificado contra el backend real
> (código + 37 requests HTTP). Este documento es el contrato; cualquier
> implementación futura debe respetarlo.

---

## Principio rector

El sistema tiene **un único ADMIN**. Toda la política deriva de esa decisión:
no existen flujos de creación, desactivación ni eliminación de ADMIN, y el
sistema nunca puede quedar sin administrador.

## Modelo conceptual

```text
Usuarios
├── ADMIN (único, protegido — fuera de toda gestión)
├── OPERATOR
│   ├── activo
│   └── inactivo
└── VIEWER
    ├── activo
    └── inactivo
```

## Reglas por rol

### ADMIN (único)

- Es el administrador del sistema. **NO se desactiva, NO se elimina.**
- Crea y gestiona usuarios OPERATOR y VIEWER.
- Desde la gestión normal de usuarios **no existe** la opción de crear otro ADMIN.

### OPERATOR

- Creado por ADMIN, rol `OPERATOR`.
- Hace lo que el backend ya define: ver productos, entradas y salidas de stock,
  historial (matriz vigente más abajo).
- Puede ser **desactivado** y **reactivado** por ADMIN.
- No puede crear usuarios.

### VIEWER

- Creado por ADMIN, rol `VIEWER`.
- Solo lectura (productos, detalle, historial).
- Puede ser **desactivado** y **reactivado** por ADMIN.
- No puede crear usuarios.

## Register = "crear usuario interno"

El endpoint `POST /auth/register` (ADMIN-only, ya existe) se trata en el
frontend como **crear usuario interno**, nunca como registro público:

- ❌ Nada de "Registrarse" en el Login.
- ❌ El usuario no puede elegir `ADMIN` en ningún formulario.
- ✅ El selector de rol de la UI de creación permite únicamente:

```text
OPERATOR | VIEWER
```

- El ADMIN único queda fuera de ese flujo.
- Dato verificado del backend: register sin `role` explícito crea **VIEWER**
  (default del backend). El frontend debe enviar `role` siempre explícito.

## Desactivación (soft-disable)

Para OPERATOR y VIEWER:

- Desactivación posterior vía estado `activo/inactivo` (soft-disable), no
  eliminación física.
- **Prohibido eliminar físicamente usuarios**: los movimientos conservan
  `userId` para trazabilidad; un DELETE físico rompería el historial.
- El ADMIN **no muestra** acciones de desactivar/eliminar y no existe ninguna
  operación que deje el sistema sin administrador.

## Acciones del ADMIN sobre usuarios

```text
Crear usuario
├── OPERATOR
└── VIEWER

Gestionar usuario
├── ver datos
├── desactivar (OPERATOR/VIEWER)
├── reactivar (OPERATOR/VIEWER)
└── cambiar rol OPERATOR↔VIEWER  → FUTURO / decisión abierta
    (el backend hoy NO tiene update de usuario; si algún día se implementa,
    es un endpoint nuevo y una decisión de producto separada)
```

## Matriz vigente (del diagnóstico, ya implementada en backend)

| Acción                  | ADMIN | OPERATOR | VIEWER |
|-------------------------|:-----:|:--------:|:------:|
| Login                   |  ✅   |    ✅    |   ✅   |
| Ver productos / detalle |  ✅   |    ✅    |   ✅   |
| Crear / editar / (de)activar producto | ✅ | ❌ | ❌ |
| Entrada / salida de stock | ✅  |    ✅    |   ❌   |
| Ver historial           |  ✅   |    ✅    |   ✅   |
| Crear usuario (register)|  ✅   |    ❌    |   ❌   |

Códigos reales: 401 = no autenticado · 403 = autenticado sin permiso.

## Piezas de backend necesarias para implementar este módulo

Gap analysis sobre el backend actual (hoy NO existen; no implementar aún):

1. **Campo `active` en `users`** — migración de schema + entidad.
2. **`GET /users`** (ADMIN-only) — listar usuarios para la página de gestión.
3. **`POST /users/:id/deactivate` y `POST /users/:id/reactivate`** (ADMIN-only)
   — espejo del patrón ya existente en productos.
4. **Login consciente del estado** — el use case `Login` hoy solo valida
   email+password; deberá rechazar usuarios inactivos con un mensaje propio.
5. **Guard de ADMIN único** — los endpoints de gestión deben rechazar cualquier
   operación dirigida a un usuario con role `ADMIN` (defensa en el servidor,
   no solo en la UI).
6. **Decisión técnica abierta — JWT de inactivados**: los tokens son stateless;
   al desactivar un usuario su token sigue válido hasta expirar. Opciones:
   chequear estado en `authenticate` (una consulta por request) o aceptar la
   ventana hasta expiración. Resolver antes de implementar.
7. **Endurecimiento opcional de register**: hoy el backend acepta
   `role: 'ADMIN'` (verificado: 201). La UI no lo ofrecerá, pero como defensa
   en profundidad el backend podría rechazarlo explícitamente. Decisión
   pendiente — no implementada.

## Fuera de alcance (v1)

- Registro público, recuperación/ cambio de contraseña.
- Edición de email o datos de perfil.
- Eliminación física de usuarios.
- Múltiples ADMIN o jerarquías de administradores.
- Auditoría de sesiones / revocación de tokens individual.
