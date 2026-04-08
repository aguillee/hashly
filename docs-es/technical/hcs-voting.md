# 🗳️ Votaciones On-Chain (HCS)

Todos los votos en Hashly se registran en el **Hedera Consensus Service (HCS)** para total transparencia e inmutabilidad.

---

## 🔍 ¿Qué es HCS?

El Hedera Consensus Service es un servicio de registro **descentralizado y verificable**. Los mensajes enviados a un topic de HCS reciben un timestamp de consenso y se almacenan en un log inmutable y ordenado. **Cualquier persona** puede leer estos mensajes para verificar los datos de forma independiente.

---

## 📋 HCS Topics

Hashly utiliza topics de HCS dedicados para diferentes tipos de votos:

| Propósito | Topic ID (Mainnet) |
|---|---|
| 🗳️ Votos de Eventos | `0.0.10279947` |
| 💰 Votos de Assets (Tokens/Colecciones) | `0.0.10279948` |
| 📍 Check-ins de Asistencia | `0.0.10300837` |

---

## 📦 Formatos de Mensajes

### 🗳️ Votos de Eventos

Se registran cuando un usuario vota en un NFT mint, meetup o hackathon:

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

### 💰 Votos de Assets

Se registran cuando un usuario vota en un token, colección NFT o proyecto del ecosistema:

```json
{
  "type": "asset_vote",
  "version": 1,
  "wallet": "0.0.xxxxx",
  "target_id": "0.0.123456",
  "target_type": "token",
  "vote": "up",
  "voting_power": 9,
  "holdings": {
    "el_santuario": 1,
    "santuario_hedera": 3
  },
  "timestamp": 1234567890
}
```

### 📍 Check-ins de Asistencia

Se registran cuando un usuario hace check-in en un evento:

```json
{
  "type": "checkin",
  "version": 1,
  "wallet": "0.0.xxxxx",
  "event_id": "cuid123...",
  "timestamp": 1234567890
}
```

---

## 🔎 Verificar votos

Cualquier persona puede verificar los mensajes de HCS usando:

- 🌐 **Hedera Mirror Node API** — Consulta los mensajes del topic en:
  `https://mainnet.mirrornode.hedera.com/api/v1/topics/{topicId}/messages`
- 🔍 **HashScan** — Visualiza mensajes del topic en [hashscan.io](https://hashscan.io)
- 🛠️ **Exploradores de terceros** — Cualquier explorador de bloques de Hedera que soporte HCS topics

---

## 🔐 Submit Key

Todos los mensajes de HCS se envían a través de un **submit key controlado** (`0.0.10279885`). Esto asegura que solo el backend de Hashly pueda escribir en los topics, **previniendo spam** mientras se mantiene la transparencia de lectura.

> ⚠️ Los topics **no tienen admin key**, lo que los hace inmutables — una vez creados, la configuración del topic no puede cambiarse y los mensajes no pueden eliminarse.
