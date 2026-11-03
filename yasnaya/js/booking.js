(function () {
  // ===================== НАСТРОЙКИ =====================
  // Адрес веб-приложения Apps Script (оканчивается на /exec)
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx0jHcaKN--qWaxPMAev5sT7C8g2Lc32IQDXojUSHPbheFrniKYsMuvkKtatDYMJR-V/exec';

  // Цена дома за ночь. Пары [до скольки человек включительно, цена, р]
  const RATES = {
    // Пн–Чт
    weekday: [[2, 200], [4, 300], [6, 400], [8, 450], [9, 470],
              [10, 490], [11, 510], [12, 530], [13, 550], [14, 570]],
    // Пт–Вс
    weekend: [[2, 300], [4, 400], [6, 550], [8, 600], [9, 625],
              [10, 650], [11, 675], [12, 700], [13, 725], [14, 750]],
  };

  const PRICING = {
    petFee: 0,             // доплата за питомца, разово (р); 0 = бесплатно
    banya: 150,            // Русская баня, р
    chan: 200,             // Сибирский чан, р
    extrasPerNight: false, // false = один раз за весь заезд, true = за каждую ночь
  };
  // =====================================================

  const scriptReady = SCRIPT_URL.indexOf('ТВОЙ_ID') === -1;

  const $ = (id) => document.getElementById(id);
  const daysEl = $('days'), titleEl = $('month-title');
  const summaryEl = $('summary-dates');
  const totalEl = $('total'), detailsEl = $('total-details'), statusEl = $('form-status');
  const form = $('booking-form'), submitBtn = $('submit-btn');
  const extraBanya = $('extra-banya'), extraChan = $('extra-chan');
  const petsOn = $('f-pets'), petsWrap = $('pets-wrap');

  let BUSY = [];               // занятые ночи, приходят из Google Таблицы
  let view = new Date();
  view.setDate(1);
  let start = null, end = null;
  let quote = null;            // последний расчёт цены

  const iso = (d) => d.toISOString().slice(0, 10);
  const toDate = (s) => new Date(s + 'T12:00:00');
  const fmt = (s) => s.split('-').reverse().join('.');
  const money = (n) => n.toLocaleString('ru-RU') + ' р';

  // ночь с воскресенья, пятницы и субботы считаем выходной, остальные будни
  const isWeekend = (d) => { const wd = d.getDay(); return wd === 0 || wd === 5 || wd === 6; };

  // цена за ночь для числа гостей: берём первую подходящую строку тарифа
  function priceFor(kind, guests) {
    const tiers = RATES[kind];
    for (const [upTo, price] of tiers) {
      if (guests <= upTo) return price;
    }
    return tiers[tiers.length - 1][1];
  }

  // цены услуг в подписях флажков
  const suffix = PRICING.extrasPerNight ? ' / ночь' : '';
  $('price-banya').textContent = money(PRICING.banya) + suffix;
  $('price-chan').textContent = money(PRICING.chan) + suffix;

  // ---------- календарь ----------
  function render() {
    titleEl.textContent = view.toLocaleString('ru', { month: 'long', year: 'numeric' });
    daysEl.innerHTML = '';
    const y = view.getFullYear(), m = view.getMonth();
    const offset = (new Date(y, m, 1).getDay() + 6) % 7; // неделя с понедельника
    for (let i = 0; i < offset; i++) daysEl.appendChild(document.createElement('span'));

    const today = new Date().setHours(0, 0, 0, 0);
    const count = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= count; d++) {
      const date = new Date(y, m, d, 12);
      const key = iso(date);
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = d;
      if (BUSY.includes(key) || date < today) { b.classList.add('busy'); b.disabled = true; }
      if (start && key >= start && key <= (end || start)) b.classList.add('picked');
      b.addEventListener('click', () => pick(key));
      daysEl.appendChild(b);
    }
  }

  // есть ли занятые ночи между заездом и выездом
  function hasBusyBetween(a, b) {
    for (let d = toDate(a); iso(d) < b; d.setDate(d.getDate() + 1)) {
      if (BUSY.includes(iso(d))) return true;
    }
    return false;
  }

  function pick(key) {
    if (!start || end) { start = key; end = null; setStatus(''); }
    else if (key > start) {
      if (hasBusyBetween(start, key)) {
        setStatus('В выбранный период есть занятые даты. Выберите другие.', true);
        start = key; end = null;
      } else { end = key; setStatus(''); }
    } else { start = key; }
    render();
    calc();
  }

  // ---------- расчёт цены ----------
  function calc() {
    petsWrap.hidden = !petsOn.checked;
    quote = null;
    detailsEl.textContent = '';

    // день ещё не выбран: цен не видно
    if (!start) {
      summaryEl.textContent = 'Выберите дату заезда и выезда';
      totalEl.textContent = '';
      return;
    }

    const guests = +$('f-guests').value;

    // выбран только заезд: показываем цену этой ночи
    if (!end) {
      const price = priceFor(isWeekend(toDate(start)) ? 'weekend' : 'weekday', guests);
      summaryEl.textContent = `Заезд: ${fmt(start)}. Теперь выберите дату выезда.`;
      totalEl.textContent = `Ночь с ${fmt(start)}: ${money(price)}`;
      detailsEl.textContent = `Цена указана для ${guests} чел.`;
      return;
    }

    // выбраны заезд и выезд: считаем всё
    let weekdayNights = 0, weekendNights = 0;
    for (let d = toDate(start); iso(d) < end; d.setDate(d.getDate() + 1)) {
      if (isWeekend(d)) weekendNights++; else weekdayNights++;
    }
    const nights = weekdayNights + weekendNights;

    const lines = [];
    let sum = 0;

    [['weekday', 'Будни (Пн–Чт)', weekdayNights],
     ['weekend', 'Выходные (Пт–Вс)', weekendNights]].forEach(([kind, label, n]) => {
      if (!n) return;
      const price = priceFor(kind, guests);
      const v = n * price;
      sum += v;
      lines.push(`${label}: ${n} ноч. × ${money(price)} = ${money(v)}`);
    });

    if (petsOn.checked && PRICING.petFee) {
      sum += PRICING.petFee; lines.push(`Питомец: ${money(PRICING.petFee)}`);
    }

    // баня и чан: фиксированная цена
    const times = PRICING.extrasPerNight ? nights : 1;
    const chosen = [];
    [[extraBanya, 'Баня', PRICING.banya], [extraChan, 'Чан', PRICING.chan]].forEach(([box, label, price]) => {
      if (!box.checked) return;
      const v = price * times;
      sum += v;
      chosen.push(label);
      lines.push(times > 1
        ? `${label}: ${times} × ${money(price)} = ${money(v)}`
        : `${label}: ${money(v)}`);
    });

    quote = { nights, total: sum, details: lines.join('\n'), extras: chosen.join(', ') };
    summaryEl.textContent = `${fmt(start)} → ${fmt(end)} (${nights} ноч., ${guests} чел.)`;
    totalEl.textContent = `Итого: ${money(sum)}`;
    detailsEl.textContent = lines.join('\n');
  }

  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.classList.toggle('form-status--error', !!isError);
  }

  // ---------- занятые даты из таблицы ----------
  async function loadBusy() {
    if (!scriptReady) return;
    try {
      const res = await fetch(SCRIPT_URL + '?action=busy');
      const data = await res.json();
      if (Array.isArray(data.busy)) { BUSY = data.busy; render(); }
    } catch (e) {
      console.warn('Не удалось загрузить занятые даты', e);
    }
  }

  // ---------- отправка заявки ----------
  function resetForm() {
    form.reset();
    start = end = null;
    render();
    calc();
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus('');

    if (!start || !end || !quote) return setStatus('Выберите даты заезда и выезда в календаре', true);

    const name = $('f-name').value.trim();
    const contact = $('f-contact').value.trim();
    if (name.length < 3) return setStatus('Укажите ФИО', true);
    if (contact.length < 5) return setStatus('Укажите телефон или ник в Telegram', true);
    if (!$('f-agree').checked) return setStatus('Нужно согласие на обработку данных', true);

    const payload = {
      name,
      contact,
      guests: +$('f-guests').value,
      pets: petsOn.checked ? ($('f-pets-info').value.trim() || 'да') : 'нет',
      comment: $('f-comment').value.trim(),
      checkIn: start,
      checkOut: end,
      nights: quote.nights,
      extras: quote.extras,       // например «Баня, Чан»
      total: quote.total,
      details: quote.details,
      website: $('f-trap').value, // ловушка для ботов
    };

    // пока адрес Apps Script не вписан, заявку никуда не отправляем
    if (!scriptReady) {
      console.log('Заявка (пока не отправляется):', payload);
      return setStatus('Форма заполнена верно. Приём заявок ещё не подключён: впишите адрес в SCRIPT_URL.', true);
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправляем…';
    try {
      // Content-Type не указываем: так браузер не делает лишний предзапрос, который Google не поддерживает
      const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
      const result = await res.json();

      if (!result.ok) {
        if (result.error === 'busy') {
          await loadBusy();
          start = end = null;
          render();
          calc();
          return setStatus('Эти даты уже заняты. Выберите другие.', true);
        }
        throw new Error(result.error || 'error');
      }

      resetForm();
      setStatus('Спасибо! Заявка отправлена, мы свяжемся с вами для подтверждения.');
    } catch (err) {
      console.error(err);
      setStatus('Не удалось отправить заявку (' + err.message + '). Напишите нам в Instagram или Telegram.', true);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Забронировать на сайте';
    }
  });

  // ---------- события ----------
  $('prev').addEventListener('click', () => { view.setMonth(view.getMonth() - 1); render(); });
  $('next').addEventListener('click', () => { view.setMonth(view.getMonth() + 1); render(); });
  [extraBanya, extraChan, petsOn, $('f-guests')].forEach((el) => {
    el.addEventListener('change', calc);
  });

  render();
  calc();
  loadBusy();
})();