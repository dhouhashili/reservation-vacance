const SUPABASE_URL = 'https://kqkvfavasrvukagratcu.supabase.co/rest/v1/';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtxa3ZmYXZhc3J2dWthZ3JhdGN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzgxNTYsImV4cCI6MjA5NTY1NDE1Nn0.CHfG25-2_WX99qiYo8PLkoLWF-QXNXCS2zWMJV9S22w';
const RESERVATIONS_TABLE = 'reservations';
const APP_CURRENCY = 'EUR';

const state = {
  reservations: [],
  dashboard: {},
  calendarDate: new Date(),
  editingId: null
};

const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: APP_CURRENCY });
const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const statuses = new Set(['Pending', 'Confirmed', 'Paid', 'Cancelled']);

const elements = {
  setupNotice: document.querySelector('#setupNotice'),
  monthlyRevenue: document.querySelector('#monthlyRevenue'),
  occupancyRate: document.querySelector('#occupancyRate'),
  remainingToCollect: document.querySelector('#remainingToCollect'),
  upcomingReservations: document.querySelector('#upcomingReservations'),
  reservationList: document.querySelector('#reservationList'),
  calendar: document.querySelector('#calendar'),
  calendarTitle: document.querySelector('#calendarTitle'),
  dialog: document.querySelector('#reservationDialog'),
  form: document.querySelector('#reservationForm'),
  dialogTitle: document.querySelector('#dialogTitle'),
  formMessage: document.querySelector('#formMessage'),
  deleteReservation: document.querySelector('#deleteReservation')
};

const fields = {
  id: document.querySelector('#reservationId'),
  guest_full_name: document.querySelector('#guestFullName'),
  guest_phone: document.querySelector('#guestPhone'),
  guest_email: document.querySelector('#guestEmail'),
  adults: document.querySelector('#adults'),
  children: document.querySelector('#children'),
  check_in: document.querySelector('#checkIn'),
  check_out: document.querySelector('#checkOut'),
  nights: document.querySelector('#nights'),
  total_amount: document.querySelector('#totalAmount'),
  deposit_paid: document.querySelector('#depositPaid'),
  remaining_amount: document.querySelector('#remainingAmount'),
  status: document.querySelector('#status'),
  notes: document.querySelector('#notes')
};

const isSupabaseConfigured = SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY';
const supabaseClient = isSupabaseConfigured ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

function asDate(value) {
  return new Date(`${value}T00:00:00`);
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateNightsBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const nights = Math.round((asDate(checkOut) - asDate(checkIn)) / 86400000);
  return nights > 0 ? nights : 0;
}

function calculateNights() {
  fields.nights.value = calculateNightsBetween(fields.check_in.value, fields.check_out.value) || '';
}

function calculateRemaining() {
  const total = toNumber(fields.total_amount.value);
  const deposit = toNumber(fields.deposit_paid.value);
  fields.remaining_amount.value = Math.max(0, total - deposit).toFixed(2);
}

function normalizeReservation(record) {
  const total = toNumber(record.total_amount);
  const deposit = toNumber(record.deposit_paid);
  const nights = record.nights ?? calculateNightsBetween(record.check_in, record.check_out);
  return {
    ...record,
    adults: Number(record.adults || 1),
    children: Number(record.children || 0),
    nights,
    total_amount: total,
    deposit_paid: deposit,
    remaining_amount: record.remaining_amount === null || record.remaining_amount === undefined ? Math.max(0, total - deposit) : toNumber(record.remaining_amount)
  };
}

function validateReservation(payload) {
  const requiredFields = ['guest_full_name', 'guest_phone', 'guest_email', 'check_in', 'check_out'];
  for (const field of requiredFields) {
    if (!payload[field] || String(payload[field]).trim() === '') {
      throw new Error(`${field.replaceAll('_', ' ')} is required.`);
    }
  }

  if (calculateNightsBetween(payload.check_in, payload.check_out) < 1) {
    throw new Error('Check-out date must be after check-in date.');
  }

  if (!statuses.has(payload.status || 'Pending')) {
    throw new Error('Reservation status is invalid.');
  }

  if (toNumber(payload.adults) < 1) {
    throw new Error('At least one adult is required.');
  }

  if (toNumber(payload.children) < 0 || toNumber(payload.total_amount) < 0 || toNumber(payload.deposit_paid) < 0) {
    throw new Error('Guest counts and amounts cannot be negative.');
  }
}

