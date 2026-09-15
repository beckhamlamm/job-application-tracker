// Exercises address validation and redirects without contacting private or external servers.
const test = require('node:test');
const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
const { EventEmitter } = require('node:events');
const { publicFetch } = require('../src/public-fetch');
const { validatePublicUrl } = require('../src/url-security');

test('blocks IPv6 loopback, mapped IPv4, and private addresses', () => {
  for (const url of [
    'http://[::1]/',
    'http://[::ffff:127.0.0.1]/',
    'http://[fc00::1]/',
    'http://127.1/',
    'http://10.0.0.1/',
  ]) {
    assert.throws(() => validatePublicUrl(url));
  }
});

test('blocks DNS responses containing private addresses before connecting', async () => {
  await assert.rejects(
    publicFetch('https://example.com', {
      lookup: async () => [{ address: '10.0.0.1', family: 4 }],
      requestImpl: () => assert.fail('must not connect'),
    }),
    /non-public/,
  );
});

test('pins a public address and blocks a redirect into localhost', async () => {
  let calls = 0;
  await assert.rejects(
    publicFetch('https://example.com', {
      lookup: async () => [{ address: '93.184.216.34', family: 4 }],
      requestImpl: (_url, options, callback) => {
        calls++;
        options.lookup('example.com', {}, (err, address) => {
          assert.equal(err, null);
          assert.equal(address, '93.184.216.34');
        });
        const req = new EventEmitter();
        req.end = () => {
          const res = new PassThrough();
          res.statusCode = 302;
          res.headers = { location: 'http://[::1]/' };
          callback(res);
          res.end();
        };
        return req;
      },
    }),
    /cannot be fetched/,
  );
  assert.equal(calls, 1);
});
