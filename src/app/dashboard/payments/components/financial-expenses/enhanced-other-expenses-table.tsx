'use client';

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Expense, PaymentMethod, ExpenseCategory, TEAM_MEMBERS, ExpenseAttachment } from '@/types/finance';
import { 
  updateExpense, 
  deleteExpense, 
  createExpense, 
  getPaymentMethods, 
  getExpenseCategories,
  bulkDeleteExpenses,
  bulkUpdateExpenseStatus,
  uploadExpenseAttachment,
  deleteExpenseAttachment,
  getExpenseAttachments
} from '@/lib/finance-api';
import { BulkOperations } from './bulk-operations';
import { ExpenseApprovals } from './ExpenseApprovals';
import styles from './expenses-minimal.module.css';

interface EnhancedOtherExpensesTableProps {
  expenses: Expense[];
  selectedMonth: string;
  isEditable: boolean;
  onRefresh: () => void;
  onBulkExport: (ids: string[], type: 'expense') => void;
}

interface EnhancedOtherExpensesTableRef {
  showAddForm: () => void;
}

const PAYMENT_METHOD_OPTIONS = [
  'Debit Card',
  'Credit Card', 
  'Office Hdfc Card',
  'Office Axis Card',
  'Net Banking',
  'Bank Transfer',
  'UPI',
  'Cash',
  'Office Card'
];

const USER_OPTIONS = [...TEAM_MEMBERS, 'Office'];

