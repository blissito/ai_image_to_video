# Requirements Document

## Introduction

Migrar la base de datos actual de archivo JSON a Turso (SQLite) manteniendo la funcionalidad existente con el mínimo cambio de código posible. La migración debe ser transparente para el usuario final y mantener toda la funcionalidad actual del sistema de créditos y gestión de usuarios.

## Requirements

### Requirement 1

**User Story:** Como desarrollador, quiero migrar de JSON file a Turso para tener una base de datos real sin cambiar la lógica de negocio existente.

#### Acceptance Criteria

1. WHEN el sistema inicia THEN debe conectarse automáticamente a Turso usando las credenciales del .env
2. WHEN se ejecuta una operación de usuario THEN debe funcionar exactamente igual que con el JSON file
3. WHEN se actualiza un usuario THEN los cambios deben persistir en Turso inmediatamente
4. IF la conexión a Turso falla THEN el sistema debe mostrar un error claro

### Requirement 2

**User Story:** Como desarrollador, quiero mantener la misma interfaz de funciones para minimizar cambios en el código existente.

#### Acceptance Criteria

1. WHEN llamo a getUser(email) THEN debe retornar el mismo formato de objeto que antes
2. WHEN llamo a updateUserCredits() THEN debe funcionar con los mismos parámetros
3. WHEN llamo a sufficientCredits() THEN debe retornar boolean como antes
4. WHEN llamo a addBucketLinkToUser() THEN debe agregar el link al array como antes
