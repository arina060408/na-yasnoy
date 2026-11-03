(function () {
  const slider = document.getElementById('slider');
  const track = document.getElementById('track');
  const prevBtn = document.getElementById('prev-slide');
  const nextBtn = document.getElementById('next-slide');
  const dotsBox = document.getElementById('dots');

  if (!slider || !track) { console.error('Слайдер: не найден #slider или #track'); return; }

  const slides = track.querySelectorAll('img');
  const DELAY = 4000; // пауза между сменами, мс
  let timer = null;

  function step() {
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return slides[0].getBoundingClientRect().width + gap;
  }

  function pages() {
    return Math.max(1, Math.round((track.scrollWidth - track.clientWidth) / step()) + 1);
  }

  function current() {
    return Math.round(track.scrollLeft / step());
  }

  function goTo(i) {
    const last = pages() - 1;
    if (i > last) i = 0;       // после последнего возвращаемся в начало
    if (i < 0) i = last;       // перед первым идём в конец
    track.scrollTo({ left: i * step(), behavior: 'smooth' });
  }

  function markDot() {
    if (!dotsBox) return;
    dotsBox.querySelectorAll('button').forEach((d, i) =>
      d.classList.toggle('active', i === current())
    );
  }

  function buildDots() {
    if (!dotsBox) return;
    dotsBox.innerHTML = '';
    for (let i = 0; i < pages(); i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Слайд ' + (i + 1));
      b.addEventListener('click', () => { goTo(i); restart(); });
      dotsBox.appendChild(b);
    }
    markDot();
  }

  function stopAuto() { clearInterval(timer); }
  function startAuto() {
    stopAuto();
    if (pages() > 1) timer = setInterval(() => goTo(current() + 1), DELAY);
  }
  function restart() { stopAuto(); startAuto(); }

  if (prevBtn) prevBtn.addEventListener('click', () => { goTo(current() - 1); restart(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { goTo(current() + 1); restart(); });

  track.addEventListener('scroll', markDot);
  slider.addEventListener('mouseenter', stopAuto);
  slider.addEventListener('mouseleave', startAuto);
  slider.addEventListener('touchstart', stopAuto, { passive: true });
  slider.addEventListener('touchend', startAuto, { passive: true });

  function refresh() {
    slider.classList.toggle('slider--static', pages() <= 1);
    buildDots();
    startAuto();
  }

  window.addEventListener('resize', refresh);
  window.addEventListener('load', refresh);
  refresh();
})();