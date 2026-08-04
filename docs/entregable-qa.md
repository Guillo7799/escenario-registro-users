# Desafío técnico QA: registro y aprobación de solicitudes

**Versión:** 1.0  
**Fecha:** 4 de agosto de 2026  
**Alcance:** análisis funcional, diseño de pruebas, reporte de defectos, criterio de salida y propuesta de automatización.

## Supuestos y alcance

- Una solicitud activa es aquella con estado **Pendiente de aprobación** o **Aprobada**. El negocio debe confirmar si una solicitud aprobada continúa considerándose activa y si existen otros estados.
- La unicidad de identificación y correo se evalúa sin distinguir mayúsculas en el correo y eliminando espacios externos.
- “Mayor a 10.000” no incluye exactamente 10.000.
- La observación requerida para montos mayores a 10.000 aplica al aprobar; el rechazo siempre exige motivo.
- La fecha y hora de auditoría son generadas por el servidor, no por el navegador.
- La validación del PDF debe comprobar extensión, MIME, firma/contenido y tamaño; renombrar un archivo no lo convierte en PDF válido.

# Parte A. Análisis funcional

## Escenarios principales

1. Registro exitoso de una solicitud Natural con información y PDF válidos.
2. Registro exitoso de una solicitud Jurídica con monto igual o superior a 1.000.
3. Consulta de una solicitud pendiente por un aprobador diferente de su creador.
4. Aprobación de una solicitud de hasta 10.000 sin observación.
5. Aprobación de una solicitud mayor a 10.000 con observación.
6. Rechazo de una solicitud con motivo obligatorio.
7. Consulta del historial completo de creación, aprobación o rechazo.

## Escenarios alternos y de borde

- Corrección de campos después de mostrar errores sin perder los valores válidos.
- Monto en los límites: 0, 0,01, 999,99, 1.000, 10.000 y 10.000,01.
- PDF de exactamente 5 MB y archivo que excede el límite por un byte.
- Archivo con extensión `.pdf`, pero contenido DOCX, ejecutable o vacío.
- Correos equivalentes con mayúsculas o espacios externos.
- Reutilización de identificación o correo luego de que una solicitud quede inactiva.
- Dos creaciones simultáneas con la misma identificación o correo.
- Doble clic o reintento de red al guardar/aprobar/rechazar.
- Acceso directo a rutas o endpoints de aprobación sin rol autorizado.
- Cambio o vencimiento de sesión mientras se diligencia o decide una solicitud.
- Intento de aprobar una solicitud propia después de cambiar de rol.

## Validaciones críticas

| Área | Validación esperada |
|---|---|
| Obligatoriedad | Todos los campos y el documento deben estar presentes antes de guardar. |
| Correo | Formato válido y unicidad entre solicitudes activas. |
| Identificación | Normalización y unicidad atómica entre solicitudes activas. |
| Monto | Numérico, mayor a cero, Jurídico mínimo 1.000 y observación si supera 10.000. |
| Documento | Un archivo, PDF real, máximo 5 MB, no vacío y disponible al decidir. |
| Autorización | Los permisos se validan en backend en cada operación, además de ocultar controles en UI. |
| Segregación | Un aprobador no puede decidir una solicitud creada por sí mismo. |
| Rechazo | Motivo no vacío después de normalizar espacios. |
| Estado | Solo solicitudes pendientes pueden aprobarse o rechazarse; la transición es atómica. |
| Auditoría | Usuario autenticado, acción, fecha/hora del servidor, estado y observación inmutables. |

## Riesgos funcionales

| Riesgo | Impacto | Mitigación/prueba |
|---|---|---|
| Autorización implementada solo en la interfaz | Decisiones fraudulentas o exposición de información | Pruebas negativas directas a rutas y API. |
| Condición de carrera en unicidad | Solicitudes activas duplicadas | Restricción transaccional en base de datos y prueba concurrente. |
| Validación por extensión del archivo | Carga de contenido corrupto o malicioso | Inspeccionar firma/MIME, analizar malware y almacenar fuera del directorio público. |
| Doble procesamiento de una decisión | Estados o auditorías inconsistentes | Control de versión/idempotencia y pruebas simultáneas. |
| Ambigüedad de “solicitud activa” | Reglas distintas entre negocio y desarrollo | Definir estados activos y documentarlos como criterio de aceptación. |
| Auditoría manipulable o incompleta | Pérdida de trazabilidad y cumplimiento | Generación server-side, registros inmutables y prueba de cada transición. |
| Sesiones o roles desactualizados | Acciones con permisos revocados | Revalidar autenticación/autorización en cada petición. |
| Datos personales expuestos | Riesgo legal y reputacional | Mínimo privilegio, cifrado, enmascaramiento y control de logs. |

