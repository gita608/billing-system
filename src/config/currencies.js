/**
 * Currency Configuration for Restaurant POS
 * Includes GCC countries and common currencies
 */

export const currencies = [
  // GCC Countries
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', nameAr: 'ريال سعودي', country: 'Saudi Arabia' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', nameAr: 'درهم إماراتي', country: 'UAE' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', nameAr: 'دينار كويتي', country: 'Kuwait' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'د.ب', nameAr: 'دينار بحريني', country: 'Bahrain' },
  { code: 'OMR', name: 'Omani Rial', symbol: 'ر.ع', nameAr: 'ريال عماني', country: 'Oman' },
  { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق', nameAr: 'ريال قطري', country: 'Qatar' },
  
  // Asian Currencies
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', nameAr: 'روبية هندية', country: 'India' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', nameAr: 'روبية باكستانية', country: 'Pakistan' },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', nameAr: 'تاكا بنغلاديشية', country: 'Bangladesh' },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', nameAr: 'روبية سريلانكية', country: 'Sri Lanka' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'रू', nameAr: 'روبية نيبالية', country: 'Nepal' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', nameAr: 'بيزو فلبيني', country: 'Philippines' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', nameAr: 'رينغيت ماليزي', country: 'Malaysia' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', nameAr: 'روبية إندونيسية', country: 'Indonesia' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', nameAr: 'دولار سنغافوري', country: 'Singapore' },
  
  // Middle East (Non-GCC)
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'ج.م', nameAr: 'جنيه مصري', country: 'Egypt' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.أ', nameAr: 'دينار أردني', country: 'Jordan' },
  { code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل', nameAr: 'ليرة لبنانية', country: 'Lebanon' },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د', nameAr: 'دينار عراقي', country: 'Iraq' },
  { code: 'YER', name: 'Yemeni Rial', symbol: 'ر.ي', nameAr: 'ريال يمني', country: 'Yemen' },
  
  // Major World Currencies
  { code: 'USD', name: 'US Dollar', symbol: '$', nameAr: 'دولار أمريكي', country: 'USA' },
  { code: 'EUR', name: 'Euro', symbol: '€', nameAr: 'يورو', country: 'Eurozone' },
  { code: 'GBP', name: 'British Pound', symbol: '£', nameAr: 'جنيه استرليني', country: 'UK' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', nameAr: 'دولار كندي', country: 'Canada' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', nameAr: 'دولار أسترالي', country: 'Australia' },
];

// Get currency by code
export const getCurrencyByCode = (code) => {
  return currencies.find(c => c.code === code) || currencies[0];
};

// Get currency display (code or symbol based on preference)
export const formatCurrency = (amount, currencyCode, useSymbol = false) => {
  const currency = getCurrencyByCode(currencyCode);
  const formattedAmount = Number(amount).toFixed(2);
  
  if (useSymbol) {
    return `${currency.symbol} ${formattedAmount}`;
  }
  return `${formattedAmount} ${currency.code}`;
};

export default currencies;
