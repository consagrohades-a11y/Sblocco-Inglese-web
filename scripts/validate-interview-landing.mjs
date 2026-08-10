import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  interviewLab,
  interviewOffers,
  interviewPrivateSimulation,
  interviewRolePacks,
} from '../src/config/interviewProducts.js';

assert.equal(interviewOffers.length, 3);
assert.deepEqual(interviewOffers.map((offer) => offer.price), [19, 49, 79]);
assert.deepEqual(interviewOffers.map((offer) => offer.id), ['interview-kit', 'interview-core', 'interview-complete']);
assert.equal(interviewOffers.find((offer) => offer.id === 'interview-core')?.badge, 'Più scelto');
assert.equal(interviewOffers.find((offer) => offer.id === 'interview-complete')?.bestValue, true);
assert.ok(interviewOffers.every((offer) => offer.active && offer.offerId && offer.includes.length >= 5));

assert.equal(interviewRolePacks.length, 6);
assert.ok(interviewRolePacks.every((pack) => pack.price === 14 && pack.comingSoon && !pack.active));
assert.equal(interviewLab.type, 'group');
assert.equal(interviewLab.price, 129);
assert.equal(interviewPrivateSimulation.type, 'premium-service');
assert.equal(interviewPrivateSimulation.price, 119);

const page = readFileSync('src/pages/InterviewLandingPage.jsx', 'utf8');
const offers = readFileSync('src/components/interview/InterviewOffers.jsx', 'utf8');
const sample = readFileSync('src/components/interview/InterviewSample.jsx', 'utf8');
const enquiry = readFileSync('src/components/interview/InterviewEnquiry.jsx', 'utf8');
const editorial = readFileSync('src/components/interview/InterviewEditorialSections.jsx', 'utf8');
const css = readFileSync('src/styles/interview.css', 'utf8');
const route = readFileSync('src/pages/PathwayPage.jsx', 'utf8');
const env = readFileSync('.env.example', 'utf8');

assert.match(route, /pathwayId === 'colloquio'/);
assert.match(route, /<InterviewLandingPage/);
assert.match(page, /Colloquio in inglese \| Preparati davvero \| Sblocco Inglese/);
assert.match(page, /<InterviewHero[\s\S]*<InterviewPainPoints[\s\S]*<TechnicalInterviewSection[\s\S]*<InterviewSample[\s\S]*<InterviewModules[\s\S]*<InterviewOffers/);

assert.match(sample, /45–60 secondi/);
assert.match(sample, /tentativo → struttura → lingua utile → nuovo tentativo/);
assert.match(sample, /aria-live="polite"/);
assert.match(editorial, /Sblocco Colloquio non ti insegna il contenuto tecnico del tuo lavoro/);
assert.match(editorial, /Il giorno del colloquio non puoi premere/);

assert.match(offers, /authPath\('\/login', returnTo\)/);
assert.match(offers, /params\.set\('checkout', productId\)/);
assert.match(offers, /createCheckout\(\{ offerId: product\.offerId, accessToken:/);
assert.match(offers, /client_reference_id/);
assert.match(offers, /Disponibile a breve/);
assert.match(offers, /In arrivo/);
assert.match(offers, /Interview Lab waitlist/);
assert.match(offers, /createPathwayIntake/);
assert.match(enquiry, /createPathwayIntake/);
assert.match(enquiry, /Non serve un account/);

assert.match(css, /\.dark \.interview-page/);
assert.match(css, /@media \(max-width: 1100px\)/);
assert.match(css, /@media \(max-width: 820px\)/);
assert.match(css, /@media \(max-width: 620px\)/);
assert.match(css, /@media \(max-width: 390px\)/);
assert.match(css, /prefers-reduced-motion/);

for (const key of [
  'VITE_STRIPE_INTERVIEW_KIT_URL',
  'VITE_STRIPE_INTERVIEW_CORE_URL',
  'VITE_STRIPE_INTERVIEW_COMPLETE_URL',
  'VITE_STRIPE_INTERVIEW_LAB_URL',
]) assert.match(env, new RegExp(`^${key}=`, 'm'));

console.log('Interview landing validation passed.');

