(() => {
  const byId = id => document.getElementById(id);
  let validationEvent = null;
  const showValidationError = (message, control) => {
    validationEvent?.preventDefault();
    validationEvent?.stopImmediatePropagation();
    if (control) {
      control.setAttribute('aria-invalid', 'true');
      control.addEventListener('input', () => control.removeAttribute('aria-invalid'), { once: true });
      control.addEventListener('change', () => control.removeAttribute('aria-invalid'), { once: true });
      control.focus();
    }
    if (typeof window.toast === 'function') window.toast(message);
    else {
      const toast = byId('toast');
      if (toast) { toast.textContent = message; toast.classList.remove('hidden'); }
    }
  };
  const numericValue = control => {
    if (!control) return NaN;
    const raw = control.value.trim();
    if (!raw) return NaN;
    return control.inputMode === 'numeric' && control.type === 'text'
      ? Number(raw.replace(/[^0-9-]/g, ''))
      : Number(raw.replace(',', '.'));
  };

  document.addEventListener('click', event => {
    validationEvent = event;
    const button = event.target.closest('#btnGuardar,#btnCrearFiado,#btnCrearProveedor,#btnAbono,#btnRegistrarCompra');
    if (!button) return;

    if (button.id === 'btnGuardar') {
      const name = byId('nombre');
      if (!name?.value.trim()) return showValidationError('Escribe el nombre del producto.', name);
      const price = byId('precioVenta');
      if (!price?.value.trim() || !Number.isFinite(numericValue(price)) || numericValue(price) < 0)
        return showValidationError('Ingresa un precio de venta válido (cero o mayor).', price);
      const stock = byId('cantidad');
      if (stock?.value.trim() && (!Number.isFinite(numericValue(stock)) || numericValue(stock) < 0))
        return showValidationError('El stock inicial debe ser cero o mayor.', stock);
      const minimum = byId('stockMin');
      if (minimum?.value.trim() && (!Number.isFinite(numericValue(minimum)) || numericValue(minimum) < 0))
        return showValidationError('El stock mínimo debe ser cero o mayor.', minimum);
    }

    if (button.id === 'btnCrearFiado' && !byId('nuevoFiadoNombre')?.value.trim())
      return showValidationError('Escribe el nombre del cliente.', byId('nuevoFiadoNombre'));

    if (button.id === 'btnCrearProveedor') {
      const name = byId('proveedorNombre');
      if (!name?.value.trim()) return showValidationError('Escribe el nombre del proveedor.', name);
      const email = byId('proveedorEmail');
      if (email?.value.trim() && !email.checkValidity())
        return showValidationError('Revisa el formato del correo del proveedor.', email);
    }

    if (button.id === 'btnAbono') {
      const customer = byId('fiadoAbonoSelect');
      if (!customer?.value) return showValidationError('Selecciona el cliente que realiza el abono.', customer);
      const amount = byId('fiadoAbonoMonto');
      if (!Number.isFinite(numericValue(amount)) || numericValue(amount) <= 0)
        return showValidationError('El abono debe ser mayor que cero.', amount);
    }

    if (button.id === 'btnRegistrarCompra') {
      const supplier = byId('compraProveedor');
      if (!supplier?.value) return showValidationError('Selecciona el proveedor de la compra.', supplier);
      const date = byId('compraFecha');
      if (!date?.value) return showValidationError('Indica la fecha de recepción.', date);
      const lines = byId('compraLineas');
      if (lines && !lines.querySelector('input,select'))
        return showValidationError('Agrega al menos un producto a la compra.', lines);
    }
  }, true);

  document.addEventListener('click', event => {
    const navButton = event.target.closest('.section-nav-btn');
    const toolsView = document.getElementById('toolsView');

    if (navButton?.dataset.view === 'tools') {
      event.preventDefault();
      event.stopImmediatePropagation();
      document.getElementById('dashboardPanel')?.classList.add('hidden');
      document.getElementById('inventoryView')?.classList.add('hidden');
      toolsView?.classList.remove('hidden');
      document.querySelectorAll('.section-nav-btn').forEach(button => {
        button.classList.toggle('active', button === navButton);
      });
      return;
    }

    if (navButton?.dataset.view) toolsView?.classList.add('hidden');

    const tool = event.target.closest('[data-tool]');
    if (tool) {
      const panelId = tool.dataset.tool;
      const panel = document.getElementById(panelId);
      if (panel?.classList.contains('drawer')) open(panelId);
      return;
    }

    if (event.target.closest('#btnReporteHerramientas')) {
      document.getElementById('btnReporte')?.click();
    }
  }, true);

  (() => {
    const inventory = byId('inventoryView');
    if (!inventory) return;

    if (!byId('inventoryListLayoutFix')) {
      const style = document.createElement('style');
      style.id = 'inventoryListLayoutFix';
      style.textContent = `
        .inventory-list-view { grid-template-columns: minmax(0, 1fr) !important; gap: 8px; }
        .inventory-list-view .item {
          display: grid;
          grid-template-columns: 84px minmax(0, 1fr) !important;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
          align-items: stretch;
        }
        .inventory-list-view .item-foto-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          gap: 6px;
          min-width: 0;
          min-height: 100%;
          height: auto;
          padding: 7px;
        }
        .inventory-list-view .badge-corner {
          position: static;
          display: flex;
          flex: 0 0 auto;
          flex-direction: column;
          width: 100%;
          gap: 4px;
        }
        .inventory-list-view .badge-corner span {
          max-width: 100%;
          white-space: normal;
          overflow-wrap: anywhere;
          text-align: center;
        }
        .inventory-list-view .item-foto,
        .inventory-list-view .item-avatar {
          flex: 0 1 auto;
          min-width: 0;
          max-width: 100%;
          max-height: 78px;
        }
        .inventory-list-view .item-body {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-content: start;
          align-items: stretch;
          gap: 10px 14px;
          min-width: 0;
          padding: 12px;
        }
        .inventory-list-view .item-body > * { min-width: 0; }
        .inventory-list-view .item-top,
        .inventory-list-view .item-name,
        .inventory-list-view .item-code,
        .inventory-list-view .card-btns { grid-column: 1 / -1; }
        .inventory-list-view .item-top {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: start;
          gap: 6px 10px;
        }
        .inventory-list-view .item-section,
        .inventory-list-view .stock-pill {
          min-width: 0;
          white-space: normal;
          overflow-wrap: anywhere;
        }
        .inventory-list-view .stock-pill { text-align: right; }
        .inventory-list-view .item-name {
          overflow-wrap: anywhere;
          word-break: break-word;
          line-height: 1.35;
        }
        .inventory-list-view .price-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          align-items: start;
          gap: 8px;
          min-width: 0;
        }
        .inventory-list-view .price-row > *,
        .inventory-list-view .price-row > div { min-width: 0; overflow-wrap: anywhere; }
        .inventory-list-view .price-big { font-size: clamp(14px, 2vw, 19px); overflow-wrap: anywhere; }
        .inventory-list-view .price-cost { text-align: left; }
        .inventory-list-view .item-stock-summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          align-content: start;
          gap: 8px;
          min-width: 0;
          padding: 8px;
        }
        .inventory-list-view .item-available,
        .inventory-list-view .item-stock-total { min-width: 0; overflow-wrap: anywhere; }
        .inventory-list-view .item-code {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 5px 8px;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .inventory-list-view .item-code b { min-width: 0; overflow-wrap: anywhere; word-break: break-word; }
        .inventory-list-view .item-warehouse { margin-left: auto; overflow-wrap: anywhere; }
        .inventory-list-view .card-btns { display: grid; grid-template-columns: minmax(0, 1fr); gap: 7px; margin-top: 0; }
        .inventory-list-view .item-primary-actions { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
        .inventory-list-view .item-primary-actions .c-btn,
        .inventory-list-view .item-more-actions .c-btn { min-width: 0; padding: 7px 5px; white-space: normal; overflow-wrap: anywhere; line-height: 1.3; }
        .inventory-list-view .item-more-menu,
        .inventory-list-view .item-more-actions { min-width: 0; }
        .inventory-list-view .item-more-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .inventory-list-view .item-more-actions .btn-history,
        .inventory-list-view .item-more-actions .btn-quick-discount { grid-column: 1 / -1; }
        @media (max-width: 700px) {
          .inventory-list-view .item-body { grid-template-columns: minmax(0, 1fr); gap: 9px; }
          .inventory-list-view .item-top,
          .inventory-list-view .item-name,
          .inventory-list-view .price-row,
          .inventory-list-view .item-stock-summary,
          .inventory-list-view .item-code,
          .inventory-list-view .card-btns { grid-column: 1; }
        }
        @media (max-width: 480px) {
          .inventory-list-view .item { grid-template-columns: 62px minmax(0, 1fr) !important; }
          .inventory-list-view .item-foto-wrap { padding: 5px; }
          .inventory-list-view .item-body { padding: 10px; }
          .inventory-list-view .item-top { grid-template-columns: minmax(0, 1fr); }
          .inventory-list-view .stock-pill { text-align: left; }
          .inventory-list-view .item-primary-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `;
      document.head.append(style);
    }

    const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
    const money = value => Math.round(Number(value) || 0).toLocaleString('es-CR');
    const dateLabel = value => value ? escapeHtml(new Date(`${value}T00:00:00`).toLocaleDateString('es-CR')) : '—';
    const lotStatus = (product, batch) => {
      if (!batch.vencimiento) return 'Sin vencimiento';
      const days = calcDias(batch.vencimiento);
      if (days === null) return 'Fecha inválida';
      if (days < 0) return 'Vencido';
      if (days <= margenAlertaVencimiento(product)) return days === 0 ? 'Vence hoy' : `Por vencer · ${days} d`;
      return 'Vigente';
    };

    function setQuickFilter(filter) {
      filtroRapido = filter;
      inventoryPage = 1;
      document.querySelectorAll('.quick-filter').forEach(button => {
        const active = button.dataset.quick === filter;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      render();
    }

    function clearInventoryFilters() {
      filtroRapido = 'todos';
      data.actual = null;
      data.subFiltro = null;
      data.filtroAlm = null;
      inventoryPage = 1;
      if (byId('buscador')) byId('buscador').value = '';
      document.querySelectorAll('.quick-filter').forEach(button => {
        const active = button.dataset.quick === 'todos';
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      rchips();
      rAlmChips();
      render();
    }

    function setupInventoryControls() {
      const heading = inventory.querySelector('.inventory-heading');
      const toolbar = inventory.querySelector('.list-toolbar');
      const grid = byId('grid');
      if (!heading || !toolbar || !grid) return;

      if (!byId('inventorySummary')) {
        const summary = document.createElement('section');
        summary.id = 'inventorySummary';
        summary.className = 'inventory-summary';
        summary.setAttribute('aria-label', 'Resumen y filtros de inventario');
        summary.innerHTML = `<button type="button" data-summary-filter="todos"><b id="inventoryCountAll">0</b><span>Productos</span></button>
          <button type="button" data-summary-filter="bajo"><b id="inventoryCountLow">0</b><span>Bajo stock</span></button>
          <button type="button" data-summary-filter="vence"><b id="inventoryCountExpiry">0</b><span>Por vencer</span></button>
          <button type="button" data-summary-filter="vencido"><b id="inventoryCountExpired">0</b><span>Vencidos</span></button>
          <button type="button" data-summary-filter="reservado"><b id="inventoryCountReserved">0</b><span>Reservados</span></button>`;
        heading.after(summary);
      }

      if (!byId('inventoryViewToggle')) {
        const group = document.createElement('div');
        group.id = 'inventoryViewToggle';
        group.className = 'inventory-view-toggle';
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', 'Presentación de productos');
        group.innerHTML = `<button type="button" data-inventory-view="cards" aria-label="Vista de tarjetas">Tarjetas</button>
          <button type="button" data-inventory-view="list" aria-label="Vista compacta de lista">Lista</button>`;
        heading.append(group);
      }

      if (!byId('inventoryMainFilters')) {
        const mainFilters = document.createElement('div');
        mainFilters.id = 'inventoryMainFilters';
        mainFilters.className = 'inventory-main-filters';
        mainFilters.innerHTML = '<label for="inventorySectionFilter">Sección<select id="inventorySectionFilter" aria-label="Filtrar inventario por sección"><option value="">Todas las secciones</option></select></label>';
        const quickGroup = toolbar.querySelector('.inventory-filter-group');
        toolbar.insertBefore(mainFilters, quickGroup || toolbar.querySelector('.inventory-advanced-filters'));
      }

      if (!byId('inventoryActiveFilters')) {
        const active = document.createElement('div');
        active.id = 'inventoryActiveFilters';
        active.className = 'inventory-active-filters';
        active.setAttribute('aria-live', 'polite');
        toolbar.after(active);
      }

      const sectionSelect = byId('inventorySectionFilter');
      if (sectionSelect) {
        const selected = data.actual || '';
        sectionSelect.innerHTML = '<option value="">Todas las secciones</option>' + data.secciones.map(section => `<option value="${escapeHtml(section.nombre)}">${escapeHtml(section.nombre)}</option>`).join('');
        sectionSelect.value = selected;
        sectionSelect.onchange = () => {
          data.actual = sectionSelect.value || null;
          data.subFiltro = null;
          inventoryPage = 1;
          rchips();
          render();
        };
      }

      toolbar.querySelector(':scope > .inventory-filter-group')?.remove();
      const sectionChipGroup = byId('chips')?.closest('.inventory-filter-group');
      sectionChipGroup?.classList.add('hidden');
      const advancedSummary = toolbar.querySelector('.inventory-advanced-filters summary');
      if (advancedSummary) advancedSummary.textContent = 'Más filtros · almacén y subcategoría';
      applyViewMode();
    }

    function applyViewMode(mode) {
      const grid = byId('grid');
      if (!grid) return;
      let selected = mode;
      if (!selected) {
        try { selected = localStorage.getItem('inventoryViewMode') || 'cards'; } catch { selected = 'cards'; }
      }
      selected = selected === 'list' ? 'list' : 'cards';
      grid.classList.toggle('inventory-list-view', selected === 'list');
      document.querySelectorAll('[data-inventory-view]').forEach(button => {
        const active = button.dataset.inventoryView === selected;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      try { localStorage.setItem('inventoryViewMode', selected); } catch { /* La vista seguirá funcionando sin persistencia. */ }
    }

    function updateInventorySummary() {
      if (!byId('inventorySummary')) return;
      const totals = { todos: data.productos.length, bajo: 0, vence: 0, vencido: 0, reservado: 0 };
      data.productos.forEach(product => {
        const available = getDisponible(product);
        if (available <= Number(product.stockMin || 0)) totals.bajo++;
        if (getReservado(product.id) > 0) totals.reservado++;
        const days = calcDias(getProxVence(product));
        if (days !== null && days < 0) totals.vencido++;
        else if (days !== null && days <= margenAlertaVencimiento(product)) totals.vence++;
      });
      const ids = { todos: 'inventoryCountAll', bajo: 'inventoryCountLow', vence: 'inventoryCountExpiry', vencido: 'inventoryCountExpired', reservado: 'inventoryCountReserved' };
      Object.entries(ids).forEach(([key, id]) => { if (byId(id)) byId(id).textContent = totals[key]; });

      document.querySelectorAll('.quick-filter').forEach(button => {
        const count = totals[button.dataset.quick];
        let badge = button.querySelector('.filter-count');
        if (count !== undefined) {
          if (!badge) { badge = document.createElement('span'); badge.className = 'filter-count'; button.append(badge); }
          badge.textContent = count;
        }
        button.setAttribute('aria-pressed', String(button.dataset.quick === filtroRapido));
      });
      document.querySelectorAll('[data-summary-filter]').forEach(button => {
        const active = button.dataset.summaryFilter === filtroRapido;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      updateActiveFilters();
    }

    function updateActiveFilters() {
      const panel = byId('inventoryActiveFilters');
      if (!panel) return;
      const chips = [];
      if (filtroRapido !== 'todos') {
        const labels = { bajo: 'Bajo stock', vence: 'Por vencer', vencido: 'Vencidos', reservado: 'Reservados' };
        chips.push({ key: 'quick', label: labels[filtroRapido] || filtroRapido });
      }
      if (data.actual) chips.push({ key: 'section', label: `Sección: ${data.actual}` });
      if (data.subFiltro) chips.push({ key: 'subsection', label: `Subcategoría: ${data.subFiltro}` });
      if (data.filtroAlm) chips.push({ key: 'warehouse', label: `Almacén: ${data.almacenes.find(a => a.id === data.filtroAlm)?.nombre || 'seleccionado'}` });
      const query = byId('buscador')?.value.trim();
      if (query) chips.push({ key: 'search', label: `Búsqueda: ${query}` });
      panel.innerHTML = chips.length
        ? `<span class="active-filters-label">Filtros activos</span><div class="active-filter-chips">${chips.map(chip => `<button type="button" class="active-filter-chip" data-remove-filter="${chip.key}" aria-label="Quitar filtro ${escapeHtml(chip.label)}">${escapeHtml(chip.label)} <b aria-hidden="true">×</b></button>`).join('')}<button type="button" class="clear-inventory-filters" data-clear-inventory>Limpiar todo</button></div>`
        : '<span class="inventory-no-filters">Mostrando todo el inventario</span>';
    }

    function renderProductDetails(productId) {
      const product = data.productos.find(item => String(item.id) === String(productId));
      if (!product) return toast('Artículo no disponible');
      const warehouse = data.almacenes.find(item => item.id === product.almacenId);
      const warehouseLocation = warehouse ? `${warehouse.nombre}${warehouse.pasillo ? ` · Pasillo ${warehouse.pasillo}` : ''}${warehouse.estante ? ` · Estante ${warehouse.estante}` : ''}` : 'Sin almacén';
      const reserved = getReservado(product.id);
      const available = getDisponible(product);
      const batches = [...(product.lotes || [])].sort((a, b) => {
        const aDate = a.vencimiento ? Date.parse(a.vencimiento) : Infinity;
        const bDate = b.vencimiento ? Date.parse(b.vencimiento) : Infinity;
        return aDate - bDate;
      });
      const movements = [
        ...(Array.isArray(product.historial) ? product.historial : []).map(item => ({
          fecha: item.fecha, tipo: item.tipo || 'Movimiento',
          detalle: `${Number(item.cantidad) || 0} ${product.unidad || 'u'}${item.motivo ? ` · ${item.motivo}` : ''}${item.nota ? ` · ${item.nota}` : ''}${Array.isArray(item.usados) && item.usados.length ? ` · lotes: ${item.usados.map(lot => `${lot.loteId} (${lot.cantidad})`).join(', ')}` : ''}`
        })),
        ...data.logs.filter(item => item.producto === product.nombre).map(item => ({ fecha: item.fecha, tipo: item.accion, detalle: item.detalle || '' }))
      ].sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
      const host = byId('historialContenido');
      const title = byId('modalHistorial')?.querySelector('h3');
      if (title) title.textContent = 'Detalle de producto · lotes e historial';
      if (!host) return;
      host.innerHTML = `<section class="product-detail-summary">
          <div><span>Producto</span><b>${escapeHtml(product.nombre)}</b></div>
          <div><span>Código</span><b>${escapeHtml(product.codigo)}</b></div>
          <div><span>Sección</span><b>${escapeHtml(product.seccion)}${product.clasificador && product.clasificador !== 'Sin clasificar' ? ` · ${escapeHtml(product.clasificador)}` : ''}</b></div>
          <div><span>Almacén / ubicación</span><b>${escapeHtml(warehouseLocation)}</b></div>
          <div><span>Disponible</span><b>${available} ${escapeHtml(product.unidad || 'u')}</b></div>
          <div><span>Reservado / total</span><b>${reserved} / ${Number(product.cantidad) || 0} ${escapeHtml(product.unidad || 'u')}</b></div>
          <div><span>Precio de venta</span><b>${money(product.precioVenta)} CRC</b></div>
          <div><span>Stock mínimo</span><b>${Number(product.stockMin) || 0} ${escapeHtml(product.unidad || 'u')}</b></div>
        </section>
        <section class="product-detail-section"><h4>Lotes FEFO · ${batches.length}</h4>
          ${batches.length ? `<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Lote</th><th>Vencimiento</th><th>Estado</th><th>Restante</th><th>Recibido</th><th>Costo unitario</th></tr></thead><tbody>${batches.map(batch => `<tr><td data-label="Lote">${escapeHtml(batch.id)}</td><td data-label="Vencimiento">${dateLabel(batch.vencimiento)}</td><td data-label="Estado">${escapeHtml(lotStatus(product, batch))}</td><td data-label="Restante">${Number(batch.restante) || 0} ${escapeHtml(product.unidad || 'u')}</td><td data-label="Recibido">${Number(batch.cantidad) || 0}</td><td data-label="Costo">${money(batch.costo)} CRC</td></tr>`).join('')}</tbody></table></div>` : '<p class="setting-help">Este producto todavía no tiene lotes disponibles.</p>'}
        </section>
        <section class="product-detail-section"><h4>Movimientos recientes</h4>
          ${movements.length ? `<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Fecha</th><th>Movimiento</th><th>Detalle</th></tr></thead><tbody>${movements.slice(0, 100).map(item => `<tr><td data-label="Fecha">${escapeHtml(item.fecha ? new Date(item.fecha).toLocaleString('es-CR') : '—')}</td><td data-label="Movimiento">${escapeHtml(item.tipo)}</td><td data-label="Detalle">${escapeHtml(item.detalle)}</td></tr>`).join('')}</tbody></table></div>` : '<p class="setting-help">Todavía no hay movimientos registrados para este producto.</p>'}
        </section>`;
      open('modalHistorial');
    }

    function organizeProductActions() {
      document.querySelectorAll('#grid .item').forEach(card => {
        const actions = card.querySelector('.card-btns');
        if (!actions || actions.dataset.organized === 'true') return;
        actions.dataset.organized = 'true';
        const sell = actions.querySelector('.btn-v');
        const edit = actions.querySelector('.btn-e');
        const otherButtons = [...actions.querySelectorAll('button')].filter(button => button !== sell && button !== edit);
        const primary = document.createElement('div');
        primary.className = 'item-primary-actions';
        if (sell) primary.append(sell);
        const details = document.createElement('button');
        details.type = 'button';
        details.className = 'c-btn item-details-button';
        details.textContent = 'Lotes y detalle';
        details.setAttribute('aria-label', `Ver lotes y detalle de ${card.querySelector('.item-name')?.textContent || 'producto'}`);
        details.addEventListener('click', () => renderProductDetails(card.dataset.productId));
        primary.append(details);
        if (edit) primary.append(edit);

        const menu = document.createElement('details');
        menu.className = 'item-more-menu';
        const summary = document.createElement('summary');
        summary.textContent = 'Más acciones';
        menu.append(summary);
        const menuActions = document.createElement('div');
        menuActions.className = 'item-more-actions';
        otherButtons.forEach(button => menuActions.append(button));
        menu.append(menuActions);
        actions.replaceChildren(primary, menu);
      });
    }

    function decorateInventory() {
      setupInventoryControls();
      updateInventorySummary();
      organizeProductActions();
    }

    const originalRender = render;
    render = function (...args) {
      const result = originalRender.apply(this, args);
      decorateInventory();
      return result;
    };

    document.addEventListener('click', event => {
      const summaryFilter = event.target.closest('[data-summary-filter]');
      if (summaryFilter) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setQuickFilter(summaryFilter.dataset.summaryFilter);
        return;
      }
      const viewButton = event.target.closest('[data-inventory-view]');
      if (viewButton) {
        applyViewMode(viewButton.dataset.inventoryView);
        return;
      }
      if (event.target.closest('[data-clear-inventory]')) {
        clearInventoryFilters();
        return;
      }
      const remove = event.target.closest('[data-remove-filter]');
      if (remove) {
        const key = remove.dataset.removeFilter;
        if (key === 'quick') setQuickFilter('todos');
        if (key === 'section') data.actual = null;
        if (key === 'subsection') data.subFiltro = null;
        if (key === 'warehouse') data.filtroAlm = null;
        if (key === 'search' && byId('buscador')) byId('buscador').value = '';
        if (key !== 'quick') { inventoryPage = 1; rchips(); rAlmChips(); render(); }
        return;
      }
      const quickFilter = event.target.closest('.quick-filter');
      if (quickFilter) {
        inventoryPage = 1;
        filtroRapido = quickFilter.dataset.quick || 'todos';
        queueMicrotask(decorateInventory);
        return;
      }
      if (event.target.closest('.btn-history')) {
        const title = byId('modalHistorial')?.querySelector('h3');
        if (title) title.textContent = 'Historial FEFO + FEFO por lote';
      }
      if (event.target.closest('.btn-quick-discount')) {
        const title = byId('modalHistorial')?.querySelector('h3');
        if (title) title.textContent = 'Historial FEFO + FEFO por lote';
      }
    }, true);

    document.addEventListener('input', event => {
      if (event.target.matches('#buscador')) {
        inventoryPage = 1;
        queueMicrotask(updateInventorySummary);
      }
    }, true);
    document.addEventListener('change', event => {
      if (event.target.matches('#orden')) inventoryPage = 1;
    }, true);
    document.addEventListener('click', event => {
      if (event.target.closest('.chip')) inventoryPage = 1;
    }, true);

    const previousDetails = mostrarHistorialArticulo;
    mostrarHistorialArticulo = function (id) {
      const title = byId('modalHistorial')?.querySelector('h3');
      if (title) title.textContent = 'Historial FEFO + FEFO por lote';
      return previousDetails(id);
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', decorateInventory, { once: true });
    else decorateInventory();
  })();

  (() => {
    const caja = byId('drawerCaja');
    const checkout = caja?.querySelector('.caja-checkout');
    const payment = byId('metodoPago');
    const total = byId('cajaTotal');
    const cashAmount = document.createElement('input');
    if (!caja || !checkout || !payment || !total) return;

    const style = document.createElement('style');
    style.textContent = `
      .caja-cash-field{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:8px;margin:8px 0}
      .caja-cash-field label{grid-column:1/-1;color:var(--dim);font-size:10px;font-weight:800}
      .caja-cash-field button{min-height:42px;padding:8px 10px;border:1px solid var(--border);border-radius:10px;background:var(--card);color:var(--text);font-size:10px;font-weight:800}
      .caja-change{grid-column:1/-1;margin:0;padding:9px 11px;border:1px solid var(--border);border-radius:9px;background:var(--card);color:var(--dim);font-size:11px}
      .caja-change.is-ready{border-color:var(--success);color:var(--success)}
      .caja-change.is-short{border-color:var(--warn);color:var(--warn)}
      .caja-history{margin-top:14px;padding-top:12px;border-top:1px solid var(--border)}
      .caja-history>summary{padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--card);font-size:11px;font-weight:800;cursor:pointer;list-style:none}
      .caja-history>summary::-webkit-details-marker{display:none}
      .caja-history[open]>summary{border-color:var(--primary);color:var(--primary)}
      .caja-history-controls{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:8px;margin:10px 0}
      .caja-history-controls input,.caja-history-controls select{min-width:0}
      .caja-history-list{display:grid;gap:7px;max-height:320px;overflow:auto}
      .caja-history-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px 12px;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--bg)}
      .caja-history-row b,.caja-history-row strong{font-size:11px}
      .caja-history-row small{grid-column:1/-1;color:var(--dim);font-size:9px;overflow-wrap:anywhere}
      .caja-history-empty{padding:14px;border:1px dashed var(--border);border-radius:10px;color:var(--dim);font-size:10px;text-align:center}
      @media(max-width:540px){.caja-history-controls{grid-template-columns:1fr}.caja-history-row{grid-template-columns:minmax(0,1fr);gap:4px}.caja-history-row small{grid-column:1}}
    `;
    document.head.append(style);

    cashAmount.type = 'number';
    cashAmount.id = 'cajaEfectivoRecibido';
    cashAmount.min = '0';
    cashAmount.step = '1';
    cashAmount.inputMode = 'decimal';
    cashAmount.placeholder = 'Monto recibido';
    cashAmount.setAttribute('aria-describedby', 'cajaVuelto');
    const cashField = document.createElement('div');
    cashField.className = 'caja-cash-field hidden';
    const cashLabel = document.createElement('label');
    cashLabel.htmlFor = cashAmount.id;
    cashLabel.textContent = 'Efectivo recibido (CRC)';
    const exactButton = document.createElement('button');
    exactButton.type = 'button';
    exactButton.textContent = 'Monto exacto';
    exactButton.setAttribute('aria-label', 'Completar el total exacto de la venta');
    const change = document.createElement('p');
    change.id = 'cajaVuelto';
    change.className = 'caja-change';
    change.setAttribute('aria-live', 'polite');
    change.textContent = 'Ingresa el efectivo recibido para calcular el vuelto.';
    cashField.append(cashLabel, cashAmount, exactButton, change);
    const methodField = payment.closest('.field');
    if (methodField) methodField.after(cashField);

    function moneyNumber(text) {
      const digits = String(text || '').replace(/[^\d-]/g, '');
      return Number(digits) || 0;
    }
    function totalValue() { return moneyNumber(total.textContent); }
    function updateCash() {
      const isCash = payment.value === 'efectivo';
      cashField.classList.toggle('hidden', !isCash);
      if (!isCash) {
        cashAmount.removeAttribute('aria-invalid');
        change.classList.remove('is-ready', 'is-short');
        change.textContent = 'El vuelto se calcula para pagos en efectivo.';
        return;
      }
      const amount = cashAmount.value.trim() === '' ? NaN : Number(cashAmount.value);
      const due = totalValue();
      change.classList.remove('is-ready', 'is-short');
      if (!Number.isFinite(amount) || amount < 0) {
        change.textContent = 'Ingresa el efectivo recibido para calcular el vuelto.';
        return;
      }
      if (amount >= due) cashAmount.removeAttribute('aria-invalid');
      const delta = amount - due;
      if (delta < 0) {
        change.classList.add('is-short');
        change.textContent = `Faltan ${Math.abs(delta).toLocaleString('es-CR')} CRC para completar el pago.`;
      } else {
        change.classList.add('is-ready');
        change.textContent = `Vuelto: ${delta.toLocaleString('es-CR')} CRC`;
      }
    }
    payment.addEventListener('change', updateCash);
    cashAmount.addEventListener('input', updateCash);
    exactButton.addEventListener('click', () => {
      cashAmount.value = String(totalValue());
      updateCash();
      cashAmount.focus();
    });
    new MutationObserver(updateCash).observe(total, { childList: true, characterData: true, subtree: true });
    updateCash();

    const history = document.createElement('details');
    history.className = 'caja-history';
    history.innerHTML = `<summary>Historial de ventas</summary>
      <div class="caja-history-controls">
        <input type="search" id="cajaHistorialBuscar" placeholder="Buscar producto, código, cliente u operador..." aria-label="Buscar en el historial de ventas">
        <select id="cajaHistorialMetodo" aria-label="Filtrar historial por medio de pago">
          <option value="">Todos los medios de pago</option><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option><option value="otro">Fiado / otro</option>
        </select>
        <label class="inventory-sort-label" for="cajaHistorialFecha">Desde esta fecha</label>
        <input type="date" id="cajaHistorialFecha" aria-label="Mostrar ventas desde esta fecha">
      </div>
      <div id="cajaHistorialLista" class="caja-history-list" aria-live="polite"></div>`;
    checkout.append(history);

    const historySearch = byId('cajaHistorialBuscar');
    const historyMethod = byId('cajaHistorialMetodo');
    const historyDate = byId('cajaHistorialFecha');
    const historyList = byId('cajaHistorialLista');
    const safeText = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
    const saleDate = value => {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? 'Fecha no disponible' : date.toLocaleString('es-CR');
    };
    function renderSalesHistory() {
      if (!historyList || typeof data !== 'object' || !Array.isArray(data.ventas)) return;
      const query = historySearch.value.trim();
      const method = historyMethod.value;
      const from = historyDate.value;
      const sales = [...data.ventas].filter(sale => {
        const paymentMethod = String(sale.medioPago || 'no especificado');
        const date = fechaVentaCR(sale.fecha);
        const product = data.productos.find(item => String(item.id) === String(sale.productoId));
        const searchable = [sale.nombre, sale.codigo, product?.codigo, sale.fiadoNombre, sale.clienteNombre, sale.operador, sale.ventaId, sale.id].join(' ');
        return (!method || paymentMethod === method) && (!from || date >= from) && (!query || normalizarBusqueda(searchable).includes(normalizarBusqueda(query)));
      }).sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
      historyList.innerHTML = sales.length ? sales.slice(0, 150).map(sale => {
        const quantity = Math.max(0, (Number(sale.cantidad) || 0) - (Number(sale.cantidadDevuelta) || 0));
        const amount = quantity * (Number(sale.precio) || 0);
        const methodName = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', otro: 'Fiado / otro' }[sale.medioPago] || 'No especificado';
        const client = sale.fiadoNombre || sale.clienteNombre || sale.operadorCliente || '';
        return `<article class="caja-history-row"><b>${safeText(sale.nombre || data.productos.find(item => String(item.id) === String(sale.productoId))?.nombre || 'Producto')} · ${quantity} u.</b><strong>${Math.round(amount).toLocaleString('es-CR')} CRC</strong><small>${safeText(saleDate(sale.fecha))} · ${safeText(methodName)}${client ? ` · ${safeText(client)}` : ''}${sale.operador ? ` · ${safeText(sale.operador)}` : ''}${sale.id ? ` · #${safeText(sale.id)}` : ''}</small></article>`;
      }).join('') : '<div class="caja-history-empty">No hay ventas que coincidan con esos filtros.</div>';
      if (sales.length > 150) historyList.insertAdjacentHTML('beforeend', `<div class="caja-history-empty">Se muestran las 150 ventas más recientes. Refina la búsqueda para encontrar otras.</div>`);
    }
    [historySearch, historyMethod, historyDate].forEach(control => control.addEventListener(control === historySearch ? 'input' : 'change', renderSalesHistory));
    history.addEventListener('toggle', () => { if (history.open) renderSalesHistory(); });
    byId('btnCobrar')?.addEventListener('click', () => setTimeout(renderSalesHistory, 0));
    byId('fiadoSelect')?.addEventListener('change', event => event.currentTarget.removeAttribute('aria-invalid'));
    document.addEventListener('click', event => {
      if (!event.target.closest('#btnCobrar')) return;
      const button = byId('btnCobrar');
      if (!button || button.disabled) return;
      if (payment.value === 'efectivo') {
        const amount = cashAmount.value.trim() === '' ? NaN : Number(cashAmount.value);
        if (!Number.isFinite(amount) || amount < totalValue()) {
          event.preventDefault();
          event.stopImmediatePropagation();
          cashAmount.setAttribute('aria-invalid', 'true');
          cashAmount.focus();
          toast(Number.isFinite(amount) ? 'El efectivo recibido no alcanza para cubrir el total.' : 'Ingresa el efectivo recibido para continuar.');
          return;
        }
        cashAmount.removeAttribute('aria-invalid');
      }
      if (payment.value === 'otro' && !byId('fiadoSelect')?.value) {
        event.preventDefault();
        event.stopImmediatePropagation();
        byId('fiadoSelect')?.setAttribute('aria-invalid', 'true');
        byId('fiadoSelect')?.focus();
        toast('Selecciona el cliente antes de registrar la venta fiada.');
      }
    }, true);

    const search = byId('cajaBuscador');
    document.addEventListener('keydown', event => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName))) return;
      if (caja.classList.contains('hidden')) return;
      event.preventDefault();
      search?.focus();
    });
  })();
})();