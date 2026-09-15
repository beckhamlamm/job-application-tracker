// Validates user-supplied URLs and prevents requests to local or private network hosts.
const net = require('node:net');

function isPrivateHost(hostname) {
  const host = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
  if (net.isIP(host) === 6) {
    // Only globally routed unicast; exclude transition and special-purpose ranges.
    return (
      !/^[23][0-9a-f]{3}:/.test(host) ||
      /^2001:(?:0:|2:|10:|20:|db8:)/.test(host) ||
      host.startsWith('2002:')
    );
  }
  if (net.isIP(host) === 4) {
    const [a, b] = host.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && [0, 168].includes(b)) ||
      (a === 198 && [18, 19, 51].includes(b)) ||
      (a === 203 && b === 0)
    );
  }
  return host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local');
}

function validatePublicUrl(input) {
  let target;
  try {
    target = new URL(input);
  } catch {
    throw new Error('Enter a valid URL, including https://');
  }
  if (
    !['http:', 'https:'].includes(target.protocol) ||
    target.username ||
    target.password ||
    isPrivateHost(target.hostname)
  ) {
    throw new Error('That URL cannot be fetched.');
  }
  return target;
}

module.exports = { isPrivateHost, validatePublicUrl };