function reservationPayload() {
  const total = toNumber(fields.total_amount.value);
  const deposit = toNumber(fields.deposit_paid.value);
  const payload = {
    guest_full_name: fields.guest_full_name.value.trim(),
    guest_phone: fields.guest_phone.value.trim(),
    guest_email: fields.guest_email.value.trim(),
    adults: Math.max(1, Math.trunc(toNumber(fields.adults.value) || 1)),
    children: Math.max(0, Math.trunc(toNumber(fields.children.value))),
    check_in: fields.check_in.value,
    check_out: fields.check_out.value,
    total_amount: total,
    deposit_paid: deposit,
    status: fields.status.value || 'Pending',
    notes: fields.notes.value.trim() || null
  };
  validateReservation(payload);
  return payload;
}

function buildDashboard(reservations) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  const activeReservations = reservations.filter((reservation) => reservation.status !== 'Cancelled');
  const monthlyRevenue = activeReservations.reduce((total, reservation) => {
    const checkIn = asDate(reservation.check_in);
    return checkIn.getFullYear() === today.getFullYear() && checkIn.getMonth() === today.getMonth()
      ? total + reservation.total_amount
      : total;
  }, 0);

  const remainingToCollect = activeReservations.reduce((total, reservation) => total + reservation.remaining_amount, 0);
  const occupiedNightsThisMonth = activeReservations.reduce((total, reservation) => {
    const start = asDate(reservation.check_in) > monthStart ? asDate(reservation.check_in) : monthStart;
    const end = asDate(reservation.check_out) < monthEnd ? asDate(reservation.check_out) : monthEnd;
    const nights = Math.max(0, Math.round((end - start) / 86400000));
    return total + nights;
  }, 0);

  return {
    monthly_revenue: monthlyRevenue,
    remaining_to_collect: remainingToCollect,
    occupancy_rate: Math.min(100, Math.round((occupiedNightsThisMonth / daysInMonth) * 100)),
    upcoming: activeReservations
      .filter((reservation) => asDate(reservation.check_in) >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
      .sort((a, b) => asDate(a.check_in) - asDate(b.check_in))
      .slice(0, 6)
  };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[character]));
}

function showEmptyState(message) {
  const safeMessage = escapeHtml(message);
  elements.reservationList.innerHTML = `<div class="empty-state">${safeMessage}</div>`;
  elements.upcomingReservations.innerHTML = `<div class="empty-state">${safeMessage}</div>`;
}

function renderDashboard() {
  elements.monthlyRevenue.textContent = currency.format(state.dashboard.monthly_revenue || 0);
  elements.occupancyRate.textContent = `${state.dashboard.occupancy_rate || 0}%`;
  elements.remainingToCollect.textContent = currency.format(state.dashboard.remaining_to_collect || 0);
  renderReservationCards(elements.upcomingReservations, state.dashboard.upcoming || [], true);
}

function renderReservationCards(container, reservations, compact = false) {
  if (!reservations.length) {
    container.innerHTML = '<div class="empty-state">No reservations to show yet.</div>';
    return;
  }

  container.innerHTML = reservations.map((reservation) => `
    <article class="reservation-card">
      <header>
        <div>
          <h3>${escapeHtml(reservation.guest_full_name)}</h3>
          <div class="reservation-meta">
            <span>${dateFormatter.format(asDate(reservation.check_in))} → ${dateFormatter.format(asDate(reservation.check_out))}</span>
            ${compact ? '' : `<span>${escapeHtml(reservation.guest_phone)} · ${escapeHtml(reservation.guest_email)}</span>`}
            <span>${reservation.adults} adult(s), ${reservation.children} child(ren) · ${reservation.nights} night(s)</span>
            <span>${currency.format(reservation.total_amount)} total · ${currency.format(reservation.remaining_amount)} remaining</span>
          </div>
        </div>
        <span class="badge ${escapeHtml(reservation.status)}">${escapeHtml(reservation.status)}</span>
      </header>
      <div class="card-actions"><button type="button" data-edit-id="${reservation.id}">Edit</button></div>
    </article>
  `).join('');
}

function renderReservations() {
  renderReservationCards(elements.reservationList, state.reservations);
}

function reservationsForDay(day) {
  return state.reservations.filter((reservation) => {
    const start = asDate(reservation.check_in);
    const end = asDate(reservation.check_out);
    return reservation.status !== 'Cancelled' && day >= start && day < end;
  });
}