# Parte B. Diseño de casos de prueba

## Casos funcionales

### CP-F-001 — Registrar solicitud Natural válida

- **Precondiciones:** usuario Creador autenticado; identificación y correo sin solicitud activa.
- **Datos:** ID `1122334455`; Mariana López; `mariana.lopez@example.com`; Natural; monto 4.500; fecha actual; `soporte.pdf` válido de 1 MB.
- **Pasos:** abrir Nueva solicitud; diligenciar los datos; adjuntar el PDF; guardar.
- **Resultado esperado:** se crea un único radicado en estado Pendiente de aprobación y se audita creación, fecha/hora y usuario.
- **Prioridad:** Alta.

### CP-F-002 — Registrar cliente Jurídico con monto mínimo

- **Precondiciones:** Creador autenticado; datos únicos.
- **Datos:** Jurídico; monto exactamente 1.000; demás campos y PDF válidos.
- **Pasos:** diligenciar y guardar la solicitud.
- **Resultado esperado:** la solicitud se guarda; el límite 1.000 es aceptado.
- **Prioridad:** Alta.

### CP-F-003 — Aceptar monto positivo mínimo para cliente Natural

- **Precondiciones:** Creador autenticado; datos únicos.
- **Datos:** Natural; monto 0,01; demás datos válidos.
- **Pasos:** crear la solicitud.
- **Resultado esperado:** solicitud pendiente creada sin error de monto.
- **Prioridad:** Media.

### CP-F-004 — Aceptar PDF de exactamente 5 MB

- **Precondiciones:** Creador autenticado; PDF real de 5.242.880 bytes.
- **Datos:** formulario válido y archivo en el límite.
- **Pasos:** adjuntar el archivo y guardar.
- **Resultado esperado:** el documento es aceptado y queda asociado al radicado.
- **Prioridad:** Alta.

### CP-F-005 — Visualizar solicitud pendiente como aprobador

- **Precondiciones:** solicitud pendiente; Aprobador diferente del creador autenticado.
- **Datos:** radicado existente.
- **Pasos:** ingresar a la bandeja; buscar el radicado; abrir el detalle.
- **Resultado esperado:** se muestran datos, PDF, estado, historial y acciones Aprobar/Rechazar.
- **Prioridad:** Alta.

### CP-F-006 — Aprobar solicitud menor a 10.000 sin observación

- **Precondiciones:** solicitud pendiente por 9.999,99 con PDF válido; aprobador autorizado.
- **Datos:** observación vacía.
- **Pasos:** abrir detalle; seleccionar Aprobar.
- **Resultado esperado:** estado Aprobada; auditoría con usuario y fecha/hora; no se exige observación.
- **Prioridad:** Alta.

### CP-F-007 — Aprobar solicitud de exactamente 10.000 sin observación

- **Precondiciones:** solicitud pendiente por 10.000; PDF válido; aprobador autorizado.
- **Datos:** observación vacía.
- **Pasos:** aprobar.
- **Resultado esperado:** se aprueba porque la regla aplica solo a montos mayores a 10.000.
- **Prioridad:** Alta.

### CP-F-008 — Aprobar monto mayor a 10.000 con observación

- **Precondiciones:** solicitud pendiente por 10.000,01; PDF válido; aprobador autorizado.
- **Datos:** observación “Capacidad de pago verificada”.
- **Pasos:** ingresar observación; aprobar.
- **Resultado esperado:** solicitud Aprobada y observación incluida en auditoría.
- **Prioridad:** Alta.

### CP-F-009 — Rechazar solicitud indicando motivo

- **Precondiciones:** solicitud pendiente; aprobador autorizado.
- **Datos:** motivo “Documento ilegible”.
- **Pasos:** abrir detalle; ingresar motivo; rechazar.
- **Resultado esperado:** estado Rechazada; motivo, aprobador y fecha/hora registrados.
- **Prioridad:** Alta.

