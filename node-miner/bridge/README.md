# NODE MINER: puente WebSocket a pool Monero

ESTADO: BORRADOR, NO DESPLEGADO. No hay minería real conectada.

Este archivo prepara el componente de red que conectaría Safari con pool.hashvault.pro:443 (TLS).
El cálculo RandomX seguirá ocurriendo en el propio iPhone, con consentimiento explícito.
El código del puente NO crea potencia de CPU ni genera criptomonedas.

SEGURIDAD:
- Destino fijo (no sirve como proxy TCP abierto).
- Solo acepta Origin https://bryanstl1.github.io y una contraseña de acceso de al menos 32 caracteres.
- BRIDGE_TOKEN debe configurarse como SECRET en Cloudflare, nunca en este repositorio ni en el chat.
- Un Origin válido no demuestra identidad: el token es imprescindible.
- No publiques ni compartas la URL que lleve el token de acceso. Rótala si se expone.
- No almacena la frase de recuperación ni las claves privadas de Monero.

FALTA:
1. Confirmar que Cloudflare Workers permita este uso bajo sus términos vigentes.
2. Crear un Worker en la cuenta personal del usuario y configurar BRIDGE_TOKEN como secreto.
3. Verificar funcionamiento WSS<->Stratum; el código no ha sido probado con un pool real.
4. Implementar e integrar cliente Stratum en Safari: login, recepción de jobs y seed_hash, nonces, submit, dificultad y contador de shares aceptadas. El RandomX LAB actual es solo un benchmark local.
5. Validar si HashVault acepta una tasa cercana a 4.67 H/s. Una share puede tardar varias horas, y pago no está garantizado.

Cloudflare Workers:
https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/
https://developers.cloudflare.com/workers/runtime-apis/websockets/
https://developers.cloudflare.com/workers/platform/limits/

Pool:
https://hashvault.pro/monero/ports

Nunca subir claves secretas a GitHub Pages, que es público.
