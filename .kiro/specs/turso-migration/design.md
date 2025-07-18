# Design Document

## Overview

Implementar una migración minimalista de JSON file a Turso manteniendo exactamente la misma interfaz de funciones. El diseño se enfoca en el menor cambio posible: solo reemplazar las operaciones de archivo por queries SQL, manteniendo la misma estructura de datos y funciones públicas.

## Architecture

```
src/
├── db_setters.ts (modificar mínimamente)
├── db/
│   ├── turso.ts (nueva conexión)
│   ├── schema.sql (tabla users)
│   └── migrate.ts (script one-time)
```

**Principio:** Cambiar solo la implementación interna, mantener la interfaz pública idéntica.

## Components and Interfaces

### Database Connection (src/db/turso.ts)

```typescript
// Conexión singleton simple
export const db = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_KEY!,
});
```

### Schema (src/db/schema.sql)

```sql
-- Tabla única que replica exactamente la estructura JSON
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  credits INTEGER DEFAULT 0,
  video_ids TEXT DEFAULT '[]', -- JSON array as string
  bucket_links TEXT DEFAULT '[]', -- JSON array as string
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);
```

### Modified Functions (src/db_setters.ts)

- `getUser(email)` → SELECT + JSON.parse arrays
- `updateUserCredits()` → UPDATE + JSON.stringify arrays
- `sufficientCredits()` → Same logic, different data source
- `addBucketLinkToUser()` → UPDATE with array manipulation

## Data Models

**User Object (mantener formato exacto):**

```typescript
interface User {
  id?: number;
  name?: string;
  email: string;
  credits: number;
  videoIds: string[];
  bucketLinks: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

## Error Handling

- Mantener los mismos console.log y throw Error existentes
- Agregar solo validación básica de conexión DB
- No cambiar el manejo de errores en el resto del código

## Testing Strategy

1. **Migration Test:** Verificar que datos JSON se transfieren correctamente
2. **Function Compatibility:** Confirmar que todas las funciones existentes funcionan igual
3. **Integration Test:** Probar flujo completo de usuario (login → compra → generación)

## Implementation Notes

**Minimal Changes Approach:**

- Usar `@libsql/client` (ya compatible con Turso)
- Mantener arrays como JSON strings en DB (más simple que relaciones)
- No cambiar ninguna función pública, solo implementación interna
- Script de migración one-time para transferir data existente

**Dependencies to Add:**

```json
{
  "@libsql/client": "^0.4.0"
}
```

**Migration Strategy:**

1. Crear tabla en Turso
2. Leer JSON actual
3. Insertar cada usuario en Turso
4. Backup JSON como .bak
5. Modificar db_setters.ts
6. Test manual básico
