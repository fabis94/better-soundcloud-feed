import sharp from "sharp";

const sizes = [16, 48, 128];

await Promise.all(
  sizes.map((size) =>
    sharp("public/icon.svg")
      .resize(size, size)
      .png()
      .toFile(`public/icon-${size}.png`)
  )
);

console.log(`Generated icons: ${sizes.map((s) => `icon-${s}.png`).join(", ")}`);
