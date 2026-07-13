import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generalExpressionCards } from '../src/data/generalExpressionCards.js';
import {
  createExpressionAuditRecord,
  requiredExpressionAuditFields,
  trainerCardLevels,
} from '../src/content/trainer/trainerCardContract.js';

const SOURCE_FILE = 'src/data/generalExpressionCards.js';
const OUTPUT_DIRECTORY = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../reports/trainer-audit',
);
const JSON_OUTPUT = resolve(OUTPUT_DIRECTORY, 'general-expression-audit.json');
const MARKDOWN_OUTPUT = resolve(OUTPUT_DIRECTORY, 'general-expression-audit.md');
const STRICT_MODE = process.argv.includes('--strict');

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘]/g, "'")
    .toLowerCase()
    .replace(/\*\*/g, '')
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTemplate(value, target) {
  const normalizedTarget = normalizeText(target);
  return normalizeText(value)
    .replace(normalizedTarget, '<target>')
    .replace(/\b(i|you|he|she|we|they|it)\b/g, '<pronoun>')
    .replace(/\b(a|an|the)\b/g, '<article>')
    .replace(/\b\d+\b/g, '<number>')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshteinDistance(first, second) {
  const rows = second.length + 1;
  const columns = first.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(columns).fill(0));

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let column = 0; column < columns; column += 1) matrix[0][column] = column;

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = second[row - 1] === first[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[rows - 1][columns - 1];
}

function similarity(first, second) {
  const longest = Math.max(first.length, second.length);
  if (longest === 0) return 1;
  return 1 - (levenshteinDistance(first, second) / longest);
}

function addIssue(record, code, message, severity = 'warning') {
  const finding = { code, message };
  if (severity === 'error') record.automatedIssues.push(finding);
  else record.automatedWarnings.push(finding);
}

function collectGroups(records, keySelector) {
  const groups = new Map();
  records.forEach((record) => {
    const key = keySelector(record);
    if (!key) return;
    const existing = groups.get(key) || [];
    existing.push(record);
    groups.set(key, existing);
  });
  return groups;
}

function markExactDuplicates(records, keySelector, code, label) {
  const groups = collectGroups(records, keySelector);
  groups.forEach((group) => {
    if (group.length < 2) return;
    const ids = group.map((record) => record.sourceItemId).filter(Boolean);
    group.forEach((record) => {
      addIssue(record, code, `${label}: ${ids.join(', ')}`, 'error');
      record.possibleDuplicates.push(...ids.filter((id) => id !== record.sourceItemId));
    });
  });
}

function markNearDuplicates(records) {
  for (let firstIndex = 0; firstIndex < records.length; firstIndex += 1) {
    const first = records[firstIndex];
    const firstTarget = normalizeText(first.englishTarget);
    if (firstTarget.length < 8) continue;

    for (let secondIndex = firstIndex + 1; secondIndex < records.length; secondIndex += 1) {
      const second = records[secondIndex];
      const secondTarget = normalizeText(second.englishTarget);
      if (secondTarget.length < 8 || firstTarget === secondTarget) continue;

      const lengthRatio = Math.min(firstTarget.length, secondTarget.length)
        / Math.max(firstTarget.length, secondTarget.length);
      if (lengthRatio < 0.72) continue;

      const score = similarity(firstTarget, secondTarget);
      if (score < 0.86) continue;

      const message = `Possible near duplicate (${score.toFixed(2)}): ${first.sourceItemId} / ${second.sourceItemId}`;
      addIssue(first, 'near_duplicate_target', message);
      addIssue(second, 'near_duplicate_target', message);
      first.possibleDuplicates.push(second.sourceItemId);
      second.possibleDuplicates.push(first.sourceItemId);
    }
  }
}

function markRepeatedTemplates(records, field, code, minimumCount = 4) {
  const groups = collectGroups(records, (record) => normalizeTemplate(record[field], record.englishTarget));
  groups.forEach((group, template) => {
    if (!template || group.length < minimumCount) return;
    const ids = group.map((record) => record.sourceItemId);
    group.forEach((record) => {
      addIssue(record, code, `Template repeated across ${group.length} cards: ${ids.slice(0, 8).join(', ')}${ids.length > 8 ? ', ...' : ''}`);
    });
  });
}

