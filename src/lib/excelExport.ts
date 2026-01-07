import * as XLSX from 'xlsx';
import { FormData } from '@/types/form';

// Helper to extract username from email (part before @)
// Used for Google Sheet compatibility - stores only username part (e.g., "john.t" from "john.t@buyersclub.com.au")
export const getUsernameFromEmail = (email: string | undefined): string => {
  if (!email) return '';
  const parts = email.split('@');
  return parts[0] || '';
};

// Helper to combine selling agent fields into one string
// Format: "Name, Email, Mobile" (only includes non-empty fields)
const formatSellingAgent = (formData: FormData): string => {
  const parts: string[] = [];
  
  if (formData.sellingAgentName?.trim()) {
    parts.push(formData.sellingAgentName.trim());
  }
  if (formData.sellingAgentEmail?.trim()) {
    parts.push(formData.sellingAgentEmail.trim());
  }
  if (formData.sellingAgentMobile?.trim()) {
    parts.push(formData.sellingAgentMobile.trim());
  }
  
  // If we have the combined field from before, use it as fallback
  if (parts.length === 0 && formData.sellingAgent?.trim()) {
    return formData.sellingAgent.trim();
  }
  
  return parts.join(', ');
};

/**
 * Export form data to Excel file for testing/auditing
 * Creates a structured Excel file with multiple sheets for different sections
 */
export function exportFormDataToExcel(formData: FormData, filename: string = 'property-form-data.xlsx') {
  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Helper function to flatten nested objects for Excel
  const flattenObject = (obj: any, prefix: string = '', result: Record<string, any> = {}): Record<string, any> => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        const value = obj[key];
        
        if (value === null || value === undefined) {
          result[newKey] = '';
        } else if (Array.isArray(value)) {
          // Handle arrays (like lots)
          if (value.length === 0) {
            result[newKey] = '';
          } else {
            value.forEach((item, index) => {
              if (typeof item === 'object' && item !== null) {
                flattenObject(item, `${newKey}[${index}]`, result);
              } else {
                result[`${newKey}[${index}]`] = item;
              }
            });
          }
        } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
          flattenObject(value, newKey, result);
        } else {
          result[newKey] = value;
        }
      }
    }
    return result;
  };

  // Sheet 1: Overview (key fields only)
  const overviewData = [
    ['Field', 'Value'],
    ['Property Address', formData.address?.propertyAddress || ''],
    ['Project Address', formData.address?.projectAddress || ''],
    ['Project Name', formData.address?.projectName || ''],
    ['Suburb', formData.address?.suburbName || ''],
    ['State', formData.address?.state || ''],
    ['Post Code', formData.address?.postCode || ''],
    ['LGA', formData.address?.lga || ''],
    ['Property Type', formData.decisionTree?.propertyType || ''],
    ['Contract Type', formData.decisionTree?.contractType || ''],
    ['Lot Type', formData.decisionTree?.lotType || ''],
    ['Status', formData.decisionTree?.status || ''],
    ['Packager', getUsernameFromEmail(formData.packager)],
    ['Sourcer', formData.sourcer || ''],
    ['Selling Agent', formatSellingAgent(formData)],
    ['Cashflow Sheet (H&L)', formData.cashflowSheetLinkHL || ''],
    ['Cashflow Sheet (General)', formData.cashflowSheetLinkGeneral || ''],
  ];
  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
  XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

  // Sheet 2: Address & Risk
  const addressRiskData = flattenObject({
    address: formData.address,
    riskOverlays: formData.riskOverlays,
  });
  const addressRiskSheet = XLSX.utils.json_to_sheet([addressRiskData]);
  XLSX.utils.book_append_sheet(workbook, addressRiskSheet, 'Address & Risk');

  // Sheet 3: Property Details
  const propertyDetailsData = flattenObject({
    propertyDescription: formData.propertyDescription,
    purchasePrice: formData.purchasePrice,
    rentalAssessment: formData.rentalAssessment,
  });
  const propertyDetailsSheet = XLSX.utils.json_to_sheet([propertyDetailsData]);
  XLSX.utils.book_append_sheet(workbook, propertyDetailsSheet, 'Property Details');

  // Sheet 4: Market Performance
  const marketPerformanceData = flattenObject({
    marketPerformance: formData.marketPerformance,
  });
  const marketPerformanceSheet = XLSX.utils.json_to_sheet([marketPerformanceData]);
  XLSX.utils.book_append_sheet(workbook, marketPerformanceSheet, 'Market Performance');

  // Sheet 5: Content Sections
  const contentSectionsData = flattenObject({
    contentSections: formData.contentSections,
  });
  const contentSectionsSheet = XLSX.utils.json_to_sheet([contentSectionsData]);
  XLSX.utils.book_append_sheet(workbook, contentSectionsSheet, 'Content Sections');

  // Sheet 6: Agent Info
  const agentInfoData = flattenObject({
    agentInfo: formData.agentInfo,
  });
  const agentInfoSheet = XLSX.utils.json_to_sheet([agentInfoData]);
  XLSX.utils.book_append_sheet(workbook, agentInfoSheet, 'Agent Info');

  // Sheet 7: Lots (if exists)
  if (formData.lots && formData.lots.length > 0) {
    const lotsData = formData.lots.map((lot, index) => ({
      lotIndex: index + 1,
      ...flattenObject(lot),
    }));
    const lotsSheet = XLSX.utils.json_to_sheet(lotsData);
    XLSX.utils.book_append_sheet(workbook, lotsSheet, 'Lots');
  }

  // Sheet 8: Complete Data (all fields flattened)
  // Create a copy of formData with packager username extracted and selling agent combined for Google Sheet compatibility
  const formDataForExport = {
    ...formData,
    packager: getUsernameFromEmail(formData.packager),
    sellingAgent: formatSellingAgent(formData),
  };
  const completeData = flattenObject(formDataForExport);
  const completeSheet = XLSX.utils.json_to_sheet([completeData]);
  XLSX.utils.book_append_sheet(workbook, completeSheet, 'Complete Data');

  // Sheet 9: Field Audit (list all fields with their paths)
  const fieldAudit: Array<{ fieldPath: string; value: any; dataType: string }> = [];
  const collectFields = (obj: any, path: string = '') => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newPath = path ? `${path}.${key}` : key;
        const value = obj[key];
        
        if (value === null || value === undefined) {
          fieldAudit.push({ fieldPath: newPath, value: '', dataType: 'null/undefined' });
        } else if (Array.isArray(value)) {
          fieldAudit.push({ fieldPath: newPath, value: `Array[${value.length}]`, dataType: 'array' });
          value.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              collectFields(item, `${newPath}[${index}]`);
            } else {
              fieldAudit.push({ fieldPath: `${newPath}[${index}]`, value: item, dataType: typeof item });
            }
          });
        } else if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
          collectFields(value, newPath);
        } else {
          fieldAudit.push({ fieldPath: newPath, value: String(value), dataType: typeof value });
        }
      }
    }
  };
  collectFields(formData);
  const fieldAuditSheet = XLSX.utils.json_to_sheet(fieldAudit);
  XLSX.utils.book_append_sheet(workbook, fieldAuditSheet, 'Field Audit');

  // Write the file
  XLSX.writeFile(workbook, filename);
}

