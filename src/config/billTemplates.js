/**
 * Bill Templates Configuration
 * Each template defines the layout and styling for printed bills
 */

export const billTemplates = {
  // Template 1: Classic/Standard
  classic: {
    id: 'classic',
    name: 'Classic',
    nameAr: 'كلاسيكي',
    description: 'Traditional receipt format with centered header',
    preview: `
┌────────────────────────────┐
│     RESTAURANT NAME        │
│       123 Street           │
│     Tel: 123-456-789       │
├────────────────────────────┤
│ Bill: #001    Date: 01/01  │
│ Type: DINE-IN              │
├────────────────────────────┤
│ Item         Qty  Amount   │
│ Burger        2    40.00   │
│ Fries         1    10.00   │
├────────────────────────────┤
│ Subtotal:          50.00   │
│ VAT (5%):           2.50   │
│ TOTAL:             52.50   │
├────────────────────────────┤
│   Thank you for visiting!  │
└────────────────────────────┘
    `,
    settings: {
      headerAlign: 'center',
      headerSize: 2,
      showLogo: false,
      showAddress: true,
      showPhone: true,
      showTaxNumber: true,
      itemsFormat: 'table', // table, list
      showItemCode: false,
      showItemNotes: true,
      footerMessage: 'Thank you for your visit!',
      footerMessageAr: 'شكراً لزيارتكم!',
      showQRCode: false,
      paperWidth: 80, // mm
      separatorStyle: 'dashes', // dashes, dots, line, stars
    }
  },

  // Template 2: Modern Compact
  modern: {
    id: 'modern',
    name: 'Modern',
    nameAr: 'حديث',
    description: 'Clean, minimal design with compact layout',
    preview: `
┌────────────────────────────┐
│ ★ RESTAURANT NAME ★        │
├────────────────────────────┤
│ #001 | DINE-IN | 01/01     │
├────────────────────────────┤
│ 2x Burger          40.00   │
│ 1x Fries           10.00   │
│............................│
│ Subtotal           50.00   │
│ VAT 5%              2.50   │
│============================│
│ TOTAL              52.50   │
├────────────────────────────┤
│      Thank you! ♥          │
└────────────────────────────┘
    `,
    settings: {
      headerAlign: 'center',
      headerSize: 1,
      showLogo: false,
      showAddress: false,
      showPhone: false,
      showTaxNumber: false,
      itemsFormat: 'compact', // quantity x name, price on right
      showItemCode: false,
      showItemNotes: false,
      footerMessage: 'Thank you! ♥',
      footerMessageAr: 'شكراً! ♥',
      showQRCode: false,
      paperWidth: 58, // mm (smaller thermal paper)
      separatorStyle: 'dots',
    }
  },

  // Template 3: Detailed/Tax Invoice
  detailed: {
    id: 'detailed',
    name: 'Tax Invoice',
    nameAr: 'فاتورة ضريبية',
    description: 'Full tax invoice with all details and tax number',
    preview: `
┌────────────────────────────┐
│     TAX INVOICE            │
│     RESTAURANT NAME        │
│   123 Street, City         │
│   Tel: 123-456-789         │
│   VAT#: 123456789012345    │
├────────────────────────────┤
│ Invoice: INV-001           │
│ Date: 01/01/2024 10:30     │
│ Type: DINE-IN              │
│ Customer: John Doe         │
│ Contact: 050-123-4567      │
├────────────────────────────┤
│ # Item      Qty Rate  Amt  │
│ 1 Burger     2  20.00 40.00│
│ 2 Fries      1  10.00 10.00│
├────────────────────────────┤
│ Items Total:       50.00   │
│ Taxable Amount:    50.00   │
│ VAT (15%):          7.50   │
│ ════════════════════════   │
│ GRAND TOTAL:       57.50   │
├────────────────────────────┤
│ Payment: CASH              │
│ Served by: Admin           │
├────────────────────────────┤
│  Thank you for choosing us │
│      [QR CODE HERE]        │
└────────────────────────────┘
    `,
    settings: {
      headerAlign: 'center',
      headerSize: 1,
      showLogo: false,
      showAddress: true,
      showPhone: true,
      showTaxNumber: true,
      itemsFormat: 'detailed', // serial, name, qty, rate, amount
      showItemCode: true,
      showItemNotes: true,
      showCustomerInfo: true,
      showServedBy: true,
      footerMessage: 'Thank you for choosing us!',
      footerMessageAr: 'شكراً لاختياركم!',
      showQRCode: true,
      paperWidth: 80,
      separatorStyle: 'line',
    }
  },

  // Template 4: Arabic Style (RTL)
  arabic: {
    id: 'arabic',
    name: 'Arabic',
    nameAr: 'عربي',
    description: 'Arabic-focused layout with RTL support',
    preview: `
┌────────────────────────────┐
│        اسم المطعم          │
│     العنوان، المدينة       │
│     هاتف: 123-456-789      │
│  رقم ضريبي: 123456789      │
├────────────────────────────┤
│ فاتورة: #001               │
│ التاريخ: 01/01/2024        │
│ النوع: محلي                │
├────────────────────────────┤
│ الصنف        الكمية المبلغ │
│ برجر           2    40.00  │
│ بطاطس          1    10.00  │
├────────────────────────────┤
│ المجموع:           50.00   │
│ ضريبة (5%):         2.50   │
│ الإجمالي:          52.50   │
├────────────────────────────┤
│      شكراً لزيارتكم!       │
└────────────────────────────┘
    `,
    settings: {
      headerAlign: 'center',
      headerSize: 2,
      showLogo: false,
      showAddress: true,
      showPhone: true,
      showTaxNumber: true,
      itemsFormat: 'table',
      showItemCode: false,
      showItemNotes: true,
      isRTL: true,
      footerMessage: 'Thank you for your visit!',
      footerMessageAr: 'شكراً لزيارتكم!',
      showQRCode: false,
      paperWidth: 80,
      separatorStyle: 'dashes',
    }
  },

  // Template 5: Quick Receipt
  quick: {
    id: 'quick',
    name: 'Quick Receipt',
    nameAr: 'إيصال سريع',
    description: 'Minimal receipt for express billing',
    preview: `
┌────────────────────────────┐
│ RESTAURANT NAME            │
│ #001 - 01/01 10:30         │
├────────────────────────────┤
│ Burger x2          40.00   │
│ Fries x1           10.00   │
├────────────────────────────┤
│ TOTAL:             52.50   │
└────────────────────────────┘
    `,
    settings: {
      headerAlign: 'left',
      headerSize: 1,
      showLogo: false,
      showAddress: false,
      showPhone: false,
      showTaxNumber: false,
      itemsFormat: 'minimal',
      showItemCode: false,
      showItemNotes: false,
      showSubtotal: false,
      showTaxBreakdown: false,
      footerMessage: '',
      footerMessageAr: '',
      showQRCode: false,
      paperWidth: 58,
      separatorStyle: 'dashes',
    }
  },
};

// Template categories for grouping in UI
export const templateCategories = [
  {
    id: 'standard',
    name: 'Standard',
    nameAr: 'قياسي',
    templates: ['classic', 'modern']
  },
  {
    id: 'business',
    name: 'Business',
    nameAr: 'تجاري',
    templates: ['detailed']
  },
  {
    id: 'regional',
    name: 'Regional',
    nameAr: 'إقليمي',
    templates: ['arabic']
  },
  {
    id: 'quick',
    name: 'Quick',
    nameAr: 'سريع',
    templates: ['quick']
  }
];

// Get template by ID
export const getTemplate = (templateId) => {
  return billTemplates[templateId] || billTemplates.classic;
};

// Get all templates as array
export const getAllTemplates = () => {
  return Object.values(billTemplates);
};

export default billTemplates;
