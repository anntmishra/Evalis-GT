const bufferModule = require('buffer');

// `buffer-equal-constant-time`, pulled in by the JWT stack, still references
// SlowBuffer.prototype during module initialization. SlowBuffer was only an
// allocation compatibility API; Buffer supplies the prototype methods it uses.
if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = bufferModule.Buffer;
}

module.exports = bufferModule;
