'use client';

import { useState, useEffect, useRef } from 'react';
import { UtilityBill, PaymentMethod, TEAM_MEMBERS } from '@/types/finance';
import { updateUtilityBill, createUtilityBill, getPaymentMethods, deleteUtilityBill } from '@/lib/finance-api';
import styles from '../../payments.module.css';

interface MonthlyUtilityTableProps {
  utilityBills: UtilityBill[];
  selectedMonth: string;
  isEditable: boolean;
  onRefresh: () => void;
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

export function MonthlyUtilityTable({ utilityBills, selectedMonth, isEditable, onRefresh }: MonthlyUtilityTableProps) {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
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
    <div style={{
      background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.7) 0%, rgba(51, 65, 85, 0.4) 100%)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(148, 163, 184, 0.1)',
      borderRadius: '24px',
      padding: '2rem',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
      }}>
        <div>
          <h3 style={{ 
            color: '#ffffff', 
            fontSize: '1.25rem', 
            fontWeight: '700',
            margin: '0 0 0.5rem 0',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            🏠 Utility Expenses
          </h3>
          <p style={{
            color: 'rgba(148, 163, 184, 0.8)',
            fontSize: '0.9rem',
            margin: '0',
            fontWeight: '500'
          }}>
            {formatMonthDisplay(selectedMonth)}
          </p>
        </div>
        
        {isEditable && (
          <button 
            onClick={() => setShowAddForm(true)}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              padding: '0.75rem 1.5rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
            }}
          >
            + Add Utility Bill
          </button>
        )}
      </div>

      <div style={{ 
        borderRadius: '12px',
        background: 'rgba(15, 23, 42, 0.3)',
        border: '1px solid rgba(148, 163, 184, 0.1)'
      }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          background: 'transparent'
        }}>
          <thead>
            <tr style={{ 
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
              borderBottom: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <th style={{ 
                color: '#10b981', 
                padding: '0.75rem 1rem', 
                textAlign: 'left', 
                fontSize: '0.8rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Provider
              </th>
              <th style={{ 
                color: '#10b981', 
                padding: '0.75rem 1rem', 
                textAlign: 'left', 
                fontSize: '0.8rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Type
              </th>
              <th style={{ 
                color: '#10b981', 
                padding: '0.75rem 1rem', 
                textAlign: 'right', 
                fontSize: '0.8rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Amount
              </th>
              <th style={{ 
                color: '#10b981', 
                padding: '0.75rem 1rem', 
                textAlign: 'center', 
                fontSize: '0.8rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Paid By
              </th>
              <th style={{ 
                color: '#10b981', 
                padding: '0.75rem 1rem', 
                textAlign: 'center', 
                fontSize: '0.8rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {allUtilityRows.map((row, index) => (
              <tr 
                key={row.name} 
                style={{ 
                  borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
                  transition: 'all 0.2s ease',
                  background: index % 2 === 0 ? 'rgba(15, 23, 42, 0.2)' : 'transparent'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(16, 185, 129, 0.05)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = index % 2 === 0 ? 'rgba(15, 23, 42, 0.2)' : 'transparent';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                {/* Provider Name */}
                <td style={{ 
                  padding: '0.75rem 1rem', 
                  fontSize: '0.9rem', 
                  fontWeight: '600'
                }}>
                  <div style={{
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: row.hasPayment ? '#10b981' : 'rgba(148, 163, 184, 0.3)'
                    }}></div>
                    {row.name}
                  </div>
                </td>
                
                {/* Bill Type */}
                <td style={{ 
                  padding: '0.75rem 1rem', 
                  fontSize: '0.85rem'
                }}>
                  {row.billType ? (
                    <span style={{
                      background: `rgba(59, 130, 246, 0.2)`,
                      color: '#3b82f6',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      textTransform: 'capitalize'
                    }}>
                      {row.billType === 'other' ? '📋 Other' :
                       row.billType === 'internet' ? '🌐 Internet' :
                       row.billType === 'electricity' ? '⚡ Electric' :
                       row.billType === 'water' ? '💧 Water' :
                       row.billType === 'gas' ? '🔥 Gas' :
                       row.billType === 'phone' ? '📞 Phone' : '📋 Other'
                      }
                    </span>
                  ) : (
                    <span style={{ color: 'rgba(148, 163, 184, 0.4)', fontSize: '0.8rem' }}>—</span>
                  )}
                </td>
                {/* Amount */}
                <td style={{ 
                  padding: '0.75rem 1rem', 
                  fontSize: '0.9rem', 
                  fontWeight: '700', 
                  textAlign: 'right'
                }}>
                  {row.hasPayment ? (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                      color: '#10b981',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      display: 'inline-block',
                      fontWeight: '700',
                      fontSize: '0.85rem'
                    }}>
                      {formatCurrency(row.amount)}
                    </div>
                  ) : (
                    <span style={{ 
                      color: 'rgba(148, 163, 184, 0.5)', 
                      fontStyle: 'italic',
                      fontSize: '0.8rem',
                      background: 'rgba(148, 163, 184, 0.1)',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '6px',
                      border: '1px solid rgba(148, 163, 184, 0.2)'
                    }}>
                      Nill
                    </span>
                  )}
                </td>
                {/* Paid By */}
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                  {row.hasPayment ? (
                    isEditable && row.billId ? (
                      <select
                        value={row.paidBy}
                        onChange={(e) => handlePaidByChange(row.billId!, e.target.value)}
                        disabled={isUpdating === row.billId}
                        style={{
                          padding: '0.5rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid rgba(148, 163, 184, 0.2)',
                          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.6) 100%)',
                          backdropFilter: 'blur(10px)',
                          color: 'white',
                          fontSize: '0.8rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          minWidth: '120px',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = '#10b981';
                          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.2)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <option value="">Select person</option>
                        {USER_OPTIONS.map(user => (
                          <option key={user} value={user} style={{ 
                            backgroundColor: '#1e293b',
                            color: '#ffffff'
                          }}>
                            {user.charAt(0).toUpperCase() + user.slice(1)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div style={{ 
                        color: '#3b82f6', 
                        fontSize: '0.85rem',
                        padding: '0.5rem 1rem',
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
                        borderRadius: '8px',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        fontWeight: '600',
                        display: 'inline-block'
                      }}>
                        {row.paidBy || 'Not specified'}
                      </div>
                    )
                  ) : (
                    <span style={{ 
                      color: 'rgba(148, 163, 184, 0.4)', 
                      fontSize: '1.2rem'
                    }}>
                      —
                    </span>
                  )}
                </td>
                {/* Actions */}
                <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                  {row.hasPayment && row.billId && isEditable ? (
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleEditBill(row.billId!)}
                        style={{
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#3b82f6',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          padding: '0.25rem 0.4rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: '600',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.3)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBill(row.billId!)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#ef4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          padding: '0.25rem 0.4rem',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: '600',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  ) : (
                    <span style={{ 
                      color: 'rgba(148, 163, 184, 0.4)', 
                      fontSize: '1.2rem'
                    }}>
                      —
                    </span>
                  )}
                </td>
              </tr>
            ))}
            
            {/* Total Row */}
            <tr style={{ 
              borderTop: '2px solid rgba(16, 185, 129, 0.3)', 
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)',
              fontWeight: 'bold'
            }}>
              <td colSpan={2} style={{ 
                color: '#ffffff', 
                padding: '0.75rem 1rem', 
                fontSize: '1.1rem', 
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#10b981'
                  }}></div>
                  TOTAL
                </div>
              </td>
              <td style={{ 
                padding: '0.75rem 1rem', 
                fontSize: '1.2rem', 
                fontWeight: '800', 
                textAlign: 'right'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '12px',
                  display: 'inline-block',
                  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                }}>
                  {formatCurrency(totalAmount)}
                </div>
              </td>
              <td style={{ padding: '0.75rem 1rem' }}></td>
              <td style={{ padding: '0.75rem 1rem' }}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Add/Edit Utility Bill Form */}
      {(showAddForm || showEditForm) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div ref={formRef} style={{
            background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.95) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '20px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
            }}>
              <h3 style={{
                color: '#ffffff',
                fontSize: '1.25rem',
                fontWeight: '700',
                margin: 0,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                🏠 {editingBill ? 'Edit' : 'Add'} Utility Bill
              </h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setShowEditForm(false);
                  setEditingBill(null);
                  resetForm();
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  color: '#ef4444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 'bold'
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ color: 'rgba(148, 163, 184, 0.9)' }}>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Provider Name */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#ffffff' }}>
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
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      background: 'rgba(15, 23, 42, 0.5)',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
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
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        background: 'rgba(15, 23, 42, 0.5)',
                        color: 'white',
                        fontSize: '0.9rem',
                        marginTop: '0.5rem'
                      }}
                    />
                  )}
                </div>

                {/* Bill Type and Amount */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#ffffff' }}>
                      Bill Type
                    </label>
                    <select
                      value={formData.bill_type}
                      onChange={(e) => setFormData({ ...formData, bill_type: e.target.value as any })}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        background: 'rgba(15, 23, 42, 0.5)',
                        color: 'white',
                        fontSize: '0.9rem'
                      }}
                    >
                      <option value="other">Other</option>
                      <option value="internet">Internet</option>
                      <option value="electricity">Electricity</option>
                      <option value="water">Water</option>
                      <option value="gas">Gas</option>
                      <option value="phone">Phone</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#ffffff' }}>
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount_inr}
                      onChange={(e) => setFormData({ ...formData, amount_inr: e.target.value })}
                      placeholder="0.00"
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        background: 'rgba(15, 23, 42, 0.5)',
                        color: 'white',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                </div>

                {/* Payment Method and Due Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#ffffff' }}>
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
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        background: 'rgba(15, 23, 42, 0.5)',
                        color: 'white',
                        fontSize: '0.9rem'
                      }}
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
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: '1px solid rgba(148, 163, 184, 0.3)',
                          background: 'rgba(15, 23, 42, 0.5)',
                          color: 'white',
                          fontSize: '0.9rem',
                          marginTop: '0.5rem'
                        }}
                      />
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#ffffff' }}>
                      Due Date *
                    </label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        background: 'rgba(15, 23, 42, 0.5)',
                        color: 'white',
                        fontSize: '0.9rem'
                      }}
                    />
                  </div>
                </div>

                {/* Bill Number (Optional) */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#ffffff' }}>
                    Bill Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.bill_number}
                    onChange={(e) => setFormData({ ...formData, bill_number: e.target.value })}
                    placeholder="Bill/Invoice number"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      background: 'rgba(15, 23, 42, 0.5)',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                {/* Paid By */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#ffffff' }}>
                    Paid By
                  </label>
                  <select
                    value={formData.paid_by}
                    onChange={(e) => setFormData({ ...formData, paid_by: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      background: 'rgba(15, 23, 42, 0.5)',
                      color: 'white',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="">Select team member</option>
                    {USER_OPTIONS.map(member => (
                      <option key={member} value={member}>
                        {member}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes (Optional) */}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#ffffff' }}>
                    Notes (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      background: 'rgba(15, 23, 42, 0.5)',
                      color: 'white',
                      fontSize: '0.9rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Form Actions */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      setShowAddForm(false);
                      setShowEditForm(false);
                      setEditingBill(null);
                    }}
                    style={{
                      background: 'rgba(148, 163, 184, 0.2)',
                      border: '1px solid rgba(148, 163, 184, 0.3)',
                      borderRadius: '8px',
                      color: 'rgba(148, 163, 184, 0.9)',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      background: isSubmitting 
                        ? 'rgba(148, 163, 184, 0.3)' 
                        : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white',
                      padding: '0.75rem 1.5rem',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting ? 0.7 : 1
                    }}
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

      {/* Instructions */}
      <div style={{ 
        marginTop: '1.5rem',
        padding: '1rem 1.5rem',
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.08) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: '12px',
        fontSize: '0.85rem',
        color: 'rgba(148, 163, 184, 0.9)',
        fontWeight: '500',
        backdropFilter: 'blur(10px)'
      }}>
        💡 {isEditable 
          ? 'Use dropdowns to assign who paid each utility bill. Only current month data can be modified.'
          : 'This is historical data from a previous month and cannot be modified.'
        }
      </div>
    </div>
  );
}