export const EnhancedOtherExpensesTable = forwardRef<EnhancedOtherExpensesTableRef, EnhancedOtherExpensesTableProps>(
  ({ expenses, selectedMonth, isEditable, onRefresh, onBulkExport }, ref) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Expense; direction: 'ascending' | 'descending' } | null>(null);
  const [attachments, setAttachments] = useState<ExpenseAttachment[]>([]);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [showApprovals, setShowApprovals] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formData, setFormData] = useState<any>({
    purpose: '',
    amount_inr: '',
    category_id: '',
    person_paid: '',
    person_responsible: '',
    payment_method_id: '',
    expense_date: '',
    payment_status: 'pending',
    notes: '',
    recurring_type: undefined,
    recurring_end_date: undefined
  });

  useImperativeHandle(ref, () => ({
    showAddForm: () => setShowAddForm(true)
  }));

  useEffect(() => {
    if (showAddForm || showEditForm) {
      loadFormData();
    }
  }, [showAddForm, showEditForm]);

  const loadFormData = async () => {
    try {
      const [methods, categories] = await Promise.all([
        getPaymentMethods(),
        getExpenseCategories()
      ]);
      setPaymentMethods(methods);
      setExpenseCategories(categories);
    } catch (error) {
      console.error('Error loading form data:', error);
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
      setSelectedItems(expenses.map(expense => expense.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleClearSelection = () => {
    setSelectedItems([]);
  };

  // Bulk operations
  const handleBulkDelete = async (ids: string[]) => {
    await bulkDeleteExpenses(ids);
    onRefresh();
  };

  const handleBulkUpdateStatus = async (ids: string[], status: string) => {
    await bulkUpdateExpenseStatus(ids, status);
    onRefresh();
  };

  const handleBulkExport = (ids: string[]) => {
    onBulkExport(ids, 'expense');
  };

  // Form handling
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      purpose: '',
      amount_inr: '',
      category_id: '',
      person_paid: '',
      person_responsible: '',
      payment_method_id: '',
      expense_date: today,
      payment_status: 'pending',
      notes: '',
      recurring_type: undefined,
      recurring_end_date: undefined
    });
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      const submitData = {
        ...formData,
        amount_inr: parseFloat(formData.amount_inr),
        amount_usd: parseFloat(formData.amount_inr) / 83.5
      };

      if (editingExpense) {
        const updatedExpense = await updateExpense(editingExpense.id, submitData);
        if (fileToUpload) {
          await uploadExpenseAttachment(updatedExpense.id, fileToUpload);
        }
      } else {
        const newExpense = await createExpense(submitData);
        if (fileToUpload) {
          await uploadExpenseAttachment(newExpense.id, fileToUpload);
        }
      }

      resetForm();
      setShowAddForm(false);
      setShowEditForm(false);
      setEditingExpense(null);
      onRefresh();
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      purpose: expense.purpose,
      amount_inr: expense.amount_inr.toString(),
      category_id: expense.category_id,
      person_paid: expense.person_paid,
      person_responsible: expense.person_responsible || '',
      payment_method_id: expense.payment_method_id,
      expense_date: expense.expense_date,
      payment_status: expense.payment_status,
      notes: expense.notes || '',
      recurring_type: expense.recurring_type,
      recurring_end_date: expense.recurring_end_date
    });
    setShowEditForm(true);
    const expenseAttachments = await getExpenseAttachments(expense.id);
    setAttachments(expenseAttachments);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    
    try {
      await deleteExpense(id);
      onRefresh();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      setIsUpdating(id);
      await updateExpense(id, { payment_status: status as any });
      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Delete this attachment?')) return;

    try {
      await deleteExpenseAttachment(attachmentId);
      setAttachments(attachments.filter(a => a.id !== attachmentId));
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Failed to delete attachment');
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: { background: '#f59e0b', color: 'white' },
      paid: { background: '#10b981', color: 'white' },
      approved: { background: '#3b82f6', color: 'white' },
      rejected: { background: '#ef4444', color: 'white' }
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
    setEditingExpense(null);
    resetForm();
  };

  const sortedExpenses = [...expenses].sort((a, b) => {
    if (sortConfig === null) {
      return 0;
    }
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'ascending' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'ascending' ? 1 : -1;
    }
    return 0;
  });

  const requestSort = (key: keyof Expense) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className={styles.tableContainer}>
      {/* Table */}
      <div className={styles.tableWrapper}>
        {sortedExpenses.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No expenses found for {selectedMonth}</p>
            {isEditable && (
              <button 
                className={styles.addButton}
                onClick={() => setShowAddForm(true)}
              >
                Add First Expense
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
                    checked={selectedItems.length === expenses.length && expenses.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </th>
                <th onClick={() => requestSort('purpose')}>Purpose</th>
                <th onClick={() => requestSort('category')}>Category</th>
                <th onClick={() => requestSort('amount_inr')}>Amount</th>
                <th onClick={() => requestSort('person_paid')}>Paid By</th>
                <th onClick={() => requestSort('payment_status')}>Status</th>
                <th onClick={() => requestSort('expense_date')}>Date</th>
                <th></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedExpenses.map((expense) => (
                <>
                  <tr key={expense.id}>
                    <td className={styles.checkboxColumn}>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(expense.id)}
                        onChange={(e) => handleSelectItem(expense.id, e.target.checked)}
                      />
                    </td>
                    <td>
                      <div className={styles.purposeCell}>
                        <span className={styles.purpose}>{expense.purpose}</span>
                        {expense.notes && (
                          <span className={styles.notes}>{expense.notes}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={styles.category}>
                        {expense.category?.icon} {expense.category?.name}
                      </span>
                    </td>
                    <td>{formatCurrency(expense.amount_inr)}</td>
                    <td>{expense.person_paid}</td>
                    <td>
                      {isEditable ? (
                        <select
                          value={expense.payment_status}
                          onChange={(e) => handleStatusUpdate(expense.id, e.target.value)}
                          disabled={isUpdating === expense.id}
                          className={styles.statusSelect}
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      ) : (
                        getStatusBadge(expense.payment_status)
                      )}
                    </td>
                    <td>{new Date(expense.expense_date).toLocaleDateString()}</td>
                    <td>{expense.attachments && expense.attachments.length > 0 ? '📎' : ''}</td>
                    <td>
                      <div className={styles.actionButtons}>
                        {isEditable && (
                          <>
                            <button
                              className={styles.editButton}
                              onClick={() => handleEdit(expense)}
                            >
                              ✏️
                            </button>
                            <button
                              className={styles.deleteButton}
                              onClick={() => handleDelete(expense.id)}
                            >
                              🗑️
                            </button>
                            <button
                              className={styles.approvalsButton}
                              onClick={() => setShowApprovals(showApprovals === expense.id ? null : expense.id)}
                            >
                              👍
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {showApprovals === expense.id && (
                    <tr>
                      <td colSpan={9}>
                        <ExpenseApprovals expenseId={expense.id} />
                      </td>
                    </tr>
                  )}
                </>
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
              <h3>{editingExpense ? 'Edit' : 'Add'} Expense</h3>
              <button className={styles.closeButton} onClick={closeForm}>×</button>
            </div>

            <div className={styles.formContent}>
              <div className={styles.formGrid}>
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label>Purpose *</label>
                  <input
                    type="text"
                    value={formData.purpose}
                    onChange={(e) => handleInputChange('purpose', e.target.value)}
                    placeholder="Expense purpose"
                    required
                  />
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
                  <label>Category *</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => handleInputChange('category_id', e.target.value)}
                    required
                  >
                    <option value="">Select category</option>
                    {expenseCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Paid By *</label>
                  <select
                    value={formData.person_paid}
                    onChange={(e) => handleInputChange('person_paid', e.target.value)}
                    required
                  >
                    <option value="">Select person</option>
                    {USER_OPTIONS.map(user => (
                      <option key={user} value={user}>{user}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Responsible Person</label>
                  <select
                    value={formData.person_responsible}
                    onChange={(e) => handleInputChange('person_responsible', e.target.value)}
                  >
                    <option value="">Select person</option>
                    {USER_OPTIONS.map(user => (
                      <option key={user} value={user}>{user}</option>
                    ))}
                  </select>
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
                  <label>Date *</label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => handleInputChange('expense_date', e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Status</label>
                  <select
                    value={formData.payment_status}
                    onChange={(e) => handleInputChange('payment_status', e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
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
                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                  <label>Recurring</label>
                  <div className={styles.recurringContainer}>
                    <select
                      value={formData.recurring_type}
                      onChange={(e) => handleInputChange('recurring_type', e.target.value)}
                    >
                      <option value="">Not recurring</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    {formData.recurring_type && (
                      <input
                        type="date"
                        value={formData.recurring_end_date}
                        onChange={(e) => handleInputChange('recurring_end_date', e.target.value)}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Attachments */}
              <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                <label>Attachments</label>
                <div className={styles.attachmentsContainer}>
                  {attachments.map(attachment => (
                    <div key={attachment.id} className={styles.attachment}>
                      <a href={attachment.file_path} target="_blank" rel="noopener noreferrer">{attachment.file_name}</a>
                      <button onClick={() => handleDeleteAttachment(attachment.id)}>🗑️</button>
                    </div>
                  ))}
                </div>
                <input type="file" onChange={(e) => setFileToUpload(e.target.files ? e.target.files[0] : null)} />
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
                  disabled={isSubmitting || !formData.purpose || !formData.amount_inr}
                >
                  {isSubmitting ? 'Saving...' : (editingExpense ? 'Update' : 'Add')} Expense
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
        totalItems={expenses.length}
        itemType="expense"
      />
    </div>
  );
});
