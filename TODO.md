# TODO - Módulo Fase 2 / Playoff por categoría y grupo

## Estado general
- [x] 1. Crear migración DB para soportar fase 2 tipo grupos (además del modo eliminación).
- [x] 2. Extender tipos TypeScript para configuración, grupos y clasificación de fase 2.
- [ ] 3. Implementar `phase2Service` con CRUD de grupos/equipos y generación de partidos fase 2.
- [ ] 4. Integrar UI en `Fixture.tsx` para administrar fase 2 por categoría/grupo.
- [ ] 5. Conectar standings fase 2 desde 0 y clasificación por reglas.
- [ ] 6. Verificar build y pruebas críticas de flujo.
- [ ] 7. Documentar uso del nuevo módulo.

## Detalle por pasos

### 1) Migración DB
- [ ] Crear archivo `migrations/002_phase2_groups.sql` con:
  - [ ] Tabla/config para modo fase 2 por categoría (`elimination` | `group_league`)
  - [ ] Tabla de participantes de fase 2 (editable)
  - [ ] Reglas de clasificación fase 2 por categoría
  - [ ] Índices y constraints básicos
  - [ ] Comentarios de rollback

### 2) Tipos
- [ ] Actualizar `src/types/index.ts` con:
  - [ ] `Phase2Mode`
  - [ ] `Phase2Config`
  - [ ] `Phase2Participant`
  - [ ] `Phase2Rule`
  - [ ] `Phase2GroupStanding` / `Phase2Classification`

### 3) Servicio fase 2
- [ ] Crear `src/services/phase2Service.ts`:
  - [ ] `getConfig`, `saveConfig`
  - [ ] `getParticipants`, `addParticipant`, `removeParticipant`
  - [ ] `createOrUpdateGroups`
  - [ ] `generateGroupMatchesPhase2`
  - [ ] `clearPhase2Data`
  - [ ] `previewPhase2Standings`
  - [ ] `getPhase2Classification`

### 4) UI en Fixture
- [ ] Modificar `src/pages/Fixture.tsx`:
  - [ ] Nuevo bloque “Administrador Fase 2”
  - [ ] Selector de modo
  - [ ] Gestión de grupos y parejas (agregar/quitar/mover)
  - [ ] Botón generar/regenerar partidos fase 2
  - [ ] Tabla standings fase 2
  - [ ] Vista de clasificados fase 2

### 5) Reglas funcionales
- [ ] Standings fase 2 calculados solo con `phase = 2`
- [ ] Puntos parten desde 0
- [ ] Clasificación basada en reglas y desempates

### 6) Verificación
- [ ] `npm run build`
- [ ] Revisión de errores de tipos/lint
- [ ] Pruebas críticas manuales del módulo

### 7) Documentación
- [ ] Actualizar `README.md` con flujo de fase 2 por grupos
