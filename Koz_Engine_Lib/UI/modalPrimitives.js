(function initModalPrimitivesLib(root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createModalPrimitivesApi() {
  function removeById(doc, id) {
    if (!doc || !id) return;
    doc.getElementById(id)?.remove();
  }

  function createCloseIconButton(doc, onClick) {
    const btn = doc.createElement("button");
    btn.textContent = "✕";
    Object.assign(btn.style, {
      position: "absolute", top: "10px", right: "12px", background: "none", color: "#fff",
      border: "none", fontSize: "calc(20px * var(--font-scale, 1))", cursor: "pointer", lineHeight: "1",
    });
    btn.onclick = onClick;
    return btn;
  }

  function createBackButton(doc, onClick, options = {}) {
    const btn = doc.createElement("button");
    btn.textContent = "← Back to City";
    Object.assign(btn.style, {
      background: "#333", color: "#fff", border: "1px solid #555", padding: "10px 20px",
      borderRadius: "6px", cursor: "pointer", fontSize: "calc(13px * var(--font-scale, 1))",
      marginTop: options.marginTop || "8px",
      width: options.width || "100%",
    });
    btn.onclick = onClick;
    return btn;
  }

  return {
    removeById,
    createCloseIconButton,
    createBackButton,
  };
});
