# ♾️ Forever Mints & 🐟 DreamCast

## ♾️ Forever Mints

Los Forever Mints son eventos **sin fecha de cierre** — están siempre activos y abiertos para mintear.

### 🔄 Diferencias con Eventos Regulares

| Característica | Evento Regular | Forever Mint |
|---|---|---|
| ⏰ **Duración** | Fecha de inicio y fin | Siempre activo |
| 📆 **Visualización de fecha** | Muestra fechas específicas | Muestra "Always Live" |
| 🔄 **Cooldown de voto** | 24h entre cambios | Cambio en cualquier momento |
| 🐉 **Cooldown voto NFT** | 24h por NFT | Sin cooldown |
| 📂 **Listado** | Cuadrícula por fecha | Pestaña dedicada "Forever" |

### 🗳️ Votación en Forever Mints

Como los forever mints son permanentes, las **reglas de votación son más flexibles**:

- 🔄 Puedes **cambiar la dirección de tu voto en cualquier momento** (sin esperar a medianoche UTC)
- 💪 Tu **poder de voto completo** aplica (base + NFT boosts)
- 📊 Los votos **aún cuentan** para tu límite diario de 5 votos
- ⛓️ Todos los votos se registran en **HCS** igual que los eventos regulares

### 🔍 Filtros

En el Calendario, usa el filtro **Forever** para ver solo forever mints (excluyendo DreamCast). Usa el filtro **DreamCast** para ver solo los pools de DreamCast.

---

## 🐟 DreamCast Pools

DreamCast es una experiencia de **mint de NFTs con temática de pesca** de DreamBay. Cada pool contiene NFTs organizados por tiers con diferentes niveles de rareza.

### 🎯 Sistema de Tiers

Cada pool de DreamCast tiene **5 tiers**, del más raro al más común:

| Tier | Rareza | Color |
|---|---|---|
| 🦑 **Kraken** | Ultra raro | 🟡 Amarillo |
| 🐉 **Hydra** | Muy raro | 🔴 Rojo |
| 🧜 **Siren** | Raro | 🟣 Morado |
| 🐠 **Keeper** | Poco común | 🔵 Azul |
| 🐟 **Small Fry** | Común | 🟢 Esmeralda |

### 📊 Información del Pool

Cada pool de DreamCast muestra:

- 🎯 **Desglose por tier** — Cuántos NFTs existen en cada tier
- 📈 **Stats** — Total de capturas (mints) y volumen total (HBAR gastado)
- 🖼️ **Preview NFTs** — Imágenes de muestra del pool
- 💰 **Precio de mint** — Costo por "cast" (intento de mint)
- 💸 **Buyback** — Si el pool soporta recompra de NFTs

### 🎀 Branding Visual

Los eventos DreamCast son **visualmente distintos** de los forever mints regulares:

- 🎀 **Branding rosa** (borde, badges, botones) vs morado para forever mints estándar
- 🐟 **Ícono de pez** con badge "DREAMCAST"
- 🎣 Botón **"Cast Now"** en lugar de "Mint Now"
- 🏷️ **Tier pills** mostrando todos los nombres de tier con sus colores asociados

### 📡 Fuente de Datos

Los pools de DreamCast se sincronizan automáticamente desde la **API de DreamBay**:

- 🔄 Los pools activos se importan diariamente
- 💾 La metadata (tiers, stats, previews) se almacena junto al evento
- 🚫 Los pools de prueba se filtran automáticamente
