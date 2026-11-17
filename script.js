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

const reducedMotionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const prefersReducedMotion = reducedMotionPreference.matches;
const scrollZoomSections = [
  { section: document.querySelector('.renfort-hero'), imageSelector: '.renfort-hero-photo', property: '--renfort-scroll-scale', zoom: 0.02 },
  { section: document.querySelector('.hero-home'), imageSelector: '.hero-photo', property: '--home-scroll-scale', zoom: 0.045 }
].map(item => ({ ...item, image: item.section?.querySelector(item.imageSelector) })).filter(item => item.section && item.image);
scrollZoomSections.forEach(({ section, image, property, zoom }) => {
  let zoomFrame = 0;
  const renderScrollZoom = () => {
    zoomFrame = 0;
    if (reducedMotionPreference.matches) {
      image.style.removeProperty(property);
      return;
    }
    const bounds = section.getBoundingClientRect();
    const travel = Math.max(1, window.innerHeight + bounds.height);
    const progress = Math.max(0, Math.min(1, (window.innerHeight - bounds.top) / travel));
    const scrollProgress = Math.max(0, Math.min(1, (progress - 0.5) * 2));
    image.style.setProperty(property, (1.015 + scrollProgress * zoom).toFixed(4));
  };
  const updateScrollZoom = () => {
    if (!zoomFrame) zoomFrame = window.requestAnimationFrame(renderScrollZoom);
  };
  window.addEventListener('scroll', updateScrollZoom, { passive: true });
  window.addEventListener('resize', updateScrollZoom, { passive: true });
  reducedMotionPreference.addEventListener('change', updateScrollZoom);
  updateScrollZoom();
});
if (!prefersReducedMotion && 'IntersectionObserver' in window) {
  const revealItems = document.querySelectorAll(
    '.offer-route, .offer-section-heading, .trust-strip>div, .service-card, .section-heading, .audience-routes a, .audience-group, .competence-grid article, .lab-project, .method-grid article, .method-note, .audit-offer, .local-page-card, .service-area-card, .local-feature-grid article, .price-card, .mission-detail-grid article, .offer-price-card, .maintenance-levels article, .maintenance-includes article, .travel-zones article, .full-audit-card, .project-quote-panel, .reinforcement-details article, .reinforcement-rate, .renfort-steps article, .about-photo, .about-copy'
  );
  revealItems.forEach(item => {
    item.classList.add('reveal');
    const position = Array.from(item.parentElement.children).indexOf(item);
    item.style.transitionDelay = `${Math.min(Math.max(position, 0), 6) * 65}ms`;
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
function prepareContactRequest(requestType) {
  if (!leadForm) return;
  const requestDetails = {
    projet: { value: 'Mission projet / évolution technique', subject: 'Demande de mission projet - site web' },
    depannage: { value: 'Dépannage ponctuel', subject: 'Demande de dépannage - site web' },
    maintenance: { value: 'Forfait mensuel', subject: 'Demande de forfait maintenance - site web' },
    renfort: { value: 'Renfort informatique', subject: 'Demande de renfort informatique - site web' },
    audit: { value: 'Audit informatique complet', subject: 'Demande d’audit informatique complet - site web' },
    express: { value: 'Échange express offert (30 min)', subject: 'Demande échange express offert - site web' }
  }[requestType];
  if (requestDetails) {
    const needSelect = leadForm.querySelector('[name="need_type"]');
    const subject = leadForm.querySelector('[name="_subject"]');
    if (needSelect) needSelect.value = requestDetails.value;
    if (subject) subject.value = requestDetails.subject;
  }
}
if (leadForm) {
  prepareContactRequest(new URLSearchParams(window.location.search).get('besoin'));
  const endpoint = (siteConfig.formspreeEndpoint || '').trim();
  const endpointMatch = endpoint.match(/^https:\/\/formspree\.io\/f\/([A-Za-z0-9]+)$/);
  const submitButton = leadForm.querySelector('[type="submit"]');
  const setupHint = document.querySelector('#form-setup-hint');
  const status = leadForm.querySelector('.form-status');
  const errorBox = leadForm.querySelector('.form-error');
  const honeypot = leadForm.querySelector('[name="_gotcha"]');

  if (endpointMatch) {
    leadForm.action = endpoint;
    submitButton.disabled = false;
    if (setupHint) setupHint.hidden = true;
    leadForm.addEventListener('submit', async event => {
      event.preventDefault();
      if (!leadForm.reportValidity()) return;
      if (honeypot?.value) return;
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

const offerDialog = document.querySelector('#offer-detail-dialog');
const offerDialogContent = document.querySelector('#offer-detail-content');
const offerDialogTitle = document.querySelector('#offer-detail-title');
const offerDialogKicker = document.querySelector('#offer-detail-kicker');
const offerDialogRequest = document.querySelector('#offer-detail-request');

if (offerDialog && offerDialogContent && typeof offerDialog.showModal === 'function') {
  const offers = {
    depannage: { title: 'Dépannage informatique', kicker: 'INTERVENTION PONCTUELLE', request: 'depannage', action: 'Demander une intervention' },
    maintenance: { title: 'Les forfaits maintenance', kicker: 'SUIVI RÉGULIER', request: 'maintenance', action: 'Parler de mon équipe' },
    missions: { title: 'Projets & Renfort IT', kicker: 'MISSIONS & JOURNÉES DÉDIÉES' }
  };

  document.querySelectorAll('[data-offer-dialog], [data-offer-open-travel]').forEach(trigger => {
    trigger.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const key = trigger.dataset.offerDialog || 'depannage';
      const offer = offers[key];
      const template = document.querySelector(`#offer-content-${key}`);
      if (!offer || !template) return;
      event.preventDefault();
      const content = template.content.cloneNode(true);
      content.querySelectorAll('[data-offer-clone]').forEach(slot => {
        const source = document.querySelector(slot.dataset.offerClone);
        if (!source) return;
        const copy = source instanceof HTMLTemplateElement ? source.content.cloneNode(true) : source.cloneNode(true);
        const elements = copy instanceof Element ? [copy, ...copy.querySelectorAll('*')] : [...copy.querySelectorAll('*')];
        elements.forEach(element => {
          element.removeAttribute('id');
          element.classList.remove('reveal', 'is-visible');
          element.style.removeProperty('transition-delay');
        });
        slot.append(copy);
      });
      content.querySelectorAll('[data-offer-text]').forEach(slot => {
        slot.textContent = document.querySelector(slot.dataset.offerText)?.textContent.trim() || '';
      });
      content.querySelectorAll('a[href="renfort-informatique.html#demande"]').forEach(link => {
        link.href = '?besoin=renfort#contact-form';
      });
      offerDialogTitle.textContent = offer.title;
      offerDialogKicker.textContent = offer.kicker;
      offerDialogContent.replaceChildren(content);
      offerDialogRequest.hidden = !offer.request;
      if (offer.request) {
        offerDialogRequest.href = `?besoin=${offer.request}#contact-form`;
        offerDialogRequest.firstChild.textContent = `${offer.action} `;
      }
      trigger.focus({ preventScroll: true });
      offerDialog.showModal();
      document.documentElement.classList.add('offer-dialog-visible');
      offerDialogContent.scrollTop = 0;
      if (trigger.hasAttribute('data-offer-open-travel')) {
        const travel = offerDialogContent.querySelector('.offer-detail-disclosure');
        if (travel) {
          travel.open = true;
          offerDialogContent.scrollTop = Math.max(0, travel.offsetTop - offerDialogContent.offsetTop - 12);
        }
      }
    });
  });

  offerDialog.querySelectorAll('.offer-dialog-close, .offer-dialog-back').forEach(button => {
    button.addEventListener('click', () => offerDialog.close());
  });
  offerDialog.addEventListener('close', () => {
    document.documentElement.classList.remove('offer-dialog-visible');
  });
  offerDialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...offerDialog.querySelectorAll('button, a[href], summary, input, select, textarea, [tabindex]')]
      .filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (!first) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  let backdropPointerDown = false;
  const outsideDialog = event => {
    const box = offerDialog.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  };
  offerDialog.addEventListener('pointerdown', event => {
    backdropPointerDown = event.target === offerDialog && outsideDialog(event);
  });
  offerDialog.addEventListener('click', event => {
    if (backdropPointerDown && event.target === offerDialog && outsideDialog(event)) {
      offerDialog.close();
      backdropPointerDown = false;
      return;
    }
    const link = event.target.closest('a[href]');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !leadForm) return;
    const requestType = new URL(link.href, window.location.href).searchParams.get('besoin');
    if (!requestType) return;
    event.preventDefault();
    prepareContactRequest(requestType);
    offerDialog.close();
    window.requestAnimationFrame(() => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.querySelector('#contact-form')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      leadForm.querySelector('[name="name"]')?.focus({ preventScroll: true });
    });
  });

  const openLegacyOfferLink = () => {
    const legacyOffers = {
      '#forfaits-maintenance-detail': '.tariff-button[data-offer-dialog="maintenance"]',
      '#projets-renfort': '.tariff-button[data-offer-dialog="missions"]',
      '#deplacements-audit': '[data-offer-open-travel]'
    };
    const selector = legacyOffers[window.location.hash];
    if (!selector || offerDialog.open) return;
    document.querySelector('#tarifs')?.scrollIntoView({ behavior: 'instant', block: 'start' });
    document.querySelector(selector)?.click();
  };
  window.addEventListener('hashchange', openLegacyOfferLink);
  openLegacyOfferLink();
}
