(function () {
  const vscode = acquireVsCodeApi();
  const left = document.getElementById('viewer-left');
  const right = document.getElementById('viewer-right');
  const statusText = document.getElementById('status-text');
  const diffList = document.getElementById('diff-list');
  let leftBlobUrl;
  let rightBlobUrl;

  function setBlob(viewer, base64, previous) {
    if (previous.current) {
      URL.revokeObjectURL(previous.current);
    }
    previous.current = URL.createObjectURL(new Blob([atob(base64)], { type: 'text/plain' }));
    viewer.setAttribute('src', previous.current);
  }

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.type === 'setDiff') {
      setBlob(left, message.payload.beforeBase64, { get current() { return leftBlobUrl; }, set current(v) { leftBlobUrl = v; } });
      setBlob(right, message.payload.afterBase64, { get current() { return rightBlobUrl; }, set current(v) { rightBlobUrl = v; } });
      statusText.textContent = message.payload.summary;
      diffList.innerHTML = (message.payload.components || [])
        .map((component) => `<button class="layer-item" data-reference="${component.reference}"><span class="badge">${component.type}</span><strong>${component.reference}</strong></button>`)
        .join('');
      for (const button of diffList.querySelectorAll('button')) {
        button.addEventListener('click', () => {
          vscode.postMessage({
            type: 'navigate',
            payload: { reference: button.dataset.reference }
          });
        });
      }
    }
  });
})();
