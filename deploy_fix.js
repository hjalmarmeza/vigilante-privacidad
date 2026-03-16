const fs = require('fs');
const path = require('path');

const filePath = '/Users/hjalmarmeza/Downloads/Antigravity/Vigilante_Privacidad/index.html';
let content = fs.readFileSync(filePath, 'utf8');

// Forzar una versión nueva del script para romper el cache del navegador
const timestamp = Date.now();
content = content.replace('script.js', `script.js?v=${timestamp}`);
content = content.replace('style.css', `style.css?v=${timestamp}`);

fs.writeFileSync(filePath, content);
console.log('✅ Cache buster aplicado a index.html');
