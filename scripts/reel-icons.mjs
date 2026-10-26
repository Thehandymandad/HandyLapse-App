// Genera le icone dell'app Reel Studio (schermata Home di iPhone / PWA): node scripts/reel-icons.mjs
import sharp from "sharp";

const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0A0B0E"/>
  <circle cx="256" cy="256" r="210" fill="url(#g)"/>
  <defs><radialGradient id="g"><stop offset="0" stop-color="#D4FF3A" stop-opacity="0.28"/><stop offset="1" stop-color="#D4FF3A" stop-opacity="0"/></radialGradient></defs>
  <rect x="146" y="104" width="220" height="304" rx="44" fill="none" stroke="#D4FF3A" stroke-width="26"/>
  <path d="M226 196 L314 256 L226 316 Z" fill="#D4FF3A" stroke="#D4FF3A" stroke-width="14" stroke-linejoin="round"/>
  <path d="M392 92 l12 30 30 12 -30 12 -12 30 -12 -30 -30 -12 30 -12z" fill="#FFFFFF"/>
</svg>`;

for (const [file, size] of [["public/reel-icon-180.png", 180], ["public/reel-icon-192.png", 192], ["public/reel-icon-512.png", 512]]) {
  await sharp(Buffer.from(svg(size))).png().toFile(file);
  console.log(file);
}
