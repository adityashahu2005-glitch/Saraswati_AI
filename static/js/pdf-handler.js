/**
 * PDF and Document Handler (Upload, Drag-and-Drop, Base64 conversion)
 */

let uploadedFileName = null;
let uploadedFileBase64 = null;

function setupDropZone() {
  const dropZone = document.getElementById("dropZone");
  if (!dropZone) return;

  ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ["dragenter", "dragover"].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add("border-indigo-500", "bg-indigo-50/50", "dark:bg-indigo-950/30");
    }, false);
  });

  ["dragleave", "drop"].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove("border-indigo-500", "bg-indigo-50/50", "dark:bg-indigo-950/30");
    }, false);
  });

  dropZone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      processSelectedFile(files[0]);
    }
  });
}

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) {
    processSelectedFile(file);
  }
}

function processSelectedFile(file) {
  uploadedFileName = file.name;
  const isPdf = file.name.toLowerCase().endsWith(".pdf");
  const reader = new FileReader();

  const fileInfoText = document.getElementById("fileInfoText");

  if (isPdf) {
    reader.onload = function(e) {
      const arrayBuffer = e.target.result;
      let binary = "";
      const bytes = new Uint8Array(arrayBuffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      uploadedFileBase64 = btoa(binary);
      AppState.activePdfBase64 = uploadedFileBase64;

      if (fileInfoText) {
        fileInfoText.innerHTML = `
          <span class="inline-flex items-center space-x-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
            <span>📄 ${file.name}</span>
            <span class="text-xs text-slate-500 font-normal">(${(file.size / 1024).toFixed(1)} KB) - Ready for Gemini Analysis</span>
            <button onclick="clearUploadedFile(event)" class="ml-2 text-red-500 hover:text-red-700 text-xs">✕ Remove</button>
          </span>
        `;
      }
    };
    reader.readAsArrayBuffer(file);
  } else {
    // Text / Markdown
    reader.onload = function(e) {
      const text = e.target.result;
      document.getElementById("studyTextInput").value = text;
      uploadedFileBase64 = null;
      AppState.activePdfBase64 = null;

      if (fileInfoText) {
        fileInfoText.innerHTML = `
          <span class="inline-flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
            <span>📝 ${file.name}</span>
            <span class="text-xs text-slate-500 font-normal">(${(file.size / 1024).toFixed(1)} KB) - Loaded into editor</span>
            <button onclick="clearUploadedFile(event)" class="ml-2 text-red-500 hover:text-red-700 text-xs">✕ Clear</button>
          </span>
        `;
      }
    };
    reader.readAsText(file);
  }
}

function clearUploadedFile(event) {
  if (event) {
    event.stopPropagation();
  }
  uploadedFileName = null;
  uploadedFileBase64 = null;
  AppState.activePdfBase64 = null;
  const input = document.getElementById("pdfFileInput");
  if (input) input.value = "";
  const fileInfoText = document.getElementById("fileInfoText");
  if (fileInfoText) {
    fileInfoText.innerText = "Supports PDF documents, lecture notes, textbook chapters, or markdown";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setupDropZone();
});
