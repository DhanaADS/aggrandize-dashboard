'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { UtilityBill, PaymentMethod, TEAM_MEMBERS } from '@/types/finance';
import { 
  updateUtilityBill, 
  createUtilityBill, 
  getPaymentMethods, 
  deleteUtilityBill,
  bulkDeleteUtilityBills,
  bulkUpdateUtilityBillStatus
} from '@/lib/finance-api';
import { BulkOperations } from './bulk-operations';
import styles from './expenses-minimal.module.css';

interface EnhancedMonthlyUtilityTableProps {
  utilityBills: UtilityBill[];
  selectedMonth: string;
  isEditable: boolean;
  onRefresh: () => void;
  onBulkExport: (ids: string[], type: 'utility_bill') => void;
}

interface EnhancedMonthlyUtilityTableRef {
  showAddForm: () => void;
}

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

const PAYMENT_METHOD_OPTIONS = [
  'Debit Card',
  'Credit Card',
  'Office Hdfc Card',
  'Office Axis Card', 
  'Net Banking',
  'UPI'
];

const USER_OPTIONS = [...TEAM_MEMBERS, 'Office'];

export const EnhancedMonthlyUtilityTable = forwardRef<EnhancedMonthlyUtilityTableRef, EnhancedMonthlyUtilityTableProps>(
  ({ utilityBills, selectedMonth, isEditable, onRefresh, onBulkExport }, ref) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingBill, setEditingBill] = useState<UtilityBill | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  useImperativeHandle(ref, () => ({
    showAddForm: () => setShowAddForm(true)
  }));

  useEffect(() => {
    if (showAddForm || showEditForm) {
      loadPaymentMethods();
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

  // Multi-select functions
  const handleSelectItem = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedItems(prev => [...prev, id]);
    } else {
      setSelectedItems(prev => prev.filter(item => item !== id));
    }
  };

  const handleSelectAll = (selectAll: boolean) => {
    if (selectAll) {
      setSelectedItems(utilityBills.map(bill => bill.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
  };

  // Bulk operations
  const handleBulkDelete = async (ids: string[]) => {
    await bulkDeleteUtilityBills(ids);
    onRefresh();
  };

  const handleBulkUpdateStatus = async (ids: string[], status: string) => {
    await bulkUpdateUtilityBillStatus(ids, status);
    onRefresh();
  };

  const handleBulkExport = (ids: string[]) => {
    onBulkExport(ids, 'utility_bill');
  };

  // Form handling
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setFormData({
      bill_type: 'other',
      provider_name: '',
      amount_inr: '',
      payment_method_id: '',
      due_date: '',
      bill_number: '',
      usage_details: '',
      notes: '',
      paid_by: ''
    });
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      const submitData = {
        ...formData,
        amount_inr: parseFloat(formData.amount_inr),
        amount_usd: parseFloat(formData.amount_inr) / 83.5,
        bill_month: selectedMonth,
        payment_status: 'pending' as const
      };

      if (editingBill) {
        await updateUtilityBill(editingBill.id, submitData);
      } else {
        await createUtilityBill(submitData);
      }

      resetForm();
      setShowAddForm(false);
      setShowEditForm(false);
      setEditingBill(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving utility bill:', error);
      alert('Failed to save utility bill');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (bill: UtilityBill) => {
    setEditingBill(bill);
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
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this utility bill?')) return;
    
    try {
      await deleteUtilityBill(id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting utility bill:', error);
      alert('Failed to delete utility bill');
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      setIsUpdating(id);
      await updateUtilityBill(id, { payment_status: status as any });
      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setIsUpdating(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: { background: '#f59e0b', color: 'white' },
      paid: { background: '#10b981', color: 'white' },
      overdue: { background: '#ef4444', color: 'white' },
      cancelled: { background: '#6b7280', color: 'white' }
    };

    return (
      <span 
        className={styles.statusBadge}
        style={statusStyles[status as keyof typeof statusStyles] || statusStyles.pending}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const closeForm = () => {
    setShowAddForm(false);
    setShowEditForm(false);
    setEditingBill(null);
    resetForm();
  };

  return (
    <div className={styles.tableContainer}>
      {/* Table */}
      <div className={styles.tableWrapper}>
        {utilityBills.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No utility bills found for {selectedMonth}</p>
            {isEditable && (
              <button 
                className={styles.addButton}
                onClick={() => setShowAddForm(true)}
              >
                Add First Bill
              </button>
            )}
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxColumn}>
                  <input
                    type="checkbox"
                    checked={selectedItems.length === utilityBills.length && utilityBills.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th>Provider</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Paid By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {utilityBills.map((bill) => (
                <tr key={bill.id}>
                  <td className={styles.checkboxColumn}>
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(bill.id)}
                      onChange={(e) => handleSelectItem(bill.id, e.target.checked)}
                    />
                  </td>
                  <td>{bill.provider_name}</td>
                  <td>
                    <span className={styles.billType}>
                      {bill.bill_type.charAt(0).toUpperCase() + bill.bill_type.slice(1)}
                    </span>
                  </td>
                  <td>{formatCurrency(bill.amount_inr)}</td>
                  <td>
                    {isEditable ? (
                      <select
                        value={bill.payment_status}
                        onChange={(e) => handleStatusUpdate(bill.id, e.target.value)}
                        disabled={isUpdating === bill.id}
                        className={styles.statusSelect}
                      >
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    ) : (
                      getStatusBadge(bill.payment_status)
                    )}
                  </td>
                  <td>{new Date(bill.due_date).toLocaleDateString()}</td>
                  <td>{bill.paid_by || '-'}</td>
                  <td>
                    <div className={styles.actionButtons}>
                      {isEditable && (
                        <>
                          <button
                            className={styles.editButton}
                            onClick={() => handleEdit(bill)}
                          >
                            ✏️
                          </button>
                          <button
                            className={styles.deleteButton}
                            onClick={() => handleDelete(bill.id)}
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || showEditForm) && (
        <div className={styles.formOverlay} onClick={closeForm}>
          <div 
            ref={formRef}
            className={styles.formContainer}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.formHeader}>
              <h3>{editingBill ? 'Edit' : 'Add'} Utility Bill</h3>
              <button className={styles.closeButton} onClick={closeForm}>×</button>
            </div>

            <div className={styles.formContent}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Bill Type *</label>
                  <select
                    value={formData.bill_type}
                    onChange={(e) => handleInputChange('bill_type', e.target.value)}
                  >
                    <option value="internet">Internet</option>
                    <option value="electricity">Electricity</option>
                    <option value="water">Water</option>
                    <option value="gas">Gas</option>
                    <option value="phone">Phone</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Provider *</label>
                  <input
                    type="text"
                    value={formData.provider_name}
                    onChange={(e) => handleInputChange('provider_name', e.target.value)}
                    list="provider-options"
                    placeholder="Provider name"
                    required
                  />
                  <datalist id="provider-options">
                    {PROVIDER_OPTIONS.map(provider => (
                      <option key={provider} value={provider} />
                    ))}
                  </datalist>
                </div>

                <div className={styles.formGroup}>
                  <label>Amount (INR) *</label>
                  <input
                    type="number"
                    value={formData.amount_inr}
                    onChange={(e) => handleInputChange('amount_inr', e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Payment Method *</label>
                  <select
                    value={formData.payment_method_id}
                    onChange={(e) => handleInputChange('payment_method_id', e.target.value)}
                    required
                  >
                    <option value="">Select method</option>
                    {paymentMethods.map(method => (
                      <option key={method.id} value={method.id}>{method.name}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Due Date *</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => handleInputChange('due_date', e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Paid By</label>
                  <select
                    value={formData.paid_by}
                    onChange={(e) => handleInputChange('paid_by', e.target.value)}
                  >
                    <option value="">Select person</option>
                    {USER_OPTIONS.map(user => (
                      <option key={user} value={user}>{user}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Bill Number</label>
                  <input
                    type="text"
                    value={formData.bill_number}
                    onChange={(e) => handleInputChange('bill_number', e.target.value)}
                    placeholder="Bill reference number"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Usage Details</label>
                  <input
                    type="text"
                    value={formData.usage_details}
                    onChange={(e) => handleInputChange('usage_details', e.target.value)}
                    placeholder="Usage information"
                  />
                </div>

                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Additional notes"
                    rows={3}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  className={styles.cancelButton}
                  onClick={closeForm}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  className={styles.submitButton}
                  onClick={handleSubmit}
                  disabled={isSubmitting || !formData.provider_name || !formData.amount_inr}
                >
                  {isSubmitting ? 'Saving...' : (editingBill ? 'Update' : 'Add')} Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Operations */}
      <BulkOperations
        selectedItems={selectedItems}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkUpdateStatus={isEditable ? handleBulkUpdateStatus : undefined}
        onBulkExport={handleBulkExport}
        totalItems={utilityBills.length}
        itemType="utility_bill"
      />
    </div>
  );
});