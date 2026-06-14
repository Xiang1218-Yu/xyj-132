const DEFAULT_SETTINGS = {
  triggerMode: 'hover',
  hoverDelay: 500,
  previewWidth: 600,
  previewHeight: 400,
  enableVideoPreview: true,
  enableAudioPreview: true,
  enableImagePreview: true,
  enableWebpagePreview: true,
  blacklist: []
};

function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (result) => {
    document.querySelector(`input[name="triggerMode"][value="${result.triggerMode}"]`).checked = true;
    
    const hoverDelaySlider = document.getElementById('hoverDelay');
    const hoverDelayValue = document.getElementById('hoverDelayValue');
    hoverDelaySlider.value = result.hoverDelay;
    hoverDelayValue.textContent = result.hoverDelay;
    
    document.getElementById('previewWidth').value = result.previewWidth;
    document.getElementById('previewHeight').value = result.previewHeight;
    
    document.getElementById('enableImagePreview').checked = result.enableImagePreview;
    document.getElementById('enableVideoPreview').checked = result.enableVideoPreview;
    document.getElementById('enableAudioPreview').checked = result.enableAudioPreview;
    document.getElementById('enableWebpagePreview').checked = result.enableWebpagePreview;
    
    document.getElementById('blacklist').value = result.blacklist.join('\n');
    
    updateHoverDelaySection(result.triggerMode);
  });
}

function saveSettings() {
  const triggerMode = document.querySelector('input[name="triggerMode"]:checked').value;
  const hoverDelay = parseInt(document.getElementById('hoverDelay').value, 10);
  const previewWidth = parseInt(document.getElementById('previewWidth').value, 10);
  const previewHeight = parseInt(document.getElementById('previewHeight').value, 10);
  
  const blacklistText = document.getElementById('blacklist').value;
  const blacklist = blacklistText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  const settings = {
    triggerMode: triggerMode,
    hoverDelay: hoverDelay,
    previewWidth: previewWidth,
    previewHeight: previewHeight,
    enableImagePreview: document.getElementById('enableImagePreview').checked,
    enableVideoPreview: document.getElementById('enableVideoPreview').checked,
    enableAudioPreview: document.getElementById('enableAudioPreview').checked,
    enableWebpagePreview: document.getElementById('enableWebpagePreview').checked,
    blacklist: blacklist
  };
  
  chrome.storage.sync.set(settings, () => {
    showToast('设置已保存');
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

function updateHoverDelaySection(triggerMode) {
  const section = document.getElementById('hover-delay-section');
  section.style.display = triggerMode === 'hover' ? 'block' : 'none';
}

function init() {
  loadSettings();
  
  document.querySelectorAll('input[name="triggerMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      updateHoverDelaySection(e.target.value);
    });
  });
  
  document.getElementById('hoverDelay').addEventListener('input', (e) => {
    document.getElementById('hoverDelayValue').textContent = e.target.value;
  });
  
  document.getElementById('saveBtn').addEventListener('click', saveSettings);
}

document.addEventListener('DOMContentLoaded', init);
