function decodeHtml(value = '') {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ').trim();
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function findJobPosting(value) {
  if (!value || typeof value !== 'object') return null;
  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']];
  if (types.includes('JobPosting')) return value;

  for (const child of Object.values(value)) {
    const found = Array.isArray(child)
      ? child.map(findJobPosting).find(Boolean)
      : findJobPosting(child);
    if (found) return found;
  }
  return null;
}

function getMetaContent(html, key) {
  const tags = html.match(/<meta\s[^>]*>/gi) || [];
  const tag = tags.find((item) => new RegExp(`(?:name|property)=["']${key}["']`, 'i').test(item));
  return tag?.match(/content=["']([^"']*)["']/i)?.[1] || '';
}

function getStructuredJob(html) {
  const scripts = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const script of scripts) {
    try {
      const raw = script.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '').trim();
      const job = findJobPosting(JSON.parse(raw));
      if (job) return job;
    } catch { /* Ignore malformed structured data and use page metadata. */ }
  }
  return null;
}

function companyFromHost(url) {
  const host = new URL(url).hostname.replace(/^www\./, '');
  return host.split('.')[0].replace(/(^|[-_])(\w)/g, (_, separator, letter) => `${separator ? ' ' : ''}${letter.toUpperCase()}`);
}

function parseJobPage(html, url) {
  const job = getStructuredJob(html);
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
  const organization = first(job?.hiringOrganization);
  const role = decodeHtml(job?.title || getMetaContent(html, 'og:title') || titleTag)
    .replace(/\s+[|–—-]\s+(LinkedIn|Indeed|Glassdoor).*$/i, '');
  let company = decodeHtml(organization?.name || getMetaContent(html, 'og:site_name'));
  if (!company && role.includes(' at ')) company = role.split(/ at /i).pop();

  return {
    url,
    company: company || companyFromHost(url),
    role,
    datePosted: String(job?.datePosted || '').slice(0, 10),
  };
}

module.exports = { decodeHtml, findJobPosting, getMetaContent, parseJobPage };
