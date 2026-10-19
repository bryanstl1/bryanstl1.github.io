# NODE MINER: puente WebSocket a pool Monero

ESTADO: código experimental. Cloudflare Worker creado y vinculado a GitHub por el usuario; despliegue de este código todavía pendiente de verificación. No hay minería real conectada.

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
2. Verificar que el Worker creado por el usuario conserva el secreto BRIDGE_TOKEN en Settings > Variables and Secrets después de desplegar desde GitHub.
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

## Configuración de Cloudflare Builds

- Repositorio: `bryanstl1/bryanstl1.github.io`, rama `main`
- Carpeta raíz del build: `/node-miner/bridge`
- Comando de compilación: vacío
- Comando de despliegue: `npx wrangler deploy`
- Archivo: `wrangler.jsonc`; nombre `node-miner-bridge`
- `keep_vars: true` ayuda a conservar las variables configuradas en el panel, y `secrets.required` obliga a verificar que `BRIDGE_TOKEN` existe.

Una nueva confirmación en esta carpeta debe iniciar una compilación si Cloudflare Builds quedó conectado correctamente.

### Prueba después de desplegar

En Safari, abrir **solo la ruta pública** `https://node-miner-bridge.bryan-stl270201.workers.dev/health`.

Si devuelve `{"service":"node-miner-bridge","mining":false}`, se desplegó el código de NODE MINER. Si muestra todavía `Hello World`, el despliegue nuevo no se aplicó. Si aparece un error, revisar primero el registro de Builds de Cloudflare.

El endpoint `/health` no conecta con HashVault ni comprueba shares; no significa que ya exista minería real.
