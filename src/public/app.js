const state = {
  reservations: [],
  dashboard: {},
  calendarDate: new Date(),
  editingId: null
};

const currency = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });

const elements = {
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

function asDate(value) {
  return new Date(`${value}T00:00:00`);
}

function calculateNights() {
  if (!fields.check_in.value || !fields.check_out.value) {
    fields.nights.value = '';
    return;
  }
  const nights = Math.round((asDate(fields.check_out.value) - asDate(fields.check_in.value)) / 86400000);
  fields.nights.value = nights > 0 ? nights : 0;
}

function calculateRemaining() {
  const total = Number(fields.total_amount.value || 0);
  const deposit = Number(fields.deposit_paid.value || 0);
  fields.remaining_amount.value = Math.max(0, total - deposit).toFixed(2);
}

function reservationPayload() {
  return {
    guest_full_name: fields.guest_full_name.value,
    guest_phone: fields.guest_phone.value,
    guest_email: fields.guest_email.value,
    adults: Number(fields.adults.value),
    children: Number(fields.children.value),
    check_in: fields.check_in.value,
    check_out: fields.check_out.value,
    total_amount: Number(fields.total_amount.value),
    deposit_paid: Number(fields.deposit_paid.value),
    status: fields.status.value,
    notes: fields.notes.value
  };
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed.' }));
    throw new Error(error.message || 'Request failed.');
  }
  if (response.status === 204) return null;
  return response.json();
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
          <h3>${reservation.guest_full_name}</h3>
          <div class="reservation-meta">
            <span>${dateFormatter.format(asDate(reservation.check_in))} → ${dateFormatter.format(asDate(reservation.check_out))}</span>
            ${compact ? '' : `<span>${reservation.guest_phone} · ${reservation.guest_email}</span>`}
            <span>${reservation.adults} adult(s), ${reservation.children} child(ren) · ${reservation.nights} night(s)</span>
            <span>${currency.format(reservation.total_amount)} total · ${currency.format(reservation.remaining_amount)} remaining</span>
          </div>
        </div>
        <span class="badge ${reservation.status}">${reservation.status}</span>
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
        ${bookings.slice(0, 2).map((booking) => `<span class="calendar-pill">${booking.guest_full_name}</span>`).join('')}
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
  const [reservations, dashboard] = await Promise.all([
    api('/api/reservations'),
    api('/api/reservations/dashboard')
  ]);
  state.reservations = reservations;
  state.dashboard = dashboard;
  renderDashboard();
  renderReservations();
  renderCalendar();
}

async function saveReservation(event) {
  event.preventDefault();
  elements.formMessage.textContent = '';
  calculateNights();
  calculateRemaining();
  try {
    const payload = reservationPayload();
    const path = state.editingId ? `/api/reservations/${state.editingId}` : '/api/reservations';
    const method = state.editingId ? 'PUT' : 'POST';
    await api(path, { method, body: JSON.stringify(payload) });
    elements.dialog.close();
    await loadData();
  } catch (error) {
    elements.formMessage.textContent = error.message;
  }
}

async function deleteReservation() {
  if (!state.editingId || !confirm('Delete this reservation?')) return;
  await api(`/api/reservations/${state.editingId}`, { method: 'DELETE' });
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
  elements.reservationList.innerHTML = `<div class="empty-state">${error.message}</div>`;
});
