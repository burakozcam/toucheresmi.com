export function scanPixels(pixels: Uint8ClampedArray, mode: string, threshold: number, contrast: number) {
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3] / 255;
    const red = pixels[i] * alpha + 255 * (1 - alpha), green = pixels[i + 1] * alpha + 255 * (1 - alpha), blue = pixels[i + 2] * alpha + 255 * (1 - alpha);
    if (mode === "color") { pixels[i] = red; pixels[i + 1] = green; pixels[i + 2] = blue; }
    else { const gray = Math.max(0, Math.min(255, factor * (.299 * red + .587 * green + .114 * blue - 128) + 128)); const value = mode === "bw" ? (gray >= threshold ? 255 : 0) : gray; pixels[i] = pixels[i + 1] = pixels[i + 2] = value; }
    pixels[i + 3] = 255;
  }
  return pixels;
}
