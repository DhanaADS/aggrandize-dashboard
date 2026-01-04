// Transaction Matching Service
// Matches bank transactions with subscriptions using multi-factor scoring

import { BankTransaction, TransactionMatch, MatchingResult, MatchScore, PlatformMatchingRule } from '@/types/bank-statements';
import { Subscription } from '@/types/finance';

// Matching thresholds
const HIGH_CONFIDENCE = 80;
const MEDIUM_CONFIDENCE = 60;
const LOW_CONFIDENCE = 40;

/**
 * Calculate match score between a transaction and subscription
 */
export function calculateMatchScore(
  transaction: BankTransaction,
  subscription: Subscription,
  rules: PlatformMatchingRule[]
): MatchScore {
  let platformNameScore = 0;
  let amountScore = 0;
  let dateProximityScore = 0;
  let patternScore = 0;

  // 1. Platform Name Matching (40 points max)
  const txDesc = (transaction.normalized_description || transaction.description).toUpperCase();
  const platform = subscription.platform.toUpperCase();

  if (txDesc.includes(platform)) {
    // Exact match
    platformNameScore = 40;
  } else {
    // Check matching rules
    const rule = rules.find(
      r => r.platform_name.toUpperCase() === platform && r.is_active
    );

    if (rule) {
      const patterns = rule.match_patterns.split('|');
      for (const pattern of patterns) {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(txDesc)) {
          patternScore = 10;
          platformNameScore = 30;
          break;
        }
      }
    }

    // Fuzzy/partial match
    const platformWords = platform.split(' ');
    const matchedWords = platformWords.filter(word =>
      word.length > 2 && txDesc.includes(word)
    );

    if (matchedWords.length > 0) {
      platformNameScore = Math.max(
        platformNameScore,
        20 + (matchedWords.length / platformWords.length) * 15
      );
    }
  }

  // 2. Amount Matching (30 points max)
  const txAmount = Math.abs(transaction.amount);
  const subAmount = subscription.amount_inr;

  if (Math.abs(txAmount - subAmount) < 0.01) {
    // Exact match
    amountScore = 30;
  } else {
    const percentDiff = Math.abs(txAmount - subAmount) / subAmount;

    if (percentDiff <= 0.05) {
      // Within 5%
      amountScore = 20;
    } else if (percentDiff <= 0.10) {
      // Within 10%
      amountScore = 10;
    }
  }

  // 3. Date Proximity (20 points max)
  const txDate = new Date(transaction.transaction_date);
  const dueDate = new Date(subscription.due_date);
  const daysDiff = Math.abs(
    (txDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysDiff <= 3) {
    dateProximityScore = 20;
  } else if (daysDiff <= 7) {
    dateProximityScore = 15;
  } else if (daysDiff <= 14) {
    dateProximityScore = 10;
  } else if (txDate.getMonth() === dueDate.getMonth()) {
    // Same month
    dateProximityScore = 5;
  }

  // Calculate total score
  const totalScore = platformNameScore + amountScore + dateProximityScore + patternScore;

  // Determine confidence level
  let confidence: 'high' | 'medium' | 'low';
  if (totalScore >= HIGH_CONFIDENCE) {
    confidence = 'high';
  } else if (totalScore >= MEDIUM_CONFIDENCE) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    platformNameScore,
    amountScore,
    dateProximityScore,
    patternScore,
    totalScore,
    confidence,
  };
}

/**
 * Find the best matching subscription for a transaction
 */
export function findBestMatch(
  transaction: BankTransaction,
  subscriptions: Subscription[],
  rules: PlatformMatchingRule[]
): TransactionMatch | null {
  // Only match debit transactions with active, auto-renewal subscriptions
  if (transaction.transaction_type !== 'debit') {
    return null;
  }

  const activeAutoRenewalSubs = subscriptions.filter(
    sub => sub.is_active && sub.auto_renewal
  );

  if (activeAutoRenewalSubs.length === 0) {
    return null;
  }

  let bestMatch: TransactionMatch | null = null;
  let bestScore = 0;

  for (const subscription of activeAutoRenewalSubs) {
    const score = calculateMatchScore(transaction, subscription, rules);

    if (score.totalScore >= LOW_CONFIDENCE && score.totalScore > bestScore) {
      const reasons: string[] = [];

      if (score.platformNameScore >= 20) {
        reasons.push(`Platform name match (${score.platformNameScore} pts)`);
      }
      if (score.amountScore >= 10) {
        reasons.push(`Amount match (${score.amountScore} pts)`);
      }
      if (score.dateProximityScore >= 5) {
        reasons.push(`Date proximity (${score.dateProximityScore} pts)`);
      }
      if (score.patternScore > 0) {
        reasons.push(`Pattern match (${score.patternScore} pts)`);
      }

      let matchType: 'exact_name' | 'partial_name' | 'amount_date' | 'pattern';
      if (score.platformNameScore === 40) {
        matchType = 'exact_name';
      } else if (score.patternScore > 0) {
        matchType = 'pattern';
      } else if (score.platformNameScore > 0) {
        matchType = 'partial_name';
      } else {
        matchType = 'amount_date';
      }

      bestMatch = {
        transaction_id: transaction.id,
        subscription_id: subscription.id,
        confidence: score.totalScore / 100,
        match_type: matchType,
        reasons,
      };

      bestScore = score.totalScore;
    }
  }

  return bestMatch;
}

/**
 * Match all transactions against subscriptions
 */
export function matchTransactions(
  transactions: BankTransaction[],
  subscriptions: Subscription[],
  rules: PlatformMatchingRule[]
): MatchingResult {
  const matches: TransactionMatch[] = [];
  const suggestions: TransactionMatch[] = [];
  let matchedCount = 0;

  for (const transaction of transactions) {
    // Skip already matched transactions
    if (transaction.match_status === 'matched' || transaction.match_status === 'ignored') {
      continue;
    }

    const bestMatch = findBestMatch(transaction, subscriptions, rules);

    if (bestMatch) {
      if (bestMatch.confidence >= 0.8) {
        // High confidence - auto-match
        matches.push(bestMatch);
        matchedCount++;
      } else if (bestMatch.confidence >= 0.6) {
        // Medium confidence - suggest for review
        suggestions.push(bestMatch);
      }
    }
  }

  return {
    total_transactions: transactions.length,
    matched_count: matchedCount,
    unmatched_count: transactions.length - matchedCount,
    matches,
    suggestions,
  };
}

/**
 * Generate match reason explanation
 */
export function generateMatchReason(
  transaction: BankTransaction,
  subscription: Subscription,
  score: MatchScore
): string {
  const parts: string[] = [];

  if (score.platformNameScore >= 30) {
    parts.push(`Strong platform name match with ${subscription.platform}`);
  } else if (score.platformNameScore > 0) {
    parts.push(`Partial platform name match with ${subscription.platform}`);
  }

  if (score.amountScore === 30) {
    parts.push(`Exact amount match: ₹${transaction.amount}`);
  } else if (score.amountScore > 0) {
    parts.push(
      `Close amount match: ₹${transaction.amount} ≈ ₹${subscription.amount_inr}`
    );
  }

  if (score.dateProximityScore >= 15) {
    parts.push(`Transaction date close to due date (${subscription.due_date})`);
  } else if (score.dateProximityScore > 0) {
    parts.push(`Transaction in same period as subscription`);
  }

  if (score.patternScore > 0) {
    parts.push(`Matched against platform detection pattern`);
  }

  return parts.join('. ') + `.`;
}
