import { loadConfig } from './config.js';
import { createPool } from './db.js';

interface SeedProduct {
  sku: string;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
}

const products: SeedProduct[] = [
  {
    sku: 'aur-hp-01',
    name: 'Aurora Wireless Headphones',
    description: 'Over-ear headphones with active noise cancelling and 40 hours of battery life.',
    priceCents: 12900,
    stock: 24,
  },
  {
    sku: 'mer-lmp-01',
    name: 'Meridian Desk Lamp',
    description: 'Adjustable brass desk lamp with a warm dimmable LED and a weighted base.',
    priceCents: 6400,
    stock: 12,
  },
  {
    sku: 'hal-mug-04',
    name: 'Halden Ceramic Mug, Set of 4',
    description: 'Stoneware mugs finished in a matte reactive glaze. Dishwasher and microwave safe.',
    priceCents: 2800,
    stock: 40,
  },
  {
    sku: 'tor-kb-87',
    name: 'Torres Mechanical Keyboard',
    description: 'Compact 87-key layout with hot-swappable tactile switches and a machined aluminium case.',
    priceCents: 14900,
    stock: 8,
  },
  {
    sku: 'wex-nb-a5',
    name: 'Wexler Leather Notebook',
    description: 'A5 refillable notebook in full-grain leather, supplied with dot-grid paper.',
    priceCents: 3200,
    stock: 55,
  },
  {
    sku: 'nor-thr-01',
    name: 'Nordvik Wool Throw',
    description: 'Lambswool throw woven in a herringbone pattern, 130 by 180 centimetres.',
    priceCents: 8900,
    stock: 17,
  },
  {
    sku: 'cal-cfe-02',
    name: 'Calder Pour-Over Coffee Set',
    description: 'Borosilicate carafe, stainless filter and walnut collar. Brews up to four cups.',
    priceCents: 5400,
    stock: 21,
  },
  {
    sku: 'lum-spk-03',
    name: 'Lumen Portable Speaker',
    description: 'Splash-resistant Bluetooth speaker with a passive radiator and 18 hours of playback.',
    priceCents: 7900,
    stock: 0,
  },
  {
    sku: 'fen-bag-01',
    name: 'Fenwick Canvas Backpack',
    description: 'Waxed cotton canvas with a padded laptop sleeve that fits up to 16 inches.',
    priceCents: 11200,
    stock: 14,
  },
  {
    sku: 'ors-pan-26',
    name: 'Orsa Cast Iron Pan, 26cm',
    description: 'Pre-seasoned cast iron skillet suitable for hob, oven and open fire.',
    priceCents: 6800,
    stock: 30,
  },
  {
    sku: 'val-csh-45',
    name: 'Vale Linen Cushion Cover',
    description: 'Stonewashed linen cover with a concealed zip, 45 by 45 centimetres.',
    priceCents: 2400,
    stock: 63,
  },
  {
    sku: 'bre-org-01',
    name: 'Brecken Desk Organiser',
    description: 'Solid oak organiser with slots for stationery, cards and a phone stand.',
    priceCents: 3900,
    stock: 19,
  },
];

const config = loadConfig();
const pool = createPool(config.databaseUrl);

try {
  for (const product of products) {
    await pool.query(
      `INSERT INTO products (sku, name, description, price_cents, image_url, stock)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (sku) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         price_cents = EXCLUDED.price_cents,
         image_url = EXCLUDED.image_url,
         stock = EXCLUDED.stock,
         updated_at = now()`,
      [
        product.sku,
        product.name,
        product.description,
        product.priceCents,
        `/images/${product.sku}.jpg`,
        product.stock,
      ],
    );
  }
  console.log(`Seeded ${products.length} products`);
} finally {
  await pool.end();
}