export interface Product {
  id: string;
  name: string;
  description: string;
  /** merchant notional V in USD, decimal string */
  priceUsd: string;
  emoji: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "mug",
    name: "Studio Mug",
    description: "Hand-thrown stoneware, 350ml. The demo classic.",
    priceUsd: "5.00",
    emoji: "☕️",
  },
  {
    id: "tee",
    name: "FirmPay Tee",
    description: "Heavyweight cotton. 'The price that can't flinch.'",
    priceUsd: "12.00",
    emoji: "👕",
  },
  {
    id: "stickers",
    name: "Sticker Pack",
    description: "Six die-cut stickers. Zero-delta guaranteed.",
    priceUsd: "2.50",
    emoji: "✨",
  },
];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}
