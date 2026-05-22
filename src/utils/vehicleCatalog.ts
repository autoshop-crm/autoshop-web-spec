export interface VehicleBrandCatalogItem {
  brand: string;
  logoUrl?: string;
  models: string[];
}

const carLogoDataset = (slug: string) => `https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/thumb/${slug}.png`;

export const vehicleBrandCatalog: VehicleBrandCatalogItem[] = [
  {
    brand: 'Audi',
    logoUrl: carLogoDataset('audi'),
    models: ['A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q3', 'Q5', 'Q7', 'Q8', 'TT']
  },
  {
    brand: 'BMW',
    logoUrl: carLogoDataset('bmw'),
    models: ['1 Series', '3 Series', '5 Series', '7 Series', 'X1', 'X3', 'X5', 'X6', 'X7', 'M3', 'M5']
  },
  {
    brand: 'Chery',
    logoUrl: carLogoDataset('chery'),
    models: ['Tiggo 4', 'Tiggo 7 Pro', 'Tiggo 8 Pro', 'Arrizo 8']
  },
  {
    brand: 'Chevrolet',
    logoUrl: carLogoDataset('chevrolet'),
    models: ['Aveo', 'Cruze', 'Lacetti', 'Captiva', 'Tahoe', 'Camaro']
  },
  {
    brand: 'Ford',
    logoUrl: carLogoDataset('ford'),
    models: ['Focus', 'Mondeo', 'Kuga', 'Explorer', 'Transit', 'Mustang']
  },
  {
    brand: 'Geely',
    logoUrl: carLogoDataset('geely'),
    models: ['Atlas', 'Coolray', 'Monjaro', 'Emgrand', 'Tugella']
  },
  {
    brand: 'Haval',
    logoUrl: carLogoDataset('haval'),
    models: ['F7', 'F7x', 'Jolion', 'Dargo', 'H9', 'M6']
  },
  {
    brand: 'Honda',
    logoUrl: carLogoDataset('honda'),
    models: ['Civic', 'Accord', 'CR-V', 'HR-V', 'Pilot', 'Fit']
  },
  {
    brand: 'Hyundai',
    logoUrl: carLogoDataset('hyundai'),
    models: ['Solaris', 'Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Creta']
  },
  {
    brand: 'Kia',
    logoUrl: carLogoDataset('kia'),
    models: ['Rio', 'Ceed', 'Cerato', 'Sportage', 'Sorento', 'K5']
  },
  {
    brand: 'LADA',
    logoUrl: carLogoDataset('lada'),
    models: ['Granta', 'Vesta', 'Niva Legend', 'Niva Travel', 'Largus', 'XRAY']
  },
  {
    brand: 'Mazda',
    logoUrl: carLogoDataset('mazda'),
    models: ['Mazda 3', 'Mazda 6', 'CX-3', 'CX-5', 'CX-9']
  },
  {
    brand: 'Mercedes-Benz',
    logoUrl: carLogoDataset('mercedes-benz'),
    models: ['A-Class', 'C-Class', 'E-Class', 'S-Class', 'GLA', 'GLE', 'GLS', 'V-Class']
  },
  {
    brand: 'Nissan',
    logoUrl: carLogoDataset('nissan'),
    models: ['Almera', 'Qashqai', 'X-Trail', 'Juke', 'Patrol', 'Teana']
  },
  {
    brand: 'Renault',
    logoUrl: carLogoDataset('renault'),
    models: ['Logan', 'Sandero', 'Duster', 'Kaptur', 'Arkana', 'Megane']
  },
  {
    brand: 'Skoda',
    logoUrl: carLogoDataset('skoda'),
    models: ['Rapid', 'Octavia', 'Superb', 'Kodiaq', 'Karoq', 'Fabia']
  },
  {
    brand: 'Tesla',
    logoUrl: carLogoDataset('tesla'),
    models: ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck']
  },
  {
    brand: 'Toyota',
    logoUrl: carLogoDataset('toyota'),
    models: ['Camry', 'Corolla', 'RAV4', 'Land Cruiser', 'Highlander', 'Hilux']
  },
  {
    brand: 'Volkswagen',
    logoUrl: carLogoDataset('volkswagen'),
    models: ['Polo', 'Golf', 'Passat', 'Tiguan', 'Touareg', 'Jetta']
  }
];

export const getBrandCatalogItem = (brand: string) => vehicleBrandCatalog.find((item) => item.brand === brand);
