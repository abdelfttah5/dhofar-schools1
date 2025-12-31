
export enum SchoolType {
  GOVERNMENT = 'حكومي',
  PRIVATE = 'خاص',
  KINDERGARTEN = 'روضة'
}

// Regions based on geographic sectors
export enum Region {
  SALALAH_SECTOR = 'قطاع صلالة',
  THUMRAIT_SECTOR = 'قطاع ثمريت',
  RAKHYUT_SECTOR = 'قطاع رخيوت'
}

export enum Wilayat {
  // Salalah Sector
  SALALAH = 'صلالة',
  TAQAH = 'طاقة',
  MIRBAT = 'مرباط',
  SADAH = 'سدح',
  
  // Thumrait Sector
  THUMRAIT = 'ثمريت',
  AL_MAZYUNAH = 'المزيونة',
  MUQSHIN = 'مقشن',
  SHALIM_HALLANIYAT = 'شليم وجزر الحلانيات',
  
  // Rakhyut Sector
  RAKHYUT = 'رخيوت',
  DHALKUT = 'ضلكوت'
}

export enum Shift {
  MORNING = 'صباحي',
  EVENING = 'مسائي',
  MIXED = 'مشترك'
}

export enum Gender {
  BOYS = 'ذكور',
  GIRLS = 'إناث',
  MIXED = 'مختلط'
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ContactInfo {
  phone?: string;
  managerName?: string;
  assistantName?: string;
  assistantPhone?: string;
  email?: string;
  website?: string;
}

export interface School {
  id: string;
  name: string;
  region: Region;
  wilayat: Wilayat;
  area?: string; 
  type: SchoolType;
  grades: string;
  gender: Gender;
  shift: Shift;
  coordinates?: Coordinates;
  contact: ContactInfo;
  qualityScore: number;
  source: string;
  isVerified: boolean;
}

export interface FilterState {
  query: string;
  region: Region | 'All';
  wilayat: Wilayat | 'All';
  type: SchoolType | 'All';
  gender: Gender | 'All';
}
