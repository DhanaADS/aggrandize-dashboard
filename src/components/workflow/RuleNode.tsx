'use client';

import { useState } from 'react';
import FlowchartNode, { FlowchartNodeProps } from './FlowchartNode';
import styles from './workflow.module.css';

export interface Rule {
  id: string;
  type: 'contains' | 'not_contains' | 'regex' | 'starts_with' | 'ends_with';
  value: string;
  caseSensitive: boolean;
}

export interface RuleNodeProps extends Omit<FlowchartNodeProps, 'children'> {
  ruleType: 'title' | 'body' | 'url';
  rules: Rule[];
  logic: 'AND' | 'OR';
  onRulesChange?: (rules: Rule[]) => void;
  onLogicChange?: (logic: 'AND' | 'OR') => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export default function RuleNode({
  ruleType,
  rules,
  logic,
  onRulesChange,
  onLogicChange,
  isExpanded = false,
  onToggleExpand,
  ...nodeProps
}: RuleNodeProps) {
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [newRule, setNewRule] = useState<Partial<Rule>>({
    type: 'contains',
    value: '',
    caseSensitive: false
  });

  const addRule = () => {
    if (!newRule.value?.trim()) return;

    const rule: Rule = {
      id: Date.now().toString(),
      type: newRule.type as Rule['type'],
      value: newRule.value.trim(),
      caseSensitive: newRule.caseSensitive || false
    };

    if (onRulesChange) {
      onRulesChange([...rules, rule]);
    }

    setNewRule({
      type: 'contains',
      value: '',
      caseSensitive: false
    });
  };

  const updateRule = (id: string, updates: Partial<Rule>) => {
    if (onRulesChange) {
      onRulesChange(rules.map(rule => 
        rule.id === id ? { ...rule, ...updates } : rule
      ));
    }
  };

  const removeRule = (id: string) => {
    if (onRulesChange) {
      onRulesChange(rules.filter(rule => rule.id !== id));
    }
  };
  
  const handleInteractiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const getRuleIcon = () => {
    switch (ruleType) {
      case 'title': return '📝';
      case 'body': return '📄';
      case 'url': return '🔗';
      default: return '📋';
    }
  };

  const getRuleTitle = () => {
    switch (ruleType) {
      case 'title': return 'Title Rules';
      case 'body': return 'Body Content Rules';
      case 'url': return 'URL Pattern Rules';
      default: return 'Rules';
    }
  };

  const ruleTypeOptions = [
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'regex', label: 'Regex pattern' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' }
  ];

  return (
    <FlowchartNode
      {...nodeProps}
      icon={getRuleIcon()}
      title={getRuleTitle()}
      subtitle={`${rules.length} rule${rules.length !== 1 ? 's' : ''} • ${logic} logic`}
      onNodeClick={() => onToggleExpand?.()}
    >
      {isExpanded && (
        <div className={styles.ruleEditor} onMouseDown={handleInteractiveClick}>
          {/* Logic selector */}
          <div className={styles.logicSelector}>
            <label className={styles.logicLabel}>Rule Logic:</label>
            <div className={styles.logicButtons}>
              <button
                className={`${styles.logicButton} ${logic === 'AND' ? styles.active : ''}`}
                onClick={() => onLogicChange?.('AND')}
              >
                AND
              </button>
              <button
                className={`${styles.logicButton} ${logic === 'OR' ? styles.active : ''}`}
                onClick={() => onLogicChange?.('OR')}
              >
                OR
              </button>
            </div>
          </div>

          {/* Existing rules */}
          <div className={styles.existingRules}>
            {rules.map((rule, index) => (
              <div key={rule.id} className={styles.ruleItem}>
                {index > 0 && (
                  <div className={styles.ruleConnector}>
                    {logic}
                  </div>
                )}
                
                <div className={styles.ruleContent}>
                  {editingRule === rule.id ? (
                    // Edit mode
                    <div className={styles.ruleEditForm}>
                      <select
                        value={rule.type}
                        onChange={(e) => updateRule(rule.id, { type: e.target.value as Rule['type'] })}
                        className={styles.ruleTypeSelect}
                      >
                        {ruleTypeOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      
                      <input
                        type="text"
                        value={rule.value}
                        onChange={(e) => updateRule(rule.id, { value: e.target.value })}
                        className={styles.ruleValueInput}
                        placeholder="Enter pattern..."
                      />
                      
                      <label className={styles.caseSensitiveLabel}>
                        <input
                          type="checkbox"
                          checked={rule.caseSensitive}
                          onChange={(e) => updateRule(rule.id, { caseSensitive: e.target.checked })}
                        />
                        Case sensitive
                      </label>
                      
                      <div className={styles.ruleActions}>
                        <button
                          onClick={() => setEditingRule(null)}
                          className={styles.saveRuleButton}
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <div className={styles.ruleDisplay}>
                      <span className={styles.ruleTypeDisplay}>
                        {ruleTypeOptions.find(opt => opt.value === rule.type)?.label}
                      </span>
                      <span className={styles.ruleValueDisplay}>
                        "{rule.value}"
                      </span>
                      {rule.caseSensitive && (
                        <span className={styles.caseSensitiveFlag}>Case sensitive</span>
                      )}
                      
                      <div className={styles.ruleActions}>
                        <button
                          onClick={() => setEditingRule(rule.id)}
                          className={styles.editRuleButton}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => removeRule(rule.id)}
                          className={styles.removeRuleButton}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add new rule */}
          <div className={styles.addRuleForm}>
            <h5 className={styles.addRuleTitle}>Add New Rule</h5>
            
            <div className={styles.newRuleInputs}>
              <select
                value={newRule.type || 'contains'}
                onChange={(e) => setNewRule(prev => ({ ...prev, type: e.target.value as Rule['type'] }))}
                className={styles.ruleTypeSelect}
              >
                {ruleTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              <input
                type="text"
                value={newRule.value || ''}
                onChange={(e) => setNewRule(prev => ({ ...prev, value: e.target.value }))}
                placeholder="Enter pattern..."
                className={styles.ruleValueInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addRule();
                  }
                }}
              />
              
              <label className={styles.caseSensitiveLabel}>
                <input
                  type="checkbox"
                  checked={newRule.caseSensitive || false}
                  onChange={(e) => setNewRule(prev => ({ ...prev, caseSensitive: e.target.checked }))}
                />
                Case sensitive
              </label>
            </div>
            
            <button
              onClick={addRule}
              disabled={!newRule.value?.trim()}
              className={styles.addRuleButton}
            >
              + Add Rule
            </button>
          </div>
        </div>
      )}
    </FlowchartNode>
  );
}