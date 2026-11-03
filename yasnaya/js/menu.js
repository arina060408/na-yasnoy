(function () {
  const header = document.getElementById('header');
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  if (!header || !burger || !nav) return;

  // ---------- меню на телефоне ----------
  function setOpen(open) {
    header.classList.toggle('header--open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.textContent = open ? '✕' : '☰';
  }

  burger.addEventListener('click', function () {
    setOpen(!header.classList.contains('header--open'));
  });
  // выбрали пункт: меню закрывается
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });
  // клик мимо шапки и Esc тоже закрывают
  document.addEventListener('click', function (e) {
    if (!header.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth > 900) setOpen(false);
  });

  // ---------- подсветка текущего раздела ----------
  const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
  const sections = new Map();
  links.forEach(function (a) {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el && id !== 'top') sections.set(el, a);
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (l) { l.classList.remove('is-active'); });
        sections.get(entry.target).classList.add('is-active');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });

    sections.forEach(function (_, el) { io.observe(el); });
  }
})();