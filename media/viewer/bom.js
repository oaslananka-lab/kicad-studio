(function () {
  const vscode = acquireVsCodeApi();
  const search = document.getElementById('search');
  const toggleDnp = document.getElementById('toggle-dnp');
  const rowsEl = document.getElementById('bom-rows');
  const summaryText = document.getElementById('summary-text');
  const headers = [...document.querySelectorAll('th[data-key]')];
  let entries = [];
  let sortKey = 'references';
  let sortDir = 1;

  function rowMatches(entry, query) {
    const text = [
      entry.references.join(' '),
      entry.value,
      entry.footprint,
      entry.mpn,
      entry.manufacturer,
      entry.description
    ]
      .join(' ')
      .toLowerCase();
    return text.includes(query);
  }

  function render() {
    const query = search.value.trim().toLowerCase();
    const hideDnp = toggleDnp.checked;
    const filtered = entries
      .filter((entry) => !hideDnp || !entry.dnp)
      .filter((entry) => rowMatches(entry, query))
      .sort((left, right) => {
        const a = sortKey === 'references' ? left.references.join(',') : left[sortKey];
        const b = sortKey === 'references' ? right.references.join(',') : right[sortKey];
        return String(a).localeCompare(String(b), undefined, { numeric: true }) * sortDir;
      });

    rowsEl.innerHTML = filtered
      .map((entry) => {
        const lcsc = entry.lcsc
          ? `<a class="chip-link" href="https://www.lcsc.com/search?q=${encodeURIComponent(entry.lcsc)}">${entry.lcsc}</a>`
          : '<span class="muted">—</span>';
        return `<tr data-reference="${entry.references[0] || ''}">
          <td>${entry.references.join(', ')}</td>
          <td>${entry.quantity}</td>
          <td>${entry.value}</td>
          <td>${entry.footprint}</td>
          <td>${entry.mpn || '<span class="muted">—</span>'}</td>
          <td>${entry.manufacturer || '<span class="muted">—</span>'}</td>
          <td>${lcsc}</td>
          <td>${entry.description || '<span class="muted">—</span>'}</td>
        </tr>`;
      })
      .join('');

    for (const row of rowsEl.querySelectorAll('tr')) {
      row.addEventListener('click', () => {
        vscode.postMessage({
          type: 'rowSelected',
          payload: { reference: row.dataset.reference }
        });
      });
    }
  }

  headers.forEach((header) => {
    header.addEventListener('click', () => {
      const nextKey = header.dataset.key;
      if (sortKey === nextKey) {
        sortDir *= -1;
      } else {
        sortKey = nextKey;
        sortDir = 1;
      }
      render();
    });
  });

  search.addEventListener('input', render);
  toggleDnp.addEventListener('change', render);
  document.getElementById('btn-export-csv').addEventListener('click', () => {
    vscode.postMessage({ type: 'exportCsv' });
  });
  document.getElementById('btn-export-xlsx').addEventListener('click', () => {
    vscode.postMessage({ type: 'exportXlsx' });
  });

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.type === 'setData') {
      entries = message.payload.entries || [];
      const summary = message.payload.summary || { totalComponents: 0, uniqueValues: 0 };
      summaryText.textContent = `${summary.totalComponents} components, ${summary.uniqueValues} unique rows`;
      render();
    }
    if (message.type === 'highlight') {
      const target = rowsEl.querySelector(`[data-reference="${message.payload.reference}"]`);
      target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  });
})();
