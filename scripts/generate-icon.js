const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const svgPath = path.join(__dirname, '../public/icon.svg');
const pngPath = path.join(__dirname, '../public/icon.png');
const buildPngPath = path.join(__dirname, '../build/icon.png');

// Read the SVG file
const svgBuffer = fs.readFileSync(svgPath);

// Convert to PNG
sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile(pngPath)
  .then(() => {
    console.log('✅ Created public/icon.png');
    // Also copy to build folder
    fs.mkdirSync(path.join(__dirname, '../build'), { recursive: true });
    fs.copyFileSync(pngPath, buildPngPath);
    console.log('✅ Created build/icon.png');
    console.log('🎉 Icon generation complete!');
  })
  .catch(err => {
    console.error('Error generating icon:', err);
  });
