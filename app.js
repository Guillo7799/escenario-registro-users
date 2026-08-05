const MAX_FILE_SIZE = 5 * 1024 * 1024;
const activeStatuses = ["Pendiente de aprobación", "Aprobada"];
const users = {
  creator: { id: "u1", name: "Laura Gómez", role: "Creador" },
  approver: { id: "u2", name: "Andrés Ruiz", role: "Aprobador" },
  selfApprover: { id: "u1", name: "Laura Gómez", role: "Aprobador" },
};

let currentUser = users.creator;
let selectedRequestId = null;
let requests = [
  {
    id: "SOL-001",
    identification: "900123456",
    fullName: "Comercial Andina SAS",
    email: "finanzas@andina.ec",
    clientType: "Jurídico",
    amount: 12500,
    requestDate: "2026-08-04",
    documentName: "certificado.pdf",
    validDocument: true,
    status: "Pendiente de aprobación",
    creatorId: "u3",
    creatorName: "Camila Torres",
    audit: [
      {
        action: "Solicitud creada",
        user: "Camila Torres",
        date: "04/08/2026, 09:15",
      },
    ],
  },
  {
    id: "SOL-002",
    identification: "1020304050",
    fullName: "Laura Gómez",
    email: "laura.gomez@example.com",
    clientType: "Natural",
    amount: 3500,
    requestDate: "2026-08-03",
    documentName: "soporte-ingresos.pdf",
    validDocument: true,
    status: "Pendiente de aprobación",
    creatorId: "u1",
    creatorName: "Laura Gómez",
    audit: [
      {
        action: "Solicitud creada",
        user: "Laura Gómez",
        date: "03/08/2026, 16:42",
      },
    ],
  },
];

const $ = (selector) => document.querySelector(selector);
const sections = [
  "#request-list-section",
  "#new-request-section",
  "#detail-section",
];

function showSection(selector) {
  sections.forEach((item) =>
    $(item).classList.toggle("d-none", item !== selector),
  );
  clearAlert();
}

function showAlert(message, type = "success") {
  const alert = $("#global-alert");
  alert.textContent = message;
  alert.className = `alert alert-${type}`;
}

function clearAlert() {
  $("#global-alert").className = "alert d-none";
  $("#global-alert").textContent = "";
}

function formatMoney(value) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function statusClass(status) {
  if (status === "Aprobada") return "status-approved";
  if (status === "Rechazada") return "status-rejected";
  return "status-pending";
}

function renderRequests() {
  $("#role-description").textContent =
    `${currentUser.name} · ${currentUser.role}`;
  $("#new-request-button").classList.toggle(
    "d-none",
    currentUser.role !== "Creador",
  );
  $("#requests-body").innerHTML = requests
    .map(
      (request) => `
    <tr>
      <td class="fw-semibold">${request.id}</td>
      <td>${request.identification}</td>
      <td>${request.fullName}<small class="d-block text-secondary">${request.clientType}</small></td>
      <td>${formatMoney(request.amount)}</td>
      <td><span class="status ${statusClass(request.status)}">${request.status}</span></td>
      <td class="text-end"><button class="btn btn-sm btn-outline-primary view-request" data-id="${request.id}" type="button">Ver detalle</button></td>
    </tr>`,
    )
    .join("");
  document
    .querySelectorAll(".view-request")
    .forEach((button) =>
      button.addEventListener("click", () => openDetail(button.dataset.id)),
    );
}

function resetValidation() {
  document
    .querySelectorAll("#request-form .is-invalid")
    .forEach((field) => field.classList.remove("is-invalid"));
  document
    .querySelectorAll("#request-form .invalid-feedback")
    .forEach((element) => {
      element.textContent = "";
    });
}

function invalidate(name, message) {
  const input = document.querySelector(`[name="${name}"]`);
  input.classList.add("is-invalid");
  const feedback = input
    .closest(".col-md-6, .col-12")
    .querySelector(".invalid-feedback");
  feedback.textContent = message;
}

async function isRealPdf(file) {
  if (!file || file.size < 5) return false;
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...header) === "%PDF-";
}

async function validateForm(form) {
  resetValidation();
  const data = new FormData(form);
  const values = Object.fromEntries(data.entries());
  const errors = {};
  const file = data.get("document");

  [
    "identification",
    "fullName",
    "email",
    "clientType",
    "amount",
    "requestDate",
  ].forEach((name) => {
    if (!String(values[name] || "").trim())
      errors[name] = "Este campo es obligatorio.";
  });
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
    errors.email = "Ingresa un correo electrónico válido.";
  const amount = Number(values.amount);
  if (values.amount && amount <= 0)
    errors.amount = "El monto debe ser mayor a 0.";
  if (values.clientType === "Jurídico" && amount < 1000)
    errors.amount = "Para clientes jurídicos el monto mínimo es 1.000.";

  const identificationExists = requests.some(
    (item) =>
      activeStatuses.includes(item.status) &&
      item.identification === String(values.identification).trim(),
  );
  const emailExists = requests.some(
    (item) =>
      activeStatuses.includes(item.status) &&
      item.email.toLowerCase() === String(values.email).trim().toLowerCase(),
  );
  if (identificationExists)
    errors.identification = "La identificación ya tiene una solicitud activa.";
  if (emailExists) errors.email = "El correo ya tiene una solicitud activa.";

  if (!file || file.size === 0) errors.document = "Adjunta un documento PDF.";
  else if (file.size > MAX_FILE_SIZE)
    errors.document = "El archivo no puede superar 5 MB.";
  else if (
    file.type !== "application/pdf" ||
    !file.name.toLowerCase().endsWith(".pdf") ||
    !(await isRealPdf(file))
  ) {
    errors.document = "El archivo debe ser un PDF válido.";
  }

  Object.entries(errors).forEach(([name, message]) =>
    invalidate(name, message),
  );
  return { valid: Object.keys(errors).length === 0, values, file };
}

