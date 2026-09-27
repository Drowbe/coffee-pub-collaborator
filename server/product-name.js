'use strict';

// The product's name, from configuration (PRODUCT_NAME). Sentences a person reads use this.
// The default matches server/index.js. A file format does not: those keys stay "collaborator".
function productName() {
  const name = typeof process.env.PRODUCT_NAME === 'string' ? process.env.PRODUCT_NAME.trim() : '';
  return name || 'Collaborator';
}

module.exports = { productName };