function renderCalendar() {
  const year = state.calendarDate.getFullYear();
  const month = state.calendarDate.getMonth();
  elements.calendarTitle.textContent = monthFormatter.format(state.calendarDate);
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(start.getDate() - firstDay.getDay());

  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    const bookings = reservationsForDay(day);
    return `
      <div class="day ${day.getMonth() === month ? '' : 'muted'}">
        <div class="day-number">${day.getDate()}</div>
        ${bookings.slice(0, 2).map((booking) => `<span class="calendar-pill">${escapeHtml(booking.guest_full_name)}</span>`).join('')}
      </div>
    `;
  });
  elements.calendar.innerHTML = days.join('');
}

function resetForm() {
  elements.form.reset();
  state.editingId = null;
  fields.id.value = '';
  fields.adults.value = 2;
  fields.children.value = 0;
  fields.total_amount.value = 0;
  fields.deposit_paid.value = 0;
  fields.status.value = 'Pending';
  fields.notes.value = '';
  elements.dialogTitle.textContent = 'Add reservation';
  elements.deleteReservation.hidden = true;
  elements.formMessage.textContent = '';
  calculateNights();
  calculateRemaining();
}

function openReservation(reservation = null) {
  resetForm();
  if (reservation) {
    state.editingId = reservation.id;
    fields.id.value = reservation.id;
    for (const key of Object.keys(fields)) {
      if (key !== 'id' && reservation[key] !== undefined && fields[key]) fields[key].value = reservation[key] ?? '';
    }
    elements.dialogTitle.textContent = 'Edit reservation';
    elements.deleteReservation.hidden = false;
  }
  calculateNights();
  calculateRemaining();
  elements.dialog.showModal();
}

async function loadData() {
  if (!supabaseClient) {
    elements.setupNotice.hidden = false;
    showEmptyState('Connect Supabase to load reservations.');
    renderCalendar();
    return;
  }

  const { data, error } = await supabaseClient
    .from(RESERVATIONS_TABLE)
    .select('*')
    .order('check_in', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);

  state.reservations = (data || []).map(normalizeReservation);
  state.dashboard = buildDashboard(state.reservations);
  renderDashboard();
  renderReservations();
  renderCalendar();
}

async function saveReservation(event) {
  event.preventDefault();
  elements.formMessage.textContent = '';
  calculateNights();
  calculateRemaining();

  if (!supabaseClient) {
    elements.formMessage.textContent = 'Supabase is not configured yet.';
    return;
  }

  try {
    const payload = reservationPayload();
    const query = state.editingId
      ? supabaseClient.from(RESERVATIONS_TABLE).update(payload).eq('id', state.editingId)
      : supabaseClient.from(RESERVATIONS_TABLE).insert(payload);
    const { error } = await query;
    if (error) throw new Error(error.message);
    elements.dialog.close();
    await loadData();
  } catch (error) {
    elements.formMessage.textContent = error.message;
  }
}

async function deleteReservation() {
  if (!state.editingId || !confirm('Delete this reservation?')) return;
  const { error } = await supabaseClient.from(RESERVATIONS_TABLE).delete().eq('id', state.editingId);
  if (error) {
    elements.formMessage.textContent = error.message;
    return;
  }
  elements.dialog.close();
  await loadData();
}

document.querySelector('#newReservationButton').addEventListener('click', () => openReservation());
document.querySelector('#closeDialog').addEventListener('click', () => elements.dialog.close());
document.querySelector('#previousMonth').addEventListener('click', () => {
  state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
  renderCalendar();
});
document.querySelector('#nextMonth').addEventListener('click', () => {
  state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
  renderCalendar();
});
elements.form.addEventListener('submit', saveReservation);
elements.deleteReservation.addEventListener('click', deleteReservation);
[elements.reservationList, elements.upcomingReservations].forEach((container) => {
  container.addEventListener('click', (event) => {
    const button = event.target.closest('[data-edit-id]');
    if (!button) return;
    const reservation = state.reservations.find((item) => String(item.id) === button.dataset.editId);
    if (reservation) openReservation(reservation);
  });
});
[fields.check_in, fields.check_out].forEach((field) => field.addEventListener('input', calculateNights));
[fields.total_amount, fields.deposit_paid].forEach((field) => field.addEventListener('input', calculateRemaining));

loadData().catch((error) => {
  showEmptyState(error.message);
});
