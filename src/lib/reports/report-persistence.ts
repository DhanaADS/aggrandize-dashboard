import { createClient } from '@/lib/supabase/client';
import {
  MonthlyReport,
  ReportData,
  ReportGeneration,
  ReportTemplate,
  ReportSubscription,
  ReportGenerationRequest,
  BulkReportGenerationRequest,
  ReportFilters,
  ReportType,
  GenerationStatus
} from '@/types/reports';

const supabase = createClient();

// ===================================
// MONTHLY REPORTS CRUD OPERATIONS
// ===================================

export async function createMonthlyReport(
  reportMonth: string,
  reportType: ReportType,
  reportData: ReportData
): Promise<MonthlyReport> {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) throw new Error('User not authenticated');

  const reportInsert = {
    user_id: user.user.id,
    report_month: reportMonth,
    report_type: reportType,
    generation_status: 'generating' as GenerationStatus,
    
    // Financial Summary
    total_expenses_inr: reportData.expenses.total_inr,
    total_expenses_usd: reportData.expenses.total_usd,
    total_salaries_inr: reportData.salaries.total_monthly_inr,
    total_salaries_usd: reportData.salaries.total_monthly_usd,
    total_subscriptions_inr: reportData.subscriptions.total_monthly_inr,
    total_subscriptions_usd: reportData.subscriptions.total_monthly_usd,
    total_utility_bills_inr: reportData.utility_bills.total_monthly_inr,
    total_utility_bills_usd: reportData.utility_bills.total_monthly_usd,
    total_settlements_pending_inr: reportData.settlements.total_pending,
    total_settlements_completed_inr: reportData.settlements.total_completed,
    
    // Report Data
    report_data: reportData,
    generated_by: user.user.id
  };

  const { data, error } = await supabase
    .from('monthly_reports')
    .insert(reportInsert)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMonthlyReportStatus(
  reportId: string,
  status: GenerationStatus,
  pdfUrl?: string,
  excelUrl?: string,
  errorMessage?: string
): Promise<MonthlyReport> {
  const updateData: any = {
    generation_status: status,
    updated_at: new Date().toISOString()
  };

  if (status === 'completed') {
    updateData.generated_at = new Date().toISOString();
  }

  if (pdfUrl) updateData.pdf_url = pdfUrl;
  if (excelUrl) updateData.excel_url = excelUrl;
  if (errorMessage) updateData.error_message = errorMessage;

  const { data, error } = await supabase
    .from('monthly_reports')
    .update(updateData)
    .eq('id', reportId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMonthlyReports(filters?: ReportFilters): Promise<MonthlyReport[]> {
  try {
    // First try a simple query without joins to test basic connectivity
    let query = supabase
      .from('monthly_reports')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (filters?.month_from) {
      query = query.gte('report_month', filters.month_from);
    }
    if (filters?.month_to) {
      query = query.lte('report_month', filters.month_to);
    }
    if (filters?.report_type) {
      query = query.eq('report_type', filters.report_type);
    }
    if (filters?.generation_status) {
      query = query.eq('generation_status', filters.generation_status);
    }
    if (filters?.generated_by) {
      query = query.eq('generated_by', filters.generated_by);
    }
    if (filters?.search) {
      query = query.or(`report_month.ilike.%${filters.search}%,report_type.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Database error loading monthly reports:', error);
      return [];
    }

    // Transform data and add generated_by_name as 'System' for now
    return (data || []).map(report => ({
      ...report,
      generated_by_name: 'System' // We'll improve this later with proper user lookup
    }));
  } catch (error) {
    console.error('Error in getMonthlyReports:', error);
    return [];
  }
}

export async function getMonthlyReport(reportId: string): Promise<MonthlyReport | null> {
  const { data, error } = await supabase
    .from('monthly_reports')
    .select(`
      *,
      generated_by_profile:user_profiles!generated_by(full_name)
    `)
    .eq('id', reportId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return {
    ...data,
    generated_by_name: data.generated_by_profile?.full_name || 'Unknown'
  };
}

export async function deleteMonthlyReport(reportId: string): Promise<void> {
  const { error } = await supabase
    .from('monthly_reports')
    .delete()
    .eq('id', reportId);

  if (error) throw error;
}

export async function checkReportExists(reportMonth: string, reportType: ReportType): Promise<boolean> {
  const { data } = await supabase
    .from('monthly_reports')
    .select('id')
    .eq('report_month', reportMonth)
    .eq('report_type', reportType)
    .single();

  return !!data;
}

// ===================================
// REPORT GENERATIONS TRACKING
// ===================================

export async function createReportGeneration(
  monthlyReportId: string,
  generationType: 'manual' | 'scheduled' | 'bulk'
): Promise<ReportGeneration> {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('report_generations')
    .insert({
      monthly_report_id: monthlyReportId,
      generation_type: generationType,
      generation_status: 'started',
      progress_percentage: 0,
      generated_by: user.user.id
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateReportGenerationProgress(
  generationId: string,
  status: 'started' | 'data_collection' | 'pdf_generation' | 'completed' | 'failed',
  progress: number,
  errorDetails?: string,
  recordsProcessed?: any,
  dataQualityScore?: number
): Promise<ReportGeneration> {
  const updateData: any = {
    generation_status: status,
    progress_percentage: progress
  };

  if (status === 'completed' || status === 'failed') {
    updateData.completed_at = new Date().toISOString();
  }

  if (errorDetails) updateData.error_details = errorDetails;
  if (recordsProcessed) updateData.records_processed = recordsProcessed;
  if (dataQualityScore) updateData.data_quality_score = dataQualityScore;

  const { data, error } = await supabase
    .from('report_generations')
    .update(updateData)
    .eq('id', generationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getReportGenerations(monthlyReportId?: string): Promise<ReportGeneration[]> {
  let query = supabase
    .from('report_generations')
    .select('*')
    .order('created_at', { ascending: false });

  if (monthlyReportId) {
    query = query.eq('monthly_report_id', monthlyReportId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ===================================
// REPORT TEMPLATES CRUD OPERATIONS
// ===================================

export async function getReportTemplates(templateType?: ReportType): Promise<ReportTemplate[]> {
  try {
    let query = supabase
      .from('report_templates')
      .select('*')
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('name');

    if (templateType) {
      query = query.eq('template_type', templateType);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Database error loading templates:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getReportTemplates:', error);
    return [];
  }
}

export async function createReportTemplate(template: Omit<ReportTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<ReportTemplate> {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('report_templates')
    .insert({
      ...template,
      created_by: user.user.id
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateReportTemplate(templateId: string, updates: Partial<ReportTemplate>): Promise<ReportTemplate> {
  const { data, error } = await supabase
    .from('report_templates')
    .update(updates)
    .eq('id', templateId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteReportTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('report_templates')
    .update({ is_active: false })
    .eq('id', templateId);

  if (error) throw error;
}

// ===================================
// REPORT SUBSCRIPTIONS CRUD OPERATIONS
// ===================================

export async function getReportSubscriptions(): Promise<ReportSubscription[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('report_subscriptions')
    .select('*')
    .eq('user_id', user.user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createReportSubscription(
  reportType: ReportType,
  frequency: 'monthly' | 'quarterly' | 'yearly',
  autoEmail: boolean,
  emailRecipients: string[]
): Promise<ReportSubscription> {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) throw new Error('User not authenticated');

  // Calculate next generation date
  const nextGeneration = new Date();
  switch (frequency) {
    case 'monthly':
      nextGeneration.setMonth(nextGeneration.getMonth() + 1);
      break;
    case 'quarterly':
      nextGeneration.setMonth(nextGeneration.getMonth() + 3);
      break;
    case 'yearly':
      nextGeneration.setFullYear(nextGeneration.getFullYear() + 1);
      break;
  }

  const { data, error } = await supabase
    .from('report_subscriptions')
    .insert({
      user_id: user.user.id,
      report_type: reportType,
      frequency,
      auto_generate: true,
      auto_email: autoEmail,
      email_recipients: emailRecipients,
      next_generation_date: nextGeneration.toISOString().split('T')[0]
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateReportSubscription(
  subscriptionId: string,
  updates: Partial<ReportSubscription>
): Promise<ReportSubscription> {
  const { data, error } = await supabase
    .from('report_subscriptions')
    .update(updates)
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteReportSubscription(subscriptionId: string): Promise<void> {
  const { error } = await supabase
    .from('report_subscriptions')
    .update({ is_active: false })
    .eq('id', subscriptionId);

  if (error) throw error;
}

// ===================================
// BATCH OPERATIONS
// ===================================

export async function generateBulkReports(request: BulkReportGenerationRequest): Promise<MonthlyReport[]> {
  const results: MonthlyReport[] = [];
  
  // Generate date range
  const startDate = new Date(request.start_month + '-01');
  const endDate = new Date(request.end_month + '-01');
  
  const months: string[] = [];
  let currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    months.push(currentDate.toISOString().slice(0, 7));
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Generate reports for each month and type combination
  for (const month of months) {
    for (const reportType of request.report_types) {
      // Check if report already exists
      const exists = await checkReportExists(month, reportType);
      if (!exists) {
        try {
          // This would trigger the report generation process
          // For now, we'll create a placeholder
          const { data: user } = await supabase.auth.getUser();
          if (!user?.user?.id) throw new Error('User not authenticated');

          const { data, error } = await supabase
            .from('monthly_reports')
            .insert({
              user_id: user.user.id,
              report_month: month,
              report_type: reportType,
              generation_status: 'pending',
              generated_by: user.user.id
            })
            .select()
            .single();

          if (error) throw error;
          results.push(data);
        } catch (error) {
          console.error(`Failed to create report for ${month} - ${reportType}:`, error);
        }
      }
    }
  }

  return results;
}

// ===================================
// ANALYTICS AND INSIGHTS
// ===================================

export async function getReportsDashboardStats(): Promise<{
  total_reports: number;
  reports_this_month: number;
  successful_generations: number;
  failed_generations: number;
  average_generation_time: number;
  most_popular_report_type: ReportType;
}> {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Get total reports count
    const { count: totalReports, error: totalError } = await supabase
      .from('monthly_reports')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('Error fetching total reports:', totalError);
    }

    // Get this month's reports
    const { count: reportsThisMonth, error: monthError } = await supabase
      .from('monthly_reports')
      .select('*', { count: 'exact', head: true })
      .eq('report_month', currentMonth);

    if (monthError) {
      console.error('Error fetching this month reports:', monthError);
    }

    // Get successful generations
    const { count: successfulGenerations, error: successError } = await supabase
      .from('monthly_reports')
      .select('*', { count: 'exact', head: true })
      .eq('generation_status', 'completed');

    if (successError) {
      console.error('Error fetching successful generations:', successError);
    }

    // Get failed generations
    const { count: failedGenerations, error: failedError } = await supabase
      .from('monthly_reports')
      .select('*', { count: 'exact', head: true })
      .eq('generation_status', 'failed');

    if (failedError) {
      console.error('Error fetching failed generations:', failedError);
    }

    return {
      total_reports: totalReports || 0,
      reports_this_month: reportsThisMonth || 0,
      successful_generations: successfulGenerations || 0,
      failed_generations: failedGenerations || 0,
      average_generation_time: 0, // Simplified for now
      most_popular_report_type: 'executive_summary' // Default value
    };
  } catch (error) {
    console.error('Error in getReportsDashboardStats:', error);
    // Return default stats in case of error
    return {
      total_reports: 0,
      reports_this_month: 0,
      successful_generations: 0,
      failed_generations: 0,
      average_generation_time: 0,
      most_popular_report_type: 'executive_summary'
    };
  }
}

export async function getMonthlyReportSummaries(year?: number): Promise<Array<{
  month: string;
  total_reports: number;
  completed_reports: number;
  failed_reports: number;
  total_spend_inr: number;
}>> {
  const currentYear = year || new Date().getFullYear();
  
  const { data, error } = await supabase
    .from('monthly_reports')
    .select(`
      report_month,
      generation_status,
      total_expenses_inr,
      total_salaries_inr,
      total_subscriptions_inr,
      total_utility_bills_inr
    `)
    .gte('report_month', `${currentYear}-01`)
    .lte('report_month', `${currentYear}-12`);

  if (error) throw error;

  // Group by month
  const monthlyData = (data || []).reduce((acc, report) => {
    const month = report.report_month;
    if (!acc[month]) {
      acc[month] = {
        month,
        total_reports: 0,
        completed_reports: 0,
        failed_reports: 0,
        total_spend_inr: 0
      };
    }

    acc[month].total_reports += 1;
    if (report.generation_status === 'completed') {
      acc[month].completed_reports += 1;
      acc[month].total_spend_inr += 
        (report.total_expenses_inr || 0) +
        (report.total_salaries_inr || 0) +
        (report.total_subscriptions_inr || 0) +
        (report.total_utility_bills_inr || 0);
    }
    if (report.generation_status === 'failed') {
      acc[month].failed_reports += 1;
    }

    return acc;
  }, {} as Record<string, any>);

  return Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
}