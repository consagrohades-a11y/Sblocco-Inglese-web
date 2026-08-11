import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getInterviewProductBySlug,
  interviewLab,
  interviewOffers,
  interviewPrivateSimulation,
  interviewRolePacks,
  isInterviewProductPurchasable,
} from '../src/config/interviewProducts.js';

assert.equal(interviewOffers.length, 3);
assert.deepEqual(interviewOffers.map((offer) => offer.id), ['interview-kit', 'interview-core', 'interview-complete']);
assert.deepEqual(interviewOffers.map((offer) => offer.slug), ['kit', 'sblocco-colloquio', 'complete']);
assert.deepEqual(interviewOffers.map((offer) => offer.price), [19, 49, 79]);
assert.deepEqual(interviewOffers.map((offer) => offer.type), ['resource', 'training', 'bundle']);
assert.deepEqual(interviewOffers.map((offer) => offer.status), ['preview', 'active', 'comingSoon']);
assert.deepEqual(interviewOffers.map((offer) => offer.commercialRole), ['PREPARA', 'ALLENATI', 'PREPARA + ALLENATI + SPECIALIZZA']);
assert.deepEqual(interviewOffers.map((offer) => offer.hubCta), ['Guarda cosa include', 'Esplora il percorso', 'Scopri Complete']);
assert.deepEqual(interviewOffers.map((offer) => offer.detailPath), [
  '/percorsi/colloquio/kit',
  '/percorsi/colloquio/sblocco-colloquio',
  '/percorsi/colloquio/complete',
]);
assert.ok(interviewOffers.every((offer) => offer.offerId && offer.includes.length >= 4 && offer.formatItems.length === 5));
assert.equal(interviewOffers.find((offer) => offer.id === 'interview-core')?.recommended, true);
assert.equal(getInterviewProductBySlug('kit')?.id, 'interview-kit');
assert.equal(isInterviewProductPurchasable(getInterviewProductBySlug('kit')), false);
assert.equal(isInterviewProductPurchasable(getInterviewProductBySlug('sblocco-colloquio')), true);
assert.equal(isInterviewProductPurchasable(getInterviewProductBySlug('complete')), false);

assert.equal(interviewRolePacks.length, 6);
assert.ok(interviewRolePacks.every((pack) => (
  pack.price === 14
  && pack.status === 'comingSoon'
  && pack.comingSoon
  && !pack.active
  && !pack.includedInComplete
)));
assert.equal(interviewLab.type, 'group');
assert.equal(interviewLab.price, 129);
assert.equal(interviewPrivateSimulation.type, 'premium-service');
assert.equal(interviewPrivateSimulation.price, 119);

const source = (path) => readFileSync(path, 'utf8');
const page = source('src/pages/InterviewLandingPage.jsx');
const offers = source('src/components/interview/InterviewOffers.jsx');
const sample = source('src/components/interview/InterviewSample.jsx');
const enquiry = source('src/components/interview/InterviewEnquiry.jsx');
const editorial = source('src/components/interview/InterviewEditorialSections.jsx');
const teaser = source('src/components/interview/InterviewCoreTeaser.jsx');
const product = source('src/pages/InterviewProductPage.jsx');
const kit = source('src/pages/InterviewKitPage.jsx');
const complete = source('src/pages/InterviewCompletePage.jsx');
const previews = source('src/components/interview/InterviewProductPreviews.jsx');
const cataloguePreviews = source('src/components/interview/InterviewCatalogPreviews.jsx');
const shared = source('src/components/interview/InterviewProductShared.jsx');
const purchase = source('src/components/interview/useInterviewPurchase.js');
const css = source('src/styles/interview.css');
const productCss = source('src/styles/interview-product.css');
const route = source('src/pages/PathwayPage.jsx');
const app = source('src/App.jsx');
const env = source('.env.example');
const serverOffers = source('server/stripe/offers.js');

