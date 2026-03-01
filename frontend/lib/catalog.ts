export type CurrencyCode = "GBP" | "USD" | "EUR";
export type ProductCategory =
  | "tshirt"
  | "shirt"
  | "hoodie"
  | "jacket"
  | "pants"
  | "jeans";
export type ProductGender = "men" | "women" | "unisex";
export type ProductSize = "XS" | "S" | "M" | "L" | "XL";
export type ProductColor =
  | "black"
  | "white"
  | "blue"
  | "navy"
  | "green"
  | "red"
  | "grey"
  | "beige";

export type CatalogProduct = {
  id: string;
  name: string;
  category: ProductCategory;
  subcategory: string;
  price: number;
  currency: CurrencyCode;
  gender: ProductGender;
  availableSizes: ProductSize[];
  colors: ProductColor[];
  material: string;
  keywords: string[];
};

type CatalogIndex = {
  byCategory: Record<ProductCategory, CatalogProduct[]>;
  byGender: Record<ProductGender, CatalogProduct[]>;
  bySize: Record<ProductSize, CatalogProduct[]>;
  priceAsc: CatalogProduct[];
};

const PRODUCTS: CatalogProduct[] = [
  {
    id: "tee-001",
    name: "Classic Crew Tee",
    category: "tshirt",
    subcategory: "crew-neck",
    price: 18,
    currency: "GBP",
    gender: "men",
    availableSizes: ["S", "M", "L", "XL"],
    colors: ["white", "navy"],
    material: "cotton",
    keywords: ["tshirt", "tee", "crew", "mens", "casual"],
  },
  {
    id: "tee-002",
    name: "Essential Everyday Tee",
    category: "tshirt",
    subcategory: "crew-neck",
    price: 14,
    currency: "GBP",
    gender: "women",
    availableSizes: ["XS", "S", "M", "L"],
    colors: ["white", "red"],
    material: "cotton",
    keywords: ["tshirt", "tee", "womens", "basic", "soft"],
  },
  {
    id: "tee-003",
    name: "Relaxed Fit Studio Tee",
    category: "tshirt",
    subcategory: "oversized",
    price: 20,
    currency: "GBP",
    gender: "unisex",
    availableSizes: ["S", "M", "L"],
    colors: ["black", "grey"],
    material: "jersey",
    keywords: ["tshirt", "tee", "unisex", "relaxed", "oversized"],
  },
  {
    id: "shirt-001",
    name: "Oxford Button Shirt",
    category: "shirt",
    subcategory: "button-down",
    price: 32,
    currency: "GBP",
    gender: "men",
    availableSizes: ["S", "M", "L", "XL"],
    colors: ["white", "blue"],
    material: "oxford cotton",
    keywords: ["shirt", "button", "formal", "mens", "office"],
  },
  {
    id: "shirt-002",
    name: "Cropped Poplin Shirt",
    category: "shirt",
    subcategory: "button-up",
    price: 28,
    currency: "GBP",
    gender: "women",
    availableSizes: ["XS", "S", "M", "L"],
    colors: ["beige", "white"],
    material: "poplin",
    keywords: ["shirt", "button", "womens", "smart", "cropped"],
  },
  {
    id: "hoodie-001",
    name: "Core Fleece Hoodie",
    category: "hoodie",
    subcategory: "pullover",
    price: 35,
    currency: "GBP",
    gender: "men",
    availableSizes: ["S", "M", "L", "XL"],
    colors: ["black", "grey"],
    material: "fleece",
    keywords: ["hoodie", "sweatshirt", "mens", "warm", "casual"],
  },
  {
    id: "hoodie-002",
    name: "Weekend Zip Hoodie",
    category: "hoodie",
    subcategory: "zip-up",
    price: 38,
    currency: "GBP",
    gender: "unisex",
    availableSizes: ["S", "M", "L", "XL"],
    colors: ["green", "navy"],
    material: "french terry",
    keywords: ["hoodie", "zip", "unisex", "layering", "soft"],
  },
  {
    id: "jacket-001",
    name: "Lightweight Coach Jacket",
    category: "jacket",
    subcategory: "coach",
    price: 48,
    currency: "GBP",
    gender: "men",
    availableSizes: ["M", "L", "XL"],
    colors: ["navy", "black"],
    material: "nylon",
    keywords: ["jacket", "coach", "mens", "lightweight", "outerwear"],
  },
  {
    id: "jacket-002",
    name: "Utility Overshirt Jacket",
    category: "jacket",
    subcategory: "overshirt",
    price: 44,
    currency: "GBP",
    gender: "women",
    availableSizes: ["S", "M", "L"],
    colors: ["beige", "green"],
    material: "twill",
    keywords: ["jacket", "overshirt", "womens", "utility", "layering"],
  },
  {
    id: "pants-001",
    name: "Slim Chino Trousers",
    category: "pants",
    subcategory: "chino",
    price: 26,
    currency: "GBP",
    gender: "men",
    availableSizes: ["S", "M", "L", "XL"],
    colors: ["beige", "navy"],
    material: "cotton twill",
    keywords: ["pants", "trousers", "chino", "mens", "smart-casual"],
  },
  {
    id: "pants-002",
    name: "Tailored Straight Pants",
    category: "pants",
    subcategory: "tailored",
    price: 29,
    currency: "GBP",
    gender: "women",
    availableSizes: ["XS", "S", "M", "L"],
    colors: ["black", "grey"],
    material: "stretch blend",
    keywords: ["pants", "trousers", "womens", "tailored", "office"],
  },
  {
    id: "jeans-001",
    name: "Straight Leg Denim",
    category: "jeans",
    subcategory: "straight",
    price: 24,
    currency: "GBP",
    gender: "unisex",
    availableSizes: ["S", "M", "L", "XL"],
    colors: ["navy", "black"],
    material: "denim",
    keywords: ["jeans", "denim", "straight", "unisex", "everyday"],
  },
];

function groupByCategory(products: CatalogProduct[]): Record<ProductCategory, CatalogProduct[]> {
  return {
    tshirt: products.filter((product) => product.category === "tshirt"),
    shirt: products.filter((product) => product.category === "shirt"),
    hoodie: products.filter((product) => product.category === "hoodie"),
    jacket: products.filter((product) => product.category === "jacket"),
    pants: products.filter((product) => product.category === "pants"),
    jeans: products.filter((product) => product.category === "jeans"),
  };
}

function groupByGender(products: CatalogProduct[]): Record<ProductGender, CatalogProduct[]> {
  return {
    men: products.filter((product) => product.gender === "men"),
    women: products.filter((product) => product.gender === "women"),
    unisex: products.filter((product) => product.gender === "unisex"),
  };
}

function groupBySize(products: CatalogProduct[]): Record<ProductSize, CatalogProduct[]> {
  return {
    XS: products.filter((product) => product.availableSizes.includes("XS")),
    S: products.filter((product) => product.availableSizes.includes("S")),
    M: products.filter((product) => product.availableSizes.includes("M")),
    L: products.filter((product) => product.availableSizes.includes("L")),
    XL: products.filter((product) => product.availableSizes.includes("XL")),
  };
}

function buildCatalogIndex(products: CatalogProduct[]): CatalogIndex {
  return {
    byCategory: groupByCategory(products),
    byGender: groupByGender(products),
    bySize: groupBySize(products),
    priceAsc: [...products].sort((left, right) => left.price - right.price),
  };
}

export const catalogProducts = PRODUCTS;
export const catalogIndex = buildCatalogIndex(PRODUCTS);
