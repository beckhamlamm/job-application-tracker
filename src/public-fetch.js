// Fetches bounded public resources, pinning validated DNS addresses and checking each redirect.
const http = require('node:http');
const https = require('node:https');
const dns = require('node:dns').promises;
const net = require('node:net');
const { validatePublicUrl, isPrivateHost } = require('./url-security');

async function publicFetch(input, { signal, headers = {}, lookup = dns.lookup, requestImpl } = {}, hops = 0) {
  const target = validatePublicUrl(input);
  const host = target.hostname.replace(/^\[|\]$/g, '');
  const addresses = net.isIP(host) ? [{ address: host, family: net.isIP(host) }] : await lookup(host, { all: true });
  if (!addresses.length || addresses.some(({ address }) => !net.isIP(address) || isPrivateHost(address))) {
    throw new Error('That URL resolves to a non-public address.');
  }
  signal?.throwIfAborted();
  const pinned = addresses[0];
  const response = await new Promise((resolve, reject) => {
    const request = requestImpl || (target.protocol === 'https:' ? https.request : http.request);
    const req = request(target, {
      signal, headers, agent: false,
      lookup: (_host, options, callback) => options.all
        ? callback(null, [pinned]) : callback(null, pinned.address, pinned.family),
    }, (res) => {
      const chunks = [];
      let size = 0;
      res.on('error', reject);
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        resolve({ redirect: new URL(res.headers.location, target).href });
        return;
      }
      res.on('data', (chunk) => {
        size += chunk.length;
        if (size > 4_000_000) res.destroy(new Error('The response is too large.'));
        else chunks.push(chunk);
      });
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({ url: target.href, status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300,
          text: async () => body, json: async () => JSON.parse(body) });
      });
    });
    req.on('error', reject);
    req.end();
  });
  if (!response.redirect) return response;
  if (hops >= 5) throw new Error('Too many redirects.');
  return publicFetch(response.redirect, { signal, headers, lookup, requestImpl }, hops + 1);
}

module.exports = { publicFetch };
