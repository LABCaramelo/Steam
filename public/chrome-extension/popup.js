// Gabinete Chrome Extension - Salvar Referências
document.addEventListener('DOMContentLoaded', async () => {
  const titleInput = document.getElementById('title');
  const urlInput = document.getElementById('url');
  const targetType = document.getElementById('targetType');
  const clientField = document.getElementById('clientField');
  const clientName = document.getElementById('clientName');
  const notes = document.getElementById('notes');
  const category = document.getElementById('category');
  const form = document.getElementById('refForm');
  const successMsg = document.getElementById('successMsg');

  // Toggle client field
  targetType.addEventListener('change', () => {
    clientField.style.display = targetType.value === 'cliente' ? 'block' : 'none';
  });

  // Auto-detect current active tab title and URL
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        if (tab.title) titleInput.value = tab.title;
        if (tab.url) urlInput.value = tab.url;
      }
    } catch (e) {
      console.warn('Não foi possível ler a aba atual:', e);
    }
  }

  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newRef = {
      id: 'ref-' + Date.now(),
      title: titleInput.value.trim(),
      url: urlInput.value.trim(),
      category: category.value,
      targetType: targetType.value,
      clientName: targetType.value === 'cliente' ? clientName.value.trim() : null,
      notes: notes.value.trim(),
      savedAt: new Date().toISOString()
    };

    // Save to chrome.storage.local if available
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      try {
        const stored = await chrome.storage.local.get(['gabinete_refs']);
        const list = Array.isArray(stored.gabinete_refs) ? stored.gabinete_refs : [];
        list.unshift(newRef);
        await chrome.storage.local.set({ gabinete_refs: list });
      } catch (err) {
        console.warn('Erro ao salvar no storage da extensão:', err);
      }
    }

    // Try posting to local LAB dev server if reachable
    try {
      await fetch('http://127.0.0.1:5180/api/reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRef)
      });
    } catch {
      // Local server might be on another port or offline, ignore fetch error
    }

    // Also mirror to window.localStorage
    try {
      const local = JSON.parse(localStorage.getItem('gabinete_referencias') || '[]');
      local.unshift(newRef);
      localStorage.setItem('gabinete_referencias', JSON.stringify(local));
    } catch {
      // ignore
    }

    // Show feedback
    successMsg.style.display = 'block';
    setTimeout(() => {
      window.close();
    }, 1200);
  });
});
