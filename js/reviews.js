(function () {
  // ===================== ОТЗЫВЫ =====================
  // Как добавить отзыв: скопируй любую строку { ... }, вставь в список,
  // поменяй имя, месяц и текст. Между строками обязательно запятая.
  // stars — оценка от 1 до 5. Новые отзывы удобнее ставить в начало списка.
  const REVIEWS = [
    {
      name: 'Карина', date: 'Июнь 2026', stars: 5,
      text: 'Снимали дом на сутки и остались очень довольны! Расположение отличное: центр Гродно рядом, до всех достопримечательностей можно дойти пешком. В доме уютно, есть всё необходимое и для жизни, и для отдыха на природе. Отдельно приятно, что можно приехать с питомцем.',
    },
    {
      name: 'Андрей', date: 'Август 2026', stars: 5,
      text: 'Просто отлично! Новый комфортный дом со всем необходимым, очень уютно и тихо. Баня на высоте, везде чистота и порядок. Спасибо хозяевам за прекрасный отдых!',
    },
    {
      name: 'Ольга', date: 'Июль 2026', stars: 5,
      text: 'Прекрасно провели время в этом доме! Расслабились в горячем чане и в бане. Хозяева сделали всё для нашего комфортного отдыха, большое спасибо. До центра города около 15 минут пешком.',
    },
    {
      name: 'Кристина', date: 'Август 2026', stars: 5,
      text: 'В доме чисто и уютно, чувствуется, что хозяева заботятся о комфорте гостей: всё предусмотрено до мелочей. Они всегда на связи и с радостью подскажут, что посмотреть в городе и куда съездить за его пределы.',
    },
    {
      name: 'Алексей', date: 'Июнь 2026', stars: 5,
      text: 'Всё прошло отлично: хозяева всегда были на связи, подсказывали и помогали во всём. Просторный чистый дом, идеально подходит для компании. До исторического центра около 10–15 минут пешком. Рекомендуем!',
    },
  ];

  const DELAY = 6000; // пауза между сменами, мс (отзывы читаются дольше фото)
  // ===================================================

  const slider = document.getElementById('reviews-slider');
  const track = document.getElementById('reviews-track');
  const prevBtn = document.getElementById('reviews-prev');
  const nextBtn = document.getElementById('reviews-next');
  const dotsBox = document.getElementById('reviews-dots');
  if (!slider || !track) return;

  // карточки строим через textContent: текст отзыва не может сломать страницу
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  REVIEWS.forEach((r) => {
    const card = el('article', 'rcard');

    const head = el('div', 'rcard__head');
    head.appendChild(el('span', 'rcard__avatar', (r.name || '?').trim().charAt(0).toUpperCase()));
    const who = el('div', 'rcard__who');
    who.appendChild(el('span', 'rcard__name', r.name));
    if (r.date) who.appendChild(el('span', 'rcard__date', r.date));
    head.appendChild(who);

    card.appendChild(head);
    card.appendChild(el('div', 'rcard__stars', '★'.repeat(Math.max(1, Math.min(5, r.stars || 5)))));
    card.appendChild(el('p', 'rcard__text', r.text));
    track.appendChild(card);
  });

  const cards = track.querySelectorAll('.rcard');
  let timer = null;

  // шаг прокрутки = ширина карточки + промежуток
  function step() {
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return cards[0].getBoundingClientRect().width + gap;
  }
  function pages() {
    return Math.max(1, Math.round((track.scrollWidth - track.clientWidth) / step()) + 1);
  }
  function current() {
    return Math.round(track.scrollLeft / step());
  }
  function goTo(i) {
    const last = pages() - 1;
    if (i > last) i = 0;   // после последнего возвращаемся к первому
    if (i < 0) i = last;
    track.scrollTo({ left: i * step(), behavior: 'smooth' });
  }

  function markDot() {
    dotsBox.querySelectorAll('button').forEach((d, i) =>
      d.classList.toggle('active', i === current())
    );
  }
  function buildDots() {
    dotsBox.innerHTML = '';
    for (let i = 0; i < pages(); i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Отзыв ' + (i + 1));
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

  prevBtn.addEventListener('click', () => { goTo(current() - 1); restart(); });
  nextBtn.addEventListener('click', () => { goTo(current() + 1); restart(); });

  track.addEventListener('scroll', markDot);
  slider.addEventListener('mouseenter', stopAuto);
  slider.addEventListener('mouseleave', startAuto);
  slider.addEventListener('touchstart', stopAuto, { passive: true });
  slider.addEventListener('touchend', startAuto, { passive: true });

  // если все отзывы помещаются на экран, стрелки и точки прячем
  function refresh() {
    slider.classList.toggle('rslider--static', pages() <= 1);
    buildDots();
    startAuto();
  }
  window.addEventListener('resize', refresh);
  window.addEventListener('load', refresh);
  refresh();
})();