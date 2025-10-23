'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { UtilityBill, PaymentMethod, TEAM_MEMBERS } from '@/types/finance';
import { updateUtilityBill, createUtilityBill, getPaymentMethods, deleteUtilityBill } from '@/lib/finance-api';
import styles from './expenses-minimal.module.css';

interface MonthlyUtilityTableProps {
  utilityBills: UtilityBill[];
  selectedMonth: string;
  isEditable: boolean;
  onRefresh: () => void;
}

interface MonthlyUtilityTableRef {
  showAddForm: () => void;
}

// Predefined provider options for dropdown
const PROVIDER_OPTIONS = [
  'ACT',
  'AIRCONNECT',
  'SKYLINK',
  'ADS_Gsuit',
  'RGB_Gsuit',
  'TA_Gsuit',
  'TDS',
  'Cleaning (Maari akka)'
];

// Predefined payment method names (these will be matched with actual payment methods from DB)
const PAYMENT_METHOD_OPTIONS = [
  'Debit Card',
  'Credit Card',
  'Office Hdfc Card',
  'Office Axis Card',
  'Net Banking',
  'UPI'
];

const USER_OPTIONS = [...TEAM_MEMBERS, 'Office'];

export const MonthlyUtilityTable = forwardRef<MonthlyUtilityTableRef, MonthlyUtilityTableProps>(
  ({ utilityBills, selectedMonth, isEditable, onRefresh }, ref) => {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    showAddForm: () => setShowAddForm(true)
  }));
  const [editingBill, setEditingBill] = useState<UtilityBill | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCustomProvider, setShowCustomProvider] = useState(false);
  const [showCustomPaymentMethod, setShowCustomPaymentMethod] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    bill_type: 'other' as 'internet' | 'electricity' | 'water' | 'gas' | 'phone' | 'other',
    provider_name: '',
    amount_inr: '',
    payment_method_id: '',
    due_date: '',
    bill_number: '',
    usage_details: '',
    notes: '',
    paid_by: ''
  });

  useEffect(() => {
    if (showAddForm || showEditForm) {
      loadPaymentMethods();
    }
  }, [showAddForm, showEditForm]);

    // Click outside to close form
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(event.target as Node)) {
        setShowAddForm(false);
        setShowEditForm(false);
        setEditingBill(null);
        resetForm();
      }
    };
    
    if (showAddForm || showEditForm) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAddForm, showEditForm]);


  const loadPaymentMethods = async () => {
    try {
      const methods = await getPaymentMethods();
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      bill_type: 'other' as const,
      provider_name: '',
      amount_inr: '',
      payment_method_id: '',
      due_date: '',
      bill_number: '',
      usage_details: '',
      notes: '',
      paid_by: ''
    });
    setShowCustomProvider(false);
    setShowCustomPaymentMethod(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.provider_name || !formData.amount_inr || !formData.payment_method_id || !formData.due_date) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (editingBill) {
        // Update existing bill
        await updateUtilityBill(editingBill.id, {
          bill_type: formData.bill_type,
          provider_name: formData.provider_name,
          amount_inr: parseFloat(formData.amount_inr),
          amount_usd: 0, // Default to 0 for now
          payment_method_id: formData.payment_method_id,
          due_date: formData.due_date,
          bill_number: formData.bill_number || undefined,
          usage_details: formData.usage_details || undefined,
          notes: formData.notes || undefined,
          paid_by: formData.paid_by || undefined
        });
      } else {
        // Create new bill
        await createUtilityBill({
          bill_type: formData.bill_type,
          provider_name: formData.provider_name,
          amount_inr: parseFloat(formData.amount_inr),
          amount_usd: 0, // Default to 0 for now
          payment_method_id: formData.payment_method_id,
          payment_status: 'pending',
          bill_month: selectedMonth,
          due_date: formData.due_date,
          bill_number: formData.bill_number || undefined,
          usage_details: formData.usage_details || undefined,
          notes: formData.notes || undefined,
          paid_by: formData.paid_by || undefined
        });
      }

      resetForm();
      setShowAddForm(false);
      setShowEditForm(false);
      setEditingBill(null);
      onRefresh();
    } catch (error) {
      console.error(`Error ${editingBill ? 'updating' : 'creating'} utility bill:`, error);
      alert(`Failed to ${editingBill ? 'update' : 'create'} utility bill. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatMonthDisplay = (monthString: string) => {
    const [year, month] = monthString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const handlePaidByChange = async (billId: string, newPaidBy: string) => {
    if (!isEditable) return;

    try {
      setIsUpdating(billId);
      
      // Find the bill to update
      const bill = utilityBills.find(b => b.id === billId);
      if (!bill) return;

      // Update the bill with the paid_by field
      await updateUtilityBill(billId, {
        paid_by: newPaidBy
      });

      onRefresh();
    } catch (error) {
      console.error('Error updating paid by:', error);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleEditBill = (billId: string) => {
    const bill = utilityBills.find(b => b.id === billId);
    if (bill) {
      setEditingBill(bill);
      
      // Check if provider or payment method needs custom input
      const isCustomProvider = !PROVIDER_OPTIONS.includes(bill.provider_name);
      const isCustomPaymentMethod = !paymentMethods.some(method => method.id === bill.payment_method_id) 
        && !PAYMENT_METHOD_OPTIONS.includes(bill.payment_method_id);
      
      setShowCustomProvider(isCustomProvider);
      setShowCustomPaymentMethod(isCustomPaymentMethod);
      
      setFormData({
        bill_type: bill.bill_type,
        provider_name: bill.provider_name,
        amount_inr: bill.amount_inr.toString(),
        payment_method_id: bill.payment_method_id,
        due_date: bill.due_date,
        bill_number: bill.bill_number || '',
        usage_details: bill.usage_details || '',
        notes: bill.notes || '',
        paid_by: bill.paid_by || ''
      });
      setShowEditForm(true);
    }
  };

  const handleDeleteBill = async (billId: string) => {
    if (!isEditable) return;
    
    const bill = utilityBills.find(b => b.id === billId);
    if (!bill) return;

    if (window.confirm(`Are you sure you want to delete the ${bill.provider_name} bill?`)) {
      try {
        await deleteUtilityBill(billId);
        onRefresh();
      } catch (error) {
        console.error('Error deleting utility bill:', error);
        alert('Failed to delete utility bill. Please try again.');
      }
    }
  };

  // Show only actual utility bills from database (no predefined/sample data)
  const allUtilityRows = utilityBills.map(bill => ({
    name: bill.provider_name,
    amount: bill.amount_inr,
    paidBy: bill.paid_by || '',
    hasPayment: bill.amount_inr > 0,
    billId: bill.id,
    billType: bill.bill_type,
    dueDate: bill.due_date,
    paymentStatus: bill.payment_status
  }));

  console.log('🔍 Utility Bills from Database:', {
    selectedMonth,
    totalBills: utilityBills.length,
    billsData: utilityBills.map(bill => ({
      id: bill.id,
      provider: bill.provider_name,
      type: bill.bill_type,
      amount_inr: bill.amount_inr,
      paid_by: bill.paid_by,
      bill_month: bill.bill_month,
      due_date: bill.due_date,
      payment_status: bill.payment_status,
      created_at: bill.created_at
    }))
  });

  const totalAmount = allUtilityRows
    .filter(row => row.hasPayment)
    .reduce((sum, row) => sum + row.amount, 0);

  return (
    <>
      <table className={styles.table}>
          <thead className={styles.tableHead}>
            <tr>
              <th className={styles.tableHeadCell}>Provider</th>
              <th className={styles.tableHeadCell}>Type</th>
              <th className={`${styles.tableHeadCell} ${styles.tableHeadCellRight}`}>Amount</th>
              <th className={`${styles.tableHeadCell} ${styles.tableHeadCellCenter}`}>Paid By</th>
              <th className={`${styles.tableHeadCell} ${styles.tableHeadCellCenter}`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {allUtilityRows.map((row, index) => (
              <tr key={row.name} className={styles.tableRow}>
                <td className={styles.tableCell}>
                  <div className={`${styles.flex} ${styles.flexAlignCenter} ${styles.flexGapHalf}`}>
                    <div className={`${styles.statusDot} ${row.hasPayment ? styles.statusDotActive : styles.statusDotInactive}`}></div>
                    <span className={styles.fontBold}>{row.name}</span>
                  </div>
                </td>
                
                <td className={styles.tableCell}>
                  {row.billType ? (
                    <span className={styles.billTypeBadge}>
                      {row.billType === 'other' ? 'Other' :
                       row.billType === 'internet' ? 'Internet' :
                       row.billType === 'electricity' ? 'Electric' :
                       row.billType === 'water' ? 'Water' :
                       row.billType === 'gas' ? 'Gas' :
                       row.billType === 'phone' ? 'Phone' : 'Other'
                      }
                    </span>
                  ) : (
                    <span className={styles.textMuted}>—</span>
                  )}
                </td>
                <td className={`${styles.tableCell} ${styles.tableCellRight}`}>
                  {row.hasPayment ? (
                    <span className={styles.amountDisplay}>
                      {formatCurrency(row.amount)}
                    </span>
                  ) : (
                    <span className={styles.textMuted}>—</span>
                  )}
                </td>
                <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                  {row.hasPayment ? (
                    isEditable && row.billId ? (
                      <select
                        value={row.paidBy}
                        onChange={(e) => handlePaidByChange(row.billId!, e.target.value)}
                        disabled={isUpdating === row.billId}
                        className={styles.formSelect}
                        style={{ minWidth: '120px' }}
                      >
                        <option value="">Select person</option>
                        {USER_OPTIONS.map(user => (
                          <option key={user} value={user}>
                            {user.charAt(0).toUpperCase() + user.slice(1)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={styles.paidByDisplay}>
                        {row.paidBy || 'Not specified'}
                      </span>
                    )
                  ) : (
                    <span className={styles.textMuted}>—</span>
                  )}
                </td>
                <td className={`${styles.tableCell} ${styles.tableCellCenter}`}>
                  {row.hasPayment && row.billId && isEditable ? (
                    <div className={`${styles.flex} ${styles.flexGapHalf}`} style={{ justifyContent: 'center' }}>
                      <button
                        onClick={() => handleEditBill(row.billId!)}
                        className={styles.editButton}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBill(row.billId!)}
                        className={styles.deleteButton}
                      >
                        Delete
                      </button>
                    </div>
                  ) : (
                    <span className={styles.textMuted}>—</span>
                  )}
                </td>
              </tr>
            ))}
            
            <tr className={styles.totalRow}>
              <td colSpan={2} className={`${styles.tableCell} ${styles.fontBold}`}>
                <div className={`${styles.flex} ${styles.flexAlignCenter} ${styles.flexGapHalf}`}>
                  <div className={`${styles.statusDot} ${styles.statusDotActive}`}></div>
                  TOTAL
                </div>
              </td>
              <td className={`${styles.tableCell} ${styles.tableCellRight} ${styles.fontBold}`}>
                <span className={styles.amountDisplay}>
                  {formatCurrency(totalAmount)}
                </span>
              </td>
              <td className={styles.tableCell}></td>
              <td className={styles.tableCell}></td>
            </tr>
          </tbody>
        </table>

      {/* Add/Edit Utility Bill Form */}
      {(showAddForm || showEditForm) && (
        <div className={styles.formOverlay}>
          <div ref={formRef} className={styles.formContainer}>
            <div className={styles.formHeader}>
              <h3 className={styles.formTitle}>
                {editingBill ? 'Edit' : 'Add'} Utility Bill
              </h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setShowEditForm(false);
                  setEditingBill(null);
                  resetForm();
                }}
                className={styles.closeButton}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    Provider Name *
                  </label>
                  <select
                    value={showCustomProvider ? 'custom' : formData.provider_name}
                    onChange={(e) => {
                      if (e.target.value === 'custom') {
                        setShowCustomProvider(true);
                        setFormData({ ...formData, provider_name: '' });
                      } else {
                        setShowCustomProvider(false);
                        setFormData({ ...formData, provider_name: e.target.value });
                      }
                    }}
                    required
                    className={styles.formSelect}
                  >
                    <option value="">Select provider</option>
                    {PROVIDER_OPTIONS.map(provider => (
                      <option key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                    <option value="custom">🖊️ Custom (Enter manually)</option>
                  </select>
                  
                  {showCustomProvider && (
                    <input
                      type="text"
                      value={formData.provider_name}
                      onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                      placeholder="Enter custom provider name"
                      required
                      className={styles.formInput}
                      style={{ marginTop: '0.5rem' }}
                    />
                  )}
                </div>

                <div className={`${styles.formGrid} ${styles.formGridCols2}`}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>
                      Bill Type
                    </label>
                    <select
                      value={formData.bill_type}
                      onChange={(e) => setFormData({ ...formData, bill_type: e.target.value as any })}
                      className={styles.formSelect}
                    >
                      <option value="other">Other</option>
                      <option value="internet">Internet</option>
                      <option value="electricity">Electricity</option>
                      <option value="water">Water</option>
                      <option value="gas">Gas</option>
                      <option value="phone">Phone</option>
                    </select>
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount_inr}
                      onChange={(e) => setFormData({ ...formData, amount_inr: e.target.value })}
                      placeholder="0.00"
                      required
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div className={`${styles.formGrid} ${styles.formGridCols2}`}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>
                      Payment Method *
                    </label>
                    <select
                      value={showCustomPaymentMethod ? 'custom' : formData.payment_method_id}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setShowCustomPaymentMethod(true);
                          setFormData({ ...formData, payment_method_id: '' });
                        } else {
                          setShowCustomPaymentMethod(false);
                          setFormData({ ...formData, payment_method_id: e.target.value });
                        }
                      }}
                      required
                      className={styles.formSelect}
                    >
                      <option value="">Select payment method</option>
                      {PAYMENT_METHOD_OPTIONS.map(method => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                      {paymentMethods.map(method => (
                        <option key={method.id} value={method.id}>
                          {method.name}
                        </option>
                      ))}
                      <option value="custom">🖊️ Custom (Enter manually)</option>
                    </select>
                    
                    {showCustomPaymentMethod && (
                      <input
                        type="text"
                        value={formData.payment_method_id}
                        onChange={(e) => setFormData({ ...formData, payment_method_id: e.target.value })}
                        placeholder="Enter custom payment method"
                        required
                        className={styles.formInput}
                        style={{ marginTop: '0.5rem' }}
                      />
                    )}
                  </div>

                  <div className={styles.formField}>
                    <label className={styles.formLabel}>
                      Due Date *
                    </label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      required
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    Bill Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.bill_number}
                    onChange={(e) => setFormData({ ...formData, bill_number: e.target.value })}
                    placeholder="Bill/Invoice number"
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    Paid By
                  </label>
                  <select
                    value={formData.paid_by}
                    onChange={(e) => setFormData({ ...formData, paid_by: e.target.value })}
                    className={styles.formSelect}
                  >
                    <option value="">Select team member</option>
                    {USER_OPTIONS.map(member => (
                      <option key={member} value={member}>
                        {member}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel}>
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={3}
                    className={styles.formTextarea}
                  />
                </div>

                <div className={styles.formActions}>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setShowAddForm(false);
                      setShowEditForm(false);
                      setEditingBill(null);
                    }}
                    className={styles.cancelButton}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={styles.submitButton}
                  >
                    {isSubmitting 
                      ? (editingBill ? 'Updating...' : 'Creating...') 
                      : (editingBill ? 'Update Utility Bill' : 'Create Utility Bill')
                    }
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
});

MonthlyUtilityTable.displayName = 'MonthlyUtilityTable';