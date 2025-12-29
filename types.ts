export enum SchoolType {
  GOVERNMENT = 'حكومي',
  PRIVATE = 'خاص',
  KINDERGARTEN = 'روضة'
}

export enum Wilayat {
  SALALAH = 'صلالة',
  THUMRAIT = 'ثمريت',
  RAKHYUT = 'رخيوت'
}

export enum Shift {
  MORNING = 'صباحي',
  EVENING = 'مسائي',
  MIXED = 'مشترك'
}

export enum Gender {
  BOYS = 'بنين',
  GIRLS = 'بنات',
  MIXED = 'مختلط'
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ContactInfo {
  phone?: string;
  managerName?: string;
  email?: string;
  website?: string;
}

export interface School {
  id: string;
  name: string;
  wilayat: Wilayat;
  area?: string; // e.g. Sahalnout, Auqad
  type: SchoolType;
  grades: string; // e.g. "1-4", "5-10"
  gender: Gender;
  shift: Shift;
  coordinates?: Coordinates;
  contact: ContactInfo;
  qualityScore: number; // 0-5 based on data completeness
  source: string;
  isVerified: boolean;
}

export interface FilterState {
  query: string;
  wilayat: Wilayat | 'All';
  type: SchoolType | 'All';
  gender: Gender | 'All';
}