function auditCards(cards) {
  const records = cards.map((card) => createExpressionAuditRecord(card, SOURCE_FILE));

  records.forEach((record, index) => {
    const sourceCard = cards[index];

    requiredExpressionAuditFields.forEach((field) => {
      if (sourceCard?.[field] === undefined || sourceCard?.[field] === null || String(sourceCard[field]).trim() === '') {
        addIssue(record, 'missing_required_field', `Missing required field: ${field}`, 'error');
      }
    });

    if (sourceCard?.type !== 'expression') {
      addIssue(record, 'invalid_item_type', `Expected type expression, received ${String(sourceCard?.type)}`, 'error');
    }

    if (!trainerCardLevels.includes(sourceCard?.level)) {
      addIssue(record, 'invalid_cefr_level', `Unsupported level: ${String(sourceCard?.level)}`, 'error');
    }

    if (!sourceCard?.pronunciation) {
      addIssue(record, 'missing_pronunciation', 'Pronunciation guide is missing.');
    } else if (!/[aeiou]/i.test(sourceCard.pronunciation)) {
      addIssue(record, 'suspicious_pronunciation', 'Pronunciation guide may not be useful to learners.');
    }

    if (normalizeText(sourceCard?.example1) === normalizeText(sourceCard?.example2)) {
      addIssue(record, 'duplicate_examples', 'The two examples are identical.', 'error');
    }

    for (const field of ['example1', 'example2']) {
      const example = normalizeText(sourceCard?.[field]);
      const target = normalizeText(sourceCard?.expression);
      if (example && target && !example.includes(target)) {
        addIssue(record, 'target_missing_from_example', `${field} does not contain the target expression.`);
      }
      if (example.length > 0 && example.length < target.length + 4) {
        addIssue(record, 'example_too_thin', `${field} provides very little context.`);
      }
    }

    if (normalizeText(sourceCard?.italian).length < 3) {
      addIssue(record, 'italian_prompt_too_short', 'Italian meaning is too short to review safely.');
    }

    if (String(sourceCard?.note || '').trim().length < 18) {
      addIssue(record, 'usage_note_too_thin', 'Usage note is missing or too brief.');
    }

    if (!record.automatedIssues.length && !record.automatedWarnings.length) {
      record.automatedStatus = 'valid';
    } else if (record.automatedIssues.length) {
      record.automatedStatus = 'error';
    } else {
      record.automatedStatus = 'warning';
    }
  });

  markExactDuplicates(records, (record) => normalizeText(record.sourceItemId), 'duplicate_id', 'Duplicate source ID');
  markExactDuplicates(records, (record) => normalizeText(record.englishTarget), 'duplicate_target', 'Duplicate English target');
  markExactDuplicates(records, (record) => normalizeText(record.italianPrompt), 'duplicate_italian_prompt', 'Duplicate Italian prompt');
  markNearDuplicates(records);
  markRepeatedTemplates(records, 'example1', 'repeated_example_1_template');
  markRepeatedTemplates(records, 'example2', 'repeated_example_2_template');
  markRepeatedTemplates(records, 'usageNote', 'repeated_usage_note', 5);

  records.forEach((record) => {
    record.possibleDuplicates = [...new Set(record.possibleDuplicates)].sort();
    if (record.automatedIssues.length) record.automatedStatus = 'error';
    else if (record.automatedWarnings.length) record.automatedStatus = 'warning';
    else record.automatedStatus = 'valid';
  });

  return records;
}

