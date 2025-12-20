# Search Publication Inventory

Search the website inventory for publication sites matching specific criteria.

## Search Parameters

Ask user for search criteria (all optional):
- **Keyword**: Search in website name
- **Category**: Technology, Finance, Health, News, etc.
- **Min DA**: Minimum Domain Authority (0-100)
- **Max DA**: Maximum Domain Authority
- **Min DR**: Minimum Domain Rating (0-100)
- **Max DR**: Maximum Domain Rating
- **Max Price**: Maximum price in USD
- **Min Traffic**: Minimum organic traffic
- **TAT**: Maximum turnaround time in days

### Boolean Filters
- Do-follow links only
- News sites only
- Indexed sites only
- Exclude CBD/Casino/Dating/Crypto restricted sites

## Output Format

Display matching publications in a table:
```
SEARCH RESULTS (X matches)
==========================

| Website          | DA | DR | Price  | TAT | Category   |
|------------------|----|----|--------|-----|------------|
| techcrunch.com   | 94 | 91 | $5,000 | 3d  | Technology |
| forbes.com       | 95 | 93 | $6,500 | 5d  | Business   |
| ...              |    |    |        |     |            |
```

### Additional Info
For each result, can show on request:
- Contact person
- Traffic breakdown (US, UK, Canada)
- Content restrictions
- AI visibility flags (ChatGPT, Perplexity, etc.)

## Quick Searches
- `/inventory-search tech under 3000` - Tech sites under $3000
- `/inventory-search da90+` - Sites with DA 90+
- `/inventory-search news dofollow` - News sites with dofollow
