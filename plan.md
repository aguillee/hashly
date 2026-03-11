# Plan: News Analytics (admin-only)

Las noticias vienen de RSS (sin DB). Necesitamos tracking de views/clicks persistente.

## 1. Modelo Prisma — `NewsTracking`

Añadir modelo en `prisma/schema.prisma`:
```
model NewsTracking {
  id         String   @id  // usar el articleId del RSS (guid)
  views      Int      @default(0)
  clicks     Int      @default(0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@map("news_tracking")
}
```
Luego `npx prisma db push`.

## 2. API — `POST /api/news/track`

Nuevo archivo `app/api/news/track/route.ts`:
- Público, rate-limited
- Body: `{ articleId: string, type: "view" | "click" }`
- Upsert en `NewsTracking` (incrementa views o clicks)
- Silently fails (no rompe UX)

## 3. API — `GET /api/news/stats` (admin only)

Nuevo archivo `app/api/news/stats/route.ts`:
- Solo admin (`getCurrentUser()` + `isAdmin`)
- Devuelve: `{ stats: Record<articleId, { views, clicks }>, totals: { views, clicks } }`

## 4. Frontend — `app/news/page.tsx`

Cambios:
- Importar `useWalletStore` para saber si es admin
- Si admin: fetch `/api/news/stats` y mostrar views/clicks en cada `NewsCard`
- Si admin: mostrar totals arriba (total views, total clicks)
- Botón Refresh: solo visible para admin
- Auto-refresh: cambiar de 1h a 24h
- En cada `NewsCard`: track view (al renderizar) y track click (al hacer clic en el link)
- Pasar `stats` y `isAdmin` como props a `NewsCard`
- En NewsCard admin: badge pequeño con 👁 views · 🖱 clicks (estilo sutil)
