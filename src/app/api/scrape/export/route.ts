import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'url' | 'email';
  description?: string;
}

interface ExtractedData {
  [key: string]: string | null;
  source_url: string;
}

interface ExportRequest {
  data: ExtractedData[];
  fields: CustomField[];
  filename: string;
}

export async function POST(request: NextRequest) {
  try {
    const { data, fields, filename }: ExportRequest = await request.json();

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No data provided for export' },
        { status: 400 }
      );
    }

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields defined for export' },
        { status: 400 }
      );
    }

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Prepare data for Excel
    const excelData: (string | number | Date)[][] = [];

    // Create header row
    const headers = ['Source URL', ...fields.map(field => field.name)];
    excelData.push(headers);

    // Add data rows
    data.forEach((row) => {
      const excelRow: (string | number | Date)[] = [
        row.source_url || '',
        ...fields.map(field => {
          const value = row[field.name];
          
          // Handle different field types
          if (value === null || value === undefined || value === '') {
            return '';
          }

          switch (field.type) {
            case 'number':
              const numValue = parseFloat(value);
              return isNaN(numValue) ? value : numValue;
            
            case 'date':
              // Try to parse date
              const dateValue = new Date(value);
              return !isNaN(dateValue.getTime()) ? dateValue : value;
            
            case 'url':
            case 'email':
            case 'text':
            default:
              return value;
          }
        })
      ];
      excelData.push(excelRow);
    });

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);

    // Set column widths
    const columnWidths = [
      { wch: 60 }, // Source URL column (wider)
      ...fields.map(field => ({ 
        wch: field.type === 'url' ? 40 : field.type === 'email' ? 30 : 20 
      }))
    ];
    worksheet['!cols'] = columnWidths;

    // Style header row
    const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "00FF88" } },
          alignment: { horizontal: "center" }
        };
      }
    }

    // Add main worksheet
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Extracted Data');

    // Create summary worksheet
    const summaryData = [
      ['Export Summary'],
      [''],
      ['Total Records:', data.length],
      ['Fields Extracted:', fields.length],
      ['Export Date:', new Date().toLocaleString()],
      [''],
      ['Field Definitions:'],
      ['Field Name', 'Type', 'Description'],
      ...fields.map(field => [
        field.name,
        field.type.charAt(0).toUpperCase() + field.type.slice(1),
        field.description || 'No description'
      ])
    ];

    const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Style summary worksheet
    summaryWorksheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 40 }];
    
    // Style summary title
    if (summaryWorksheet['A1']) {
      summaryWorksheet['A1'].s = {
        font: { bold: true, size: 16 },
        alignment: { horizontal: "center" }
      };
    }

    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true
    });

    // Create response with proper headers
    const response = new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename || 'scraped-data'}.xlsx"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    });

    return response;

  } catch (error) {
    console.error('Excel export error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Export failed' 
      },
      { status: 500 }
    );
  }
}