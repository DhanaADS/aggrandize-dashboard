
'use client';

import { useState, useEffect } from 'react';
import { ExpenseApproval, ExpenseApprovalFormData } from '@/types/finance';
import { getExpenseApprovals, createExpenseApproval } from '@/lib/finance-api';
import styles from './expenses-minimal.module.css';

interface ExpenseApprovalsProps {
  expenseId: string;
}

export function ExpenseApprovals({ expenseId }: ExpenseApprovalsProps) {
  const [approvals, setApprovals] = useState<ExpenseApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<ExpenseApprovalFormData>({ expense_id: expenseId, status: 'approved', comments: '' });

  useEffect(() => {
    loadApprovals();
  }, [expenseId]);

  const loadApprovals = async () => {
    try {
      setIsLoading(true);
      const approvalsData = await getExpenseApprovals(expenseId);
      setApprovals(approvalsData);
    } catch (error) {
      console.error('Error loading approvals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof ExpenseApprovalFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      await createExpenseApproval(formData);
      loadApprovals();
      setFormData({ expense_id: expenseId, status: 'approved', comments: '' });
    } catch (error) {
      console.error('Error creating approval:', error);
      alert('Failed to save approval');
    }
  };

  return (
    <div className={styles.approvalsContainer}>
      <h4>Approval History</h4>
      {isLoading ? (
        <p>Loading approval history...</p>
      ) : (
        <div className={styles.approvalsList}>
          {approvals.map(approval => (
            <div key={approval.id} className={styles.approvalItem}>
              <p><strong>{approval.approver?.full_name}</strong> {approval.status} this expense.</p>
              <p>{approval.comments}</p>
              <span>{new Date(approval.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      <div className={styles.approvalForm}>
        <select
          value={formData.status}
          onChange={(e) => handleInputChange('status', e.target.value)}
        >
          <option value="approved">Approve</option>
          <option value="rejected">Reject</option>
        </select>
        <textarea
          value={formData.comments}
          onChange={(e) => handleInputChange('comments', e.target.value)}
          placeholder="Comments"
        />
        <button onClick={handleSubmit}>Submit</button>
      </div>
    </div>
  );
}
