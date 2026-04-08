# 🗳️ Sistema de Votación

El sistema de votación de Hashly está diseñado para ser **transparente, justo y gratificante** para los miembros activos de la comunidad.

---

## ⚙️ Cómo Funciona la Votación

### 🎯 Voto Base

Cada wallet conectada obtiene **1 voto base** por evento. Puedes votar **up** (apoyo) o **down** (oposición) en eventos de mint NFT. Los meetups y hackathons solo permiten upvotes.

### 🐉 Poder de Voto con NFTs

Tener ciertos NFTs de Hedera **aumenta tu poder de voto**:

| NFT | Token ID | Boost | Detalles |
|---|---|---|---|
| 🐉 **Santuario Hedera Dragon** | `0.0.7235629` | +1 por NFT | Escala con tus holdings — 10 dragons = +10 votos |
| ⚔️ **El Santuario** | `0.0.9954622` | +5 fijo | Solo cuenta el primer NFT |

> **📌 Ejemplo:** Si tienes 3 Dragons y 1 El Santuario, tu poder de voto total es:
>
> `1 (base) + 3 (dragons) + 5 (El Santuario) = 9 votos`

La propiedad de NFTs se verifica **en tiempo real** contra el Hedera Mirror Node en el momento de votar.

### 📊 Límite Diario de Votos

Tienes **5 votos por día** en todos los tipos de eventos. El límite se reinicia a **medianoche UTC**. Cada acción de voto (up, down, o cambio de dirección) cuenta como un slot de voto.

### ⏰ Cooldown de Votos

| Tipo | Cooldown |
|---|---|
| **Eventos regulares** | Puedes cambiar tu voto después de la próxima medianoche UTC (ventana de 24h) |
| **Forever mints** | Puedes cambiar la dirección de tu voto en cualquier momento, sin cooldown |
| **Votos NFT en eventos regulares** | Cooldown de 24h por NFT por evento |
| **Votos NFT en forever mints** | Sin cooldown |

### 🔄 Cambios de Dirección

Si votaste **up** y quieres cambiar a **down**:

- El sistema **elimina tu peso de upvote** y lo agrega como downvote
- Para un peso de voto de 9, esto significa: **-9 de upvotes, +9 de downvotes** (swing neto de 18)
- Los cambios de dirección **cuestan un slot de voto diario**

---

## ⛓️ Registro On-Chain

Cada voto se envía al **Hedera Consensus Service (HCS)**, creando un registro inmutable on-chain.

**Formato del mensaje HCS:**

```json
{
  "type": "event_vote",
  "version": 1,
  "wallet": "0.0.xxxxx",
  "event_id": "cuid123...",
  "event_type": "nft",
  "vote": "up",
  "timestamp": 1234567890
}
```

Esto significa:

- ✅ **Cada voto es verificable** on-chain
- 🔒 **Nadie** (incluyendo admins) puede alterar los registros de votos
- 🔍 La comunidad puede **auditar los rankings** de forma independiente

---

## 📋 Votación por Tipo de Contenido

Hashly aplica las mismas mecánicas de votación en diferentes tipos de contenido:

| Contenido | Tipos de Voto | Cooldown | Registro HCS |
|---|---|---|---|
| 🖼️ NFT Mint Events | Up / Down | 24h | ✅ Sí |
| 🤝 Meetups | Solo Up | 24h | ✅ Sí |
| 🏗️ Hackathons | Solo Up | 24h | ✅ Sí |
| ♾️ Forever Mints | Up / Down | Ninguno | ✅ Sí |
| 🪙 Tokens | Up / Down | Ninguno | ✅ Sí |
| 🎨 NFT Collections | Up / Down | Ninguno | ✅ Sí |
| 🌐 Ecosystem Projects | Up / Down | Ninguno | ✅ Sí |

---

## 💡 Consejos

- 🎯 Usa tus **5 votos diarios** en eventos que genuinamente apoyes u opongas.
- 🐉 Haz hold de Dragon NFTs para **maximizar tu influencia**.
- 🏅 Votar cuenta para el **progreso de misiones** (misiones diarias y de temporada).
- 🔍 Revisa el [verificador de rareza](/rarity) de Dragon NFTs para descubrir dragons raros.
