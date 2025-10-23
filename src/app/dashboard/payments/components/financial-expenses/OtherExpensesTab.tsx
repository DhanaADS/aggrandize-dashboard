'use client';

import React from 'react';
import styles from './OtherExpensesTab.module.css';

export function OtherExpensesTab() {
  return (
    <div className={styles.container}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.tableHeader}>
              <th className={styles.th}>S No</th>
              <th className={styles.th}>Platform</th>
              <th className={styles.th}>Plan</th>
              <th className={styles.th}>Purpose</th>
              <th className={styles.th}>Amount ₹/$</th>
              <th className={styles.th}>Payment Method</th>
              <th className={styles.th}>Renewal Cycle</th>
              <th className={styles.th}>Next Due Date</th>
              <th className={styles.th}>Auto-Renew?</th>
              <th className={styles.th}>Filter</th>
              <th className={styles.th}>Used By</th>
              <th className={styles.th}>Paid By</th>
            </tr>
          </thead>
          <tbody>
            <tr className={styles.tr}>
              <td className={styles.td}>1</td>
              <td className={styles.td}>StreamFlix</td>
              <td className={styles.tdSecondary}>Premium</td>
              <td className={styles.tdSecondary}>Entertainment</td>
              <td className={styles.tdSecondary}>₹199</td>
              <td className={styles.tdSecondary}>Credit Card</td>
              <td className={styles.td}>
                <button className={styles.button}>
                  <span className={styles.buttonText}>Monthly</span>
                </button>
              </td>
              <td className={styles.tdSecondary}>2024-08-15</td>
              <td className={styles.td}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                />
              </td>
              <td className={styles.tdSecondary}>Entertainment</td>
              <td className={styles.tdSecondary}>Clara</td>
              <td className={styles.tdSecondary}>Clara</td>
            </tr>
            <tr className={styles.tr}>
              <td className={styles.td}>2</td>
              <td className={styles.td}>CloudDrive</td>
              <td className={styles.tdSecondary}>Basic</td>
              <td className={styles.tdSecondary}>Storage</td>
              <td className={styles.tdSecondary}>$9.99</td>
              <td className={styles.tdSecondary}>PayPal</td>
              <td className={styles.td}>
                <button className={styles.button}>
                  <span className={styles.buttonText}>Yearly</span>
                </button>
              </td>
              <td className={styles.tdSecondary}>2025-01-20</td>
              <td className={styles.td}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                />
              </td>
              <td className={styles.tdSecondary}>Productivity</td>
              <td className={styles.tdSecondary}>Owen</td>
              <td className={styles.tdSecondary}>Owen</td>
            </tr>
            <tr className={styles.tr}>
              <td className={styles.td}>3</td>
              <td className={styles.td}>MusicStream</td>
              <td className={styles.tdSecondary}>Family</td>
              <td className={styles.tdSecondary}>Music</td>
              <td className={styles.tdSecondary}>₹299</td>
              <td className={styles.tdSecondary}>Debit Card</td>
              <td className={styles.td}>
                <button className={styles.button}>
                  <span className={styles.buttonText}>Monthly</span>
                </button>
              </td>
              <td className={styles.tdSecondary}>2024-08-22</td>
              <td className={styles.td}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                />
              </td>
              <td className={styles.tdSecondary}>Entertainment</td>
              <td className={styles.tdSecondary}>Team</td>
              <td className={styles.tdSecondary}>Team</td>
            </tr>
            <tr className={styles.tr}>
              <td className={styles.td}>4</td>
              <td className={styles.td}>DesignPro</td>
              <td className={styles.tdSecondary}>Pro</td>
              <td className={styles.tdSecondary}>Design</td>
              <td className={styles.tdSecondary}>$19.99</td>
              <td className={styles.tdSecondary}>Credit Card</td>
              <td className={styles.td}>
                <button className={styles.button}>
                  <span className={styles.buttonText}>Quarterly</span>
                </button>
              </td>
              <td className={styles.tdSecondary}>2024-09-10</td>
              <td className={styles.td}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                />
              </td>
              <td className={styles.tdSecondary}>Productivity</td>
              <td className={styles.tdSecondary}>Isabella</td>
              <td className={styles.tdSecondary}>Isabella</td>
            </tr>
            <tr className={styles.tr}>
              <td className={styles.td}>5</td>
              <td className={styles.td}>NewsToday</td>
              <td className={styles.tdSecondary}>Premium</td>
              <td className={styles.tdSecondary}>News</td>
              <td className={styles.tdSecondary}>₹99</td>
              <td className={styles.tdSecondary}>UPI</td>
              <td className={styles.td}>
                <button className={styles.button}>
                  <span className={styles.buttonText}>Monthly</span>
                </button>
              </td>
              <td className={styles.tdSecondary}>2024-08-28</td>
              <td className={styles.td}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                />
              </td>
              <td className={styles.tdSecondary}>Information</td>
              <td className={styles.tdSecondary}>Noah</td>
              <td className={styles.tdSecondary}>Noah</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className={styles.addButtonWrapper}>
        <button className={styles.addButton}>
          <div className={styles.addButtonIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" fill="currentColor" viewBox="0 0 256 256">
              <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path>
            </svg>
          </div>
          <span className="truncate">Add Expenses</span>
        </button>
      </div>
    </div>
  );
}
