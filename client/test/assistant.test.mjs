import { test } from 'node:test';
import assert from 'node:assert/strict';
import { answer, normalize } from '../src/lib/assistant.js';

const DESTS = [
  { id: 1, name: 'Boracay White Beach', province: 'Aklan', region: 'Visayas', category: 'beach', price: 1500, feedback_count: 4, avg_rating: 4.5 },
  { id: 2, name: 'Chocolate Hills', province: 'Bohol', region: 'Visayas', category: 'mountain', price: 800, feedback_count: 0, avg_rating: null },
  { id: 3, name: 'Banaue Rice Terraces', province: 'Ifugao', region: 'Luzon', category: 'mountain', price: 1200, feedback_count: 2, avg_rating: 4.9 },
  { id: 4, name: 'Siargao Cloud 9', province: 'Surigao del Norte', region: 'Mindanao', category: 'beach', price: 600, feedback_count: 1, avg_rating: 3 },
];
const tourist = { id: 'u1', name: 'Ana Cruz', role: 'tourist' };
const admin = { id: 'a1', name: 'Admin', role: 'admin' };
const ask = (q, user = null) => answer(q, { user, destinations: DESTS });

test('normalize strips punctuation, apostrophes and accents', () => {
  assert.equal(normalize("Can't  BOOK?!"), ' cant book ');
  assert.equal(normalize('Señor'), ' senor ');
});

test('how-to questions get the role-specific FAQ answer', () => {
  assert.match(ask('How do I book?').text, /create a free account or log in/);
  assert.match(ask('paano mag book', tourist).text, /pick your visit date/);
  assert.match(ask('How do I rate my trip?', tourist).text, /Rate button/);
  assert.match(ask('pano icancel booking ko', tourist).text, /My Bookings → Upcoming/);
  assert.match(ask("I can't log in").text, /password reset/);
});

test('more specific phrases beat single words', () => {
  assert.match(ask('can I edit my review?').text, /can no longer be edited/);
  assert.match(ask('how do I book on this website').text, /log in/);
});

test('region and type questions list matching destinations', () => {
  const r = ask('beaches in Visayas');
  assert.deepEqual(r.destinations.map((d) => d.id), [1]);
  assert.deepEqual(ask('mountains').destinations.map((d) => d.id).sort(), [2, 3]);
});

test('cheapest and top rated sort the list', () => {
  assert.deepEqual(ask('cheapest destinations').destinations.map((d) => d.id), [4, 2, 3, 1]);
  assert.deepEqual(ask('top rated destinations').destinations.map((d) => d.id), [3, 1, 4]);
});

test('naming a destination describes it, generic words do not count as names', () => {
  const r = ask('tell me about Boracay');
  assert.match(r.text, /Aklan \(Visayas\), ₱1,500 per person, rated 4\.5★ from 4 reviews/);
  assert.equal(r.links[0].to, '/destinations/1');
  assert.match(ask('Bohol').text, /no reviews yet/);
  assert.ok(!ask('white sand beaches').text.startsWith('Boracay'));
});

test('booking a named destination combines the how-to and the link', () => {
  const r = ask('how to book Banaue', tourist);
  assert.match(r.text, /^Banaue Rice Terraces is in Ifugao/);
  assert.equal(r.links[0].to, '/destinations/3');
});

test('admin-only topics are hidden from tourists', () => {
  assert.match(ask('export csv', admin).text, /Export CSV/);
  assert.ok(ask('export csv', tourist).suggest);
});

test('unrelated questions get the scoped fallback', () => {
  const r = ask('what is the capital of France');
  assert.ok(r.suggest);
  assert.match(r.text, /only answer questions about this website/);
});

test('list questions before destinations load ask to retry', () => {
  assert.match(answer('beaches', { destinations: null }).text, /Loading destinations/);
});

test('new FAQ topics answer booking, account and review questions', () => {
  assert.match(ask('pwede ba palitan date ng booking ko', tourist).text, /cancel the trip in My Bookings and book again/);
  assert.match(ask('how many guests can I book?').text, /1 to 50 guests/);
  assert.match(ask('can I book today?').text, /today or any future date/);
  assert.match(ask('bakit nawala account ko').text, /7 days after its email is confirmed/);
  assert.match(ask('change my password').text, /no profile page yet/);
  assert.match(ask('I did not get the confirmation email').text, /check Spam/);
  assert.match(ask('5 stars but negative why').text, /star rating and the sentiment label are separate/);
  assert.match(ask('is my email public').text, /first name and last initial/);
  assert.match(ask('what does loved by visitors mean').text, /at least 3 reviews/);
  assert.match(ask('libre ba').text, /free/);
});

test('admin-only booking status help stays hidden from tourists', () => {
  assert.match(ask('mark booking as completed', admin).text, /status menu on each row/);
  assert.doesNotMatch(ask('change status', tourist).text, /status menu on each row/);
});

test('count questions are answered from the live list', () => {
  assert.equal(ask('how many destinations are there').text, 'There are 4 destinations on the site: 1 in Luzon, 2 in Visayas, 1 in Mindanao.');
  assert.equal(ask('how many beaches in Visayas').text, 'There is 1 beach in Visayas on the site.');
  assert.match(ask('how many guests can I book?').text, /1 to 50 guests/);
});