assert.match(route, /pathwayId === 'colloquio'/);
assert.match(route, /<InterviewLandingPage/);
assert.match(app, /path="\/percorsi\/colloquio\/kit" element=\{<InterviewKitPage/);
assert.match(app, /path="\/percorsi\/colloquio\/sblocco-colloquio" element=\{<InterviewProductPage/);
assert.match(app, /path="\/percorsi\/colloquio\/complete" element=\{<InterviewCompletePage/);
assert.match(page, /Colloquio in inglese \| Preparati davvero \| Sblocco Inglese/);
assert.match(page, /<InterviewHero[\s\S]*<InterviewPainPoints[\s\S]*<TechnicalInterviewSection[\s\S]*<InterviewHubOffers[\s\S]*<InterviewCoreTeaser[\s\S]*<InterviewSample[\s\S]*<InterviewRolePacks[\s\S]*<InterviewLab[\s\S]*<InterviewPrivateUpsell[\s\S]*<InterviewEnquiry[\s\S]*<InterviewFAQ[\s\S]*<InterviewFinalCTA/);

assert.match(sample, /45–60 secondi/);
assert.match(sample, /aria-live="polite"/);
assert.match(editorial, /Sblocco Colloquio non ti insegna il contenuto tecnico del tuo lavoro/);
assert.match(offers, /to=\{product\.detailPath\}/);
assert.match(offers, /product\.commercialRole/);
assert.match(offers, /product\.status === 'preview'/);
assert.doesNotMatch(offers, /createCheckout|client_reference_id/);
assert.doesNotMatch(offers, /Pagina dettagli in arrivo/);
assert.match(teaser, /\/percorsi\/colloquio\/sblocco-colloquio/);
assert.match(enquiry, /createPathwayIntake/);
assert.match(enquiry, /Non serve un account/);

assert.match(product, /InterviewWorkspacePreview/);
assert.match(product, /InterviewProductShowcase/);
assert.match(product, /InteractiveMiniPreview/);
assert.match(product, /InterviewProductStatus/);
assert.match(product, /IL RISULTATO DEL PERCORSO/);
assert.match(product, /OTTO MODULI/);
assert.match(product, /TRE SIMULAZIONI GUIDATE/);
assert.match(product, /<InterviewPurchasePanel product=\{product\}/);
assert.match(previews, /NOW', 'BEFORE', 'VALUE', 'NEXT/);
assert.match(previews, /aria-live="polite"/);

assert.match(kit, /KitDocumentPreview/);
assert.match(kit, /KitResourcesShowcase/);
assert.match(kit, /Ti serve anche allenarti\?/);
assert.match(kit, /Interview Question Bank/);
assert.match(cataloguePreviews, /Le domande da preparare/);
assert.match(cataloguePreviews, /Could you rephrase the question\?/);
assert.match(cataloguePreviews, /ANTEPRIMA CONCETTUALE/);

assert.match(complete, /CompleteWorkspacePreview/);
assert.match(complete, /Preparazione, allenamento e pratica più specifica/);
assert.match(complete, /Per chi vuole preparare tutto in un unico posto/);
assert.match(complete, /In preparazione/);
assert.match(complete, /prezzo previsto|79 € al lancio/);

assert.match(shared, /InterviewProductStatus/);
assert.match(shared, /isInterviewProductPurchasable/);
assert.match(shared, /interviewOffers\.map/);
assert.match(purchase, /authPath\('\/login', returnTo\)/);
assert.match(purchase, /params\.set\('checkout', productId\)/);
assert.match(purchase, /createCheckout\(\{ offerId: product\.offerId, accessToken:/);
assert.match(purchase, /client_reference_id/);
assert.match(purchase, /isInterviewProductPurchasable/);

assert.match(serverOffers, /'colloquio-essential',[^\n]+false/);
assert.match(serverOffers, /'colloquio-complete',[^\n]+true/);
assert.match(serverOffers, /'colloquio-complete-plus',[^\n]+false/);
assert.match(serverOffers, /definition\.active && priceLooksValid/);

assert.match(css, /\.dark \.interview-page/);
assert.match(css, /@media \(max-width: 1100px\)/);
assert.match(css, /@media \(max-width: 820px\)/);
assert.match(css, /@media \(max-width: 620px\)/);
assert.match(css, /@media \(max-width: 390px\)/);
assert.match(css, /prefers-reduced-motion/);
assert.match(productCss, /@media \(max-width: 1150px\)/);
assert.match(productCss, /@media \(max-width: 900px\)/);
assert.match(productCss, /@media \(max-width: 720px\)/);
assert.match(productCss, /@media \(max-width: 560px\)/);
assert.match(productCss, /@media \(max-width: 390px\)/);
assert.match(productCss, /prefers-reduced-motion/);
assert.match(productCss, /\.kit-resources/);
assert.match(productCss, /\.complete-bundle/);
assert.match(productCss, /\.complete-comparison__scroll/);

for (const key of [
  'VITE_STRIPE_INTERVIEW_KIT_URL',
  'VITE_STRIPE_INTERVIEW_CORE_URL',
  'VITE_STRIPE_INTERVIEW_COMPLETE_URL',
  'VITE_STRIPE_INTERVIEW_LAB_URL',
]) assert.match(env, new RegExp(`^${key}=`, 'm'));

console.log('Interview landing validation passed.');
