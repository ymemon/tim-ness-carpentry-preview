(() => {
  const header = document.querySelector('[data-site-header]');
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.site-navigation');

  if (header) {
    const updateHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  }

  if (toggle && nav) {
    const visibleLabel = toggle.querySelector('[data-menu-label]');
    const assistiveLabel = toggle.querySelector('[data-menu-assistive-label]');

    const setMenuState = (isOpen) => {
      toggle.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('menu-open', isOpen);
      if (visibleLabel) visibleLabel.textContent = isOpen ? 'Close' : 'Menu';
      if (assistiveLabel) assistiveLabel.textContent = isOpen ? 'Close navigation' : 'Open navigation';
    };

    const closeMenu = () => setMenuState(false);

    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      setMenuState(!isOpen);
    });

    nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    window.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        toggle.focus();
      }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) closeMenu();
    });
  }

  const revealItems = document.querySelectorAll(
    '.home-feature-card, .service-item, .value-card, .portfolio-piece, .process-step-rich, .area-card, .split-image'
  );

  if ('IntersectionObserver' in window && revealItems.length) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    revealItems.forEach((item, index) => {
      item.classList.add('reveal-ready');
      item.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 70}ms`);
      revealObserver.observe(item);
    });
  }

  const calendar = document.querySelector('[data-calendar]');
  const appointmentForm = document.querySelector('[data-appointment-form]');

  if (calendar && appointmentForm) {
    const config = window.TimNessScheduler || {};
    const heading = calendar.querySelector('[data-calendar-heading]');
    const daysContainer = calendar.querySelector('[data-calendar-days]');
    const status = calendar.querySelector('[data-calendar-status]');
    const previousButton = calendar.querySelector('[data-calendar-prev]');
    const nextButton = calendar.querySelector('[data-calendar-next]');
    const dateInput = appointmentForm.querySelector('[data-appointment-date]');
    const timeInputs = [...appointmentForm.querySelectorAll('input[name="appointment_time"]')];
    const submitButton = appointmentForm.querySelector('[data-appointment-submit]');
    const booked = config.booked || {};
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
    const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const toDate = (value) => {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    const toIsoDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const localToday = new Date();
    localToday.setHours(0, 0, 0, 0);
    const fallbackMin = new Date(localToday);
    fallbackMin.setDate(fallbackMin.getDate() + 1);
    const fallbackMax = new Date(localToday);
    fallbackMax.setDate(fallbackMax.getDate() + 90);
    const minimumDate = config.minDate ? toDate(config.minDate) : fallbackMin;
    const maximumDate = config.maxDate ? toDate(config.maxDate) : fallbackMax;
    let visibleMonth = new Date(minimumDate.getFullYear(), minimumDate.getMonth(), 1);
    let selectedDate = '';

    const updateSubmitState = () => {
      const selectedTime = timeInputs.some((input) => input.checked && !input.disabled);
      submitButton.disabled = !(selectedDate && selectedTime);
    };

    const selectDate = (date) => {
      selectedDate = toIsoDate(date);
      dateInput.value = selectedDate;
      const reservedTimes = booked[selectedDate] || [];

      timeInputs.forEach((input) => {
        input.checked = false;
        input.disabled = reservedTimes.includes(input.value);
      });

      status.textContent = `${dayFormatter.format(date)} selected. Choose an available time.`;
      renderCalendar();
      updateSubmitState();

      const firstAvailableTime = timeInputs.find((input) => !input.disabled);
      if (firstAvailableTime) firstAvailableTime.focus();
    };

    const renderCalendar = () => {
      heading.textContent = monthFormatter.format(visibleMonth);
      daysContainer.replaceChildren();

      const year = visibleMonth.getFullYear();
      const month = visibleMonth.getMonth();
      const firstWeekday = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let blank = 0; blank < firstWeekday; blank += 1) {
        const placeholder = document.createElement('span');
        placeholder.className = 'calendar-blank';
        placeholder.setAttribute('aria-hidden', 'true');
        daysContainer.appendChild(placeholder);
      }

      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(year, month, day);
        const isoDate = toIsoDate(date);
        const weekday = date.getDay();
        const reservedTimes = booked[isoDate] || [];
        const isFull = reservedTimes.length >= timeInputs.length;
        const unavailable = date < minimumDate || date > maximumDate || weekday === 0 || weekday === 6 || isFull;
        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'calendar-day';
        button.textContent = String(day);
        button.disabled = unavailable;
        button.setAttribute('aria-label', `${dayFormatter.format(date)}${isFull ? ', fully requested' : ''}`);
        button.setAttribute('aria-pressed', String(selectedDate === isoDate));

        if (toIsoDate(date) === toIsoDate(localToday)) button.classList.add('is-today');
        if (selectedDate === isoDate) button.classList.add('is-selected');
        if (isFull) button.classList.add('is-full');
        if (!unavailable) button.addEventListener('click', () => selectDate(date));

        daysContainer.appendChild(button);
      }

      const previousMonth = new Date(year, month - 1, 1);
      const nextMonth = new Date(year, month + 1, 1);
      previousButton.disabled = previousMonth < new Date(minimumDate.getFullYear(), minimumDate.getMonth(), 1);
      nextButton.disabled = nextMonth > new Date(maximumDate.getFullYear(), maximumDate.getMonth(), 1);
    };

    previousButton.addEventListener('click', () => {
      visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1);
      renderCalendar();
    });

    nextButton.addEventListener('click', () => {
      visibleMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1);
      renderCalendar();
    });

    timeInputs.forEach((input) => input.addEventListener('change', updateSubmitState));

    appointmentForm.addEventListener('submit', (event) => {
      const selectedTime = timeInputs.some((input) => input.checked && !input.disabled);
      if (!selectedDate || !selectedTime) {
        event.preventDefault();
        status.textContent = 'Choose an available date and time before sending your request.';
        calendar.focus({ preventScroll: false });
      }
    });

    calendar.setAttribute('tabindex', '-1');
    renderCalendar();
  }
})();
