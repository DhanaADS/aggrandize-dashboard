// CSV Export Node Executor
import { BaseNodeExecutor } from './registry';
import { WorkflowNode, NodeExecutionContext, NodeExecutionResult } from '../types';

export class CSVExportExecutor extends BaseNodeExecutor {
  async execute(node: WorkflowNode, context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { 
        data,
        filename = 'export.csv',
        delimiter = ',',
        includeHeaders = true,
        columns,
        downloadUrl = false
      } = node.properties;
      
      if (!data) {
        throw new Error('Data is required for CSV Export node');
      }

      // Convert data to array format
      const records = Array.isArray(data) ? data : [data];
      
      if (records.length === 0) {
        throw new Error('No data to export');
      }

      // Generate CSV content
      const csvContent = this.generateCSV(records, {
        delimiter,
        includeHeaders,
        columns
      });

      const executionTime = Date.now() - startTime;

      const result = {
        filename,
        rowCount: records.length,
        columnCount: Object.keys(records[0]).length,
        csvContent,
        size: csvContent.length,
        generatedAt: new Date().toISOString()
      };

      // If downloadUrl is requested, create a data URL
      if (downloadUrl) {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const dataUrl = URL.createObjectURL(blob);
        (result as any).downloadUrl = dataUrl;
      }

      return this.createResult(
        true,
        result,
        undefined,
        executionTime
      );

    } catch (error) {
      const executionTime = Date.now() - startTime;
      return this.createResult(
        false, 
        {}, 
        error instanceof Error ? error.message : 'Unknown error',
        executionTime
      );
    }
  }

  private generateCSV(
    records: any[], 
    options: {
      delimiter: string;
      includeHeaders: boolean;
      columns?: string[];
    }
  ): string {
    if (records.length === 0) return '';

    // Determine columns to include
    const allColumns = Object.keys(records[0]);
    const columnsToUse = options.columns || allColumns;
    
    const lines: string[] = [];
    
    // Add headers if requested
    if (options.includeHeaders) {
      lines.push(columnsToUse.join(options.delimiter));
    }
    
    // Add data rows
    for (const record of records) {
      const values = columnsToUse.map(column => {
        const value = record[column];
        return this.formatCSVValue(value, options.delimiter);
      });
      lines.push(values.join(options.delimiter));
    }
    
    return lines.join('\n');
  }

  private formatCSVValue(value: any, delimiter: string): string {
    if (value === null || value === undefined) return '';
    
    let stringValue = String(value);
    
    // Escape quotes by doubling them
    stringValue = stringValue.replace(/"/g, '""');
    
    // Wrap in quotes if the value contains delimiter, quotes, or newlines
    if (stringValue.includes(delimiter) || 
        stringValue.includes('"') || 
        stringValue.includes('\n') || 
        stringValue.includes('\r')) {
      stringValue = `"${stringValue}"`;
    }
    
    return stringValue;
  }
}