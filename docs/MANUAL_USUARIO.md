# Manual de usuario — Cierre de fixture, segunda rueda y playoffs

Guía para administradores de torneos en **Liga Vibe Sport**. Describe el flujo completo por categoría: fase regular → segunda rueda → playoffs.

**Última actualización:** julio 2026 · Reglas dinámicas por categoría (multi-grupo / liga única).

---

## Acceso a la aplicación

| Entorno | URL |
|---------|-----|
| Local | [http://localhost:3000](http://localhost:3000) |
| Red local | `http://<tu-ip>:3000` (Vite muestra la IP al iniciar `npm run dev`) |

**Ruta principal:** menú **Fixture** → seleccionar categoría.

---

## Navegación en la interfaz

Tras elegir una categoría, verás estas pestañas:

| Pestaña | Contenido |
|---------|-----------|
| **Fixture (Fechas)** | Generar fixture, ver grupos y partidos de fase 1 |
| **Resultados** | Cargar y revisar resultados jugados |
| **Segunda rueda** | Generar fase 2, posiciones acumuladas y clasificados (requiere cierre) |
| **Playoffs** | Cuadro eliminatorio y bracket (requiere cierre) |

Botones en la barra superior (cuando el fixture está generado):

- **Cerrar fixture** — disponible con fixture generado (fase 1 activa).
- **Segunda rueda** / **Playoffs** — atajos tras el cierre.

En **Segunda rueda** y **Playoffs** aparece un recuadro informativo (ícono ℹ️) con las **reglas detectadas** para esa categoría: formato, redistribución y tamaño del playoff.

---

## Resumen del flujo

| Fase | Nombre en la app | Valor `phase` | Qué ocurre |
|------|------------------|---------------|------------|
| 1 | **Fase regular** | 1 | Grupos o liga única con todos los partidos iniciales |
| Cierre | **Cerrar fixture** | — | Congela la fase 1 y habilita segunda rueda y playoffs |
| 2 | **Segunda rueda** | 2 | Nueva distribución de parejas + partidos con puntos arrastrados |
| 3 | **Playoffs** | 3 | Cuadro eliminatorio con las parejas clasificadas |

Las pestañas **Segunda rueda** y **Playoffs** solo se activan después de cerrar la fase regular.

---

## 1. Fase regular (antes del cierre)

### Generar el fixture

1. Entra a **Fixture** y selecciona la categoría.
2. Configura grupos o liga según el formato del torneo.
3. Pulsa **Generar fixture** y carga los resultados de cada partido.

### Formato de categoría

La app detecta automáticamente el formato según los grupos de fase 1:

| Estructura en fase 1 | Tipo detectado |
|----------------------|----------------|
| Un solo grupo (sin `league_groups` o un único grupo) | **Liga única** |
| Dos o más grupos (A, B, C…) | **Multi-grupo** |

Esa detección define las reglas de segunda rueda y el tamaño del playoff.

---

## 2. Cerrar fixture (cierre de fase regular)

### Cuándo cerrar

- Lo ideal: **todos los partidos de fase 1 jugados**.
- Si quedan partidos pendientes, puedes usar **cierre forzado** (con nota de motivo).

### Pasos

1. En la pestaña principal del fixture, pulsa **Cerrar fixture**.
2. Revisa el modal de previsualización:
   - Partidos jugados / pendientes
   - Clasificados sugeridos
   - Empates en el límite de clasificación
3. Si hay **empates en el límite**, resuélvelos en el modal antes de confirmar (o fuerza el cierre).
4. Confirma el cierre.

### Qué hace el sistema al cerrar

- Guarda un **snapshot** de posiciones de fase 1.
- Registra el cierre en el historial (`league_phase_closures`).
- Marca la categoría como **Closed** (`fixture_status`).
- Habilita las pestañas **Segunda rueda** y **Playoffs**.

> El cierre de fase 1 **no genera** automáticamente la segunda rueda ni el playoff. Esos pasos son manuales y reversibles.

---

## 3. Segunda rueda

Accede desde la pestaña **Segunda rueda** (requiere fixture cerrado).

### Reglas según formato

La app muestra un recuadro informativo con las reglas detectadas para tu categoría.

#### Multi-grupo (2 o más grupos en fase 1)

**Redistribución por matriz de rotación**

Cada pareja va a un grupo nuevo según su **posición** en fase 1. La fórmula asigna el origen: grupo destino + posición.

**Caso típico: 3 grupos × 7 parejas (21 equipos)**

| Posición en fase 1 | Comportamiento |
|--------------------|----------------|
| 1°, 4°, 7° | Mantienen la letra de su grupo (A→A, B→B, C→C) |
| 2°, 3°, 5°, 6° | Rotan entre grupos según la matriz |

**Arrastre de puntos:** puntos, partidos jugados, sets y juegos de fase 1 se suman a los de segunda rueda.

**Clasificación a playoff (3×7):**

- Top **5** de cada grupo → 15 parejas
- **Mejor 6°** entre los tres grupos → 1 pareja
- Total: **16** al playoff

**Otros multi-grupo:**

| Grupos | Regla resumida |
|--------|----------------|
| 2 grupos | Matriz cruzada; clasifican top 4 por grupo si hay ≥6 por grupo (8 al playoff) |
| 4+ grupos | Matriz de rotación; cupos repartidos para acercarse a cuadro de 8 o 16 |

#### Liga única (un solo grupo en fase 1)

**Pocas parejas (un solo sub-grupo)**

- Segunda rueda en **un solo grupo** (mismas parejas, nuevo round robin).
- Puntos de fase 1 se arrastran.
- Clasifican las mejores N al playoff (2, 4 u 8 según cantidad de equipos).

**Muchas parejas (división en sub-grupos)**

Si hay suficientes equipos, la liga se divide en 2 o 3 sub-grupos por **serpenteo** según ranking general:

- Ejemplo 21 parejas en liga única → 3 grupos de 7 por serpenteo.
- Con 3 sub-grupos de ≥6: clasifican **5 por grupo + mejor 6°** (igual que el caso 3×7).

### Generar la segunda rueda

1. Opcional: marca **Ida y vuelta** para doble round robin.
2. Pulsa **Generar grupos y fixture** (o **Regenerar desde fase 1** si ya existía).
3. Carga resultados de los partidos de fase 2.

### Paneles útiles

- **Posiciones (fase 1 + fase 2):** tabla acumulada con arrastre.
- **Clasificación a playoffs:** quién clasifica y quién queda fuera según las reglas detectadas.

### Reiniciar

**Reiniciar segunda rueda** elimina grupos, partidos y standings de fase 2 sin tocar fase 1 ni el cierre.

---

## 4. Playoffs

Accede desde la pestaña **Playoffs** (requiere fixture cerrado).

### Origen de clasificados

Las parejas salen de la **clasificación de segunda rueda** (no de fase 1 directamente):

- Top N por grupo según configuración detectada
- Mejor 6° (si aplica)
- Orden global por puntos, diferencia de sets y juegos para asignar seeds

### Tamaño del cuadro

| Clasificados | Cuadro |
|--------------|--------|
| 2 | Final directa |
| 4 | Semifinales → final |
| 8 | Cuartos → semis → final |
| 16 | Octavos → cuartos → semis → final |

El botón muestra el tamaño esperado, por ejemplo **Generar cuadro (16)**.

### Generar el cuadro

1. Completa (o avanza) la segunda rueda hasta tener suficientes clasificados.
2. Pulsa **Generar cuadro (N)**.
3. Carga resultados en el bracket; los ganadores avanzan automáticamente.

### Reiniciar

**Reiniciar cuadro** borra los partidos de playoff (fase 3) sin afectar segunda rueda ni fase regular.

---

## 5. Tabla de reglas por escenario

| Fase 1 | Segunda rueda | Clasificación playoff | Cuadro |
|--------|---------------|----------------------|--------|
| 3 grupos × 7 | Matriz A/B/C | 5 + 5 + 5 + mejor 6° | 16 |
| 2 grupos × 7 | Matriz 2 grupos | 4 + 4 | 8 |
| Liga única ≤7 | Mismo grupo | Top 4 (o menos) | 4 |
| Liga única 8–11 | 2 grupos serpenteo | Top por grupo | 4 u 8 |
| Liga única 12–20 | 2–3 grupos serpenteo | Top por grupo | 8 |
| Liga única 21 (3×7) | 3 grupos serpenteo | 5 + 5 + 5 + mejor 6° | 16 |
| 4+ grupos | Matriz | Top repartido por grupo | 8 o 16 |

---

## 6. Resolución de empates

En **cierre de fase 1** y en **posiciones de segunda rueda**, los empates se desempatan por:

1. Decisión manual registrada (desempate)
2. Puntos
3. Diferencia de sets
4. Diferencia de juegos

Resuelve empates en el límite de clasificación **antes** de cerrar o generar playoffs.

---

## 7. Preguntas frecuentes

**¿Puedo regenerar la segunda rueda?**  
Sí. Usa *Regenerar desde fase 1*; se recalculan grupos según el snapshot/standings actuales de fase 1.

**¿El cierre borra partidos?**  
No. Solo congela la fase 1 y guarda historial.

**¿Por qué la pestaña Segunda rueda está deshabilitada?**  
Debes pulsar **Cerrar fixture** primero.

**¿Por qué hay menos de 16 clasificados?**  
Faltan partidos de segunda rueda o la categoría tiene otro formato (p. ej. 8 equipos → cuadro de 8).

**¿Puedo mezclar reglas manualmente?**  
La configuración se guarda al generar segunda rueda según el formato detectado. Para otro formato, ajusta la estructura de grupos en fase 1 antes de generar.

---

## 8. Checklist rápido por categoría

- [ ] Fixture fase 1 generado y resultados cargados
- [ ] Empates en límite resueltos (si los hay)
- [ ] **Cerrar fixture** confirmado
- [ ] Segunda rueda generada; resultados cargados
- [ ] Clasificados al playoff verificados en el panel
- [ ] Cuadro de playoff generado
- [ ] Resultados de eliminatoria cargados hasta la final

---

*Documento generado para Liga Vibe Sport. Las reglas se implementan en `src/utils/secondRoundEngine.ts` y se aplican al pulsar **Generar grupos y fixture** en Segunda rueda.*
