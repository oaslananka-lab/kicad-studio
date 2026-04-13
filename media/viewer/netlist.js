(function () {
  const rowsEl = document.getElementById('netlist-rows');
  const summaryText = document.getElementById('summary-text');

  window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'setNetlist') {
        const nets = message.payload.nets || [];
      summaryText.textContent = message.payload.status || `${nets.length} net entries`;
      rowsEl.innerHTML = nets
        .map((net) => `<tr><td>${net.netName}</td><td>${(net.nodes || []).map((node) => `${node.reference}:${node.pin}`).join(', ') || '—'}</td></tr>`)
        .join('');
    }
  });
})();
