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

  /* Newsletter forms — front-end only confirmation (no backend wired up) */
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
  document.getElementById('footerForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    e.target.reset();
  });

  /* Consultation form — saved to the admin dashboard */
  const contactForm = document.getElementById('contactForm');
  const contactNote = document.getElementById('contactNote');
  contactForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const payload = {
      name: contactForm.name.value,
      phone: contactForm.phone.value,
      email: contactForm.email.value,
      message: contactForm.message.value,
    };

    submitBtn.disabled = true;
    if (contactNote) contactNote.textContent = 'Sending…';

    try {
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Request failed');
      if (contactNote) contactNote.textContent = 'Thank you — our design team will be in touch shortly.';
      contactForm.reset();
    } catch (err) {
      if (contactNote) contactNote.textContent = 'Something went wrong — please call or WhatsApp us directly.';
    } finally {
      submitBtn.disabled = false;
    }
  });

});
