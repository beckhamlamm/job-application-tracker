function isPrivateHost(hostname) {
  return hostname === 'localhost' || hostname === '::1' || hostname.endsWith('.local') ||
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.)/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
}

function validatePublicUrl(input) {
  let target;
  try {
    target = new URL(input);
  } catch {
    throw new Error('Enter a valid URL, including https://');
  }
  if (!['http:', 'https:'].includes(target.protocol) || isPrivateHost(target.hostname)) {
    throw new Error('That URL cannot be fetched.');
  }
  return target;
}

module.exports = { isPrivateHost, validatePublicUrl };