### CP-F-010 — Reutilizar datos de una solicitud inactiva

- **Precondiciones:** negocio confirma que Rechazada es inactiva; existe solicitud rechazada.
- **Datos:** misma identificación y correo; demás datos válidos.
- **Pasos:** crear una nueva solicitud.
- **Resultado esperado:** se permite guardar porque no existe solicitud activa con esos datos.
- **Prioridad:** Media.

### CP-F-011 — Consultar trazabilidad completa

- **Precondiciones:** solicitud creada y posteriormente decidida.
- **Datos:** radicado aprobado o rechazado.
- **Pasos:** abrir detalle e historial.
- **Resultado esperado:** aparecen creación y decisión en orden, con estado, usuario y fecha/hora coherentes; ningún registro es editable.
- **Prioridad:** Alta.

### CP-F-012 — Corregir errores y conservar datos válidos

- **Precondiciones:** Creador autenticado.
- **Datos:** formulario con correo inválido y los demás campos válidos.
- **Pasos:** guardar; verificar mensaje; corregir solo el correo; guardar nuevamente.
- **Resultado esperado:** se preservan los demás valores y finalmente se crea una sola solicitud.
- **Prioridad:** Media.

## Casos negativos

### CP-N-001 — Rechazar campos obligatorios vacíos

- **Precondiciones:** Creador autenticado.
- **Datos:** formulario vacío.
- **Pasos:** abrir Nueva solicitud; guardar sin diligenciar.
- **Resultado esperado:** no se crea solicitud; cada campo obligatorio muestra un mensaje claro.
- **Prioridad:** Alta.

### CP-N-002 — Rechazar correo sin formato válido

- **Precondiciones:** Creador autenticado.
- **Datos:** `usuario.dominio.com`; demás datos válidos.
- **Pasos:** diligenciar y guardar.
- **Resultado esperado:** no se guarda y se informa formato inválido.
- **Prioridad:** Alta.

### CP-N-003 — Rechazar montos inválidos y Jurídico menor al mínimo

- **Precondiciones:** Creador autenticado.
- **Datos:** iteraciones con 0, -1 y Jurídico 999,99.
- **Pasos:** intentar guardar cada conjunto.
- **Resultado esperado:** se rechaza cada intento con el mensaje correspondiente y sin persistencia parcial.
- **Prioridad:** Alta.

### CP-N-004 — Rechazar documento inválido

- **Precondiciones:** Creador autenticado.
- **Datos:** sin archivo; dos archivos; PDF de 5 MB + 1 byte; DOCX; DOCX renombrado `.pdf`; PDF vacío.
- **Pasos:** intentar adjuntar/guardar con cada variante.
- **Resultado esperado:** no se guarda; solo se acepta un PDF real, no vacío y de hasta 5 MB.
- **Prioridad:** Crítica.

### CP-N-005 — Impedir duplicados bajo concurrencia

- **Precondiciones:** dos creadores autenticados en sesiones diferentes; no existe solicitud activa con los datos.
- **Datos:** misma identificación y/o correo, datos restantes válidos.
- **Pasos:** preparar ambos formularios; enviarlos simultáneamente.
- **Resultado esperado:** solo una transacción crea la solicitud; la otra recibe conflicto controlado; queda un único registro y una auditoría de creación.
- **Prioridad:** Crítica.

## Roles y permisos

### CP-R-001 — Bloquear pantalla y endpoint de aprobación al Creador

- **Precondiciones:** Creador autenticado; solicitud pendiente ajena.
- **Datos:** URL y petición directa del endpoint de decisión.
- **Pasos:** navegar directamente a la URL; enviar petición de aprobación/rechazo manipulada.
- **Resultado esperado:** respuesta 403/Acceso denegado; no se muestran acciones ni cambia estado/auditoría.
- **Prioridad:** Crítica.

### CP-R-002 — Permitir decisión al Aprobador autorizado

- **Precondiciones:** Aprobador autenticado; solicitud pendiente creada por otro usuario y con PDF válido.
- **Datos:** radicado disponible.
- **Pasos:** abrir bandeja y detalle; ejecutar una decisión válida.
- **Resultado esperado:** acceso y decisión permitidos, respetando motivo/observación y auditoría.
- **Prioridad:** Alta.

