export interface PhoneCountry {
  iso: string;
  name: string;
  flag: string;
  dialCode: string;
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'GN', name: 'Guinée', flag: '🇬🇳', dialCode: '+224' },
  { iso: 'SN', name: 'Sénégal', flag: '🇸🇳', dialCode: '+221' },
  { iso: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', dialCode: '+225' },
  { iso: 'ML', name: 'Mali', flag: '🇲🇱', dialCode: '+223' },
  { iso: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dialCode: '+226' },
  { iso: 'NE', name: 'Niger', flag: '🇳🇪', dialCode: '+227' },
  { iso: 'TG', name: 'Togo', flag: '🇹🇬', dialCode: '+228' },
  { iso: 'BJ', name: 'Bénin', flag: '🇧🇯', dialCode: '+229' },
  { iso: 'CM', name: 'Cameroun', flag: '🇨🇲', dialCode: '+237' },
  { iso: 'CD', name: 'RDC', flag: '🇨🇩', dialCode: '+243' },
  { iso: 'CG', name: 'Congo', flag: '🇨🇬', dialCode: '+242' },
  { iso: 'GA', name: 'Gabon', flag: '🇬🇦', dialCode: '+241' },
  { iso: 'TD', name: 'Tchad', flag: '🇹🇩', dialCode: '+235' },
  { iso: 'CF', name: 'République centrafricaine', flag: '🇨🇫', dialCode: '+236' },
  { iso: 'GW', name: 'Guinée-Bissau', flag: '🇬🇼', dialCode: '+245' }
];
