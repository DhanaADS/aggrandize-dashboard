import { NextRequest, NextResponse } from 'next/server';
import {
  getExpenseCategories,
  getPaymentMethods,
  getExpenses,
  createExpense,
  getSalaries,
  getUtilityBills,
  getSubscriptions,
  getSettlements,
} from '@/lib/umbrel';

// GET - Fetch data from Umbrel
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const table = searchParams.get('table') || 'categories';

  try {
    let data;
    switch (table) {
      case 'categories':
        data = await getExpenseCategories();
        break;
      case 'methods':
        data = await getPaymentMethods();
        break;
      case 'expenses':
        data = await getExpenses();
        break;
      case 'salaries':
        data = await getSalaries();
        break;
      case 'bills':
        data = await getUtilityBills();
        break;
      case 'subscriptions':
        data = await getSubscriptions();
        break;
      case 'settlements':
        data = await getSettlements();
        break;
      default:
        return NextResponse.json({ error: 'Invalid table' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      table,
      count: data.length,
      data,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// POST - Create test expense
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Get first category and payment method for test
    const categories = await getExpenseCategories();
    const methods = await getPaymentMethods();

    if (categories.length === 0 || methods.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No categories or payment methods found',
      }, { status: 400 });
    }

    const expense = await createExpense({
      amount_inr: body.amount_inr || 1000,
      amount_usd: body.amount_usd || 12,
      category_id: body.category_id || categories[0].id,
      person_paid: body.person_paid || 'Test User',
      purpose: body.purpose || 'Test expense from API',
      payment_method_id: body.payment_method_id || methods[0].id,
      expense_date: body.expense_date || new Date().toISOString().split('T')[0],
    });

    return NextResponse.json({
      success: true,
      message: 'Expense created',
      expense,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