### CP-R-003 — Impedir autoaprobación incluso con rol Aprobador

- **Precondiciones:** el usuario creó una solicitud y posteriormente posee rol Aprobador.
- **Datos:** radicado propio pendiente.
- **Pasos:** buscar solicitud; intentar aprobar y rechazar desde UI y mediante API.
- **Resultado esperado:** controles ausentes/deshabilitados y API responde 403; estado y auditoría no cambian.
- **Prioridad:** Crítica.

# Parte C. Reporte de bugs

## BUG-001 — Se guardan solicitudes con correo electrónico sin “@”

- **Descripción:** la validación permite persistir un correo que no cumple un formato básico.
- **Precondiciones:** Creador autenticado; identificación y correo no registrados.
- **Pasos para reproducir:** abrir Nueva solicitud; diligenciar datos válidos; ingresar `usuario.dominio.com`; adjuntar PDF válido; guardar.
- **Resultado actual:** la solicitud se guarda en estado Pendiente de aprobación.
- **Resultado esperado:** se bloquea el guardado y se informa que el correo no es válido.
- **Severidad:** Alta, afecta integridad de datos y comunicaciones.
- **Prioridad:** Alta.
- **Evidencia sugerida:** video/capturas del formulario y del registro creado; request/response y consulta de base de datos.
- **Ambiente:** QA web; navegador, versión, build, API y base de datos por completar durante ejecución.

## BUG-002 — Se acepta un DOCX renombrado con extensión PDF

- **Descripción:** el sistema parece validar únicamente el nombre/extensión y no el contenido real.
- **Precondiciones:** Creador autenticado; archivo DOCX disponible.
- **Pasos para reproducir:** renombrar `documento.docx` como `documento.pdf`; completar formulario; adjuntar; guardar.
- **Resultado actual:** el archivo y la solicitud son aceptados.
- **Resultado esperado:** el servidor rechaza archivos cuya firma, MIME y estructura no correspondan a un PDF válido.
- **Severidad:** Crítica, permite contenido no autorizado y eleva riesgo de seguridad.
- **Prioridad:** Crítica.
- **Evidencia sugerida:** archivo usado, hash SHA-256, captura, cabeceras de la petición y respuesta.
- **Ambiente:** QA web; almacenamiento de archivos y servicio antimalware por especificar.

## BUG-003 — Un Creador accede por URL directa a la pantalla de aprobación

- **Descripción:** la ruta protegida no valida correctamente el rol de la sesión.
- **Precondiciones:** usuario con rol exclusivamente Creador autenticado.
- **Pasos para reproducir:** copiar la URL de aprobación; iniciar sesión como Creador; pegar la URL en el navegador; intentar abrir/decidir una solicitud.
- **Resultado actual:** se permite ingresar a la pantalla de aprobación.
- **Resultado esperado:** acceso denegado y respuesta HTTP 403; los endpoints también deben rechazar cualquier decisión.
- **Severidad:** Crítica, vulnera autorización y segregación de funciones.
- **Prioridad:** Crítica.
- **Evidencia sugerida:** video con usuario/rol, URL, respuesta de red y prueba directa al endpoint.
- **Ambiente:** QA web; navegador y build por completar.

## BUG-004 — El rechazo no exige motivo

- **Descripción:** es posible rechazar una solicitud dejando vacío el motivo requerido por negocio.
- **Precondiciones:** Aprobador autorizado; solicitud pendiente ajena.
- **Pasos para reproducir:** abrir el detalle; seleccionar Rechazar; dejar vacío el motivo; confirmar.
- **Resultado actual:** la solicitud cambia a Rechazada sin motivo.
- **Resultado esperado:** la decisión se bloquea y se muestra “El motivo de rechazo es obligatorio”.
- **Severidad:** Alta, afecta trazabilidad, atención al cliente y cumplimiento.
- **Prioridad:** Alta.
- **Evidencia sugerida:** video, captura del historial sin motivo y request/response de rechazo.
- **Ambiente:** QA web; build y API por completar.

## BUG-005 — La concurrencia permite solicitudes activas con identificación duplicada

