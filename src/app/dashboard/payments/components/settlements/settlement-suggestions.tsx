'use client';

import { useState, useEffect } from 'react';
import { SettlementSuggestion, SettlementFormData } from '@/types/finance';
import { generateOptimalSettlements, createBulkSettlements } from '@/lib/finance-api';
import styles from '../../payments.module.css';

interface SettlementSuggestionsProps {
  onSettlementCreated?: () => void;
}

export function SettlementSuggestions({ onSettlementCreated }: SettlementSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SettlementSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [showSuggestions, setShowSuggestions] = useState(false);

  const loadSuggestions = async () => {
    try {
      setIsLoading(true);
      const data = await generateOptimalSettlements();
      setSuggestions(data);
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (showSuggestions) {
      loadSuggestions();
    }
  }, [showSuggestions]);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const handleToggleSelection = (suggestionId: string) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(suggestionId)) {
      newSelected.delete(suggestionId);
    } else {
      newSelected.add(suggestionId);
    }
    setSelectedSuggestions(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedSuggestions.size === suggestions.length) {
      setSelectedSuggestions(new Set());
    } else {
      setSelectedSuggestions(new Set(suggestions.map(s => s.id)));
    }
  };

  const handleCreateSelected = async () => {
    const selectedItems = suggestions.filter(s => selectedSuggestions.has(s.id));
    
    if (selectedItems.length === 0) {
      alert('Please select at least one settlement to create');
      return;
    }

    if (!confirm(`Create ${selectedItems.length} settlement(s)?`)) {
      return;
    }

    try {
      setIsCreating(true);
      
      const settlementData: SettlementFormData[] = selectedItems.map(suggestion => ({
        from_person: suggestion.from_person,
        to_person: suggestion.to_person,
        amount_inr: suggestion.amount_inr,
        purpose: suggestion.purpose,
        settlement_status: 'pending' as const,
        notes: `Auto-generated settlement (Confidence: ${suggestion.confidence_score}%)`
      }));

      await createBulkSettlements(settlementData);
      
      // Clear selections and reload suggestions
      setSelectedSuggestions(new Set());
      await loadSuggestions();
      
      if (onSettlementCreated) {
        onSettlementCreated();
      }

      alert(`Successfully created ${selectedItems.length} settlement(s)!`);
    } catch (error) {
      console.error('Error creating settlements:', error);
      alert('Failed to create settlements');
    } finally {
      setIsCreating(false);
    }
  };

  const getTotalAmount = () => {
    return suggestions
      .filter(s => selectedSuggestions.has(s.id))
      .reduce((sum, s) => sum + s.amount_inr, 0);
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.3)',
      border: '1px solid rgba(148, 163, 184, 0.1)',
      borderRadius: '16px',
      marginBottom: '2rem',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
        padding: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{
            color: '#3b82f6',
            fontSize: '1.1rem',
            fontWeight: '700',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>🎯</span> Smart Settlement Suggestions
          </h3>
          <p style={{
            color: 'rgba(255, 255, 255, 0.6)',
            margin: '0.25rem 0 0 0',
            fontSize: '0.85rem'
          }}>
            AI-generated optimal settlements based on expense and subscription data
          </p>
        </div>
        <button
          onClick={() => setShowSuggestions(!showSuggestions)}
          className={styles.buttonSecondary}
          style={{ 
            fontSize: '0.85rem',
            background: showSuggestions ? 'rgba(59, 130, 246, 0.2)' : 'rgba(148, 163, 184, 0.1)'
          }}
        >
          {showSuggestions ? '📖 Hide' : '🎯 Generate'} Suggestions
        </button>
      </div>

      {/* Content */}
      {showSuggestions && (
        <div style={{ padding: '1.5rem' }}>
          {isLoading ? (
            <div style={{
              color: 'rgba(255, 255, 255, 0.6)',
              textAlign: 'center',
              padding: '2rem'
            }}>
              🤖 Analyzing expenses and subscriptions...
            </div>
          ) : suggestions.length === 0 ? (
            <div style={{
              color: 'rgba(255, 255, 255, 0.6)',
              textAlign: 'center',
              padding: '2rem'
            }}>
              🎉 No settlements needed! All balances are even.
            </div>
          ) : (
            <>
              {/* Bulk Actions */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                padding: '1rem',
                background: 'rgba(59, 130, 246, 0.05)',
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.1)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedSuggestions.size === suggestions.length}
                      onChange={handleSelectAll}
                      style={{ margin: 0 }}
                    />
                    Select All ({suggestions.length})
                  </label>
                  {selectedSuggestions.size > 0 && (
                    <span style={{
                      color: '#3b82f6',
                      fontSize: '0.85rem',
                      fontWeight: '600'
                    }}>
                      {selectedSuggestions.size} selected • Total: {formatCurrency(getTotalAmount())}
                    </span>
                  )}
                </div>
                {selectedSuggestions.size > 0 && (
                  <button
                    onClick={handleCreateSelected}
                    disabled={isCreating}
                    className={styles.button}
                    style={{ fontSize: '0.85rem' }}
                  >
                    {isCreating ? '⏳ Creating...' : `✨ Create ${selectedSuggestions.size} Settlement(s)`}
                  </button>
                )}
              </div>

              {/* Suggestions List */}
              <div style={{
                display: 'grid',
                gap: '1rem'
              }}>
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.id}
                    style={{
                      background: selectedSuggestions.has(suggestion.id) 
                        ? 'rgba(59, 130, 246, 0.1)' 
                        : 'rgba(148, 163, 184, 0.05)',
                      border: selectedSuggestions.has(suggestion.id)
                        ? '1px solid rgba(59, 130, 246, 0.3)'
                        : '1px solid rgba(148, 163, 184, 0.1)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleToggleSelection(suggestion.id)}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <input
                          type="checkbox"
                          checked={selectedSuggestions.has(suggestion.id)}
                          onChange={() => handleToggleSelection(suggestion.id)}
                          style={{ margin: 0 }}
                        />
                        <div style={{
                          background: 'rgba(34, 197, 94, 0.2)',
                          color: '#22c55e',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: '600'
                        }}>
                          #{index + 1}
                        </div>
                        <div style={{
                          background: `rgba(59, 130, 246, ${suggestion.confidence_score / 500})`,
                          color: '#3b82f6',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '6px',
                          fontSize: '0.7rem',
                          fontWeight: '600'
                        }}>
                          {suggestion.confidence_score}% Confidence
                        </div>
                      </div>
                      <div style={{
                        color: '#00ff88',
                        fontSize: '1.1rem',
                        fontWeight: '700'
                      }}>
                        {formatCurrency(suggestion.amount_inr)}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        textAlign: 'center',
                        flex: 1
                      }}>
                        📤 {suggestion.from_person}
                      </div>
                      <div style={{
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '1.2rem'
                      }}>
                        →
                      </div>
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: '#10b981',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        textAlign: 'center',
                        flex: 1
                      }}>
                        📥 {suggestion.to_person}
                      </div>
                    </div>

                    <div style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '0.85rem',
                      lineHeight: '1.4'
                    }}>
                      {suggestion.purpose}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}