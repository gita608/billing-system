const escpos = require('escpos');
// For Windows, we'll use USB printers
escpos.USB = require('escpos-usb');

/**
 * Printer Service for Restaurant POS
 * Supports ESC/POS thermal printers on Windows
 * Now with multiple bill template support
 */

// Template configurations (mirror of frontend config)
const billTemplates = {
  classic: {
    headerAlign: 'CT',
    headerSize: [2, 2],
    showAddress: true,
    showPhone: true,
    showTaxNumber: true,
    itemsFormat: 'table',
    showItemCode: false,
    showItemNotes: true,
    showSubtotal: true,
    showTaxBreakdown: true,
    separatorStyle: 'dashes',
    footerMessage: 'Thank you for your visit!',
    footerMessageAr: 'شكراً لزيارتكم!',
  },
  modern: {
    headerAlign: 'CT',
    headerSize: [1, 1],
    showAddress: false,
    showPhone: false,
    showTaxNumber: false,
    itemsFormat: 'compact',
    showItemCode: false,
    showItemNotes: false,
    showSubtotal: true,
    showTaxBreakdown: true,
    separatorStyle: 'dots',
    footerMessage: 'Thank you!',
    footerMessageAr: 'شكراً!',
  },
  detailed: {
    headerAlign: 'CT',
    headerSize: [1, 1],
    showAddress: true,
    showPhone: true,
    showTaxNumber: true,
    itemsFormat: 'detailed',
    showItemCode: true,
    showItemNotes: true,
    showSubtotal: true,
    showTaxBreakdown: true,
    showCustomerInfo: true,
    showServedBy: true,
    separatorStyle: 'line',
    footerMessage: 'Thank you for choosing us!',
    footerMessageAr: 'شكراً لاختياركم!',
  },
  arabic: {
    headerAlign: 'CT',
    headerSize: [2, 2],
    showAddress: true,
    showPhone: true,
    showTaxNumber: true,
    itemsFormat: 'table',
    showItemCode: false,
    showItemNotes: true,
    showSubtotal: true,
    showTaxBreakdown: true,
    isRTL: true,
    separatorStyle: 'dashes',
    footerMessage: 'Thank you for your visit!',
    footerMessageAr: 'شكراً لزيارتكم!',
  },
  quick: {
    headerAlign: 'LT',
    headerSize: [1, 1],
    showAddress: false,
    showPhone: false,
    showTaxNumber: false,
    itemsFormat: 'minimal',
    showItemCode: false,
    showItemNotes: false,
    showSubtotal: false,
    showTaxBreakdown: false,
    separatorStyle: 'dashes',
    footerMessage: '',
    footerMessageAr: '',
  },
};

// Get separator based on style
function getSeparator(style, width = 32) {
  switch (style) {
    case 'dots':
      return '.'.repeat(width);
    case 'line':
      return '═'.repeat(width);
    case 'stars':
      return '*'.repeat(width);
    case 'dashes':
    default:
      return '-'.repeat(width);
  }
}

// Get template config
function getTemplateConfig(templateId) {
  return billTemplates[templateId] || billTemplates.classic;
}

/**
 * Print bill receipt with template support
 * @param {Object} orderData - Order data from database
 * @param {Object} settings - Restaurant settings
 * @returns {Promise<Object>} Print result
 */
