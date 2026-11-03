const siteConfig = window.SITE_CONFIG || {};
const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');
const header = document.querySelector('.site-header');

if (menuButton && nav) {
  menuButton.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  }));
}

const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

if (header) {
  const updateHeader = () => header.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!prefersReducedMotion && 'IntersectionObserver' in window) {
  const revealItems = document.querySelectorAll(
    '.service-card, .tool-logo, .audience-routes a, .audience-group, .method-grid article, .price-card, .local-page-card, .local-feature-grid article, .about-photo, .about-copy'
  );
  revealItems.forEach(item => {
    item.classList.add('reveal');
    const position = Array.from(item.parentElement.children).indexOf(item);
    item.style.transitionDelay = `${Math.max(position, 0) * 45}ms`;
  });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -20px 0px' });
  revealItems.forEach(item => observer.observe(item));
}

const leadForm = document.querySelector('#lead-form');
if (leadForm) {
  const endpoint = (siteConfig.formspreeEndpoint || '').trim();
  const endpointMatch = endpoint.match(/^https:\/\/formspree\.io\/f\/([A-Za-z0-9]+)$/);
  const submitButton = leadForm.querySelector('[type="submit"]');
  const setupHint = document.querySelector('#form-setup-hint');
  const status = leadForm.querySelector('.form-status');
  const errorBox = leadForm.querySelector('.form-error');

  if (endpointMatch) {
    leadForm.action = endpoint;
    submitButton.disabled = false;
    if (setupHint) setupHint.hidden = true;
    leadForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (!leadForm.reportValidity()) return;
      submitButton.disabled = true;
      const originalLabel = submitButton.innerHTML;
      submitButton.textContent = 'Envoi en cours…';
      if (status) { status.removeAttribute('data-fs-active'); status.textContent = ''; }
      if (errorBox) { errorBox.removeAttribute('data-fs-active'); errorBox.textContent = ''; }
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          body: new FormData(leadForm),
          headers: { Accept: 'application/json' }
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Le formulaire n’a pas pu être envoyé. Réessayez ou appelez Alex.');
        if (status) {
          status.textContent = 'Merci, votre demande a bien été envoyée. Alex vous recontactera.';
          status.setAttribute('data-fs-active', '');
        }
        leadForm.reset();
      } catch (error) {
        if (errorBox) {
          errorBox.textContent = error.message || 'Un problème de connexion empêche l’envoi. Réessayez ou contactez Alex par téléphone ou e-mail.';
          errorBox.setAttribute('data-fs-active', '');
        }
      } finally {
        submitButton.innerHTML = originalLabel;
        submitButton.disabled = false;
      }
    });
  } else if (endpoint && setupHint) {
    setupHint.textContent = 'L’URL Formspree ne semble pas correcte. Utilisez le format https://formspree.io/f/identifiant.';
  }
}

const analyticsBanner = document.querySelector('#analytics-consent');
const analyticsManage = document.querySelector('#analytics-manage');
const trackerUrl = (siteConfig.umamiScriptUrl || '').trim();
const websiteId = (siteConfig.umamiWebsiteId || '').trim();
const consentKey = 'alex-sander-analytics-consent';

function loadAnalytics() {
  if (!trackerUrl || !websiteId || document.querySelector('[data-umami-installed]')) return;
  let parsedUrl;
  try { parsedUrl = new URL(trackerUrl); } catch { return; }
  if (parsedUrl.protocol !== 'https:') return;
  const tracker = document.createElement('script');
  tracker.src = parsedUrl.href;
  tracker.defer = true;
  tracker.dataset.websiteId = websiteId;
  tracker.dataset.umamiInstalled = 'true';
  document.head.appendChild(tracker);
}

if (trackerUrl && websiteId && analyticsBanner) {
  let savedConsent = null;
  try { savedConsent = localStorage.getItem(consentKey); } catch {}
  if (savedConsent === 'accepted') loadAnalytics();
  else if (savedConsent !== 'refused') analyticsBanner.hidden = false;

  document.querySelector('#analytics-accept')?.addEventListener('click', () => {
    try { localStorage.setItem(consentKey, 'accepted'); } catch {}
    analyticsBanner.hidden = true;
    loadAnalytics();
  });
  document.querySelector('#analytics-refuse')?.addEventListener('click', () => {
    try { localStorage.setItem(consentKey, 'refused'); } catch {}
    analyticsBanner.hidden = true;
    if (document.querySelector('[data-umami-installed]')) window.location.reload();
  });
  analyticsManage?.addEventListener('click', () => {
    analyticsBanner.hidden = false;
  });
} else if (analyticsManage) {
  analyticsManage.hidden = true;
}
