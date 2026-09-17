import {
  verifyWebhookSignature,
  generateWebhookSignature,
} from './verify-webhook';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

console.log('--- Running Webhook Signature Tests ---');

const secret = 'super_secret_test_key_123';
const rawPayload = JSON.stringify({
  fixture: { id: 1208021, status: { short: 'FT' } },
  goals: { home: 2, away: 1 },
});

// Test 1: Valid signature matches
const validSignature = generateWebhookSignature(rawPayload, secret);
assert(
  verifyWebhookSignature(rawPayload, validSignature, secret) === true,
  'Valid HMAC hex signature should verify'
);
console.log('✓ Valid signature verified successfully');

// Test 2: Valid signature with 'sha256=' prefix
const prefixedSignature = `sha256=${validSignature}`;
assert(
  verifyWebhookSignature(rawPayload, prefixedSignature, secret) === true,
  'Signature with sha256= prefix should verify'
);
console.log('✓ Prefixed sha256= signature verified successfully');

// Test 3: Tampered payload rejected
const tamperedPayload = JSON.stringify({
  fixture: { id: 1208021, status: { short: 'FT' } },
  goals: { home: 3, away: 1 }, // Changed score!
});
assert(
  verifyWebhookSignature(tamperedPayload, validSignature, secret) === false,
  'Tampered payload should be rejected'
);
console.log('✓ Tampered payload rejected successfully');

// Test 4: Invalid signature rejected
const invalidSignature = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
assert(
  verifyWebhookSignature(rawPayload, invalidSignature, secret) === false,
  'Invalid signature should be rejected'
);
console.log('✓ Invalid signature rejected successfully');

// Test 5: Missing or empty inputs rejected
assert(
  verifyWebhookSignature(rawPayload, null, secret) === false,
  'Null signature should be rejected'
);
assert(
  verifyWebhookSignature(rawPayload, '', secret) === false,
  'Empty signature should be rejected'
);
assert(
  verifyWebhookSignature(rawPayload, validSignature, '') === false,
  'Empty secret should be rejected'
);
console.log('✓ Edge cases handled correctly');

console.log('All Webhook Signature tests passed successfully!');
