import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathways, pathwaySlugs } from '../src/data/pathways.js';

const expectedSlugs = ['colloquio', 'lavorare', 'parlare', 'estero', 'basi'];
assert.deepEqual(pathwaySlugs, expectedSlugs);

for (const slug of expectedSlugs) {
  const pathway = pathways[slug];
  assert.equal(pathway.slug, slug);
  assert.ok(pathway.seo.title.endsWith('| Sblocco Inglese'));
  assert.ok(pathway.seo.description.length >= 60);
  assert.equal(pathway.goals.length, 6, `${slug} must have six performance stages`);
  assert.ok(pathway.bottlenecks.length >= 5, `${slug} must have at least five bottlenecks`);
  assert.equal(pathway.method.length, 4, `${slug} must apply the four-part method`);
  assert.equal(pathway.tryIt.steps.length, 4, `${slug} must have a four-part Try It structure`);
  assert.ok(pathway.tryIt.modelAnswer.length >= 60);
  assert.equal(pathway.supportOptions.length, 4);
  assert.deepEqual(pathway.supportOptions.slice(0, 2).map((item) => item.kind), ['checkout', 'checkout']);
  assert.ok(pathway.supportOptions.every((option) => option.price === undefined), `${slug} must not invent prices`);
  assert.ok(pathway.faqs.length >= 4);
}

assert.equal(pathways.colloquio.intake, true);
assert.equal(pathways.colloquio.faqs.length, 6);
assert.equal(pathways.basi.foundationLink, '/grammar/a1');

const app = readFileSync('src/App.jsx', 'utf8');
const goals = readFileSync('src/components/home/GoalQuickSelector.jsx', 'utf8');
const experience = readFileSync('src/components/pathways/PathwayExperience.jsx', 'utf8');

for (const slug of expectedSlugs) {
  assert.match(app, new RegExp(`path="/percorsi/${slug}"`));
  assert.match(goals, new RegExp(`to: '/percorsi/${slug}'`));
}

assert.match(experience, /loadPathwayOffers/);
assert.match(experience, /createCheckout\(\{ offerId, accessToken:/);
assert.match(experience, /Prossimamente/);
assert.match(experience, /Vai al percorso/);
assert.doesNotMatch(experience, /€\s*\d|\d\s*€/);

console.log('Pathway system validation passed.');

