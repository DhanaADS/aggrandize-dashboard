'use client';

import React from 'react';
import styles from './workflow-editor.module.css';

interface ConfigFormProps {
  nodeType: string;
  nodeData: any;
  onUpdate: (data: any) => void;
}

export function HttpRequestConfig({ nodeData, onUpdate }: ConfigFormProps) {
  return (
    <>
      <div className={styles.settingGroup}>
        <label>URL</label>
        <input 
          type="url" 
          placeholder="https://api.example.com/data"
          defaultValue={nodeData.url || ''}
          onChange={(e) => onUpdate({ ...nodeData, url: e.target.value })}
          className={styles.input}
        />
      </div>
      <div className={styles.settingGroup}>
        <label>Method</label>
        <select 
          className={styles.select}
          defaultValue={nodeData.method || 'GET'}
          onChange={(e) => onUpdate({ ...nodeData, method: e.target.value })}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </select>
      </div>
      <div className={styles.settingGroup}>
        <label>Headers</label>
        <textarea 
          placeholder='{"Content-Type": "application/json"}'
          defaultValue={nodeData.headers || ''}
          onChange={(e) => onUpdate({ ...nodeData, headers: e.target.value })}
          className={styles.textarea}
        />
      </div>
      <div className={styles.settingGroup}>
        <label>Request Body</label>
        <textarea 
          placeholder="Request body (for POST/PUT requests)"
          defaultValue={nodeData.body || ''}
          onChange={(e) => onUpdate({ ...nodeData, body: e.target.value })}
          className={styles.textarea}
        />
      </div>
    </>
  );
}

export function WebScraperConfig({ nodeData, onUpdate }: ConfigFormProps) {
  return (
    <>
      <div className={styles.settingGroup}>
        <label>Target URL</label>
        <input 
          type="url" 
          placeholder="https://example.com"
          defaultValue={nodeData.url || ''}
          onChange={(e) => onUpdate({ ...nodeData, url: e.target.value })}
          className={styles.input}
        />
      </div>
      <div className={styles.settingGroup}>
        <label>CSS Selector</label>
        <input 
          type="text" 
          placeholder=".title, #content, article"
          defaultValue={nodeData.selector || ''}
          onChange={(e) => onUpdate({ ...nodeData, selector: e.target.value })}
          className={styles.input}
        />
      </div>
      <div className={styles.settingGroup}>
        <label>Wait for Element (seconds)</label>
        <input 
          type="number" 
          placeholder="5"
          min="0"
          max="60"
          defaultValue={nodeData.waitTime || 5}
          onChange={(e) => onUpdate({ ...nodeData, waitTime: parseInt(e.target.value) })}
          className={styles.input}
        />
      </div>
      <div className={styles.settingGroup}>
        <label>Extract Attribute</label>
        <select 
          className={styles.select}
          defaultValue={nodeData.attribute || 'text'}
          onChange={(e) => onUpdate({ ...nodeData, attribute: e.target.value })}
        >
          <option value="text">Text Content</option>
          <option value="href">Link (href)</option>
          <option value="src">Image (src)</option>
          <option value="innerHTML">HTML Content</option>
        </select>
      </div>
    </>
  );
}

export function EmailConfig({ nodeData, onUpdate }: ConfigFormProps) {
  return (
    <>
      <div className={styles.settingGroup}>
        <label>To Email</label>
        <input 
          type="email" 
          placeholder="recipient@example.com"
          defaultValue={nodeData.to || ''}
          onChange={(e) => onUpdate({ ...nodeData, to: e.target.value })}
          className={styles.input}
        />
      </div>
      <div className={styles.settingGroup}>
        <label>Subject</label>
        <input 
          type="text" 
          placeholder="Email subject"
          defaultValue={nodeData.subject || ''}
          onChange={(e) => onUpdate({ ...nodeData, subject: e.target.value })}
          className={styles.input}
        />
      </div>
      <div className={styles.settingGroup}>
        <label>Email Body</label>
        <textarea 
          placeholder="Email content..."
          defaultValue={nodeData.body || ''}
          onChange={(e) => onUpdate({ ...nodeData, body: e.target.value })}
          className={styles.textarea}
          rows={6}
        />
      </div>
      <div className={styles.settingGroup}>
        <label>Email Type</label>
        <select 
          className={styles.select}
          defaultValue={nodeData.type || 'text'}
          onChange={(e) => onUpdate({ ...nodeData, type: e.target.value })}
        >
          <option value="text">Plain Text</option>
          <option value="html">HTML</option>
        </select>
      </div>
    </>
  );
}

export function WhatsAppConfig({ nodeData, onUpdate }: ConfigFormProps) {
  return (
    <>
      <div className={styles.settingGroup}>
        <label>Phone Number</label>
        <input 
          type="tel" 
          placeholder="+1234567890"
          defaultValue={nodeData.phone || ''}
          onChange={(e) => onUpdate({ ...nodeData, phone: e.target.value })}
          className={styles.input}
        />
      </div>
      <div className={styles.settingGroup}>
        <label>Message</label>
        <textarea 
          placeholder="WhatsApp message content..."
          defaultValue={nodeData.message || ''}
          onChange={(e) => onUpdate({ ...nodeData, message: e.target.value })}
          className={styles.textarea}
          rows={4}
        />
      </div>
      <div className={styles.settingGroup}>
        <label>API Token</label>
        <input 
          type="password" 
          placeholder="Your WhatsApp API token"
          defaultValue={nodeData.token || ''}
          onChange={(e) => onUpdate({ ...nodeData, token: e.target.value })}
          className={styles.input}
        />
      </div>
    </>
  );
}

