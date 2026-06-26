export type GenderCategory = 'masculino' | 'femenino' | 'infantil';
export type ProductVersion = 'fans' | 'player' | 'retro' | 'women' | 'tracksuit_adult' | 'kids_jersey' | 'kids_tracksuit';

interface SizingData {
  height?: number;
  weight?: number;
  age?: number;
}

export function getRecommendedSize(version: ProductVersion, data: SizingData): string {
  const { height, weight, age } = data;

  if (!height && !weight && !age) return 'Faltan datos';

  switch (version) {
    case 'fans': // Fans Version Size Chart
      if (!height || !weight) return 'S/R';
      if (height <= 165 && weight <= 65) return 'S';
      if (height <= 170 && weight <= 70) return 'M';
      if (height <= 175 && weight <= 75) return 'L';
      if (height <= 180 && weight <= 80) return 'XL';
      if (height <= 185 && weight <= 87) return 'XXL';
      if (height <= 190 && weight <= 95) return '3XL';
      return '4XL';

    case 'player': // Player Version Size Chart (Corte Slim fit)
      if (!height || !weight) return 'S/R';
      if (height <= 165 && weight <= 60) return 'S';
      if (height <= 170 && weight <= 65) return 'M';
      if (height <= 175 && weight <= 70) return 'L';
      if (height <= 180 && weight <= 80) return 'XL';
      if (height <= 185 && weight <= 90) return 'XXL';
      if (height <= 190 && weight <= 100) return '3XL';
      return '4XL';

    case 'women': // Women Jersey Size Chart
      if (!height || !weight) return 'S/R';
      if (height <= 165 && weight <= 52) return 'S';
      if (height <= 170 && weight <= 58) return 'M';
      if (height <= 175 && weight <= 65) return 'L';
      if (height <= 180 && weight <= 70) return 'XL';
      return 'XXL';

    case 'retro': // Retro Jerseys Size Chart
      if (!height || !weight) return 'S/R';
      if (height <= 165 && weight <= 60) return 'S';
      if (height <= 170 && weight <= 65) return 'M';
      if (height <= 175 && weight <= 70) return 'L';
      if (height <= 180 && weight <= 80) return 'XL';
      return 'XXL';

    case 'tracksuit_adult': // Adult Tracksuit Size Chart
      if (!height || !weight) return 'S/R';
      if (height <= 170 && weight <= 67) return 'S';
      if (height <= 176 && weight <= 75) return 'M';
      if (height <= 182 && weight <= 80) return 'L';
      if (height <= 190 && weight <= 90) return 'XL';
      return 'XXL';

    case 'kids_jersey': // Kids Soccer Jerseys Size Chart
      if (age) {
        if (age <= 4) return '16#';
        if (age <= 5) return '18#';
        if (age <= 7) return '20#';
        if (age <= 8) return '22#';
        if (age <= 9) return '24#';
        if (age <= 11) return '26#';
        return '28#';
      }
      if (height) {
        if (height <= 105) return '16#';
        if (height <= 115) return '18#';
        if (height <= 125) return '20#';
        if (height <= 135) return '22#';
        if (height <= 145) return '24#';
        if (height <= 155) return '26#';
        return '28#';
      }
      return 'S/R';

    case 'kids_tracksuit': // Kids Tracksuit Size Chart
      if (!height) return 'S/R';
      if (height <= 125) return '10#';
      if (height <= 135) return '12#';
      if (height <= 145) return '14#';
      if (height <= 155) return '16#';
      return '18#';

    default:
      return 'S/R';
  }
}