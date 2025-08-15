// Database Write Node Executor
import { BaseNodeExecutor } from './registry';
import { WorkflowNode, NodeExecutionContext, NodeExecutionResult } from '../types';
import { createClient } from '@/lib/supabase/client';

export class DatabaseWriteExecutor extends BaseNodeExecutor {
  async execute(node: WorkflowNode, context: NodeExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const { 
        table,
        operation = 'insert',
        data,
        whereClause,
        batchSize = 100
      } = node.properties;
      
      if (!table) {
        throw new Error('Table name is required for Database Write node');
      }

      if (!data) {
        throw new Error('Data is required for Database Write node');
      }

      const supabase = createClient();
      let result: any;

      switch (operation.toLowerCase()) {
        case 'insert':
          result = await this.handleInsert(supabase, table, data, batchSize);
          break;
        case 'update':
          result = await this.handleUpdate(supabase, table, data, whereClause);
          break;
        case 'upsert':
          result = await this.handleUpsert(supabase, table, data, batchSize);
          break;
        case 'delete':
          result = await this.handleDelete(supabase, table, whereClause);
          break;
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      const executionTime = Date.now() - startTime;

      return this.createResult(
        true,
        {
          table,
          operation,
          rowsAffected: result.count || result.data?.length || 0,
          success: true,
          executedAt: new Date().toISOString()
        },
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

  private async handleInsert(supabase: any, table: string, data: any, batchSize: number) {
    const records = Array.isArray(data) ? data : [data];
    
    if (records.length <= batchSize) {
      const { data: result, error } = await supabase
        .from(table)
        .insert(records)
        .select();
      
      if (error) throw new Error(`Insert failed: ${error.message}`);
      return { data: result, count: result?.length || 0 };
    }
    
    // Handle large batches
    const results = [];
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { data: result, error } = await supabase
        .from(table)
        .insert(batch)
        .select();
      
      if (error) throw new Error(`Batch insert failed: ${error.message}`);
      results.push(...(result || []));
    }
    
    return { data: results, count: results.length };
  }

  private async handleUpdate(supabase: any, table: string, data: any, whereClause: any) {
    if (!whereClause) {
      throw new Error('WHERE clause is required for update operations');
    }

    let query = supabase.from(table).update(data);
    
    // Apply where conditions
    for (const [key, value] of Object.entries(whereClause)) {
      query = query.eq(key, value);
    }
    
    const { data: result, error, count } = await query.select();
    
    if (error) throw new Error(`Update failed: ${error.message}`);
    return { data: result, count };
  }

  private async handleUpsert(supabase: any, table: string, data: any, batchSize: number) {
    const records = Array.isArray(data) ? data : [data];
    
    if (records.length <= batchSize) {
      const { data: result, error } = await supabase
        .from(table)
        .upsert(records)
        .select();
      
      if (error) throw new Error(`Upsert failed: ${error.message}`);
      return { data: result, count: result?.length || 0 };
    }
    
    // Handle large batches
    const results = [];
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { data: result, error } = await supabase
        .from(table)
        .upsert(batch)
        .select();
      
      if (error) throw new Error(`Batch upsert failed: ${error.message}`);
      results.push(...(result || []));
    }
    
    return { data: results, count: results.length };
  }

  private async handleDelete(supabase: any, table: string, whereClause: any) {
    if (!whereClause) {
      throw new Error('WHERE clause is required for delete operations');
    }

    let query = supabase.from(table).delete();
    
    // Apply where conditions
    for (const [key, value] of Object.entries(whereClause)) {
      query = query.eq(key, value);
    }
    
    const { data: result, error, count } = await query.select();
    
    if (error) throw new Error(`Delete failed: ${error.message}`);
    return { data: result, count };
  }
}