- **Descripción:** dos operaciones simultáneas superan la validación de unicidad y crean duplicados.
- **Precondiciones:** dos sesiones Creador; identificación sin solicitud activa.
- **Pasos para reproducir:** diligenciar en ambas sesiones la misma identificación con datos válidos; sincronizar el envío; consultar los registros.
- **Resultado actual:** ambas solicitudes se guardan con radicados distintos.
- **Resultado esperado:** una creación tiene éxito y la otra falla con conflicto de identificación; debe existir un único registro activo.
- **Severidad:** Crítica, compromete integridad transaccional y decisiones financieras.
- **Prioridad:** Crítica.
- **Evidencia sugerida:** video de ambas sesiones, marcas de tiempo, requests/responses y consulta de base de datos con ambos radicados.
- **Ambiente:** QA web/API/base de datos; versiones y nivel de aislamiento por completar.

# Parte D. Criterio de salida y recomendación de liberación

**No recomiendo liberar el módulo a producción en su estado actual.** Tres defectos son bloqueantes: acceso de un Creador a aprobación, aceptación de archivos cuyo contenido no es PDF y creación concurrente de identificaciones duplicadas. Los tres afectan controles esenciales de seguridad e integridad y pueden provocar decisiones no autorizadas, carga de contenido riesgoso y duplicidad financiera. El rechazo sin motivo también debe corregirse antes de certificar por afectar trazabilidad y cumplimiento. El correo inválido podría clasificarse como no bloqueante solo si no participa en notificaciones o procesos posteriores; aun así debe quedar corregido para la certificación.

Antes de una nueva ronda se recomienda implementar autorización en backend y pruebas de acceso negativo; restricción única/transacción en base de datos para datos activos; validación server-side de firma, MIME, tamaño y análisis antimalware; obligatoriedad de motivo/observación en API; y auditoría inmutable con hora de servidor. Desarrollo debe añadir pruebas unitarias, integración y concurrencia para estos controles. QA debe ejecutar regresión completa, retest de los cinco defectos, pruebas de API y seguridad, y conservar evidencia de trazabilidad. La liberación requerirá cero defectos Críticos/Altos abiertos relacionados con autorización, archivos, unicidad, estados o auditoría; cobertura satisfactoria de los casos de prioridad Alta/Crítica y aceptación formal de cualquier riesgo residual por negocio.

# Parte E. Automatización

Se implementó un ejemplo con **Playwright y TypeScript/JavaScript** sobre la interfaz demostrativa. La configuración genera reporte HTML y conserva captura, video y traza cuando falla una prueba.

| ID | Caso automatizado | Justificación y valor | Nivel recomendado |
|---|---|---|---|
| AUTO-001 | Registro válido y estado pendiente | Es el flujo de mayor uso y valida formulario, carga PDF, persistencia visible y estado inicial. Detecta regresiones de extremo a extremo. | E2E UI; complementar creación/estado en API. |
| AUTO-002 | Correo, monto Jurídico y contenido PDF inválidos | Son reglas críticas y repetitivas, con alto riesgo de combinaciones y regresión. | Integración/API para matriz amplia; una muestra E2E en UI. |
| AUTO-003 | Acceso por rol y rechazo con motivo | Protege autorización y trazabilidad, áreas con defectos críticos reportados. | API para permisos y E2E para visibilidad/flujo. |

Archivos relevantes: `tests/solicitudes.spec.js`, `playwright.config.js` y `README.md`. En un producto real se separarían los datos por ejecución, se crearían precondiciones mediante API y se probaría concurrencia en integración para evitar pruebas UI lentas o frágiles.

# Matriz resumida de cobertura

| Requisito | Casos asociados |
|---|---|
| Registro y obligatoriedad | CP-F-001, CP-F-002, CP-F-003, CP-F-012, CP-N-001 |
| Correo | CP-F-001, CP-F-010, CP-N-002, CP-N-005 |
| Monto y tipo de cliente | CP-F-002, CP-F-003, CP-F-006, CP-F-007, CP-F-008, CP-N-003 |
| Documento PDF | CP-F-004, CP-N-004, CP-R-002 |
| Aprobación/rechazo | CP-F-005 a CP-F-009, CP-R-002 |
| Roles y autoaprobación | CP-R-001, CP-R-002, CP-R-003 |
| Unicidad/concurrencia | CP-F-010, CP-N-005 |
| Auditoría | CP-F-001, CP-F-008, CP-F-009, CP-F-011 |
