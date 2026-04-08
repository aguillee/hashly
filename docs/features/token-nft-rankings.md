# 📊 Rankings de Tokens & NFTs

Hashly permite a la comunidad **rankear tokens y colecciones NFT de Hedera** a través de votación on-chain.

---

## 🪙 Rankings de Tokens

### 📋 Qué se Lista

Los tokens de Hedera (fungible tokens) se sincronizan desde fuentes del ecosistema. Cada listado de token muestra:

- 🏷️ **Nombre y símbolo** del token
- 🆔 **Token ID** (ej. `0.0.XXXXX`)
- 💹 **Precio actual** y datos de mercado
- 🗳️ **Conteo de votos** de la comunidad
- 👍👎 **Botones de voto** up/down

### 🗳️ Votación

- ♾️ **Votos permanentes** — Puedes cambiar tu voto en cualquier momento (sin cooldown)
- 🐉 **NFT-boosted** — Tu poder de voto completo aplica (base + dragons + El Santuario)
- ⛓️ **On-chain** — Registrado vía HCS asset votes
- 🏅 **Cuenta para misiones** — Misión "Vota en 5 tokens diferentes" (100 XP)

---

## 🎨 Rankings de Colecciones NFT

### 📋 Qué se Lista

Las colecciones NFT de Hedera son curadas desde marketplaces y envíos de la comunidad. Cada listado muestra:

- 🏷️ **Nombre de la colección** e imágenes de preview
- 👤 **Información del creador**
- 💰 **Floor price** y volumen
- 🔢 **Supply total** y cantidad de holders
- 🗳️ **Conteo de votos** de la comunidad

### 🗳️ Votación

Mismas mecánicas que la votación de tokens:

- ♾️ Votos permanentes con cambios de dirección
- 🐉 Poder de voto NFT-boosted
- ⛓️ Registro on-chain vía HCS
- 🏅 Progreso de misión: "Vota en 5 colecciones NFT diferentes" (100 XP)

---

## ⛓️ Formato de Voto HCS

Los votos en tokens y colecciones se registran como **asset votes** en el topic HCS de assets:

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

> 🔍 Esto proporciona **transparencia total** — cualquiera puede ver quién votó, con cuánto poder, y cuándo.

---

## 📝 Enviar un Token o Colección

Los usuarios pueden enviar tokens o colecciones NFT para **revisión de la comunidad**. Los envíos pasan por aprobación de un admin antes de aparecer en los rankings.