function now() {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
}

function openDetail(id) {
  selectedRequestId = id;
  const request = requests.find((item) => item.id === id);
  $("#detail-title").textContent = request.id;
  $("#detail-content").innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <span class="status ${statusClass(request.status)}">${request.status}</span>
      <span class="small text-secondary">Creada por ${request.creatorName}</span>
    </div>
    <div class="detail-grid">
      <div class="detail-item"><span>Identificación</span><strong>${request.identification}</strong></div>
      <div class="detail-item"><span>Solicitante</span><strong>${request.fullName}</strong></div>
      <div class="detail-item"><span>Correo</span><strong>${request.email}</strong></div>
      <div class="detail-item"><span>Tipo de cliente</span><strong>${request.clientType}</strong></div>
      <div class="detail-item"><span>Monto solicitado</span><strong>${formatMoney(request.amount)}</strong></div>
      <div class="detail-item"><span>Documento</span><strong>${request.documentName}</strong></div>
    </div>`;

  const canDecide =
    currentUser.role === "Aprobador" &&
    request.status === "Pendiente de aprobación";
  $("#decision-panel").classList.toggle("d-none", !canDecide);
  $("#approve-button").disabled = request.creatorId === currentUser.id;
  $("#reject-button").disabled = request.creatorId === currentUser.id;
  $("#decision-comment").value = "";
  $("#decision-error").classList.add("d-none");
  renderAudit(request);
  showSection("#detail-section");

  if (canDecide && request.creatorId === currentUser.id) {
    showAlert(
      "No puedes aprobar o rechazar una solicitud creada por ti.",
      "warning",
    );
  }
}

function renderAudit(request) {
  $("#audit-list").innerHTML = request.audit
    .map(
      (entry) => `
    <li><strong>${entry.action}</strong><span class="audit-meta">${entry.date} · ${entry.user}</span></li>`,
    )
    .join("");
}

function decide(action) {
  const request = requests.find((item) => item.id === selectedRequestId);
  const comment = $("#decision-comment").value.trim();
  const error = $("#decision-error");
  error.classList.add("d-none");

  if (
    currentUser.role !== "Aprobador" ||
    request.creatorId === currentUser.id
  ) {
    showAlert("No tienes permiso para realizar esta acción.", "danger");
    return;
  }
  if (!request.validDocument) {
    error.textContent = "La solicitud no tiene un documento válido.";
    error.classList.remove("d-none");
    return;
  }
  if (action === "Rechazada" && !comment) {
    error.textContent = "El motivo de rechazo es obligatorio.";
    error.classList.remove("d-none");
    return;
  }
  if (action === "Aprobada" && request.amount > 10000 && !comment) {
    error.textContent =
      "La observación es obligatoria para montos mayores a 10.000.";
    error.classList.remove("d-none");
    return;
  }

  request.status = action;
  request.audit.push({
    action: `${action}${comment ? `: ${comment}` : ""}`,
    user: currentUser.name,
    date: now(),
  });
  renderRequests();
  openDetail(request.id);
  showAlert(`La solicitud fue ${action.toLowerCase()} correctamente.`);
}

$("#user-selector").addEventListener("change", (event) => {
  currentUser = users[event.target.value];
  renderRequests();
  showSection("#request-list-section");
});

$("#new-request-button").addEventListener("click", () => {
  $("#request-form").reset();
  resetValidation();
  $("#request-date").value = new Date().toISOString().slice(0, 10);
  showSection("#new-request-section");
});

document
  .querySelectorAll(".close-form")
  .forEach((button) =>
    button.addEventListener("click", () =>
      showSection("#request-list-section"),
    ),
  );
$("#close-detail").addEventListener("click", () =>
  showSection("#request-list-section"),
);
$("#approve-button").addEventListener("click", () => decide("Aprobada"));
$("#reject-button").addEventListener("click", () => decide("Rechazada"));

$("#request-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (currentUser.role !== "Creador") {
    showAlert("Solo un usuario creador puede registrar solicitudes.", "danger");
    return;
  }
  const result = await validateForm(event.currentTarget);
  if (!result.valid) return;

  const request = {
    id: `SOL-${String(requests.length + 1).padStart(3, "0")}`,
    identification: result.values.identification.trim(),
    fullName: result.values.fullName.trim(),
    email: result.values.email.trim(),
    clientType: result.values.clientType,
    amount: Number(result.values.amount),
    requestDate: result.values.requestDate,
    documentName: result.file.name,
    validDocument: true,
    status: "Pendiente de aprobación",
    creatorId: currentUser.id,
    creatorName: currentUser.name,
    audit: [
      { action: "Solicitud creada", user: currentUser.name, date: now() },
    ],
  };
  requests.push(request);
  renderRequests();
  showSection("#request-list-section");
  showAlert(
    `Solicitud ${request.id} guardada con estado Pendiente de aprobación.`,
  );
});

if (
  new URLSearchParams(location.search).get("view") === "approval" &&
  currentUser.role !== "Aprobador"
) {
  showAlert("Acceso denegado: se requiere el rol Aprobador.", "danger");
}

renderRequests();