function countBy(records, selector) {
  return records.reduce((counts, record) => {
    const key = selector(record) || 'missing';
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function buildSummary(records) {
  const issueCounts = {};
  const warningCounts = {};

  records.forEach((record) => {
    record.automatedIssues.forEach(({ code }) => {
      issueCounts[code] = (issueCounts[code] || 0) + 1;
    });
    record.automatedWarnings.forEach(({ code }) => {
      warningCounts[code] = (warningCounts[code] || 0) + 1;
    });
  });

  return {
    dataset: 'general-expression',
    sourceFile: SOURCE_FILE,
    generatedAt: new Date().toISOString(),
    totalCards: records.length,
    validCards: records.filter((record) => record.automatedStatus === 'valid').length,
    cardsWithWarnings: records.filter((record) => record.automatedStatus === 'warning').length,
    cardsWithErrors: records.filter((record) => record.automatedStatus === 'error').length,
    cardsRequiringManualReview: records.filter((record) => record.automatedStatus !== 'valid').length,
    byLevel: countBy(records, (record) => record.proposedLevel),
    byCategory: countBy(records, (record) => record.currentCategory),
    issueCounts,
    warningCounts,
  };
}

function markdownTableRows(counts) {
  return Object.entries(counts)
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
    .map(([key, count]) => `| ${key} | ${count} |`)
    .join('\n');
}

function buildMarkdown(summary, records) {
  const priorityRecords = records.filter(
    (record) => record.automatedIssues.length || record.automatedWarnings.length,
  );

  const findingRows = priorityRecords
    .map((record) => {
      const codes = [
        ...record.automatedIssues.map((finding) => finding.code),
        ...record.automatedWarnings.map((finding) => finding.code),
      ];
      return `| ${record.sourceItemId || 'missing'} | ${record.proposedLevel || 'missing'} | ${record.currentCategory || 'missing'} | ${record.automatedStatus} | ${codes.join(', ')} |`;
    })
    .join('\n');

  return `# General Expression Trainer automated audit\n\n` +
    `Generated: ${summary.generatedAt}\n\n` +
    `This report is an automated screening tool. It does not approve, reject, rewrite, migrate, or publish cards. Every card still requires manual linguistic review.\n\n` +
    `## Summary\n\n` +
    `| Metric | Count |\n|---|---:|\n` +
    `| Total cards | ${summary.totalCards} |\n` +
    `| Structurally valid with no automated warning | ${summary.validCards} |\n` +
    `| Cards with warnings | ${summary.cardsWithWarnings} |\n` +
    `| Cards with errors | ${summary.cardsWithErrors} |\n` +
    `| Cards requiring manual review | ${summary.cardsRequiringManualReview} |\n\n` +
    `## Errors by code\n\n| Code | Cards |\n|---|---:|\n${markdownTableRows(summary.issueCounts) || '| None | 0 |'}\n\n` +
    `## Warnings by code\n\n| Code | Cards |\n|---|---:|\n${markdownTableRows(summary.warningCounts) || '| None | 0 |'}\n\n` +
    `## Level distribution\n\n| Level | Cards |\n|---|---:|\n${markdownTableRows(summary.byLevel)}\n\n` +
    `## Category distribution\n\n| Category | Cards |\n|---|---:|\n${markdownTableRows(summary.byCategory)}\n\n` +
    `## Cards flagged for review\n\n| Source ID | Level | Category | Status | Finding codes |\n|---|---|---|---|---|\n${findingRows || '| None | | | | |'}\n`;
}

const records = auditCards(generalExpressionCards);
const summary = buildSummary(records);
const report = {
  summary,
  rules: {
    requiredFields: requiredExpressionAuditFields,
    validLevels: trainerCardLevels,
    duplicateChecks: ['source ID', 'English target', 'Italian prompt'],
    nearDuplicateThreshold: 0.86,
    repeatedTemplateMinimum: 4,
  },
  cards: records,
};

await mkdir(OUTPUT_DIRECTORY, { recursive: true });
await writeFile(JSON_OUTPUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
await writeFile(MARKDOWN_OUTPUT, buildMarkdown(summary, records), 'utf8');

console.log(JSON.stringify({
  status: summary.cardsWithErrors > 0 ? 'review_required' : 'complete',
  outputs: {
    json: JSON_OUTPUT,
    markdown: MARKDOWN_OUTPUT,
  },
  summary,
}, null, 2));

if (STRICT_MODE && summary.cardsWithErrors > 0) {
  process.exitCode = 1;
}
