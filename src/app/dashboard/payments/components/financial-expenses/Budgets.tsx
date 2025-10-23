
'use client';

import { useState, useEffect } from 'react';
import { Budget, BudgetFormData, ExpenseCategory } from '@/types/finance';
import { getBudgets, createBudget, updateBudget, deleteBudget, getExpenseCategories } from '@/lib/finance-api';
import styles from './expenses-minimal.module.css';

interface BudgetsProps {
  selectedMonth: string;
}

export function Budgets({ selectedMonth }: BudgetsProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [formData, setFormData] = useState<BudgetFormData>({ category_id: '', amount: 0, month: selectedMonth });

  useEffect(() => {
    loadBudgets();
    loadCategories();
  }, [selectedMonth]);

  const loadBudgets = async () => {
    try {
      setIsLoading(true);
      const budgetsData = await getBudgets(selectedMonth);
      setBudgets(budgetsData);
    } catch (error) {
      console.error('Error loading budgets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await getExpenseCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleInputChange = (field: keyof BudgetFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, formData);
      } else {
        await createBudget(formData);
      }
      loadBudgets();
      setEditingBudget(null);
      setFormData({ category_id: '', amount: 0, month: selectedMonth });
    } catch (error) {
      console.error('Error saving budget:', error);
      alert('Failed to save budget');
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setFormData({ category_id: budget.category_id, amount: budget.amount, month: budget.month });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this budget?')) return;

    try {
      await deleteBudget(id);
      loadBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
      alert('Failed to delete budget');
    }
  };

  return (
    <div className={styles.budgetsContainer}>
      <h2>Budgets for {selectedMonth}</h2>
      <div className={styles.budgetForm}>
        <select
          value={formData.category_id}
          onChange={(e) => handleInputChange('category_id', e.target.value)}
        >
          <option value="">Select Category</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
        <input
          type="number"
          value={formData.amount}
          onChange={(e) => handleInputChange('amount', e.target.value)}
          placeholder="Amount"
        />
        <button onClick={handleSubmit}>{editingBudget ? 'Update' : 'Add'} Budget</button>
        {editingBudget && <button onClick={() => setEditingBudget(null)}>Cancel</button>}
      </div>
      {isLoading ? (
        <p>Loading budgets...</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Budget</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map(budget => (
              <tr key={budget.id}>
                <td>{budget.category?.name}</td>
                <td>{budget.amount}</td>
                <td>
                  <button onClick={() => handleEdit(budget)}>Edit</button>
                  <button onClick={() => handleDelete(budget.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
