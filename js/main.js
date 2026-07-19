// Folu Executive Interior — site interactions

document.addEventListener('DOMContentLoaded', () => {

  /* Preloader */
  const preloader = document.getElementById('preloader');
  window.addEventListener('load', () => {
    setTimeout(() => preloader.classList.add('done'), 250);
  });
  // fallback in case 'load' already fired or is slow
  setTimeout(() => preloader && preloader.classList.add('done'), 1800);

  /* Footer year */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Mobile nav toggle */
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  navToggle?.addEventListener('click', () => {
    mainNav.classList.toggle('open');
  });
  mainNav?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => mainNav.classList.remove('open'));
  });

  /* Scroll reveal */
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach(el => revealObserver.observe(el));

  /* Back to top */
  const backToTop = document.getElementById('backToTop');
  window.addEventListener('scroll', () => {
    backToTop?.classList.toggle('show', window.scrollY > 600);
  });
  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* Testimonial carousel */
  const testimonials = document.querySelectorAll('.testimonial');
  const dotsWrap = document.getElementById('testimonialDots');
  if (testimonials.length && dotsWrap) {
    testimonials.forEach((_, i) => {
      const dot = document.createElement('button');
      if (i === 0) dot.classList.add('active');
      dot.addEventListener('click', () => showTestimonial(i));
      dotsWrap.appendChild(dot);
    });

    let current = 0;
    function showTestimonial(index) {
      testimonials[current].classList.remove('active');
      dotsWrap.children[current].classList.remove('active');
      current = index;
      testimonials[current].classList.add('active');
      dotsWrap.children[current].classList.add('active');
    }
    setInterval(() => {
      showTestimonial((current + 1) % testimonials.length);
    }, 5500);
  }

  /* Forms — front-end only confirmation (no backend wired up yet) */
  const handleFormSubmit = (formId, noteId, message) => {
    const form = document.getElementById(formId);
    const note = document.getElementById(noteId);
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      if (note) note.textContent = message;
      form.reset();
    });
  };
  handleFormSubmit('ctaForm', 'formNote', 'Thank you — you are on the list.');
  handleFormSubmit('contactForm', 'contactNote', 'Thank you — our design team will be in touch shortly.');
  document.getElementById('footerForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    e.target.reset();
  });

});
