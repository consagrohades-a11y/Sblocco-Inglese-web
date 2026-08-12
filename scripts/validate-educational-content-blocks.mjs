import {
  exerciseBuilderTemplates,
  validateExerciseBuilderJson,
} from '../src/lib/exerciseBuilderSchema.js';
import {
  isStructuredEducationalContent,
  normalizeEducationalContentBlock,
  validateEducationalContentBlock,
} from '../src/lib/educationalContentBlock.js';

const failures = [];
const template = exerciseBuilderTemplates.educational_content_block;

if (!template) failures.push('Missing educational_content_block template.');

const content = template?.question?.content || {};
const semanticValidation = validateEducationalContentBlock(content);
if (semanticValidation.errors.length) {
  failures.push(`Educational template semantic validation failed: ${semanticValidation.errors.join(' | ')}`);
}
if (!isStructuredEducationalContent(content)) {
  failures.push('Educational template is not recognised as structured content.');
}

const normalized = normalizeEducationalContentBlock(content);
if (!normalized.structured || normalized.variant !== 'grammar') {
  failures.push('Educational template normalization did not preserve structured grammar content.');
}
if (!normalized.sections.some((section) => section.type === 'rule')) {
  failures.push('Educational template must contain at least one rule example for renderer coverage.');
}
if (!normalized.sections.some((section) => section.type === 'mistake')) {
  failures.push('Educational template must contain a mistake comparison for renderer coverage.');
}
if (!normalized.sections.some((section) => section.type === 'recap')) {
  failures.push('Educational template must contain a recap for renderer coverage.');
}

const importResult = validateExerciseBuilderJson(JSON.stringify(template));
const imported = importResult.items[0]?.payload;
if (importResult.errors.length || importResult.items.some((item) => item.status === 'invalid')) {
  failures.push(`Educational template does not round-trip through Exercise Builder: ${[
    ...importResult.errors,
    ...importResult.items.flatMap((item) => item.errors || []),
  ].join(' | ')}`);
}
if (imported?.content?.template_id !== content.template_id) {
  failures.push('Exercise Builder import did not preserve content.template_id.');
}
if (imported?.content?.variant !== content.variant) {
  failures.push('Exercise Builder import did not preserve content.variant.');
}
if (JSON.stringify(imported?.content?.sections) !== JSON.stringify(content.sections)) {
  failures.push('Exercise Builder import did not preserve structured content.sections.');
}
if (!imported?.content?.body) {
  failures.push('Educational template must preserve a legacy content.body fallback.');
}

const invalidSection = structuredClone(content);
invalidSection.sections = [{ type: 'special_blue_box', body: 'Unsupported renderer-specific block.' }];
if (!validateEducationalContentBlock(invalidSection).errors.length) {
  failures.push('Educational validation accepted an unsupported section type.');
}

const legacy = normalizeEducationalContentBlock({ body: 'Legacy teaching text.' });
if (legacy.structured || legacy.body !== 'Legacy teaching text.') {
  failures.push('Legacy content_block fallback is not backward compatible.');
}

if (failures.length) {
  console.error('Educational content block validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Educational content block validation passed with ${normalized.sections.length} structured sections and legacy fallback coverage.`);