async function printBill(orderData, settings) {
  return new Promise((resolve) => {
    try {
      // Find USB printer
      const devices = escpos.USB.findPrinter();
      if (!devices || devices.length === 0) {
        resolve({ success: false, error: 'No USB printer found. Please connect a thermal printer.' });
        return;
      }

      const device = new escpos.USB();
      const printer = new escpos.Printer(device);
      
      // Get template configuration
      const templateId = settings.bill_template || 'classic';
      const template = getTemplateConfig(templateId);
      const separator = getSeparator(template.separatorStyle);
      const isArabic = settings.language === 'ar' || template.isRTL;

      device.open((err) => {
        if (err) {
          resolve({ success: false, error: 'Failed to open printer: ' + err.message });
          return;
        }

        try {
          // ============ HEADER ============
          printer.align(template.headerAlign);
          printer.size(template.headerSize[0], template.headerSize[1]);
          printer.style('B');
          
          // Restaurant name
          if (templateId === 'detailed') {
            printer.text(isArabic ? 'فاتورة ضريبية' : 'TAX INVOICE');
            printer.size(1, 1);
          }
          printer.text(settings.restaurant_name || 'RESTAURANT POS');
          printer.style('NORMAL');
          printer.size(1, 1);
          printer.text('');

          // Restaurant info based on template
          if (template.showAddress && settings.restaurant_address) {
            printer.text(settings.restaurant_address);
          }
          if (template.showPhone && settings.restaurant_phone) {
            printer.text((isArabic ? 'هاتف: ' : 'Tel: ') + settings.restaurant_phone);
          }
          if (template.showTaxNumber && settings.tax_number) {
            printer.text((isArabic ? 'رقم ضريبي: ' : 'VAT#: ') + settings.tax_number);
          }
          printer.text(separator);
          printer.text('');

          // ============ BILL INFO ============
          printer.align('LT');
          
          if (templateId === 'modern') {
            // Compact single line format
            const billInfo = '#' + (orderData.bill_number || orderData.order_number) + ' | ' + 
                           orderData.order_type.toUpperCase() + ' | ' + 
                           new Date(orderData.created_at).toLocaleDateString();
            printer.text(billInfo);
          } else if (templateId === 'quick') {
            // Minimal format
            printer.text('#' + (orderData.bill_number || orderData.order_number) + ' - ' + 
                        new Date(orderData.created_at).toLocaleString());
          } else {
            // Standard format
            printer.text((isArabic ? 'فاتورة: ' : 'Bill No: ') + (orderData.bill_number || orderData.order_number));
            printer.text((isArabic ? 'التاريخ: ' : 'Date: ') + new Date(orderData.created_at).toLocaleString());
            printer.text((isArabic ? 'النوع: ' : 'Order Type: ') + orderData.order_type.toUpperCase());
            
            if (template.showCustomerInfo) {
              if (orderData.customer_name) {
                printer.text((isArabic ? 'العميل: ' : 'Customer: ') + orderData.customer_name);
              }
              if (orderData.contact_no) {
                printer.text((isArabic ? 'الاتصال: ' : 'Contact: ') + orderData.contact_no);
              }
            }
          }
          printer.text(separator);
          printer.text('');

          // ============ ITEMS ============
          if (orderData.items && orderData.items.length > 0) {
            
            if (template.itemsFormat === 'detailed') {
              // Detailed format with serial numbers
              printer.text(isArabic ? '# الصنف     الكمية السعر المبلغ' : '# Item      Qty  Rate  Amount');
              printer.text(separator);
              orderData.items.forEach((item, index) => {
                const serial = String(index + 1).padEnd(2);
                const itemName = item.item_name.substring(0, 10).padEnd(10);
                const qty = String(item.quantity).padStart(3);
                const rate = parseFloat(item.rate).toFixed(2).padStart(6);
                const amount = (item.quantity * item.rate).toFixed(2).padStart(7);
                printer.text(serial + itemName + ' ' + qty + ' ' + rate + ' ' + amount);
                if (template.showItemNotes && item.notes) {
                  printer.text('   ' + (isArabic ? 'ملاحظة: ' : 'Note: ') + item.notes);
                }
              });
              
            } else if (template.itemsFormat === 'compact' || template.itemsFormat === 'minimal') {
              // Compact format: Qty x Name ... Amount
              orderData.items.forEach((item) => {
                const qtyName = item.quantity + 'x ' + item.item_name.substring(0, 18);
                const amount = (item.quantity * item.rate).toFixed(2);
                const spaces = Math.max(1, 32 - qtyName.length - amount.length);
                printer.text(qtyName + ' '.repeat(spaces) + amount);
              });
              
            } else {
              // Table format (classic)
              printer.text(isArabic ? 'الصنف        الكمية المبلغ' : 'Item          Qty  Rate  Amount');
              printer.text(separator);
              orderData.items.forEach((item) => {
                const itemName = item.item_name.substring(0, 14).padEnd(14);
                const qty = String(item.quantity).padStart(3);
                const rate = parseFloat(item.rate).toFixed(2).padStart(6);
                const amount = (item.quantity * item.rate).toFixed(2).padStart(7);
                printer.text(itemName + ' ' + qty + ' ' + rate + ' ' + amount);
                if (template.showItemNotes && item.notes) {
                  printer.text('  ' + (isArabic ? 'ملاحظة: ' : 'Note: ') + item.notes);
                }
              });
            }
          }

          printer.text(separator);
          printer.text('');

          // ============ TOTALS ============
          printer.align('RT');
          
          if (template.showSubtotal) {
            printer.text((isArabic ? 'المجموع:     ' : 'Subtotal:     ') + parseFloat(orderData.subtotal || 0).toFixed(2));
          }
          if (template.showTaxBreakdown) {
            const taxLabel = isArabic ? 'ضريبة (' + (settings.tax_rate || 5) + '%):' : 'VAT (' + (settings.tax_rate || 5) + '%):';
            printer.text(taxLabel.padEnd(14) + parseFloat(orderData.tax || 0).toFixed(2));
          }
          
          // Grand total
          if (template.separatorStyle === 'line') {
            printer.text('════════════════════════════════');
          }
          printer.style('B');
          printer.size(1, 1);
          const totalLabel = isArabic ? 'الإجمالي:' : 'TOTAL:';
          printer.text(totalLabel.padEnd(14) + parseFloat(orderData.total || 0).toFixed(2) + ' ' + (settings.currency || 'SAR'));
          printer.style('NORMAL');
          printer.text('');

          // Payment info
          if (templateId !== 'quick') {
            printer.align('LT');
            printer.text((isArabic ? 'طريقة الدفع: ' : 'Payment: ') + orderData.payment_mode);
            if (template.showServedBy) {
              printer.text((isArabic ? 'خدمة: ' : 'Served by: ') + 'Admin');
            }
            printer.text('');
          }

          // ============ FOOTER ============
          const footerMsg = isArabic ? template.footerMessageAr : template.footerMessage;
          if (footerMsg) {
            printer.align('CT');
            printer.text(footerMsg);
          }
          printer.text('');
          printer.text('');
          printer.text('');

          // Cut paper and close
          printer.cut();
          printer.close(() => {
            resolve({ success: true, message: 'Bill printed successfully' });
          });
        } catch (printError) {
          resolve({ success: false, error: 'Print error: ' + printError.message });
        }
      });
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
}

/**
 * Print KOT (Kitchen Order Ticket)
 * @param {Object} orderData - Order data
 * @param {Object} settings - Restaurant settings
 * @returns {Promise<Object>} Print result
 */
async function printKOT(orderData, settings) {
  return new Promise((resolve) => {
    try {
      // Find USB printer
      const devices = escpos.USB.findPrinter();
      if (!devices || devices.length === 0) {
        resolve({ success: false, error: 'No USB printer found. Please connect a thermal printer.' });
        return;
      }

      const device = new escpos.USB();
      const printer = new escpos.Printer(device);
      const isArabic = settings.language === 'ar';

      device.open((err) => {
        if (err) {
          resolve({ success: false, error: 'Failed to open printer: ' + err.message });
          return;
        }

        try {
          // Header
          printer.align('CT');
          printer.size(2, 2);
          printer.style('B');
          printer.text(isArabic ? 'طلب المطبخ' : 'KITCHEN ORDER');
          printer.style('NORMAL');
          printer.size(1, 1);
          printer.text('');

          // Order info
          printer.align('LT');
          printer.text((isArabic ? 'طلب #: ' : 'Order #: ') + orderData.order_number);
          printer.text((isArabic ? 'الوقت: ' : 'Time: ') + new Date(orderData.created_at).toLocaleTimeString());
          printer.text((isArabic ? 'النوع: ' : 'Type: ') + orderData.order_type.toUpperCase());
          if (orderData.notes) {
            // Extract table number if present
            const tableMatch = orderData.notes.match(/Table:\s*(\d+)/i);
            if (tableMatch) {
              printer.size(2, 2);
              printer.style('B');
              printer.text((isArabic ? 'طاولة: ' : 'TABLE: ') + tableMatch[1]);
              printer.style('NORMAL');
              printer.size(1, 1);
            }
          }
          printer.text('--------------------------------');
          printer.text('');

          // Items
          printer.style('B');
          printer.text(isArabic ? 'الأصناف:' : 'Items:');
          printer.style('NORMAL');
          
          if (orderData.items && orderData.items.length > 0) {
            orderData.items.forEach((item, index) => {
              printer.size(1, 1);
              printer.text((index + 1) + '. ' + item.item_name + ' x' + item.quantity);
              if (item.notes) {
                printer.text('   ' + (isArabic ? 'ملاحظة: ' : 'Note: ') + item.notes);
              }
            });
          }

          printer.text('--------------------------------');
          printer.text('');
          printer.text('');
          printer.text('');

          // Cut paper and close
          printer.cut();
          printer.close(() => {
            resolve({ success: true, message: 'KOT printed successfully' });
          });
        } catch (printError) {
          resolve({ success: false, error: 'Print error: ' + printError.message });
        }
      });
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
}

/**
 * Test printer connection
 * @param {string} printerName - Optional printer name (not used for USB)
 * @returns {Promise<Object>} Test result
 */
async function testPrinter(printerName = null) {
  return new Promise((resolve) => {
    try {
      // Find USB printer
      const devices = escpos.USB.findPrinter();
      if (!devices || devices.length === 0) {
        resolve({ success: false, error: 'No USB printer found. Please connect a thermal printer.' });
        return;
      }

      const device = new escpos.USB();
      const printer = new escpos.Printer(device);

      device.open((err) => {
        if (err) {
          resolve({ success: false, error: 'Failed to open printer: ' + err.message });
          return;
        }

        try {
          printer.align('CT');
          printer.size(2, 2);
          printer.style('B');
          printer.text('PRINTER TEST');
          printer.style('NORMAL');
          printer.size(1, 1);
          printer.text('');
          printer.text('This is a test print.');
          printer.text('If you can read this,');
          printer.text('your printer is working!');
          printer.text('');
          printer.text(new Date().toLocaleString());
          printer.text('');
          printer.text('');
          printer.cut();
          printer.close(() => {
            resolve({ success: true, message: 'Test print successful' });
          });
        } catch (printError) {
          resolve({ success: false, error: 'Print error: ' + printError.message });
        }
      });
    } catch (error) {
      resolve({ success: false, error: error.message });
    }
  });
}

/**
 * Get list of available printers
 * @returns {Array} List of printer devices
 */
function getAvailablePrinters() {
  try {
    const devices = escpos.USB.findPrinter();
    if (!devices || devices.length === 0) {
      return [];
    }
    return devices.map((device, index) => ({
      id: index,
      name: device.deviceDescriptor ? 'USB Printer ' + (index + 1) : 'Printer ' + (index + 1),
      vendorId: device.deviceDescriptor?.idVendor || 'Unknown',
      productId: device.deviceDescriptor?.idProduct || 'Unknown',
    }));
  } catch (error) {
    console.error('Error getting printers:', error);
    return [];
  }
}

module.exports = {
  printBill,
  printKOT,
  testPrinter,
  getAvailablePrinters,
};
