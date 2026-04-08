# 🔌 Resumen de la API

Hashly expone una **REST API** para toda la funcionalidad de la plataforma. Todos los endpoints están bajo `/api/`.

---

## 🌐 Endpoints Públicos (Sin autenticación)

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/events` | Listar eventos con filtros (tipo, fuente, búsqueda, rango de fechas, forever mints) |
| GET | `/api/events/[id]` | Obtener detalles de un evento |
| GET | `/api/forever-mints` | Listar forever mints (paginado) |
| GET | `/api/collections` | Listar colecciones NFT |
| GET | `/api/tokens` | Listar tokens |
| GET | `/api/ecosystem` | Listar proyectos aprobados del ecosistema |
| GET | `/api/leaderboard` | Obtener leaderboard de temporada |
| GET | `/api/news` | Obtener artículos de noticias agregados |
| GET | `/api/community/profiles` | Listar perfiles de comunidad aprobados |
| GET | `/api/home-ads` | Obtener carrusel de ads de la página principal |

---

## 🔐 Endpoints Autenticados (Requieren wallet)

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/auth/verify` | Autenticarse con firma de wallet |
| GET | `/api/auth/me` | Obtener info del usuario actual |
| POST | `/api/events/[id]/vote` | Votar en un evento |
| POST | `/api/collections/[id]/vote` | Votar en una colección |
| POST | `/api/tokens/[id]/vote` | Votar en un token |
| POST | `/api/ecosystem/[id]/vote` | Votar en un proyecto |
| GET | `/api/missions` | Obtener progreso de misiones |
| POST | `/api/missions/claim` | Reclamar una misión completada |
| POST | `/api/community/profile` | Crear perfil de comunidad |
| PUT | `/api/community/profile` | Actualizar perfil de comunidad |
| POST | `/api/events` | Enviar un nuevo evento |
| POST | `/api/ecosystem` | Enviar un nuevo proyecto |
| POST | `/api/referral/apply` | Aplicar un código de referido |
| GET | `/api/referral/stats` | Obtener estadísticas de referidos |
| GET | `/api/users/vote-limit` | Consultar votos diarios restantes |
| GET | `/api/users/nfts` | Obtener holdings de NFT del usuario |

---

## 🛡️ Endpoints de Admin

Los endpoints de admin requieren una wallet autenticada que esté en la variable de entorno `ADMIN_WALLETS`.

| Método | Endpoint | Descripción |
|---|---|---|
| PATCH | `/api/admin/events/[id]` | Aprobar/rechazar eventos |
| PATCH | `/api/admin/collections/[id]` | Aprobar/rechazar colecciones |
| PATCH | `/api/admin/ecosystem/[id]` | Aprobar/rechazar proyectos |
| POST | `/api/admin/sync/dreambay` | Sincronizar eventos de DreamBay |
| POST | `/api/admin/sync/kabila` | Sincronizar eventos de Kabila |

---

## ⏱️ Rate Limiting

Todos los endpoints tienen **rate limiting** para prevenir abuso. Los endpoints públicos tienen límites más altos que los autenticados. El rate limiter rastrea por **dirección IP** y **dirección de wallet**.

---

## 📦 Formato de Datos

- Todas las respuestas usan **JSON**.
- Las fechas están en formato **ISO 8601**.
- La paginación usa los parámetros `page` y `limit` donde aplique.
