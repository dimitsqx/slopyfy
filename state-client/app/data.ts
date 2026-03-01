export type Product = {
  id: string;
  name: string;
  ageGroup: "kids" | "adults";
  category: "tops" | "bottoms" | "outerwear" | "accessories" | "footwear";
  priceUsd: number;
  sizes: string[];
  colors: string[];
  productDescription: string;
  inventory: number;
};

export const PRODUCTS: Product[] = [
  {
    id: "tee-001",
    name: "Nimbus Cotton Tee",
    ageGroup: "adults",
    category: "tops",
    priceUsd: 28,
    sizes: ["XS", "S", "M", "L", "XL"],
    colors: ["white", "midnight", "sage"],
    productDescription: "Soft combed cotton tee with a relaxed fit and reinforced neck.",
    inventory: 42,
  },
  {
    id: "hood-002",
    name: "Atlas Fleece Hoodie",
    ageGroup: "adults",
    category: "outerwear",
    priceUsd: 74,
    sizes: ["S", "M", "L", "XL"],
    colors: ["charcoal", "sand"],
    productDescription: "Heavyweight fleece hoodie with double-layer hood and hidden pocket.",
    inventory: 18,
  },
  {
    id: "pants-003",
    name: "Tide Tapered Chino",
    ageGroup: "adults",
    category: "bottoms",
    priceUsd: 62,
    sizes: ["28", "30", "32", "34", "36"],
    colors: ["navy", "khaki", "olive"],
    productDescription: "Tapered chino with stretch cotton and a clean, minimal finish.",
    inventory: 30,
  },
  {
    id: "jkt-004",
    name: "Summit Shell Jacket",
    ageGroup: "adults",
    category: "outerwear",
    priceUsd: 128,
    sizes: ["S", "M", "L"],
    colors: ["black", "slate"],
    productDescription: "Lightweight shell with water resistance and breathable lining.",
    inventory: 12,
  },
  {
    id: "cap-005",
    name: "Drift Canvas Cap",
    ageGroup: "kids",
    category: "accessories",
    priceUsd: 24,
    sizes: ["OS"],
    colors: ["ecru", "forest"],
    productDescription: "Structured canvas cap with an adjustable brass buckle.",
    inventory: 55,
  },
  {
    id: "sneak-006",
    name: "Flux Knit Runner",
    ageGroup: "kids",
    category: "footwear",
    priceUsd: 96,
    sizes: ["8", "9", "10", "11", "12"],
    colors: ["graphite", "cloud"],
    productDescription: "Knit runner with cushioned midsole and grippy outsole.",
    inventory: 20,
  },
];
