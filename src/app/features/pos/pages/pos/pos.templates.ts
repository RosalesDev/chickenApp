export const BILLING_TYPE_MODAL_HTML = `
  <p class="text-muted mb-4">Seleccioná el tipo de facturación:</p>
  <div class="d-flex flex-column gap-3">
    
    <button class="btn btn-outline-primary btn-lg d-flex align-items-center justify-content-between p-3" id="btn-cf">
      <div class="text-start">
        <div class="fw-bold fs-5">Consumidor Final</div>
        <small class="opacity-75">Factura C o Ticket rápido</small>
      </div>
      <i class="bi bi-person fs-2"></i>
    </button>

    <button class="btn btn-outline-success btn-lg d-flex align-items-center justify-content-between p-3" id="btn-ri">
      <div class="text-start">
        <div class="fw-bold fs-5">Responsable Inscripto</div>
        <small class="opacity-75">Factura A (Requiere CUIT)</small>
      </div>
      <i class="bi bi-building fs-2"></i>
    </button>

    <button class="btn btn-outline-secondary btn-lg d-flex align-items-center justify-content-between p-3" id="btn-sf">
      <div class="text-start">
        <div class="fw-bold fs-5">Consumo Interno / Remito</div>
        <small class="opacity-75">Sin comprobante fiscal</small>
      </div>
      <i class="bi bi-file-earmark-text fs-2"></i>
    </button>

  </div>
`;