export function TelegramConfig({ nodeData, onUpdate }: ConfigFormProps) {
  return (
    <>
      <div className={styles.settingGroup}>
        <label>Chat ID</label>
        <input 
          type="text" 
          placeholder="@channel or chat_id"
          defaultValue={nodeData.chatId || ''}
          onChange={(e) => onUpdate({ ...nodeData, chatId: e.target.value })}
          className={styles.input}
        />
      </div>
      <div className={styles.settingGroup}>
        <label>Message</label>
        <textarea 
          placeholder="Telegram message content..."
          defaultValue={nodeData.message || ''}
          onChange={(e) => onUpdate({ ...nodeData, message: e.target.value })}
          className={styles.textarea}
          rows={4}
        />
      </div>
      <div className={styles.settingGroup}>
        <label>Bot Token</label>
        <input 
          type="password" 
          placeholder="Your Telegram bot token"
          defaultValue={nodeData.botToken || ''}
          onChange={(e) => onUpdate({ ...nodeData, botToken: e.target.value })}
          className={styles.input}
        />
      </div>
      <div className={styles.settingGroup}>
        <label>Parse Mode</label>
        <select 
          className={styles.select}
          defaultValue={nodeData.parseMode || 'text'}
          onChange={(e) => onUpdate({ ...nodeData, parseMode: e.target.value })}
        >
          <option value="text">Plain Text</option>
          <option value="Markdown">Markdown</option>
          <option value="HTML">HTML</option>
        </select>
      </div>
    </>
  );
}

export function ScheduleConfig({ nodeData, onUpdate }: ConfigFormProps) {
  return (
    <>
      <div className={styles.settingGroup}>
        <label>Schedule Type</label>
        <select 
          className={styles.select}
          defaultValue={nodeData.scheduleType || 'interval'}
          onChange={(e) => onUpdate({ ...nodeData, scheduleType: e.target.value })}
        >
          <option value="interval">Interval</option>
          <option value="cron">Cron Expression</option>
          <option value="once">Run Once</option>
        </select>
      </div>
      
      {nodeData.scheduleType === 'interval' && (
        <>
          <div className={styles.settingGroup}>
            <label>Interval Value</label>
            <input 
              type="number" 
              placeholder="5"
              min="1"
              defaultValue={nodeData.intervalValue || 5}
              onChange={(e) => onUpdate({ ...nodeData, intervalValue: parseInt(e.target.value) })}
              className={styles.input}
            />
          </div>
          <div className={styles.settingGroup}>
            <label>Interval Unit</label>
            <select 
              className={styles.select}
              defaultValue={nodeData.intervalUnit || 'minutes'}
              onChange={(e) => onUpdate({ ...nodeData, intervalUnit: e.target.value })}
            >
              <option value="seconds">Seconds</option>
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
        </>
      )}
      
      {nodeData.scheduleType === 'cron' && (
        <div className={styles.settingGroup}>
          <label>Cron Expression</label>
          <input 
            type="text" 
            placeholder="0 0 * * *"
            defaultValue={nodeData.cronExpression || ''}
            onChange={(e) => onUpdate({ ...nodeData, cronExpression: e.target.value })}
            className={styles.input}
          />
          <small style={{ color: '#666', fontSize: '12px' }}>
            Format: minute hour day month weekday
          </small>
        </div>
      )}
      
      {nodeData.scheduleType === 'once' && (
        <div className={styles.settingGroup}>
          <label>Run At</label>
          <input 
            type="datetime-local" 
            defaultValue={nodeData.runAt || ''}
            onChange={(e) => onUpdate({ ...nodeData, runAt: e.target.value })}
            className={styles.input}
          />
        </div>
      )}
    </>
  );
}

export function DataFilterConfig({ nodeData, onUpdate }: ConfigFormProps) {
  return (
    <>
      <div className={styles.settingGroup}>
        <label>Filter Type</label>
        <select 
          className={styles.select}
          defaultValue={nodeData.filterType || 'contains'}
          onChange={(e) => onUpdate({ ...nodeData, filterType: e.target.value })}
        >
          <option value="contains">Contains</option>
          <option value="equals">Equals</option>
          <option value="startsWith">Starts With</option>
          <option value="endsWith">Ends With</option>
          <option value="regex">Regular Expression</option>
          <option value="length">Length</option>
        </select>
      </div>
      <div className={styles.settingGroup}>
        <label>Field Path</label>
        <input 
          type="text" 
          placeholder="data.title or data[0].name"
          defaultValue={nodeData.fieldPath || ''}
          onChange={(e) => onUpdate({ ...nodeData, fieldPath: e.target.value })}
          className={styles.input}
        />
      </div>
      <div className={styles.settingGroup}>
        <label>Filter Value</label>
        <input 
          type="text" 
          placeholder="Value to filter by"
          defaultValue={nodeData.filterValue || ''}
          onChange={(e) => onUpdate({ ...nodeData, filterValue: e.target.value })}
          className={styles.input}
        />
      </div>
      <div className={styles.settingGroup}>
        <label>Case Sensitive</label>
        <select 
          className={styles.select}
          defaultValue={nodeData.caseSensitive ? 'true' : 'false'}
          onChange={(e) => onUpdate({ ...nodeData, caseSensitive: e.target.value === 'true' })}
        >
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </div>
    </>
  );
}

// Configuration form mapper
export const configForms = {
  'http-request': HttpRequestConfig,
  'web-scraper': WebScraperConfig,
  'email-send': EmailConfig,
  'whatsapp-send': WhatsAppConfig,
  'telegram-send': TelegramConfig,
  'schedule': ScheduleConfig,
  'data-filter': DataFilterConfig,
};