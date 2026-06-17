import sharp from 'sharp'

/**
 * Pré-processamento de imagem para extração por IA.
 *
 * Modelos de visão reduzem a resolução da imagem antes de "ler". Prints de
 * celular são altos e estreitos (ex.: 1080×2400) — ao encolher essa proporção
 * esticada, o texto pequeno (odd, mercado, valores) vira borrão e a IA erra.
 *
 * Solução: normaliza a largura e, quando a imagem é muito alta, corta em fatias
 * horizontais com leve sobreposição. Cada fatia chega ao modelo em proporção
 * próxima de paisagem/quadrada, preservando a legibilidade do texto.
 */

const MAX_WIDTH = 1280          // largura máxima (legível + payload menor)
const TALL_RATIO = 1.6          // altura/largura acima disso = "alto" (celular)
const TARGET_SLICE_RATIO = 1.2  // proporção alvo de cada fatia (altura/largura)
const MAX_SLICES = 5            // teto de fatias por imagem
const OVERLAP = 0.08            // 8% de sobreposição entre fatias vizinhas
const JPEG_QUALITY = 92

export interface PreppedImage {
  buffer: Buffer
  mimeType: string
}

/**
 * Retorna 1 imagem (quando normal/larga) ou várias fatias contínuas
 * (quando o print é muito alto). Sempre em JPEG.
 */
export async function prepareBetImages(input: Buffer): Promise<PreppedImage[]> {
  // 1) Normaliza: corrige rotação EXIF e limita a largura.
  let pipeline = sharp(input, { failOn: 'none' }).rotate()
  const meta0 = await pipeline.metadata()
  if ((meta0.width ?? 0) > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH })
  }
  const normalized = await pipeline.jpeg({ quality: JPEG_QUALITY }).toBuffer()

  const meta = await sharp(normalized).metadata()
  const width = meta.width ?? 0
  const height = meta.height ?? 0
  if (!width || !height) return [{ buffer: normalized, mimeType: 'image/jpeg' }]

  const ratio = height / width
  if (ratio <= TALL_RATIO) {
    // Imagem normal/larga (típico de PC) — manda inteira.
    return [{ buffer: normalized, mimeType: 'image/jpeg' }]
  }

  // 2) Imagem alta (típico de celular) → fatia em N pedaços com sobreposição.
  const n = Math.min(MAX_SLICES, Math.max(2, Math.ceil(ratio / TARGET_SLICE_RATIO)))
  const baseSlice = Math.floor(height / n)
  const overlapPx = Math.round(baseSlice * OVERLAP)

  const slices: PreppedImage[] = []
  for (let i = 0; i < n; i++) {
    const top = Math.max(0, i * baseSlice - (i > 0 ? overlapPx : 0))
    const sliceH = Math.min(baseSlice + overlapPx, height - top)
    if (sliceH <= 0) continue
    const buffer = await sharp(normalized)
      .extract({ left: 0, top, width, height: sliceH })
      .sharpen()
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer()
    slices.push({ buffer, mimeType: 'image/jpeg' })
  }

  return slices.length ? slices : [{ buffer: normalized, mimeType: 'image/jpeg' }]
}
