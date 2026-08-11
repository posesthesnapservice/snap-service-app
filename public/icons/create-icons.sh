#!/bin/bash
# This script creates placeholder SVG icons for the PWA
# In production, replace with actual PNG icons

for size in 72 96 128 144 152 192 384 512; do
  cat > "icon-${size}x${size}.svg" << SVG
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0a0a0f" rx="20"/>
  <text x="50%" y="55%" font-family="sans-serif" font-size="${size/3}" fill="#D4AF37" text-anchor="middle" dominant-baseline="middle">📷</text>
</svg>
SVG
done
echo "Icons created"
