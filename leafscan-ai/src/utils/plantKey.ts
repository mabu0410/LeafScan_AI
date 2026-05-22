import { Plant } from '../types';

export type SupportedPlantOption = {
  key: string;
  label: string;
};

export const SUPPORTED_PLANTS: SupportedPlantOption[] = [
  { key: 'apple', label: 'Táo (Apple)' },
  { key: 'blueberry', label: 'Việt quất (Blueberry)' },
  { key: 'cherry', label: 'Cherry' },
  { key: 'corn', label: 'Ngô / Bắp (Corn)' },
  { key: 'grape', label: 'Nho (Grape)' },
  { key: 'orange', label: 'Cam (Orange)' },
  { key: 'peach', label: 'Đào (Peach)' },
  { key: 'pepper_bell', label: 'Ớt chuông (Bell Pepper)' },
  { key: 'potato', label: 'Khoai tây (Potato)' },
  { key: 'raspberry', label: 'Mâm xôi (Raspberry)' },
  { key: 'soybean', label: 'Đậu nành (Soybean)' },
  { key: 'squash', label: 'Bí (Squash)' },
  { key: 'strawberry', label: 'Dâu tây (Strawberry)' },
  { key: 'tomato', label: 'Cà chua (Tomato)' },
];

const SUPPORTED_KEY_SET = new Set(SUPPORTED_PLANTS.map((item) => item.key));

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function canonicalizePlantKey(value?: string | null): string | undefined {
  const raw = normalizeText(value || '');
  if (!raw) return undefined;

  const aliasRules: Array<{ needles: string[]; key: string }> = [
    { needles: ['strawberry', 'dau tay'], key: 'strawberry' },
    { needles: ['tomato', 'ca chua'], key: 'tomato' },
    { needles: ['corn', 'maize', 'ngo', 'bap'], key: 'corn' },
    { needles: ['potato', 'khoai tay'], key: 'potato' },
    { needles: ['apple', 'tao'], key: 'apple' },
    { needles: ['grape', 'nho'], key: 'grape' },
    { needles: ['peach', 'dao'], key: 'peach' },
    { needles: ['orange', 'cam'], key: 'orange' },
    { needles: ['pepper bell', 'bell pepper', 'pepper', 'ot chuong'], key: 'pepper_bell' },
    { needles: ['blueberry'], key: 'blueberry' },
    { needles: ['cherry'], key: 'cherry' },
    { needles: ['raspberry'], key: 'raspberry' },
    { needles: ['soybean', 'dau nanh'], key: 'soybean' },
    { needles: ['squash', 'bi'], key: 'squash' },
  ];

  for (const rule of aliasRules) {
    if (rule.needles.some((needle) => raw.includes(needle))) {
      return rule.key;
    }
  }

  const snake = raw.replace(/\s+/g, '_');
  if (SUPPORTED_KEY_SET.has(snake)) {
    return snake;
  }

  const firstToken = raw.split(' ')[0];
  if (SUPPORTED_KEY_SET.has(firstToken)) {
    return firstToken;
  }

  return undefined;
}

export function plantKeyLabel(plantKey?: string | null): string {
  if (!plantKey) return 'Chưa chọn';
  const found = SUPPORTED_PLANTS.find((item) => item.key === plantKey);
  return found?.label || plantKey;
}

export function derivePlantKeyFromPlant(plant: Plant | undefined): string | undefined {
  if (!plant) return undefined;
  return (
    canonicalizePlantKey(plant.category) ||
    canonicalizePlantKey(plant.name) ||
    canonicalizePlantKey(plant.latinName)
  );
}
