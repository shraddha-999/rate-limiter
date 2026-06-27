// Vite 5 calls getRandomValues on the default import of 'node:crypto'.
// In Node < 19, node:crypto doesn't expose Web Crypto methods at the top level.
// Patching the module object here (CJS cache is shared with ESM imports)
// makes Vite's `crypto$2.getRandomValues(...)` work on any Node version.
const nodeCrypto = require('crypto')
if (typeof nodeCrypto.getRandomValues !== 'function') {
  const webCrypto = nodeCrypto.webcrypto
  nodeCrypto.getRandomValues = webCrypto.getRandomValues.bind(webCrypto)
  nodeCrypto.randomUUID = webCrypto.randomUUID.bind(webCrypto)
}
if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') {
  globalThis.crypto = nodeCrypto.webcrypto
}
