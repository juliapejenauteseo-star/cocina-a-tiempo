# Cocina a Tiempo

Aplicación para organizar una despensa familiar compartida, aprovechar alimentos próximos a su fecha y completar la compra. Código generado mediante instrucciones en lenguaje natural a Codex durante el Hackathon Vibe Coding E7.

Aplicación de referencia: https://cocina-a-tiempo-prueba.juls1976.chatgpt.site/app

Demostración ficticia sin registro: https://cocina-a-tiempo-prueba.juls1976.chatgpt.site/maqueta

## Referencia de entrega

Candidata v40. Release `3e26d596b0440763`. Commit de origen `2929f158a81161c4b2a58f164320e149ca8ee1d8`. La primera creación registrada es del 9 de octubre de 2026. `PROVENIENCIA.json` identifica archivos y hashes; `HISTORIAL_COMMITS.txt` conserva fechas y mensajes de los commits sin direcciones de correo.

Este repositorio preparado es un snapshot del código. Su nuevo historial de GitHub no sustituye el historial de origen ni el Google Doc de prompts. No se incluyen hogares, recibos, contraseñas, enlaces de invitación, archivos de entorno o exportaciones privadas.

## Funciones

- Hogar compartido con acceso por correo, invitaciones y separación de datos.
- Despensa por lotes, cantidades, ubicación, caducidad y consumo preferente.
- Quince recetas, propuestas por lote y raciones, y cambio voluntario de cantidades.
- Compra pendiente/comprada y formulario único para incorporar lo realmente adquirido.
- Consumo, descarte y correcciones protegidas de operaciones propias recientes.
- Dictado opcional con revisión antes de pasar al formulario y guardar.

## Estructura

`src/`: fuentes actuales. `dist/`: HTML y snapshot servido del release. `firestore.rules`: reglas de acceso. Los scripts `validar-*.mjs` incluidos son comprobaciones locales. La documentación técnica y los prompts de la candidatura se entregan en Google Docs independientes.

## Revisar el código

La versión publicada utiliza ChatGPT Sites y Firebase Spark. Para una inspección local se puede servir `dist` con un servidor HTTP estático y abrir `/app.html` o `/maqueta.html`. Abrir directamente desde el sistema de archivos no reproduce el entorno de módulos del navegador. El servidor estático genérico no implementa automáticamente las rutas `/app` y `/maqueta` usadas en Sites.

No se necesita compilación para servir el snapshot de `dist`. Las fuentes originales de `src` están incluidas para revisión y desarrollo. Para desplegar en otro proyecto, configura Firebase Authentication, Firestore, dominios autorizados y las reglas antes de probar. No actives facturación ni cambies reglas de acceso para eludir fallos.

La configuración web de Firebase forma parte del código público de la aplicación. La autorización de usuarios y hogares se aplica mediante Authentication y reglas de servidor; no por ocultar esa configuración.

## Comprobaciones locales

Con Node.js disponible, ejecutar desde esta carpeta, por ejemplo:

```text
node validar-simplificacion.mjs
node validar-voz-formulario.mjs
node validar-catalogo.mjs
```

Estos casos no son pruebas de micrófono real ni reemplazan los ensayos contra Firebase o dispositivos físicos. Los resultados publicados se distinguen por versión y tipo en la documentación técnica.

## Límites

El reconocimiento depende del navegador y puede usar un servicio remoto. La aplicación no certifica seguridad alimentaria ni aptitud para personas alérgicas. Preferencias e información de alérgenos se conservan; perfiles de alergias reales quedan fuera de esta versión. El modo maqueta es ficticio y local. Las correcciones pueden bloquearse si hubo cambios posteriores. No se garantiza uso sin conexión, accesibilidad certificada o compatibilidad con todos los navegadores.

## Datos de prueba

Para evaluar y grabar, usar únicamente cuentas, alias y alimentos ficticios. No introducir datos personales reales ni publicar contraseñas de usuarios. El acceso al hogar privado de la participante no forma parte de la entrega.
