'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './contacts.module.css';

interface Contact {
  id: string;
  name: string;
  email: string;
  niche?: string;
  website?: string;
  clientType?: string;
  dateInteraction?: string;
  priceRange?: string;
  orderStatus?: string;
  confidence?: number;
  notes?: string;
  tags?: string[];
  created: string;
  lastActivity?: string;
}

export default function ContactsPage() {
  const router = useRouter();
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [contactsPerPage] = useState(20);
  const [loading, setLoading] = useState(true);
  const [totalContacts, setTotalContacts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [filterCounts, setFilterCounts] = useState({
    all: 0,
    qualified: 0,
    negotiation: 0,
    proposalSent: 0,
    followUp: 0,
    highValue: 0
  });

  // Fetch contacts from API
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: contactsPerPage.toString(),
        search: searchTerm,
        filter: selectedFilter
      });

      const response = await fetch(`/api/mailforge/contacts?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch contacts');
      }

      setContacts(result.data);
      setFilteredContacts(result.data);
      setTotalContacts(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
      
      // Update filter counts
      setFilterCounts(prev => ({
        ...prev,
        all: result.pagination.total,
        highValue: result.filters.highValueCount || 0
      }));

    } catch (error) {
      console.error('Error fetching contacts:', error);
      alert('Failed to load contacts: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [currentPage, searchTerm, selectedFilter]);

  // Fetch filter counts on initial load
  useEffect(() => {
    const fetchFilterCounts = async () => {
      try {
        const [qualifiedRes, negotiationRes, proposalRes, followUpRes] = await Promise.all([
          fetch('/api/mailforge/contacts?filter=qualified&limit=1'),
          fetch('/api/mailforge/contacts?filter=negotiation&limit=1'),
          fetch('/api/mailforge/contacts?filter=proposal-sent&limit=1'),
          fetch('/api/mailforge/contacts?filter=follow-up&limit=1')
        ]);

        const [qualified, negotiation, proposal, followUp] = await Promise.all([
          qualifiedRes.json(),
          negotiationRes.json(),
          proposalRes.json(),
          followUpRes.json()
        ]);

        setFilterCounts(prev => ({
          ...prev,
          qualified: qualified.pagination?.total || 0,
          negotiation: negotiation.pagination?.total || 0,
          proposalSent: proposal.pagination?.total || 0,
          followUp: followUp.pagination?.total || 0
        }));
      } catch (error) {
        console.error('Error fetching filter counts:', error);
      }
    };

    fetchFilterCounts();
  }, []);

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    const contactIds = Array.from(selectedContacts);
    
    try {
      let response;
      switch (action) {
        case 'delete':
          response = await fetch(`/api/mailforge/contacts?ids=${contactIds.join(',')}`, {
            method: 'DELETE'
          });
          break;
        case 'add_tag':
          // TODO: Implement tag addition
          alert('Tag functionality coming soon!');
          return;
        case 'update_status':
          // TODO: Implement status update
          alert('Status update functionality coming soon!');
          return;
        default:
          return;
      }

      if (response) {
        const result = await response.json();
        if (response.ok) {
          alert(`Successfully processed ${result.deleted || result.updated || 0} contacts`);
          setSelectedContacts(new Set());
          setShowBulkActions(false);
          fetchContacts(); // Refresh data
        } else {
          throw new Error(result.error);
        }
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      alert('Action failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleSelectContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = () => {
    const currentPageContacts = getCurrentPageContacts();
    const allSelected = currentPageContacts.every(contact => selectedContacts.has(contact.id));
    
    const newSelected = new Set(selectedContacts);
    if (allSelected) {
      currentPageContacts.forEach(contact => newSelected.delete(contact.id));
    } else {
      currentPageContacts.forEach(contact => newSelected.add(contact.id));
    }
    setSelectedContacts(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const getCurrentPageContacts = () => {
    // Since API handles pagination, just return the current contacts
    return filteredContacts;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Qualified': return '#00ff88';
      case 'Negotiation': return '#00d4ff';
      case 'Proposal sent': return '#ffd93d';
      case 'Follow-up needed': return '#ff6b6b';
      default: return '#a78bfa';
    }
  };

  const getClientTypeIcon = (type: string) => {
    return type === 'Direct Client' ? '👤' : '🏢';
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Contact Management</h1>
          <p className={styles.subtitle}>
            Manage your imported leads and contacts ({totalContacts} total)
            {loading && ' - Loading...'}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button 
            onClick={() => router.push('/dashboard/mailforge/import')}
            className={styles.importButton}
          >
            📥 Import Contacts
          </button>
          <button 
            onClick={() => router.push('/dashboard/mailforge')}
            className={styles.backButton}
          >
            ← Back to MailForge
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className={styles.filtersSection}>
        <div className={styles.searchBar}>
          <div className={styles.searchIcon}>🔍</div>
          <input
            type="text"
            placeholder="Search contacts by name, email, or niche..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        
        <div className={styles.filterTabs}>
          {[
            { key: 'all', label: 'All Contacts', count: filterCounts.all },
            { key: 'qualified', label: 'Qualified', count: filterCounts.qualified },
            { key: 'negotiation', label: 'Negotiation', count: filterCounts.negotiation },
            { key: 'proposal-sent', label: 'Proposal Sent', count: filterCounts.proposalSent },
            { key: 'follow-up', label: 'Follow-up', count: filterCounts.followUp },
            { key: 'high-value', label: 'High Value', count: filterCounts.highValue }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSelectedFilter(tab.key)}
              className={`${styles.filterTab} ${selectedFilter === tab.key ? styles.active : ''}`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {showBulkActions && (
        <div className={styles.bulkActions}>
          <div className={styles.bulkActionsContent}>
            <span className={styles.selectedCount}>
              {selectedContacts.size} contacts selected
            </span>
            <div className={styles.bulkButtons}>
              <button className={styles.bulkButton} onClick={() => alert('Send Email coming soon!')}>📧 Send Email</button>
              <button className={styles.bulkButton} onClick={() => handleBulkAction('add_tag')}>🏷️ Add Tags</button>
              <button className={styles.bulkButton} onClick={() => alert('Add to Campaign coming soon!')}>📁 Add to Campaign</button>
              <button className={styles.bulkButton} onClick={() => handleBulkAction('delete')}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Contacts Table */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <p>Loading contacts...</p>
          </div>
        ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.contactsTable}>
            <thead>
              <tr>
                <th className={styles.checkboxHeader}>
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={getCurrentPageContacts().length > 0 && getCurrentPageContacts().every(contact => selectedContacts.has(contact.id))}
                    className={styles.checkbox}
                  />
                </th>
                <th>Contact</th>
                <th>Niche/Service</th>
                <th>Client Type</th>
                <th>Status</th>
                <th>Value</th>
                <th>Last Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getCurrentPageContacts().map((contact) => (
                <tr key={contact.id} className={styles.contactRow}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedContacts.has(contact.id)}
                      onChange={() => handleSelectContact(contact.id)}
                      className={styles.checkbox}
                    />
                  </td>
                  <td className={styles.contactInfo}>
                    <div className={styles.contactDetails}>
                      <div className={styles.contactName}>{contact.name}</div>
                      <div className={styles.contactEmail}>{contact.email}</div>
                      {contact.website && (
                        <div className={styles.contactWebsite}>
                          <a href={contact.website} target="_blank" rel="noopener noreferrer">
                            {contact.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className={styles.nicheCell}>
                    <div className={styles.nicheTag}>{contact.niche}</div>
                  </td>
                  <td className={styles.clientType}>
                    <span className={styles.clientTypeIcon}>
                      {getClientTypeIcon(contact.clientType || '')}
                    </span>
                    {contact.clientType}
                  </td>
                  <td>
                    <span 
                      className={styles.statusBadge}
                      style={{ 
                        background: `${getStatusBadgeColor(contact.orderStatus || '')}20`,
                        color: getStatusBadgeColor(contact.orderStatus || ''),
                        border: `1px solid ${getStatusBadgeColor(contact.orderStatus || '')}40`
                      }}
                    >
                      {contact.orderStatus}
                    </span>
                  </td>
                  <td className={styles.priceRange}>
                    {contact.priceRange && contact.priceRange !== 'Not specified' ? (
                      <span className={styles.priceValue}>{contact.priceRange}</span>
                    ) : (
                      <span className={styles.priceNotSpecified}>Not specified</span>
                    )}
                  </td>
                  <td className={styles.lastActivity}>{contact.lastActivity}</td>
                  <td className={styles.actions}>
                    <button className={styles.actionButton} title="Send Email">📧</button>
                    <button className={styles.actionButton} title="Edit Contact">✏️</button>
                    <button className={styles.actionButton} title="View Details">👁️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={styles.pageButton}
            >
              ← Previous
            </button>
            
            <div className={styles.pageNumbers}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`${styles.pageNumber} ${currentPage === pageNum ? styles.active : ''}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={styles.pageButton}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredContacts.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📭</div>
          <h3 className={styles.emptyTitle}>No contacts found</h3>
          <p className={styles.emptyDescription}>
            {searchTerm || selectedFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Import your first contacts to get started'
            }
          </p>
          {(!searchTerm && selectedFilter === 'all') && (
            <button 
              onClick={() => router.push('/dashboard/mailforge/import')}
              className={styles.emptyAction}
            >
              📥 Import Contacts
            </button>
          )}
        </div>
      )}
    </div>
  );
}