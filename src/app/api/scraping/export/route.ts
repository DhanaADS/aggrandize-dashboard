import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { jobId, fields } = await request.json();

    // Fetch job results (in a real app, this would be from database)
    const jobResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/scraping/execute?jobId=${jobId}`);
    const job = await jobResponse.json();

    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: 'Job not completed yet' },
        { status: 400 }
      );
    }

    // Generate CSV
    const csvHeaders = fields.map((f: any) => f.name);
    const csvRows = [
      csvHeaders.join(','),
      ...job.results.map((result: any) => {
        return csvHeaders.map(header => {
          const value = result[header] || '';
          // Escape quotes and wrap in quotes if contains comma
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          // Handle arrays
          if (Array.isArray(value)) {
            return `"${value.join('; ')}"`;
          }
          return value;
        }).join(',');
      })
    ];

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="scraped_data_${jobId}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating CSV:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSV' },
      { status: 500 }
    );
  }
}