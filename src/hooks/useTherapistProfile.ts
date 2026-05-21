import { useState, useEffect } from 'react';
import { TherapistProfile } from '@/types';

const STORAGE_KEY = 'therapydesk-profile';

const defaultProfile: TherapistProfile = {
  name: '',
  profession: 'Ψυχολόγος',
  address: '',
  city: '',
  postalCode: '',
  phone: '',
  email: '',
  afm: '',
  doy: '',
  iban: '',
  myDataUserId: '',
  myDataSubscriptionKey: '',
  myDataProduction: false,
};

export function useTherapistProfile() {
  const [profile, setProfileState] = useState<TherapistProfile>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultProfile, ...JSON.parse(stored) } : defaultProfile;
    } catch {
      return defaultProfile;
    }
  });

  const saveProfile = (updates: Partial<TherapistProfile>) => {
    const updated = { ...profile, ...updates };
    setProfileState(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return { profile, saveProfile };
}
