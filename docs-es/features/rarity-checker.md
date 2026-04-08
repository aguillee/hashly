# 🔍 Verificador de Rareza NFT

Hashly incluye una herramienta integrada de **ranking de rareza** para la colección NFT **Santuario Hedera Dragon**.

---

## 📋 Información General

| Dato | Valor |
|---|---|
| 🎨 **Colección** | Santuario Hedera Dragons |
| 🆔 **Token ID** | `0.0.7235629` |
| 🔢 **Supply Total** | 1,000 |
| 📊 **Circulando** | 534 NFTs actualmente en wallets |
| 🏷️ **Tipos de Traits** | 9 categorías diferentes |

---

## 🏅 Tiers de Rareza

Los NFTs se rankean según su **puntaje de rareza combinado** en todos los traits:

| Tier | Criterio | Color del Badge |
|---|---|---|
| 🟢 **Mythic** | Solo Rank #1 | Verde |
| 🟡 **Legendary** | Top 5% | Amarillo |
| 🟣 **Epic** | Top 15% | Morado |
| 🟠 **Rare** | Top 30% | Naranja |
| 🟩 **Uncommon** | Top 50% | Verde |
| ⬜ **Common** | Debajo del 50% | Gris |

---

## 🧮 Cómo se Calcula la Rareza

1. 📊 **Frecuencia del Trait** — Para cada valor de trait, se cuenta cuántos NFTs lo comparten
2. 🔢 **Puntaje de Rareza** — `(1 - frecuencia / total) * 100` por trait. Un trait compartido por solo 1 NFT tiene un puntaje de ~99.8%
3. ⚖️ **Promedio Ponderado** — Cada tipo de trait tiene un peso. "Piel" (skin) tiene un peso personalizado del **15%**; los 8 traits restantes se reparten el **85%** equitativamente (~10.6% cada uno)
4. 🏆 **Ranking Final** — Los NFTs se ordenan por puntaje ponderado total. **Mayor = más raro**

### ⭐ Ranks Especiales

Los serials **#1, #652, #653 y #654** son **1-of-1 specials** — siempre mantienen el **Rank #1** independientemente de sus puntajes de traits.

---

## ✨ Funcionalidades

- 🔍 **Búsqueda** — Encuentra cualquier dragon por número de serial, nombre o valor de trait
- 🏅 **Filtro por tier** — Haz clic en Mythic, Legendary, Epic, etc. para filtrar
- 🏷️ **Filtro por listing** — Muestra solo los NFTs actualmente listados en venta
- 🔄 **Ordenar** — Por rank (default), número de serial, o precio de listing
- 📊 **Desglose de Traits** — Panel expandible mostrando todos los tipos de traits, sus pesos y distribuciones de valores
- 📈 **Supply Circulante** — Visualización en tiempo real del supply circulante vs máximo desde el Hedera Mirror Node

---

## 🐉 Vista de Detalle del NFT

Haz clic en cualquier tarjeta de dragon para ver:

- 🖼️ **Imagen a tamaño completo**
- 🏆 **Rank de rareza** y puntaje
- 🏷️ Todos los **valores de traits** con porcentajes de rareza individuales
- 🔢 **Cantidad** de NFTs que comparten cada trait
- 💰 **Status de listing** y precio (si está listado)

---

## 💪 Por Qué Importan los Dragons

Los Dragon NFTs no son solo coleccionables en Hashly — cada uno que tengas te da **+1 de poder de voto** en todos los eventos, tokens, colecciones y proyectos del ecosistema. El verificador de rareza te ayuda a descubrir cuáles dragons son los **hallazgos más raros**. 🐉
