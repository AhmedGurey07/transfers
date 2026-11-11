(() => {
  const STORAGE_KEY = "ahmed-gurey-orders-v1";
  const DRIVERS_STORAGE_KEY = "ahmed-gurey-drivers-v1";
  const cloudDeployment = location.protocol !== "file:"
    || Boolean(window.ORDER_DESK_SUPABASE?.url && window.ORDER_DESK_SUPABASE?.anonKey);
  const categories = [
    "Tiles & marble",
    "Doors & mirrors",
    "Plumbing",
    "Electrical & decoration",
    "Gypsum & boards",
    "Shower glass",
    "Lighting & cables",
    "General order",
    "Converter"
  ];
  function normalizeCreatedBy(value) {
    const name = String(value || "").trim().toLowerCase();
    if (name === "ahmed gurey" || name === "eng ahmed gurey") return "Eng Ahmed Gurey";
    if (name === "hamze ali") return "Hamze Ali";
    return "";
  }
  function createdByForUser(user) {
    const displayName = normalizeCreatedBy(user?.user_metadata?.display_name);
    if (displayName) return displayName;
    const identity = `${user?.email || ""} ${user?.user_metadata?.username || ""}`
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (identity.includes("hamzeali")) return "Hamze Ali";
    if (identity.includes("engahmedgurey") || identity.includes("ahmedgurey")) return "Eng Ahmed Gurey";
    return "Eng Ahmed Gurey";
  }
  function usernameForUser(user) {
    const metadataName = String(user?.user_metadata?.display_name || user?.user_metadata?.username || "").trim();
    if (metadataName) return metadataName;
    const emailName = String(user?.email || "").split("@")[0].trim();
    return emailName || "Ahmed";
  }
  function greetingForTime(date = new Date()) {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 18) return "Good afternoon";
    if (hour >= 18 && hour < 21) return "Good evening";
    return "Good night";
  }
  const units = ["PCS", "CRT", "BOX", "ROLL", "MTR", "FLK", "SXRD", "XIDH", "FIRI", "SET", "M", "SQM", "KG", "BAG"];
  const tileUnits = ["FLK", "CRT", "FIRI"];
  const converters = {
    "tile-40-normal": { label: "40x40 Normal", falakad: 80.64, cartoon: 0.96, firi: 0.16 },
    "tile-40-outdoor": { label: "40x40 Outdoor", falakad: 70.4, cartoon: 0.8, firi: 0.16 },
    "tile-40-new": { label: "40x40 New", falakad: 78.96, cartoon: 0.94, firi: 0.94 / 6 },
    "tile-30-30": { label: "30x30", falakad: 86.4, cartoon: 0.72, firi: 0.09 },
    "tile-30-45": { label: "30x45 Normal", falakad: 97.2, cartoon: 0.81, firi: 0.135 },
    "tile-30-45-88": { label: "30x45 88 CRT", falakad: 71.28, cartoon: 0.81, firi: 0.135 },
    "tile-30-60-marble": { label: "30x60 Marble", falakad: 81, cartoon: 0.9, firi: 0.18 },
    "tile-30-60-other": { label: "30x60 Other", falakad: 86.4, cartoon: 0.9, firi: 0.18 },
    "tile-60-60-porcelain": { label: "60x60 Porcelain", falakad: 63.36, cartoon: 1.44, firi: 0.36 },
    "tile-60-60-46-crt": { label: "60x60 Porcelain 46 CRT", falakad: 66.24, cartoon: 1.44, firi: 0.36 },
    "tile-60-60-ceramic": { label: "60x60 Ceramic", falakad: 57.6, cartoon: 1.44, firi: 0.36 },
    "tile-60-60-thick": { label: "60x60 High thickness", falakad: 41.04, cartoon: 1.08, firi: 0.36 },
    "tile-60-60-outdoor": { label: "60x60 Outdoor", falakad: 45.36, cartoon: 1.08, firi: 0.36 },
    "tile-60-120-large": { label: "60x120 Large", falakad: 97.92, cartoon: 1.44, firi: 0.72 },
    "tile-60-120-small": { label: "60x120 Small", falakad: 43.2, cartoon: 1.44, firi: 0.72 },
    "tile-20-120": { label: "20x120", falakad: 50.4, cartoon: 1.2, firi: 0.36 },
    "tile-37-25": { label: "37x25", falakad: 97.5, cartoon: 0.75, firi: 0.09375 }
  };
  const gypsumConverters = {
    "gypsum-caag": {
      label: "Gypsum Caag",
      panelCartonArea: 7.08,
      firiArea: 0.354,
      structural: [
        { name: "Angle", factor: 0.4, piecesPerCarton: 50 },
        { name: "Main Tee", factor: 0.225, piecesPerCarton: 27 },
        { name: "Bir 120", factor: 1.35, piecesPerCarton: 75 },
        { name: "Bir 60", factor: 1.4, piecesPerCarton: 75 }
      ]
    },
    "gypsum-saafi": {
      label: "Gypsum Saafi",
      panelCartonArea: 3.5403,
      firiArea: 0.354,
      structural: [
        { name: "Angle", factor: 0.4, piecesPerCarton: 50 },
        { name: "Main Tee", factor: 0.225, piecesPerCarton: 27 },
        { name: "Bir 120", factor: 1.35, piecesPerCarton: 75 },
        { name: "Bir 60", factor: 1.4, piecesPerCarton: 75 }
      ]
    }
  };
  let productCatalog = window.AHMED_GUREY_PRODUCTS;
  if (!Array.isArray(productCatalog)) throw new Error("The warehouse product catalog did not load.");
  function cleanPdfText(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[–—−]/g, "-")
      .replace(/[’‘]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/·/g, " | ")
      .replace(/²/g, "2")
      .replace(/[^\x20-\x7e]/g, "?")
      .replace(/\s+/g, " ")
      .trim();
  }
  const productsByName = new Map();
  const productsByPdfName = new Map();
  const productsByCode = new Map();
  let lastSyncedVersion = "";
  let syncInProgress = false;
  let lastSyncError = "";
  let supabaseClient = null;
  let cloudUser = null;
  let cloudRole = "staff";
  let currentPreparedBy = "Eng Ahmed Gurey";
  let workspaceUsers = [];
  let cloudChannel = null;
  let cloudActivationPromise = null;
  let cloudRefreshTimer = null;
  let invitationSetupPending = new URLSearchParams(location.hash.slice(1)).get("type") === "invite"
    || new URLSearchParams(location.search).get("type") === "invite";
  let invitedSignupUser = null;
  let profilePreviewUrl = "";
  let editingCatalogIndex = -1;
  let adjustingCatalogIndex = -1;
  let catalogAdjustments = [];
  let catalogEditHistory = [];
  let returnedTiles = [];
  let returnedTilesSetupError = "";
  let editingReturnedTileId = "";
  let viewHistory = [];
  let orderFormSnapshot = "";
  function indexProductCatalog() {
    productsByName.clear();
    productsByPdfName.clear();
    productsByCode.clear();
    productCatalog.forEach((item) => {
      productsByName.set(item.product.toLocaleLowerCase(), item);
      productsByPdfName.set(cleanPdfText(item.product).toLocaleLowerCase(), item);
      const code = item.product.match(/^\[([^\]]+)\]/)?.[1];
      if (code) productsByCode.set(code.toLocaleLowerCase(), item);
    });
  }
  indexProductCatalog();
  function getCatalogProduct(product) {
    const normalized = String(product || "").toLocaleLowerCase();
    const code = String(product || "").match(/^\s*\[([^\]]+)\]/)?.[1]?.toLocaleLowerCase();
    return productsByName.get(normalized)
      || productsByPdfName.get(cleanPdfText(product).toLocaleLowerCase())
      || productsByCode.get(code);
  }

  function renderProductCatalogOptions() {
    const catalogList = $("#product-catalog");
    catalogList.replaceChildren(...productCatalog.map((item) => {
      const option = document.createElement("option");
      option.value = item.product;
      return option;
    }));
    $("#catalog-count").textContent = productCatalog.length.toLocaleString("en");
    renderCatalogFilterOptions();
    renderCatalogFilterPanel();
    renderProductCatalogTable();
  }

  function getFilteredCatalogRows() {
    const query = $("#catalog-search").value.trim().toLocaleLowerCase();
    const filterFields = [
      ["product", "PRODUCT"], ["quantities", "QUANTITY"], ["qtyItems", "Q/ITEM"],
      ["taken", "TAKEN"], ["rQuantities", "R/QUANTITY"], ["uomNs", "UOM/N"],
      ["unit", "UOM"], ["statuses", "STS"]
    ];
    return productCatalog.filter((item) => {
      const matchesSearch = `${item.product} ${(item.quantities || []).join(" ")} ${(item.qtyItems || []).join(" ")} ${(item.taken || []).join(" ")} ${(item.rQuantities || []).join(" ")} ${(item.uomNs || []).join(" ")} ${(item.statuses || []).join(" ")} ${item.unit}`
        .toLocaleLowerCase().includes(query);
      if (!matchesSearch) return false;
      return filterFields.every(([field]) => {
        const selected = catalogValueFilters[field];
        if (catalogNumericFields.has(field)) {
          if (!selected) return true;
          const target = Number(selected.value);
          if (!Number.isFinite(target)) return true;
          const values = Array.isArray(item[field]) ? item[field] : [item[field]];
          return values.some((value) => {
            const number = Number(value);
            if (!Number.isFinite(number)) return false;
            return selected.operator === "<" ? number < target
              : selected.operator === ">" ? number > target
                : selected.operator === "<=" ? number <= target
                  : selected.operator === ">=" ? number >= target
                    : selected.operator === "!=" ? number !== target
                      : selected.operator === "between"
                        ? number >= Math.min(target, Number(selected.second))
                          && number <= Math.max(target, Number(selected.second))
                        : number === target;
          });
        }
        if (selected?.contains !== undefined) {
          const values = (Array.isArray(item[field]) ? item[field] : [item[field]])
            .map((value) => String(value || "").toLocaleLowerCase());
          return values.some((value) => value.includes(selected.contains));
        }
        if (!selected || !selected.size) return true;
        const values = Array.isArray(item[field]) ? item[field] : [item[field]];
        return values.some((value) => selected.has(String(value || "—")));
      });
    });
  }

  function renderProductCatalogTable() {
    const filterFields = [
      ["product", "PRODUCT"], ["quantities", "QUANTITY"], ["qtyItems", "Q/ITEM"],
      ["taken", "TAKEN"], ["rQuantities", "R/QUANTITY"], ["uomNs", "UOM/N"],
      ["unit", "UOM"], ["statuses", "STS"]
    ];
    $("#catalog-headings").replaceChildren(
      ...filterFields.map(([, label]) => Object.assign(document.createElement("th"), { textContent: label })),
      Object.assign(document.createElement("th"), { innerHTML: '<span class="sr-only">Actions</span>' })
    );
    const filtered = getFilteredCatalogRows();
    const target = $("#catalog-products");
    target.replaceChildren(...filtered.map((item) => {
      const row = document.createElement("tr");
      row.title = "Click to preview this product";
      row.addEventListener("click", () => openCatalogPreview(item));
      const product = document.createElement("td");
      const productLink = document.createElement("button");
      productLink.type = "button";
      productLink.className = "catalog-product-history-link";
      productLink.textContent = item.product;
      productLink.title = "Show this product's history";
      productLink.addEventListener("click", (event) => {
        event.stopPropagation();
        itemHistoryProductFilter = item.product;
        $("#item-history-search").value = item.product;
        setView("item-history");
      });
      product.append(productLink);
      const quantity = document.createElement("td");
      quantity.textContent = formatCatalogValues(item.quantities);
      const qtyItem = document.createElement("td");
      qtyItem.textContent = formatCatalogValues(item.qtyItems);
      const taken = document.createElement("td");
      taken.textContent = formatCatalogValues(item.taken);
      const rQuantity = document.createElement("td");
      rQuantity.textContent = formatCatalogValues(item.rQuantities);
      const uomN = document.createElement("td");
      uomN.textContent = formatCatalogValues(item.uomNs);
      const unit = document.createElement("td");
      unit.textContent = item.unit;
      const status = document.createElement("td");
      status.textContent = (item.statuses || []).join(", ") || "—";
      const actions = document.createElement("td");
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "order-action-button";
      edit.setAttribute("aria-label", "Edit product");
      edit.title = "Edit product";
      edit.textContent = "Edit";
      edit.addEventListener("click", (event) => {
        event.stopPropagation();
        beginCatalogEdit(productCatalog.indexOf(item));
      });
      const add = document.createElement("button");
      add.type = "button";
      add.className = "order-action-button";
      add.setAttribute("aria-label", "Add quantity");
      add.title = "Add quantity";
      add.textContent = "Add";
      add.addEventListener("click", (event) => {
        event.stopPropagation();
        beginCatalogAdjustment(productCatalog.indexOf(item), 1);
      });
      const history = document.createElement("button");
      history.type = "button";
      history.className = "order-action-button";
      history.setAttribute("aria-label", "View product history");
      history.title = "Show this product's item history";
      history.textContent = "History";
      history.addEventListener("click", (event) => {
        event.stopPropagation();
        itemHistoryProductFilter = item.product;
        $("#item-history-search").value = item.product;
        setView("item-history");
      });
      actions.append(edit, add, history);
      row.append(product, quantity, qtyItem, taken, rQuantity, uomN, unit, status, actions);
      return row;
    }));
    labelTableRows(target);
    $("#catalog-view-count").textContent = filtered.length.toLocaleString("en");
    $("#catalog-empty").hidden = filtered.length > 0;
  }

  function labelTableRows(tbody) {
    const headerCells = [...tbody.closest("table").querySelectorAll("thead th")];
    const headers = headerCells.map((header) => {
      const label = header.textContent.trim().replace(/\s+/g, " ");
      header.title = label;
      return label;
    });
    tbody.querySelectorAll("tr").forEach((row) => {
      [...row.cells].forEach((cell, index) => {
        cell.dataset.label = headers[index] || "";
      });
    });
  }

  function openCatalogPreview(item) {
    const details = [
      ["Product", item.product],
      ["Quantity", formatCatalogValues(item.quantities)],
      ["Q/ITEM", formatCatalogValues(item.qtyItems)],
      ["Taken", formatCatalogValues(item.taken)],
      ["R/QUANTITY", formatCatalogValues(item.rQuantities)],
      ["UOM/N", formatCatalogValues(item.uomNs)],
      ["UOM", item.unit || "—"],
      ["STS", formatCatalogValues(item.statuses)]
    ];
    $("#catalog-preview-title").textContent = item.product;
    $("#catalog-preview-details").replaceChildren(...details.map(([label, value]) => {
      const card = document.createElement("div");
      card.append(Object.assign(document.createElement("span"), { textContent: label }));
      card.append(Object.assign(document.createElement("strong"), { textContent: value }));
      return card;
    }));
    $("#catalog-preview").hidden = false;
  }

  function closeCatalogPreview() {
    $("#catalog-preview").hidden = true;
  }

  function formatCatalogNumber(value) {
    const text = String(value ?? "").trim();
    const number = Number(text);
    if (!text || !Number.isFinite(number)) return text;
    return text.includes(".") || !Number.isInteger(number) ? number.toFixed(2) : text;
  }

  function formatCatalogValues(values) {
    return Array.isArray(values) && values.length
      ? values.map(formatCatalogNumber).join(", ")
      : "—";
  }

  const catalogValueFilters = {};
  const catalogNumericFields = new Set(["quantities", "qtyItems", "taken", "rQuantities", "uomNs"]);

  function renderCatalogFilterPanel() {
    $$("[data-catalog-filter-value]").forEach((input) => {
      const current = catalogValueFilters[input.dataset.catalogFilterValue];
      input.value = current?.value || "";
      const operator = $(`[data-catalog-filter-operator='${input.dataset.catalogFilterValue}']`);
      if (operator) operator.value = current?.operator || "=";
    });
    $$("[data-catalog-filter-second]").forEach((input) => {
      const current = catalogValueFilters[input.dataset.catalogFilterSecond];
      input.value = current?.second || "";
      input.hidden = current?.operator !== "between";
    });
    $$("[data-catalog-filter-input]").forEach((input) => {
      input.value = catalogValueFilters[input.dataset.catalogFilterInput]?.contains
        ? String(catalogValueFilters[input.dataset.catalogFilterInput].contains).toUpperCase()
        : "";
    });
  }

  function applyCatalogFilterPanel() {
    Object.keys(catalogValueFilters).forEach((key) => delete catalogValueFilters[key]);
    $$("[data-catalog-filter-value]").forEach((input) => {
      if (input.value === "") return;
      catalogValueFilters[input.dataset.catalogFilterValue] = {
        operator: $(`[data-catalog-filter-operator='${input.dataset.catalogFilterValue}']`).value,
        value: input.value,
        second: $(`[data-catalog-filter-second='${input.dataset.catalogFilterValue}']`)?.value || ""
      };
    });
    $$("[data-catalog-filter-input]").forEach((input) => {
      const value = input.value.trim().toLocaleLowerCase();
      if (!value) return;
      catalogValueFilters[input.dataset.catalogFilterInput] = { contains: value };
    });
    renderProductCatalogTable();
  }

  function cancelCatalogFilterPanel() {
    renderCatalogFilterPanel();
  }

  function catalogFieldValues(field) {
    return [...new Set(productCatalog.map((item) => {
      const values = Array.isArray(item[field]) ? item[field] : [item[field]];
      return values.map((value) => String(value || "—"));
    }).flat())].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  }

  function openCatalogFilterMenu(heading, field, label) {
    $$(".catalog-filter-menu").forEach((menu) => menu.remove());
    const menu = document.createElement("div");
    menu.className = "catalog-filter-menu";
    if (catalogNumericFields.has(field)) {
      const current = catalogValueFilters[field];
      const title = document.createElement("div");
      title.className = "catalog-filter-menu-title";
      title.textContent = "Number Filters";
      title.append(Object.assign(document.createElement("span"), { textContent: "›" }));
      const submenu = document.createElement("div");
      submenu.className = "catalog-filter-submenu";
      const options = [
        ["=", "Equals..."], ["!=", "Does Not Equal..."], [">", "Greater Than..."],
        [">=", "Greater Than Or Equal To..."], ["<", "Less Than..."],
        ["<=", "Less Than Or Equal To..."], ["between", "Between..."]
      ];
      options.forEach(([operator, text]) => {
        const option = document.createElement("button");
        option.type = "button";
        option.textContent = text;
        option.addEventListener("click", () => {
          const first = window.prompt(text.replace("...", ""), current?.value || "");
          if (first === null || first.trim() === "" || !Number.isFinite(Number(first))) return;
          if (operator === "between") {
            const second = window.prompt("And", current?.second || "");
            if (second === null || second.trim() === "" || !Number.isFinite(Number(second))) return;
            catalogValueFilters[field] = { operator, value: first.trim(), second: second.trim() };
          } else {
            catalogValueFilters[field] = { operator, value: first.trim() };
          }
          menu.remove();
          renderProductCatalogTable();
        });
        submenu.append(option);
      });
      const clear = document.createElement("button");
      clear.type = "button";
      clear.textContent = "Clear Filter";
      clear.addEventListener("click", () => {
        delete catalogValueFilters[field];
        menu.remove();
        renderProductCatalogTable();
      });
      submenu.append(clear);
      title.append(submenu);
      menu.append(title);
      heading.append(menu);
      return;
    }
    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = `Search ${label.toLowerCase()}`;
    const values = catalogFieldValues(field);
    const selected = new Set(catalogValueFilters[field] || values);
    const list = document.createElement("div");
    list.className = "catalog-filter-values";
    const renderValues = () => {
      list.replaceChildren(...values.filter((value) =>
        value.toLocaleLowerCase().includes(search.value.trim().toLocaleLowerCase())
      ).map((value) => {
        const labelElement = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = value;
        checkbox.checked = selected.has(value);
        checkbox.addEventListener("change", () => checkbox.checked ? selected.add(value) : selected.delete(value));
        labelElement.append(checkbox, document.createTextNode(value));
        return labelElement;
      }));
    };
    const selectAll = document.createElement("button");
    selectAll.type = "button";
    selectAll.textContent = "Select all";
    selectAll.addEventListener("click", () => { values.forEach((value) => selected.add(value)); renderValues(); });
    const clearAll = document.createElement("button");
    clearAll.type = "button";
    clearAll.textContent = "Clear all";
    clearAll.addEventListener("click", () => { selected.clear(); renderValues(); });
    const apply = document.createElement("button");
    apply.type = "button";
    apply.className = "button-primary";
    apply.textContent = "Apply";
    apply.addEventListener("click", () => {
      catalogValueFilters[field] = selected.size === values.length ? new Set() : selected;
      menu.remove();
      renderProductCatalogTable();
    });
    const actions = document.createElement("div");
    actions.className = "catalog-filter-actions";
    actions.append(selectAll, clearAll, apply);
    menu.append(search, list, actions);
    heading.append(menu);
    search.addEventListener("input", renderValues);
    renderValues();
    search.focus();
  }

  function splitCatalogValues(value) {
    return String(value || "").split(",").map((entry) => entry.trim()).filter(Boolean);
  }

  function catalogUomValues() {
    return [...new Set(productCatalog.map((item) => String(item.unit || "").trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  }

  function renderCatalogFilterOptions() {
    const target = $("[data-catalog-filter='unit']");
    if (!target) return;
    const selected = target.value;
    target.replaceChildren(new Option("All UOM", ""), ...catalogUomValues().map((unit) => new Option(unit, unit)));
    target.value = catalogUomValues().includes(selected) ? selected : "";
  }

  function renderCatalogUomOptions(selected = "") {
    const target = $("#catalog-edit-unit");
    const values = catalogUomValues();
    target.replaceChildren(...values.map((unit) => {
      const option = document.createElement("option");
      option.value = unit;
      option.textContent = unit;
      option.selected = unit === selected;
      return option;
    }));
    target.value = values.includes(selected) ? selected : "";
  }

  function beginCatalogEdit(index) {
    const item = productCatalog[index];
    if (!item) return;
    editingCatalogIndex = index;
    $("#catalog-edit-title").textContent = "Edit catalog product";
    $("#catalog-edit-product").value = item.product;
    $("#catalog-edit-quantities").value = (item.quantities || []).map(formatCatalogNumber).join(", ");
    $("#catalog-edit-qty-items").value = (item.qtyItems || []).map(formatCatalogNumber).join(", ");
    $("#catalog-edit-taken").value = (item.taken || []).map(formatCatalogNumber).join(", ");
    $("#catalog-edit-r-quantities").value = (item.rQuantities || []).map(formatCatalogNumber).join(", ");
    $("#catalog-edit-uom-ns").value = (item.uomNs || []).map(formatCatalogNumber).join(", ");
    renderCatalogUomOptions(item.unit);
    $("#catalog-edit-statuses").value = (item.statuses || []).join(", ");
    $("#catalog-edit-status").textContent = "";
    $("#catalog-edit-status").classList.remove("error");
    $("#catalog-edit-form").hidden = false;
    $("#catalog-edit-product").focus();
  }

  function beginCatalogAdd() {
    editingCatalogIndex = -1;
    $("#catalog-edit-title").textContent = "Add catalog product";
    $("#catalog-edit-product").value = "";
    $("#catalog-edit-quantities").value = "";
    $("#catalog-edit-qty-items").value = "";
    $("#catalog-edit-taken").value = "";
    $("#catalog-edit-r-quantities").value = "";
    $("#catalog-edit-uom-ns").value = "";
    renderCatalogUomOptions();
    $("#catalog-edit-statuses").value = "";
    $("#catalog-edit-status").textContent = "";
    $("#catalog-edit-status").classList.remove("error");
    $("#catalog-edit-form").hidden = false;
    $("#catalog-edit-product").focus();
  }

  function closeCatalogEdit() {
    editingCatalogIndex = -1;
    $("#catalog-edit-form").hidden = true;
    $("#catalog-edit-status").textContent = "";
    $("#catalog-edit-title").textContent = "Edit catalog product";
  }

  function updateCatalogDerivedFields() {
    const quantity = Number(splitCatalogValues($("#catalog-edit-quantities").value)[0]);
    const takenText = splitCatalogValues($("#catalog-edit-taken").value)[0];
    const taken = takenText === undefined || takenText === "" ? 0 : Number(takenText);
    const qtyItem = Number(splitCatalogValues($("#catalog-edit-qty-items").value)[0]);
    if (!Number.isFinite(quantity) || !Number.isFinite(taken)) return;
    const remaining = quantity - taken;
    $("#catalog-edit-r-quantities").value = formatCatalogNumber(String(remaining));
    $("#catalog-edit-statuses").value = remaining === 0 ? "END" : "DONE";
    if (Number.isFinite(qtyItem) && qtyItem !== 0) {
      $("#catalog-edit-uom-ns").value = formatCatalogNumber(String(remaining / qtyItem));
    } else {
      $("#catalog-edit-uom-ns").value = "";
    }
  }

  async function saveCatalogEdit(event) {
    event.preventDefault();
    if (!$("#catalog-edit-form").reportValidity()) return;
    if (!cloudUser || !supabaseClient) {
      $("#catalog-edit-status").textContent = "Sign in to save catalog changes.";
      $("#catalog-edit-status").classList.add("error");
      return;
    }
    const product = $("#catalog-edit-product").value.trim();
    const unit = $("#catalog-edit-unit").value.trim();
    const duplicate = productCatalog.some((item, index) =>
      index !== editingCatalogIndex && item.product.toLocaleLowerCase() === product.toLocaleLowerCase()
    );
    if (!unit) {
      $("#catalog-edit-status").textContent = "Select at least one UOM.";
      $("#catalog-edit-status").classList.add("error");
      return;
    }
    if (duplicate) {
      $("#catalog-edit-status").textContent = "Another product already has this description.";
      $("#catalog-edit-status").classList.add("error");
      return;
    }
    const isNewProduct = editingCatalogIndex < 0;
    updateCatalogDerivedFields();
    const previous = productCatalog[editingCatalogIndex];
    const updatedProduct = {
      product,
      unit,
      quantities: splitCatalogValues($("#catalog-edit-quantities").value),
      qtyItems: splitCatalogValues($("#catalog-edit-qty-items").value),
      taken: splitCatalogValues($("#catalog-edit-taken").value),
      rQuantities: splitCatalogValues($("#catalog-edit-r-quantities").value),
      uomNs: splitCatalogValues($("#catalog-edit-uom-ns").value),
      statuses: splitCatalogValues($("#catalog-edit-statuses").value)
    };
    const historyValue = (value) => Array.isArray(value)
      ? value.map(formatCatalogNumber).join(", ")
      : String(value ?? "");
    const changedFields = isNewProduct ? [] : [
      ["product", "Product / description"],
      ["quantities", "Quantity"],
      ["qtyItems", "Q/ITEM"],
      ["taken", "Taken"],
      ["rQuantities", "R/QUANTITY"],
      ["uomNs", "UOM/N"],
      ["unit", "UOM"],
      ["statuses", "STS"]
    ].flatMap(([field, label]) => {
      const before = historyValue(previous[field]);
      const after = historyValue(updatedProduct[field]);
      return before === after ? [] : [{ field: label, before, after }];
    });
    const editEntry = changedFields.length ? {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      product: updatedProduct.product,
      previousProduct: previous.product,
      changes: changedFields
    } : null;
    if (editingCatalogIndex < 0) productCatalog.push(updatedProduct);
    else productCatalog[editingCatalogIndex] = updatedProduct;
    if (editEntry) catalogEditHistory = [...catalogEditHistory, editEntry];
    try {
      await saveCatalogToCloud(currentCatalogData());
      indexProductCatalog();
      renderProductCatalogOptions();
      renderItemHistory();
      refreshPreview();
      closeCatalogEdit();
      showToast(isNewProduct ? "Product added to the catalog." : "Product catalog updated.");
    } catch (error) {
      if (editingCatalogIndex < 0) productCatalog.pop();
      else productCatalog[editingCatalogIndex] = previous;
      if (editEntry) catalogEditHistory = catalogEditHistory.filter((entry) => entry.id !== editEntry.id);
      console.error("Could not save the catalog product.", error);
      $("#catalog-edit-status").textContent = error.message || "Could not save catalog changes.";
      $("#catalog-edit-status").classList.add("error");
    }
  }

  function beginCatalogAdjustment(index, direction) {
    const item = productCatalog[index];
    if (!item) return;
    adjustingCatalogIndex = index;
    $("#catalog-adjust-form").hidden = false;
    $("#catalog-adjust-product-label").textContent = `${direction > 0 ? "Adding to" : "Subtracting from"} ${item.product}`;
    $("#catalog-adjust-form").dataset.direction = String(direction);
    $("#catalog-adjust-amount").value = "";
    $("#catalog-adjust-date").value = dateValue();
    $("#catalog-adjust-reason").value = "";
    $("#catalog-adjust-status").textContent = "";
    $("#catalog-adjust-status").classList.remove("error");
    $("#catalog-adjust-amount").focus();
    $("#catalog-adjust-form").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeCatalogAdjustment() {
    adjustingCatalogIndex = -1;
    $("#catalog-adjust-form").hidden = true;
    $("#catalog-adjust-status").textContent = "";
  }

  async function saveCatalogAdjustment(event) {
    event.preventDefault();
    if (adjustingCatalogIndex < 0 || !$("#catalog-adjust-form").reportValidity()) return;
    if (!cloudUser || !supabaseClient) {
      $("#catalog-adjust-status").textContent = "Sign in to save quantity adjustments.";
      $("#catalog-adjust-status").classList.add("error");
      return;
    }
    const item = productCatalog[adjustingCatalogIndex];
    const amount = Number($("#catalog-adjust-amount").value);
    const direction = Number($("#catalog-adjust-form").dataset.direction);
    const date = $("#catalog-adjust-date").value;
    const reason = $("#catalog-adjust-reason").value.trim();
    const quantity = Number(item.quantities?.[0]);
    if (!item || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(direction)
      || !Number.isFinite(quantity) || !date || !reason) return;
    const previous = {
      ...item,
      quantities: [...(item.quantities || [])],
      taken: [...(item.taken || [])],
      rQuantities: [...(item.rQuantities || [])],
      uomNs: [...(item.uomNs || [])],
      statuses: [...(item.statuses || [])]
    };
    const nextQuantity = quantity + amount * direction;
    if (nextQuantity < 0) {
      $("#catalog-adjust-status").textContent = "The quantity cannot become negative.";
      $("#catalog-adjust-status").classList.add("error");
      return;
    }
    item.quantities = [...(item.quantities || [])];
    item.quantities[0] = formatCatalogNumber(nextQuantity);
    recalculateCatalogProduct(item);
    const adjustment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      date,
      product: item.product,
      amount: amount * direction,
      reason,
      unit: item.unit || "—"
    };
    catalogAdjustments = [...catalogAdjustments, adjustment];
    try {
      await saveCatalogToCloud(currentCatalogData());
      renderProductCatalogOptions();
      closeCatalogAdjustment();
      showToast("Product quantity adjustment saved.");
    } catch (error) {
      Object.assign(item, previous);
      catalogAdjustments = catalogAdjustments.filter((entry) => entry.id !== adjustment.id);
      console.error("Could not save product quantity adjustment.", error);
      $("#catalog-adjust-status").textContent = error.message || "Could not save this adjustment.";
      $("#catalog-adjust-status").classList.add("error");
    }
  }

  function returnedTileDate(value) {
    if (!value) return "—";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`)
      : new Date(value);
    return Number.isNaN(date.getTime())
      ? value
      : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
  }

  function renderReturnedTiles() {
    const status = $("#returned-tile-status");
    const unavailable = Boolean(returnedTilesSetupError);
    $("#save-returned-tile").disabled = unavailable;
    $("#import-returned-tiles").disabled = unavailable;
    if (unavailable) {
      status.textContent = returnedTilesSetupError;
      status.classList.add("error");
    } else if (status.textContent === "Run supabase-returned-tiles.sql in Supabase SQL Editor, then reload this app to enable returned tiles.") {
      status.textContent = "";
      status.classList.remove("error");
    }
    const query = $("#returned-tiles-search").value.trim().toLocaleLowerCase();
    const entries = [...returnedTiles]
      .filter((entry) => [
        entry.returnedFrom, entry.product, entry.branch, entry.driver,
        entry.returnedBy, entry.recordedBy, entry.sourceNo
      ].join(" ").toLocaleLowerCase().includes(query))
      .sort((left, right) => String(right.returnedDate || "").localeCompare(String(left.returnedDate || ""))
        || Number(right.createdAt || 0) - Number(left.createdAt || 0));
    const rows = entries.map((entry) => {
      const row = document.createElement("tr");
      row.classList.add("clickable-returned-tile-row");
      row.tabIndex = 0;
      row.setAttribute("role", "button");
      row.setAttribute("aria-label", `Edit returned tile ${entry.product} returned from ${entry.returnedFrom}`);
      row.addEventListener("click", () => beginReturnedTileEdit(entry.id));
      row.addEventListener("keydown", (event) => {
        if (event.target !== row || !["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        beginReturnedTileEdit(entry.id);
      });
      [
        entry.sourceNo || "—",
        entry.returnedFrom || "—",
        entry.product || "—",
        entry.branch || "—",
        entry.driver || "—",
        formatCatalogNumber(entry.cartons),
        formatCatalogNumber(entry.firi),
        returnedTileDate(entry.deliveredDate),
        returnedTileDate(entry.returnedDate),
        entry.returnedBy || "—",
        entry.recordedBy || "—"
      ].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      return row;
    });
    $("#returned-tiles").replaceChildren(...rows);
    labelTableRows($("#returned-tiles"));
    $("#returned-tiles-count").textContent = returnedTiles.length.toLocaleString("en");
    $("#returned-tiles-empty").hidden = entries.length > 0;
  }

  function beginReturnedTileEdit(id) {
    const entry = returnedTiles.find((candidate) => candidate.id === id);
    if (!entry) return;
    editingReturnedTileId = id;
    $("#returned-tile-form-title").textContent = "Edit returned tile";
    $("#return-customer").value = entry.returnedFrom || "";
    $("#return-product").value = entry.product || "";
    $("#return-branch").value = entry.branch || "";
    $("#return-driver").value = entry.driver || "";
    $("#return-cartons").value = String(entry.cartons ?? 0);
    $("#return-firi").value = String(entry.firi ?? 0);
    $("#return-delivered-date").value = entry.deliveredDate || "";
    $("#return-date").value = entry.returnedDate || "";
    $("#return-returned-by").value = entry.returnedBy || "";
    $("#save-returned-tile").textContent = "Save changes";
    $("#cancel-returned-tile-edit").hidden = false;
    $("#returned-tile-status").textContent = "";
    $("#returned-tile-status").classList.remove("error");
    $("#returned-tile-form").scrollIntoView({ behavior: "smooth", block: "start" });
    $("#return-customer").focus({ preventScroll: true });
  }

  function closeReturnedTileEdit() {
    editingReturnedTileId = "";
    $("#returned-tile-form").reset();
    $("#return-cartons").value = "0";
    $("#return-firi").value = "0";
    $("#return-date").value = dateValue();
    $("#returned-tile-form-title").textContent = "Register a returned tile";
    $("#save-returned-tile").textContent = "Save return";
    $("#cancel-returned-tile-edit").hidden = true;
    $("#returned-tile-status").textContent = "";
    $("#returned-tile-status").classList.remove("error");
  }

  async function saveReturnedTile(event) {
    event.preventDefault();
    const form = $("#returned-tile-form");
    const status = $("#returned-tile-status");
    if (!form.reportValidity()) return;
    status.classList.remove("error");
    if (!cloudUser || !supabaseClient) {
      status.textContent = "Sign in to save returned tiles.";
      status.classList.add("error");
      return;
    }
    if (returnedTilesSetupError) {
      status.textContent = returnedTilesSetupError;
      status.classList.add("error");
      return;
    }
    const cartons = Number($("#return-cartons").value);
    const firi = Number($("#return-firi").value);
    if (!Number.isFinite(cartons) || cartons < 0 || !Number.isFinite(firi) || firi < 0
      || cartons + firi <= 0) {
      status.textContent = "Enter a quantity greater than zero in Cartons or FIRI.";
      status.classList.add("error");
      return;
    }
    const existing = editingReturnedTileId
      ? returnedTiles.find((candidate) => candidate.id === editingReturnedTileId)
      : null;
    if (editingReturnedTileId && !existing) {
      status.textContent = "This return is no longer available. Refresh the list and try again.";
      status.classList.add("error");
      return;
    }
    const now = Date.now();
    const entry = { ...(existing || {}) };
    [
      "deliveryRecipient", "deliveryBranch", "deliveryDriver", "deliveryDate",
      "deliveredRecordedBy", "deliveredRecordedAt"
    ].forEach((field) => delete entry[field]);
    Object.assign(entry, {
      id: existing?.id || `return-${now}-${Math.random().toString(36).slice(2)}`,
      createdAt: existing?.createdAt || now,
      returnedFrom: $("#return-customer").value.trim(),
      product: $("#return-product").value.trim(),
      branch: $("#return-branch").value.trim(),
      driver: $("#return-driver").value.trim(),
      cartons,
      firi,
      deliveredDate: $("#return-delivered-date").value,
      returnedDate: $("#return-date").value,
      returnedBy: $("#return-returned-by").value.trim(),
      recordedBy: usernameForUser(cloudUser),
      ...(existing ? {
        returnEditedAt: now,
        returnEditedBy: usernameForUser(cloudUser)
      } : {})
    });
    const previousEntries = returnedTiles;
    returnedTiles = existing
      ? returnedTiles.map((candidate) => candidate.id === entry.id ? entry : candidate)
      : [...returnedTiles, entry];
    status.textContent = existing ? "Saving return changes…" : "Saving returned tile…";
    status.classList.remove("error");
    $("#save-returned-tile").disabled = true;
    try {
      const { data: savedEntry, error } = existing
        ? await supabaseClient.from("returned_tile_records")
          .update({ data: entry, updated_at: new Date().toISOString() })
          .eq("id", entry.id)
          .select("id")
          .maybeSingle()
        : await supabaseClient.from("returned_tile_records")
          .insert({ id: entry.id, data: entry })
          .select("id")
          .maybeSingle();
      if (error) throw error;
      if (!savedEntry) throw new Error("The returned-tile record was not saved. Refresh the list and try again.");
      closeReturnedTileEdit();
      status.textContent = existing
        ? "Return changes saved. Catalog stock was not changed."
        : "Return saved. Catalog stock was not changed.";
      renderReturnedTiles();
      renderItemHistory();
      showToast(existing ? "Returned tile updated." : "Returned tile saved.");
    } catch (error) {
      returnedTiles = previousEntries;
      console.error("Could not save returned tile.", error);
      status.textContent = error.message || "Could not save this return.";
      status.classList.add("error");
    } finally {
      $("#save-returned-tile").disabled = false;
    }
  }

  async function importReturnedTiles(file) {
    const status = $("#returned-tiles-import-status");
    status.hidden = false;
    status.classList.remove("error");
    try {
      if (!file) return;
      if (!cloudUser || !supabaseClient) throw new Error("Sign in before importing returned-tile history.");
      if (returnedTilesSetupError) throw new Error(returnedTilesSetupError);
      const fileApp = location.protocol === "file:";
      const localServer = fileApp || location.protocol === "http:"
        && ["127.0.0.1", "localhost"].includes(location.hostname);
      if (!localServer) {
        throw new Error("Excel history import is available when you open the app with Start Order Desk.cmd.");
      }
      if (file.size > 25 * 1024 * 1024) throw new Error("Choose a workbook smaller than 25 MB.");
      status.textContent = "Reading returned-tile history…";
      const apiBase = fileApp ? "http://127.0.0.1:8765" : "";
      const response = await fetch(`${apiBase}/api/import-returned-tiles`, {
        method: "POST",
        body: file,
        cache: "no-store",
        mode: fileApp ? "cors" : "same-origin"
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not read the returned-tile workbook.");
      if (!Array.isArray(result.returns) || result.returns.some((entry) =>
        !entry || typeof entry.product !== "string" || typeof entry.returnedFrom !== "string"
      )) {
        throw new Error("The workbook does not contain valid returned-tile rows.");
      }
      const workbookReturns = result.returns
        .filter((entry) => entry.product.trim() && entry.returnedFrom.trim());
      const existingById = new Map(returnedTiles.map((entry) => [entry.id, entry]));
      const imported = workbookReturns
        .filter((entry) => !existingById.has(entry.id))
        .map((entry) => ({
          ...entry,
          createdAt: Number(entry.createdAt) || Date.now(),
          recordedBy: String(entry.recordedBy || "").trim() || usernameForUser(cloudUser)
        }));
      const recorderUpdates = workbookReturns.flatMap((source) => {
        const existing = existingById.get(source.id);
        const recordedBy = String(source.recordedBy || "").trim();
        return existing && !String(existing.recordedBy || "").trim() && recordedBy
          ? [{ ...existing, recordedBy }]
          : [];
      });
      if (!imported.length && !recorderUpdates.length) {
        status.textContent = "No new returns found. Previously imported rows were left unchanged.";
        return;
      }
      const previousEntries = returnedTiles;
      const updatedById = new Map(recorderUpdates.map((entry) => [entry.id, entry]));
      returnedTiles = [
        ...returnedTiles.map((entry) => updatedById.get(entry.id) || entry),
        ...imported
      ];
      try {
        const { error } = await supabaseClient.from("returned_tile_records").upsert(
          [...recorderUpdates, ...imported].map((entry) => ({ id: entry.id, data: entry })),
          { onConflict: "id" }
        );
        if (error) throw error;
      } catch (error) {
        returnedTiles = previousEntries;
        throw error;
      }
      const messages = [];
      if (imported.length) messages.push(`Imported ${imported.length.toLocaleString("en")} return records`);
      if (recorderUpdates.length) {
        messages.push(`loaded recorder names for ${recorderUpdates.length.toLocaleString("en")} existing returns`);
      }
      status.textContent = `${messages.join(" and ")}. Catalog stock was not changed.`;
      renderReturnedTiles();
      renderItemHistory();
      showToast(messages.join(" and ") + ".");
    } catch (error) {
      console.error("Could not import returned-tile history.", error);
      status.textContent = error.message || "Could not import this workbook.";
      status.classList.add("error");
    }
  }

  function setSyncStatus(message, isError = false) {
    const status = $("#sync-status");
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  function applySyncedSourceData(data) {
    if (!Array.isArray(data.products) || !data.products.length
      || data.products.some((item) => !item || typeof item.product !== "string"
        || typeof item.unit !== "string" || !Array.isArray(item.qtyItems)
        || !Array.isArray(item.rQuantities) || !Array.isArray(item.uomNs))) {
      throw new Error("The updated Excel catalog has an invalid format.");
    }
    for (const key of Object.keys(converters)) {
      const source = data.converters?.[key];
      if (!source || !["falakad", "cartoon", "firi"].every((field) =>
        Number.isFinite(Number(source[field])) && Number(source[field]) > 0
      )) {
        throw new Error(`The updated source is missing valid converter values for ${key}.`);
      }
    }
    for (const key of Object.keys(gypsumConverters)) {
      const source = data.gypsumConverters?.[key];
      if (!source || !Number.isFinite(Number(source.panelCartonArea))
        || !Number.isFinite(Number(source.firiArea)) || !Array.isArray(source.structural)
        || source.structural.some((item) => !item || typeof item.name !== "string"
          || !Number.isFinite(Number(item.factor)) || !Number.isFinite(Number(item.piecesPerCarton))
          || Number(item.piecesPerCarton) <= 0)) {
        throw new Error(`The updated source is missing valid gypsum converter values for ${key}.`);
      }
    }
    productCatalog = data.products;
    if (Array.isArray(data.adjustments)) catalogAdjustments = data.adjustments;
    if (Array.isArray(data.catalogEditHistory)) catalogEditHistory = data.catalogEditHistory;
    window.AHMED_GUREY_PRODUCTS = productCatalog;
    indexProductCatalog();
    Object.keys(converters).forEach((key) => {
      converters[key] = { ...converters[key], ...data.converters[key] };
    });
    Object.keys(gypsumConverters).forEach((key) => {
      gypsumConverters[key] = {
        ...gypsumConverters[key],
        ...data.gypsumConverters[key],
        structural: data.gypsumConverters[key].structural.map((item) => ({
          ...item,
          factor: Number(item.factor),
          piecesPerCarton: Number(item.piecesPerCarton)
        }))
      };
    });
    renderProductCatalogOptions();
    renderCatalogFilterOptions();
    updateConverter();
    refreshPreview();
  }

  function currentCatalogData() {
    return {
      products: productCatalog.map((item) => ({
        product: String(item.product || ""),
        quantity: String(item.quantity || ""),
        quantities: Array.isArray(item.quantities) ? item.quantities.map(String) : [],
        qtyItems: Array.isArray(item.qtyItems) ? item.qtyItems.map(String) : [],
        taken: Array.isArray(item.taken) ? item.taken.map(String) : [],
        rQuantities: Array.isArray(item.rQuantities) ? item.rQuantities.map(String) : [],
        uomNs: Array.isArray(item.uomNs) ? item.uomNs.map(String) : [],
        unit: String(item.unit || ""),
        statuses: Array.isArray(item.statuses) ? item.statuses.map(String) : []
      })),
      converters,
      gypsumConverters,
      adjustments: catalogAdjustments,
      catalogEditHistory
    };
  }

  function catalogHasWorkbookColumns(data) {
    return Array.isArray(data?.products)
      && data.products.some((item) =>
        Array.isArray(item?.quantities)
        || Array.isArray(item?.taken)
        || Array.isArray(item?.statuses)
      );
  }

  async function syncCatalogToWorkbook(data = currentCatalogData()) {
    const fileApp = location.protocol === "file:";
    const localServer = fileApp || location.protocol === "http:" && ["127.0.0.1", "localhost"].includes(location.hostname);
    if (!localServer) {
      setSyncStatus("Database saved · Excel sync requires Start Order Desk.cmd.", true);
      return false;
    }
    const apiBase = fileApp ? "http://127.0.0.1:8765" : "";
    const response = await fetch(`${apiBase}/api/write-workbook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      cache: "no-store",
      mode: fileApp ? "cors" : "same-origin"
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Could not update the Excel workbook.");
    applySyncedSourceData(result.data);
    lastSyncedVersion = result.data.version;
    setSyncStatus(`Excel workbook updated · ${result.data.products.length.toLocaleString("en")} products.`);
    return true;
  }

  async function saveCatalogToCloud(data = currentCatalogData(), syncWorkbook = true) {
    if (!supabaseClient || !cloudUser) {
      throw new Error("Sign in to save catalog changes to the database.");
    }
    const { error } = await supabaseClient.from("workspace_catalog").upsert({
      catalog_key: "default",
      data,
      updated_at: new Date().toISOString()
    }, { onConflict: "catalog_key" });
    if (error) throw error;
    if (syncWorkbook) await syncCatalogToWorkbook(data);
  }

  async function loadCatalogFromCloud() {
    const { data, error } = await supabaseClient
      .from("workspace_catalog")
      .select("data")
      .eq("catalog_key", "default")
      .maybeSingle();
    if (error) throw error;
    if (data?.data && catalogHasWorkbookColumns(data.data)) applySyncedSourceData(data.data);
    return Boolean(data?.data);
  }

  function exportCatalogToExcel() {
    const headers = ["PRODUCT / DESCRIPTION", "QUANTITY", "Q/ITEM", "TAKEN", "R/QUANTITY", "UOM/N", "UOM", "STS"];
    const valueForExcel = (value) => escapeAttribute(Array.isArray(value) ? value.join(", ") : value ?? "");
    const rows = getFilteredCatalogRows().map((item) => [
      item.product,
      item.quantities,
      item.qtyItems,
      item.taken,
      item.rQuantities,
      item.uomNs,
      item.unit,
      item.statuses
    ]);
    const table = `<table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${
      rows.map((row) => `<tr>${row.map((value) => `<td>${valueForExcel(value)}</td>`).join("")}</tr>`).join("")
    }</tbody></table>`;
    const workbook = `<!doctype html><html><head><meta charset="utf-8"><style>table{border-collapse:collapse}th,td{border:1px solid #999;padding:5px}th{font-weight:bold;background:#eaf3ec}</style></head><body>${table}</body></html>`;
    const blob = new Blob([`\ufeff${workbook}`], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `warehouse-catalog-${dateValue()}.xls`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(`${rows.length.toLocaleString("en")} filtered products exported to Excel.`);
  }

  async function uploadWorkbook(file) {
    if (!file) return;
    const fileApp = location.protocol === "file:";
    const localServer = fileApp || location.protocol === "http:" && ["127.0.0.1", "localhost"].includes(location.hostname);
    if (!localServer) {
      setSyncStatus("Excel upload is available when using Start Order Desk.cmd.", true);
      return;
    }
    const apiBase = fileApp ? "http://127.0.0.1:8765" : "";
    setSyncStatus("Uploading Excel workbook…");
    try {
      const response = await fetch(`${apiBase}/api/upload-workbook`, {
        method: "POST",
        body: file,
        cache: "no-store",
        mode: fileApp ? "cors" : "same-origin"
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not upload the workbook.");
      lastSyncedVersion = "";
      applySyncedSourceData(result.data);
      lastSyncedVersion = result.data.version;
      await saveCatalogToCloud(currentCatalogData(), false);
      setSyncStatus(`Excel catalog updated · ${result.data.products.length.toLocaleString("en")} products.`);
      showToast("Product catalog updated from Excel.");
    } catch (error) {
      console.error("Could not upload the Excel workbook.", error);
      setSyncStatus(`Excel upload failed — ${error.message}`, true);
      showToast("The Excel workbook could not be uploaded.");
    }
  }

  async function syncSourceData(force = false) {
    const fileApp = location.protocol === "file:";
    const localServer = location.protocol === "http:" && ["127.0.0.1", "localhost"].includes(location.hostname);
    if (!fileApp && !localServer) {
      setSyncStatus("Live sync off — open Start Order Desk.cmd.");
      return;
    }
    if (syncInProgress) return;
    syncInProgress = true;
    try {
      const apiBase = fileApp ? "http://127.0.0.1:8765" : "";
      const response = await fetch(`${apiBase}/api/${force ? "refresh" : "data"}`, {
        method: force ? "POST" : "GET",
        cache: "no-store",
        mode: fileApp ? "cors" : "same-origin"
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Could not read the original files.");
      if (result.data.version !== lastSyncedVersion) {
        applySyncedSourceData(result.data);
        lastSyncedVersion = result.data.version;
        if (cloudUser && supabaseClient) await saveCatalogToCloud(currentCatalogData(), false);
      }
      if (result.warning) {
        if (result.warning !== lastSyncError) console.error("Live source sync warning.", result.warning);
        lastSyncError = result.warning;
        setSyncStatus("Sync warning — using last good data. " + result.warning, true);
      } else {
        lastSyncError = "";
        setSyncStatus(`Live sync active · checked ${new Intl.DateTimeFormat("en", {
          hour: "numeric",
          minute: "2-digit"
        }).format(new Date())}.`);
      }
    } catch (error) {
      const message = error.message || "Could not connect to the local sync helper.";
      if (message !== lastSyncError) console.error("Could not sync the original Excel and converter files.", error);
      lastSyncError = message;
      setSyncStatus(`Live sync unavailable — ${message}`, true);
    } finally {
      syncInProgress = false;
    }
  }

  function setAuthStatus(message, isError = false) {
    const status = $("#auth-status");
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  function showAuthGate(message, isError = false) {
    $("#app-shell").hidden = true;
    $("#auth-gate").hidden = false;
    $("#auth-form").hidden = false;
    $("#invite-signup-form").hidden = true;
    setAuthStatus(message, isError);
  }

  function setInviteSignupStatus(message, isError = false) {
    const status = $("#invite-signup-status");
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  function showInvitationSignup(user) {
    invitedSignupUser = user;
    $("#app-shell").hidden = true;
    $("#auth-gate").hidden = false;
    $("#auth-form").hidden = true;
    $("#invite-signup-form").hidden = false;
    $("#invite-email").value = user.email || "";
    $("#invite-username").value = typeof user.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name
      : "";
    setInviteSignupStatus("");
  }

  function validateAvatarFile(file) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      throw new Error("Choose a PNG, JPEG, or WebP image.");
    }
    if (file.size > 2 * 1024 * 1024) throw new Error("The profile image must be 2 MB or smaller.");
  }

  async function uploadProfileAvatar(file, userId) {
    validateAvatarFile(file);
    if (!file) return null;
    const extension = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[file.type];
    const path = `${userId}/avatar.${extension}`;
    const { error } = await supabaseClient.storage.from("profile-photos").upload(path, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: true
    });
    if (error) {
      if (error.message?.toLowerCase().includes("bucket not found")) {
        throw new Error("Profile photo storage is not set up yet. Run the storage bucket setup from supabase-schema.sql in your Supabase SQL Editor, then try again.");
      }
      throw error;
    }
    return path;
  }

  function getProfileAvatarUrl(user) {
    const path = user?.user_metadata?.avatar_path;
    if (typeof path !== "string" || !path) return "";
    return supabaseClient.storage.from("profile-photos").getPublicUrl(path).data.publicUrl;
  }

  function renderAccountAvatar(user) {
    const name = String(user?.user_metadata?.display_name || user?.email || "AG").trim();
    const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "AG";
    $("#account-avatar-initials").textContent = initials;
    const image = $("#account-avatar-image");
    const url = getProfileAvatarUrl(user);
    image.hidden = !url;
    if (url) image.src = url;
    else image.removeAttribute("src");
    const sidebarName = $("#sidebar-account-name");
    const sidebarId = $("#sidebar-account-id");
    const sidebarInitials = $("#sidebar-avatar-initials");
    const sidebarImage = $("#sidebar-avatar-image");
    if (sidebarName) sidebarName.textContent = usernameForUser(user);
    if (sidebarId) sidebarId.textContent = user?.email || "Signed in";
    if (sidebarInitials) sidebarInitials.textContent = initials;
    if (sidebarImage) {
      sidebarImage.hidden = !url;
      if (url) sidebarImage.src = url;
      else sidebarImage.removeAttribute("src");
    }
  }

  function resetProfilePreview() {
    if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
    profilePreviewUrl = "";
    const preview = $("#profile-avatar-preview");
    const url = getProfileAvatarUrl(cloudUser);
    preview.hidden = !url;
    if (url) preview.src = url;
    else preview.removeAttribute("src");
  }

  function prepareProfileForm() {
    $("#profile-username").value = String(cloudUser?.user_metadata?.display_name || "");
    $("#profile-avatar-file").value = "";
    $("#profile-password").value = "";
    $("#profile-password-confirm").value = "";
    resetProfilePreview();
    $("#profile-status").textContent = "";
    $("#profile-status").classList.remove("error");
  }

  async function finishInvitedSignup(event) {
    event.preventDefault();
    const submit = $("#invite-signup-submit");
    const name = $("#invite-username").value.trim();
    const password = $("#invite-password").value;
    const confirmation = $("#invite-password-confirm").value;
    const file = $("#invite-avatar-file").files[0];
    if (!invitationSetupPending || !invitedSignupUser) {
      setInviteSignupStatus("Signups are invite-only. Ask a workspace admin to send you an invitation.", true);
      return;
    }
    if (!name || name.length > 120) {
      setInviteSignupStatus("Enter a username up to 120 characters.", true);
      return;
    }
    if (password.length < 8 || password !== confirmation) {
      setInviteSignupStatus(password !== confirmation ? "The passwords do not match." : "Use a password with at least 8 characters.", true);
      return;
    }
    submit.disabled = true;
    setInviteSignupStatus("Creating your account…");
    try {
      const avatarPath = await uploadProfileAvatar(file, invitedSignupUser.id);
      const metadata = { ...invitedSignupUser.user_metadata, display_name: name };
      if (avatarPath) metadata.avatar_path = avatarPath;
      const { data, error } = await supabaseClient.auth.updateUser({ password, data: metadata });
      if (error) throw error;
      if (!data.user) throw new Error("Supabase did not return your updated account.");
      invitationSetupPending = false;
      invitedSignupUser = null;
      history.replaceState(null, "", `${location.pathname}${location.search}`);
      $("#invite-signup-form").reset();
      await activateCloudSession(data.user);
    } catch (error) {
      console.error("Could not complete the invited signup.", error);
      setInviteSignupStatus(error.message || "Could not complete signup.", true);
    } finally {
      submit.disabled = false;
    }
  }

  async function saveOwnProfile(event) {
    event.preventDefault();
    if (!cloudUser) return;
    const submit = $("#save-profile");
    const name = $("#profile-username").value.trim();
    const password = $("#profile-password").value;
    const confirmation = $("#profile-password-confirm").value;
    const file = $("#profile-avatar-file").files[0];
    const status = $("#profile-status");
    if (!name || name.length > 120) {
      status.textContent = "Enter a username up to 120 characters.";
      status.classList.add("error");
      return;
    }
    if (password && password.length < 8) {
      status.textContent = "Use a password with at least 8 characters.";
      status.classList.add("error");
      return;
    }
    if (password !== confirmation) {
      status.textContent = "The passwords do not match.";
      status.classList.add("error");
      return;
    }
    submit.disabled = true;
    status.textContent = "Saving your profile…";
    status.classList.remove("error");
    try {
      const avatarPath = await uploadProfileAvatar(file, cloudUser.id);
      const metadata = { ...cloudUser.user_metadata, display_name: name };
      if (avatarPath) metadata.avatar_path = avatarPath;
      const update = { data: metadata };
      if (password) update.password = password;
      const { data, error } = await supabaseClient.auth.updateUser(update);
      if (error) throw error;
      if (!data.user) throw new Error("Supabase did not return your updated profile.");
      cloudUser = data.user;
      renderAccountAvatar(cloudUser);
      prepareProfileForm();
      status.textContent = "Profile saved.";
    } catch (error) {
      console.error("Could not save your profile.", error);
      status.textContent = error.message || "Could not save your profile.";
      status.classList.add("error");
    } finally {
      submit.disabled = false;
    }
  }

  function disableAuthForm() {
    $("#auth-email").disabled = true;
    $("#auth-password").disabled = true;
    $("#auth-submit").disabled = true;
  }

  async function loadCloudData(importLocalData) {
    const [orderResult, driverResult, catalogResult, returnResult] = await Promise.all([
      supabaseClient.from("orders").select("id,data").order("id"),
      supabaseClient.from("drivers").select("driver_key,name,phone").order("name"),
      supabaseClient.from("workspace_catalog").select("data").eq("catalog_key", "default").maybeSingle(),
      supabaseClient.from("returned_tile_records").select("id,data").order("id")
    ]);
    if (orderResult.error) throw orderResult.error;
    if (driverResult.error) throw driverResult.error;
    if (catalogResult.error) throw catalogResult.error;
    if (returnResult.error) {
      if (["42P01", "PGRST205"].includes(returnResult.error.code)) {
        returnedTiles = [];
        returnedTilesSetupError = "Run supabase-returned-tiles.sql in Supabase SQL Editor, then reload this app to enable returned tiles.";
      } else {
        throw returnResult.error;
      }
    } else {
      returnedTilesSetupError = "";
      returnedTiles = returnResult.data.map((row) => row.data);
      if (returnedTiles.some((entry) => !entry || typeof entry.id !== "string"
        || typeof entry.returnedFrom !== "string" || typeof entry.product !== "string")) {
        throw new Error("The shared returned-tile history contains an invalid record.");
      }
    }
    if (catalogResult.data?.data && catalogHasWorkbookColumns(catalogResult.data.data)) {
      applySyncedSourceData(catalogResult.data.data);
    }

    let orderData = orderResult.data.map((row) => row.data);
    if (importLocalData) {
      const localOrders = loadOrders();
      const onlineOrderIds = new Set(orderResult.data.map((row) => row.id));
      const missingOrders = localOrders.filter((order) => !onlineOrderIds.has(order.id));
      if (missingOrders.length) {
        const { error } = await supabaseClient.from("orders").upsert(
          missingOrders.map((order) => ({ id: order.id, data: order })),
          { onConflict: "id" }
        );
        if (error) throw error;
        orderData.push(...missingOrders);
        showToast(`${missingOrders.length} existing ${missingOrders.length === 1 ? "order was" : "orders were"} imported online.`);
      }
    }

    const driverData = driverResult.data.map(({ name, phone }) => ({ name, phone }));
    if (importLocalData) {
      const knownDrivers = new Set(driverData.map((driver) => driver.phone.trim()));
      const missingDrivers = loadDrivers().filter((driver) =>
        !knownDrivers.has(driver.phone.trim())
      );
      if (missingDrivers.length) {
        const { error } = await supabaseClient.from("drivers").upsert(
          missingDrivers.map((driver) => ({
            driver_key: driver.phone.trim(),
            name: driver.name,
            phone: driver.phone
          })),
          { onConflict: "driver_key" }
        );
        if (error) throw error;
        driverData.push(...missingDrivers);
      }
    }

    orders = loadOrders(orderData);
    drivers = loadDrivers(driverData);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      localStorage.setItem(DRIVERS_STORAGE_KEY, JSON.stringify(drivers));
    } catch (error) {
      console.warn("Could not keep a local backup of online data.", error);
    }
    renderSavedDrivers();
    renderOverview();
    renderAllOrders();
    renderHistory();
    refreshPreview();
    setSyncStatus("Online · orders and drivers sync across signed-in devices.");
  }

  function setUsersStatus(message, isError = false) {
    const status = $("#users-status");
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  async function invokeUserManagement(body) {
    const { data, error } = await supabaseClient.functions.invoke("manage-users", { body });
    if (error) {
      let message = error.message || "Could not complete user management request.";
      if (error.context instanceof Response) {
        try {
          const responseData = await error.context.clone().json();
          if (typeof responseData.error === "string") message = responseData.error;
        } catch (parseError) {
          console.error("Could not read the user-management error response.", parseError);
        }
      }
      throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }

  function formatUserDate(value) {
    if (!value) return "Never";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Unknown"
      : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
  }

  function resetManagedUserForm() {
    $("#user-form").reset();
    $("#managed-user-id").value = "";
    $("#user-form-title").textContent = "Invite a user";
    $("#user-form-help").textContent = "They’ll receive an email invitation to set their password.";
    $("#save-managed-user").textContent = "Send invitation";
    $("#cancel-user-edit").hidden = true;
    $("#managed-user-email").readOnly = false;
    $("#managed-user-role").value = "staff";
    $("#managed-user-role-field").hidden = cloudRole !== "owner";
    $("#managed-user-role").querySelector('option[value="owner"]').hidden = true;
    $("#managed-user-role").disabled = false;
    setUsersStatus("");
  }

  function renderWorkspaceUsers() {
    const body = $("#workspace-users");
    body.replaceChildren();
    $("#users-empty").hidden = workspaceUsers.length > 0;
    workspaceUsers.forEach((user) => {
      const row = document.createElement("tr");
      const values = [
        user.name || "—",
        user.email || "—",
        user.role.charAt(0).toUpperCase() + user.role.slice(1),
        user.active ? "Active" : "Inactive",
        formatUserDate(user.lastSignInAt)
      ];
      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      const actions = document.createElement("td");
      actions.className = "user-row-actions";
      const canManage = cloudRole === "owner" || user.role === "staff";
      if (canManage) {
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "button button-secondary";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => editWorkspaceUser(user));
        actions.append(editButton);
        if (user.role !== "owner" && user.id !== cloudUser?.id) {
          const activeButton = document.createElement("button");
          activeButton.type = "button";
          activeButton.className = "button button-secondary";
          activeButton.textContent = user.active ? "Deactivate" : "Reactivate";
          activeButton.addEventListener("click", () => setWorkspaceUserActive(user, !user.active));
          actions.append(activeButton);
        }
      }
      row.append(actions);
      body.append(row);
    });
  }

  async function loadWorkspaceUsers() {
    if (!["owner", "admin"].includes(cloudRole)) {
      setUsersStatus("Only workspace admins can manage users.", true);
      return;
    }
    $("#users-refresh").disabled = true;
    setUsersStatus("Loading workspace users…");
    try {
      const result = await invokeUserManagement({ action: "list" });
      workspaceUsers = result.users;
      renderWorkspaceUsers();
      resetManagedUserForm();
    } catch (error) {
      console.error("Could not load workspace users.", error);
      setUsersStatus(error.message, true);
      workspaceUsers = [];
      renderWorkspaceUsers();
    } finally {
      $("#users-refresh").disabled = false;
    }
  }

  function editWorkspaceUser(user) {
    if (cloudRole !== "owner" && user.role !== "staff") {
      setUsersStatus("Admins can only edit staff accounts.", true);
      return;
    }
    $("#managed-user-id").value = user.id;
    $("#managed-user-name").value = user.name;
    $("#managed-user-email").value = user.email;
    $("#managed-user-role").value = user.role;
    $("#managed-user-role-field").hidden = cloudRole !== "owner";
    $("#managed-user-role").querySelector('option[value="owner"]').hidden = user.role !== "owner";
    $("#managed-user-role").disabled = user.role === "owner";
    $("#user-form-title").textContent = "Edit user";
    $("#user-form-help").textContent = user.role === "owner"
      ? "The owner role cannot be changed."
      : "Changing an email address may require confirmation from the new address.";
    $("#save-managed-user").textContent = "Save user";
    $("#cancel-user-edit").hidden = false;
    setUsersStatus("");
    $("#managed-user-name").focus();
  }

  async function setWorkspaceUserActive(user, active) {
    if (!window.confirm(`${active ? "Reactivate" : "Deactivate"} ${user.email}?`)) return;
    try {
      await invokeUserManagement({ action: "set-active", userId: user.id, active });
      await loadWorkspaceUsers();
      setUsersStatus(`User ${active ? "reactivated" : "deactivated"}.`);
    } catch (error) {
      console.error("Could not update workspace user status.", error);
      setUsersStatus(error.message, true);
    }
  }

  async function saveWorkspaceUser(event) {
    event.preventDefault();
    if (!["owner", "admin"].includes(cloudRole)) {
      setUsersStatus("Only workspace admins can manage users.", true);
      return;
    }
    const submit = $("#save-managed-user");
    const userId = $("#managed-user-id").value;
    const payload = {
      name: $("#managed-user-name").value.trim(),
      email: $("#managed-user-email").value.trim(),
      role: cloudRole === "owner" ? $("#managed-user-role").value : "staff"
    };
    submit.disabled = true;
    setUsersStatus(userId ? "Saving user changes…" : "Sending invitation…");
    try {
      const result = await invokeUserManagement(userId
        ? { action: "update", userId, ...payload }
        : { action: "invite", ...payload });
      resetManagedUserForm();
      const successMessage = userId
        ? result.emailChangePending
          ? "User updated. A confirmation email was sent to the new address."
          : "User updated."
        : "Invitation sent. The user must accept it to set a password.";
      await loadWorkspaceUsers();
      setUsersStatus(successMessage);
    } catch (error) {
      console.error("Could not save workspace user.", error);
      setUsersStatus(error.message, true);
    } finally {
      submit.disabled = false;
    }
  }

  function exportLocalBackup() {
    if (cloudDeployment) return;
    const backup = {
      format: "shaafici-order-desk-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      orders,
      drivers
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json"
    }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `shaafici-order-desk-backup-${dateValue()}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`${orders.length} ${orders.length === 1 ? "order" : "orders"} exported. Keep the backup file safe.`);
  }

  async function importOnlineBackup(file) {
    const status = $("#data-backup-status");
    status.hidden = false;
    status.classList.remove("error");
    try {
      if (!cloudDeployment || !cloudUser) throw new Error("Sign in to the online workspace before importing a backup.");
      if (file.size > 25 * 1024 * 1024) throw new Error("The backup file is larger than the 25 MB import limit.");
      const backup = JSON.parse(await file.text());
      if (!backup || backup.format !== "shaafici-order-desk-backup" || backup.version !== 1
        || !Array.isArray(backup.orders) || !Array.isArray(backup.drivers)) {
        throw new Error("This is not a supported Order Desk backup file.");
      }
      if (backup.orders.some((order) => !order || typeof order.id !== "string" || !order.id.trim()
        || !Array.isArray(order.items))) {
        throw new Error("The backup contains an invalid order.");
      }
      if (backup.drivers.some((driver) => !driver || typeof driver.name !== "string"
        || typeof driver.phone !== "string" || !driver.name.trim() || !driver.phone.trim())) {
        throw new Error("The backup contains an invalid saved driver.");
      }
      const importedOrders = loadOrders(backup.orders);
      if (importedOrders.length !== backup.orders.length
        || new Set(importedOrders.map((order) => order.id)).size !== importedOrders.length) {
        throw new Error("The backup contains duplicate or unsupported orders.");
      }
      const existingOrderResult = await supabaseClient.from("orders").select("id");
      if (existingOrderResult.error) throw existingOrderResult.error;
      const existingOrderIds = new Set(existingOrderResult.data.map((row) => row.id));
      const missingOrders = importedOrders.filter((order) => !existingOrderIds.has(order.id));
      if (missingOrders.length) {
        const { error } = await supabaseClient.from("orders").upsert(
          missingOrders.map((order) => ({ id: order.id, data: order })),
          { onConflict: "id" }
        );
        if (error) throw error;
      }

      const existingDriverResult = await supabaseClient.from("drivers").select("driver_key");
      if (existingDriverResult.error) throw existingDriverResult.error;
      const existingDriverKeys = new Set(existingDriverResult.data.map((row) => row.driver_key));
      const knownDriverKeys = new Set();
      const missingDrivers = loadDrivers(backup.drivers).filter((driver) => {
        const key = driver.phone.trim();
        if (existingDriverKeys.has(key) || knownDriverKeys.has(key)) return false;
        knownDriverKeys.add(key);
        return true;
      });
      if (missingDrivers.length) {
        const { error } = await supabaseClient.from("drivers").upsert(
          missingDrivers.map((driver) => ({
            driver_key: driver.phone.trim(),
            name: driver.name,
            phone: driver.phone
          })),
          { onConflict: "driver_key" }
        );
        if (error) throw error;
      }

      await loadCloudData(false);
      status.textContent = `Imported ${missingOrders.length} new ${missingOrders.length === 1 ? "order" : "orders"} and ${missingDrivers.length} saved ${missingDrivers.length === 1 ? "driver" : "drivers"}. Existing online records were kept.`;
      showToast(`${missingOrders.length} new ${missingOrders.length === 1 ? "order" : "orders"} imported online.`);
    } catch (error) {
      console.error("Could not import the Order Desk backup.", error);
      status.classList.add("error");
      status.textContent = error.message || "Could not import this backup file.";
    }
  }

  function scheduleCloudRefresh() {
    clearTimeout(cloudRefreshTimer);
    cloudRefreshTimer = window.setTimeout(async () => {
      if (!cloudUser) return;
      try {
        await loadCloudData(false);
      } catch (error) {
        console.error("Could not refresh shared online data.", error);
        setSyncStatus(`Online refresh failed — ${error.message}`, true);
      }
    }, 250);
  }

  function subscribeToCloudChanges() {
    if (cloudChannel) supabaseClient.removeChannel(cloudChannel);
    let channel = supabaseClient.channel("order-desk-shared-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, scheduleCloudRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, scheduleCloudRefresh);
    if (!returnedTilesSetupError) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table: "returned_tile_records" }, scheduleCloudRefresh);
    }
    cloudChannel = channel.subscribe((status, error) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          const message = error?.message || `Realtime connection ${status.toLowerCase()}.`;
          console.error("Could not subscribe to online changes.", error || message);
          setSyncStatus(`Live updates unavailable — ${message}`, true);
        }
      });
  }

  async function activateCloudSession(user) {
    if (cloudActivationPromise) return cloudActivationPromise;
    const activation = (async () => {
      cloudUser = user;
      currentPreparedBy = createdByForUser(user);
      form.elements.preparedBy.value = currentPreparedBy;
      setAuthStatus("Loading your online orders…");
      try {
        const roleResult = await supabaseClient.from("workspace_user_roles")
          .select("role").eq("user_id", user.id).maybeSingle();
        if (roleResult.error) {
          console.error("Could not load the workspace user role.", roleResult.error);
          cloudRole = "staff";
        } else {
          cloudRole = roleResult.data?.role || "staff";
        }
        await loadCloudData(true);
        await applyYesterdayOrderTransfers();
        $("#auth-gate").hidden = true;
        $("#app-shell").hidden = false;
        $("#storage-description").textContent = `Signed in as ${user.email || "workspace member"}.`;
        renderLoadedApp();
        subscribeToCloudChanges();
      } catch (error) {
        cloudUser = null;
        console.error("Could not load the online workspace.", error);
        showAuthGate(`Could not load online data: ${error.message}`, true);
      }
    })();
    cloudActivationPromise = activation;
    try {
      await activation;
    } finally {
      if (cloudActivationPromise === activation) cloudActivationPromise = null;
    }
  }

  function lockCloudApp() {
    if (cloudChannel && supabaseClient) supabaseClient.removeChannel(cloudChannel);
    cloudChannel = null;
    clearTimeout(cloudRefreshTimer);
    resetForm();
    setView("overview");
    cloudUser = null;
    cloudRole = "staff";
    orders = [];
    drivers = [];
    showAuthGate("Sign in to load your shared online workspace.");
  }

  function initializeOnlineMode() {
    const config = window.ORDER_DESK_SUPABASE || {};
    const validConfig = typeof config.url === "string" && config.url.startsWith("https://")
      && typeof config.anonKey === "string" && config.anonKey.length > 20;
    if (!window.supabase?.createClient) {
      disableAuthForm();
      showAuthGate("Could not load the Supabase client library. Check your internet connection and reload.", true);
      return;
    }
    if (!validConfig) {
      disableAuthForm();
      showAuthGate("Online storage is not configured. Add your Supabase Project URL and anon key to supabase-config.js.", true);
      return;
    }

    supabaseClient = window.supabase.createClient(config.url, config.anonKey);
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") lockCloudApp();
      if (event === "SIGNED_IN" && session?.user) {
        window.setTimeout(() => {
          if (invitationSetupPending) showInvitationSignup(session.user);
          else activateCloudSession(session.user);
        }, 0);
      }
    });
    supabaseClient.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      if (data.session?.user && invitationSetupPending) showInvitationSignup(data.session.user);
      else if (data.session?.user) activateCloudSession(data.session.user);
      else showAuthGate("Sign in to load your shared online workspace.");
    }).catch((error) => {
      console.error("Could not check the online sign-in session.", error);
      showAuthGate(`Could not connect to Supabase: ${error.message}`, true);
    });
  }

  const isTileProduct = (product) => /\btile(?:s)?\b|\bmarmar\b/i.test(product);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const form = $("#order-form");
  const itemsBody = $("#items-body");
  let needsMoneyDataCleanup = false;
  let orders = [];
  let drivers = [];
  let editingId = null;
  let orderSort = { key: "createdAt", direction: "desc" };
  let historyOrderFilter = "";
  let itemHistoryProductFilter = "";
  let converterPinnedOpen = false;
  let printPreviewOrder = null;
  let printPreviewReturnView = "new-order";
  let printPreviewPdfUrl = null;
  let printLayout = "full-page";
  let toastTimer;
  function loadOrders(savedValue) {
    try {
      const source = savedValue === undefined ? localStorage.getItem(STORAGE_KEY) || "[]" : savedValue;
      const saved = typeof source === "string" ? JSON.parse(source) : source;
      if (!Array.isArray(saved)) throw new Error("Saved order data is not a list.");
      needsMoneyDataCleanup = saved.some((order) =>
        order && ("currency" in order || Array.isArray(order.items) && order.items.some((item) => item && "price" in item))
      );
      return saved.filter((order) => order && typeof order.id === "string" && Array.isArray(order.items)).map((order) => {
        const createdAt = order.createdAt || Date.now();
        const history = Array.isArray(order.history)
          ? order.history.filter((entry) => entry && Number.isFinite(entry.timestamp) && typeof entry.action === "string")
          : [{ timestamp: createdAt, action: "Order created", details: "Order recorded." }];
        return {
          id: order.id,
          customer: order.customer || "",
          branch: order.branch || "",
          category: order.category || categories[0],
          transferId: order.transferId || "",
          date: order.date || "",
          driver: order.driver || "",
          driverPhone: order.driverPhone || "",
          preparedBy: order.preparedBy || "",
          notes: order.notes || "",
          status: order.status || "Open",
          deletedAt: Number(order.deletedAt) || 0,
          catalogTakenApplied: Boolean(order.catalogTakenApplied),
          history,
          items: order.items.map((item) => item || {}).map((item) => {
          const product = item.product || "";
          const catalogProduct = getCatalogProduct(product);
          const catalogUnit = catalogProduct?.unit || units[0];
          const qtyItem = item.qtyItem == null
            ? catalogProduct?.qtyItems?.length === 1 ? catalogProduct.qtyItems[0] : ""
            : String(item.qtyItem);
          const ordered = item.ordered === "" || item.ordered == null ? "" : Number(item.ordered) || 0;
          const savedQuantities = Array.isArray(item.quantities)
            ? item.quantities
            : [{ quantity: item.quantity, unit: item.unit }];
          if (isTileProduct(product)) {
            return {
              product,
              ordered,
              qtyItem,
              quantities: Array.from({ length: 3 }, (_, index) => ({
                quantity: Number(savedQuantities[index]?.quantity) || 0,
                unit: units.includes(savedQuantities[index]?.unit) ? savedQuantities[index].unit : tileUnits[index]
              }))
            };
          }
          if (savedQuantities.length > 1) {
            return {
              product,
              ordered,
              qtyItem,
              quantities: savedQuantities.map((quantity) => ({
                quantity: Number(quantity?.quantity) || 0,
                unit: units.includes(quantity?.unit) ? quantity.unit : catalogUnit
              }))
            };
          }
          return {
            product,
            ordered,
            qtyItem,
            quantity: Number(savedQuantities[0]?.quantity) || 0,
            unit: units.includes(savedQuantities[0]?.unit) ? savedQuantities[0].unit : catalogUnit
          };
          }),
          createdAt
        };
      });
    } catch (error) {
      console.error("Could not load saved orders.", error);
      return [];
    }
  }

  async function persistOrders(changedOrder) {
    if (cloudDeployment) {
      if (!supabaseClient || !cloudUser) {
        showToast("Sign in before saving orders online.");
        return false;
      }
      const savedOrders = changedOrder ? [changedOrder] : orders;
      const { error } = await supabaseClient.from("orders").upsert(
        savedOrders.map((order) => ({ id: order.id, data: order })),
        { onConflict: "id" }
      );
      if (error) {
        console.error("Could not save orders online.", error);
        showToast(`Could not save online: ${error.message}`);
        return false;
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
      } catch (error) {
        console.warn("Could not keep a local order backup.", error);
      }
      return true;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (error) {
      console.error("Could not save orders in this browser.", error);
      showToast("Could not save. Check this browser's storage settings.");
      return false;
    }
    return true;
  }

  function loadDrivers(savedValue) {
    try {
      const source = savedValue === undefined ? localStorage.getItem(DRIVERS_STORAGE_KEY) || "[]" : savedValue;
      const saved = typeof source === "string" ? JSON.parse(source) : source;
      if (!Array.isArray(saved)) throw new Error("Saved driver data is not a list.");
      return saved.filter((driver) =>
        driver && typeof driver.name === "string" && typeof driver.phone === "string"
        && driver.name.trim() && driver.phone.trim()
      ).map((driver) => ({ name: driver.name.trim(), phone: driver.phone.trim() }));
    } catch (error) {
      console.error("Could not load saved drivers.", error);
      showToast("Could not load saved drivers from this browser.");
      return [];
    }
  }

  async function persistDrivers() {
    if (cloudDeployment) {
      if (!supabaseClient || !cloudUser) {
        showToast("Sign in before saving drivers online.");
        return false;
      }
      const { error } = await supabaseClient.from("drivers").upsert(
        drivers.map((driver) => ({
          driver_key: driver.name.trim().toLocaleLowerCase(),
          name: driver.name,
          phone: driver.phone
        })),
        { onConflict: "driver_key" }
      );
      if (error) {
        console.error("Could not save drivers online.", error);
        showToast(`Could not save driver online: ${error.message}`);
        return false;
      }
      try {
        localStorage.setItem(DRIVERS_STORAGE_KEY, JSON.stringify(drivers));
      } catch (error) {
        console.warn("Could not keep a local driver backup.", error);
      }
      return true;
    }
    try {
      localStorage.setItem(DRIVERS_STORAGE_KEY, JSON.stringify(drivers));
    } catch (error) {
      console.error("Could not save drivers in this browser.", error);
      showToast("Could not save the driver. Check this browser's storage settings.");
      return false;
    }
    return true;
  }

  function renderSavedDrivers() {
    const list = $("#saved-drivers");
    list.replaceChildren(...drivers.map((driver) => {
      const option = document.createElement("option");
      option.value = driver.name;
      option.label = driver.phone;
      return option;
    }));
    $("#drivers-status").textContent = drivers.length
      ? `${drivers.length} ${drivers.length === 1 ? "driver" : "drivers"} saved`
      : "No drivers saved yet.";
  }

  function fillSavedDriverPhone() {
    const selectedName = $("#order-driver").value.trim().toLocaleLowerCase();
    const driver = drivers.find((entry) => entry.name.toLocaleLowerCase() === selectedName);
    if (driver) $("#driver-phone").value = driver.phone;
  }

  async function saveDriver() {
    const name = $("#saved-driver-name").value.trim();
    const phone = $("#saved-driver-phone").value.trim();
    if (!name || !phone) {
      showToast("Enter both a driver name and phone number.");
      return;
    }

    const phoneAlreadyRegistered = drivers.some((driver) => driver.phone.trim() === phone);
    if (phoneAlreadyRegistered) {
      showToast("This driver is already registered.");
      return;
    }
    const previousDrivers = drivers;
    drivers.push({ name, phone });
    if (!await persistDrivers()) {
      drivers = previousDrivers;
      renderSavedDrivers();
      return;
    }

    renderSavedDrivers();
    $("#order-driver").value = name;
    $("#driver-phone").value = phone;
    $("#saved-driver-name").value = "";
    $("#saved-driver-phone").value = "";
    refreshPreview();
    showToast("Driver saved for future orders.");
  }

  function dateValue(date = new Date()) {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(`${value}T00:00:00`);
    return new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(date);
  }

  function nextOrderId() {
    const date = dateValue().replaceAll("-", "").slice(2);
    const todayCount = orders.filter((order) => order.id.includes(date)).length + 1;
    return `AG-${date}-${String(todayCount).padStart(3, "0")}`;
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2800);
  }

  function decodePdfText(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
    }
    return new TextDecoder("windows-1252").decode(bytes);
  }

  function readPdfPage(stream) {
    const textItems = [];
    const expression = /BT\s+\/F\d+\s+([\d.]+)\s+Tf\s+([\d.]+)\s+([\d.]+)\s+Td\s+<([0-9a-f]+)>\s+Tj\s+ET/g;
    for (const match of stream.matchAll(expression)) {
      textItems.push({
        text: decodePdfText(match[4]),
        x: Number(match[2]),
        top: 842 - Number(match[3]) - Number(match[1])
      });
    }
    textItems.sort((left, right) => left.top - right.top || left.x - right.x);
    const lines = [];
    textItems.forEach((item) => {
      let line = lines.find((candidate) => Math.abs(candidate.top - item.top) <= 2);
      if (!line) {
        line = { top: item.top, items: [] };
        lines.push(line);
      }
      line.items.push(item);
      line.top = line.items.reduce((sum, entry) => sum + entry.top, 0) / line.items.length;
    });
    lines.forEach((line) => line.items.sort((left, right) => left.x - right.x));
    return lines.sort((left, right) => left.top - right.top);
  }

  function getPdfField(lines, label, isRightColumn) {
    const labelItem = lines.flatMap((line) => line.items.map((item) => ({ ...item, lineTop: line.top })))
      .find((item) => item.text.toUpperCase() === label);
    if (!labelItem) return "";
    const valueLines = lines.filter((line) => line.top > labelItem.lineTop + 2 && line.top < labelItem.lineTop + 34);
    const values = valueLines.flatMap((line) => line.items
      .filter((item) => isRightColumn ? item.x >= 300 : item.x < 300)
      .map((item) => ({ ...item, lineTop: line.top })));
    const linesByTop = [];
    values.forEach((item) => {
      let line = linesByTop.find((candidate) => Math.abs(candidate.top - item.lineTop) <= 2);
      if (!line) {
        line = { top: item.lineTop, items: [] };
        linesByTop.push(line);
      }
      line.items.push(item);
    });
    const value = linesByTop.sort((left, right) => left.top - right.top)
      .map((line) => line.items.sort((left, right) => left.x - right.x).map((item) => item.text).join(" "))
      .join(" ").trim();
    return value === "-" ? "" : value;
  }

  function parsePdfDate(value) {
    const match = value.match(/^(?:(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})|([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4}))$/);
    if (!match) return "";
    const day = Number(match[1] || match[5]);
    const monthName = match[2] || match[4];
    const year = Number(match[3] || match[6]);
    const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      .findIndex((name) => name.toLowerCase() === monthName.toLowerCase());
    if (month < 0) return "";
    return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
  }

  function parsePdfQuantities(text) {
    const matches = [...text.matchAll(/(^|\|\s*)((?:\d+(?:\.\d+)?|-)\s+([A-Z]+))(?=\s*(?:\||$))/g)];
    if (!matches.length || matches.map((match) => match[0].replace(/^\s*\|\s*/, "").trim()).join(" | ") !== text) return null;
    return matches.map((match) => {
      const pair = match[2].trim().match(/^(\d+(?:\.\d+)?|-)\s+([A-Z]+)$/);
      if (!pair || !units.includes(pair[2])) throw new Error(`The PDF contains an unsupported unit: ${pair?.[2] || text}.`);
      return { quantity: pair[1] === "-" ? 0 : Number(pair[1]), unit: pair[2] };
    });
  }

  function parseGeneratedOrderPdf(buffer) {
    if (buffer.byteLength > 25 * 1024 * 1024) throw new Error("The PDF is larger than the 25 MB import limit.");
    const source = new TextDecoder("windows-1252").decode(buffer);
    if (!source.startsWith("%PDF-")) throw new Error("Choose a valid PDF file.");
    const pages = [...source.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
      .map((match) => readPdfPage(match[1]))
      .filter((lines) => lines.length);
    const firstPage = pages.find((lines) => lines.some((line) => line.items.some((item) => item.text === "CUSTOMER / COMPANY")));
    if (!firstPage || !pages.some((lines) => lines.some((line) => line.items.some((item) => item.text === "PRODUCT / DESCRIPTION")))) {
      throw new Error("This PDF has no readable SHAAFICI order text. Scanned or image-only PDFs are not supported.");
    }

    const items = [];
    pages.forEach((lines) => {
      const header = lines.find((line) => line.items.some((item) => item.text === "PRODUCT / DESCRIPTION"));
      if (!header) return;
      const rows = [];
      const bodyLines = lines.filter((line) => line.top > header.top + 2);
      for (const line of bodyLines) {
        if (line.items.some((item) => item.text === "ORDER NOTES" || item.text === "CREATED BY" || item.text === "Thank you for your business." || /^Page \d+ of \d+$/.test(item.text))) break;
        const index = line.items.find((item) => item.x < 80 && /^\d+$/.test(item.text));
        if (index) rows.push({ line, lines: [line] });
        else if (rows.length) rows[rows.length - 1].lines.push(line);
      }
      rows.forEach((row) => {
        const texts = row.lines.flatMap((line) => line.items.map((item) => item.text));
        const orderedText = texts.find((text) => /^Ordered:\s*/i.test(text));
        const orderedMatch = orderedText?.match(/^Ordered:\s*(\d+(?:\.\d+)?)/i);
        const quantities = [];
        const productLines = [];
        texts.forEach((text) => {
          if (/^\d+$/.test(text) && row.lines[0].items.some((item) => item.text === text && item.x < 80)) return;
          if (/^Ordered:/i.test(text)) return;
          const parsed = parsePdfQuantities(text);
          if (parsed) quantities.push(...parsed);
          else if (text !== "ORDER NOTES") productLines.push(text);
        });
        const extractedProduct = productLines.join(" ").trim();
        const catalogProduct = getCatalogProduct(extractedProduct);
        const product = catalogProduct?.product || extractedProduct;
        if (!product) throw new Error("A product description could not be read from the PDF.");
        if (isTileProduct(product)) {
          tileUnits.forEach((unit) => {
            if (!quantities.some((pair) => pair.unit === unit)) quantities.push({ quantity: 0, unit });
          });
          quantities.sort((left, right) => tileUnits.indexOf(left.unit) - tileUnits.indexOf(right.unit));
        }
        items.push({
          product,
          ordered: orderedMatch ? Number(orderedMatch[1]) : "",
          quantities,
          qtyItem: catalogProduct?.qtyItems?.length === 1
            ? catalogProduct.qtyItems[0]
            : ""
        });
      });
    });
    if (!items.length) throw new Error("No order items were found in this PDF.");
    const dateText = getPdfField(firstPage, "ORDER DATE", true);
    return {
      customer: getPdfField(firstPage, "CUSTOMER / COMPANY", false),
      branch: getPdfField(firstPage, "BRANCH", false),
      transferId: getPdfField(firstPage, "TRANSFER ID", false),
      date: parsePdfDate(dateText),
      driver: getPdfField(firstPage, "DELIVERED BY", true),
      driverPhone: getPdfField(firstPage, "DRIVER PHONE", false),
      preparedBy: getPdfField(firstPage, "CREATED BY", false) || getPdfField(firstPage, "PREPARED BY", true),
      items
    };
  }

  function pdfLines(items) {
    const lines = [];
    items.filter((item) => item.str.trim()).forEach((item) => {
      const x = item.transform[4];
      const y = item.transform[5];
      let line = lines.find((candidate) => Math.abs(candidate.y - y) <= 2);
      if (!line) {
        line = { y, items: [] };
        lines.push(line);
      }
      line.items.push({ text: item.str.trim(), x, y, width: item.width });
      line.y = line.items.reduce((sum, entry) => sum + entry.y, 0) / line.items.length;
    });
    lines.forEach((line) => line.items.sort((left, right) => left.x - right.x));
    return lines.sort((left, right) => right.y - left.y);
  }

  function isDeliverySlipPlaceholder(text) {
    return /\b(?:stock\s*manager|driver|approved\s*by)\s*:/i.test(text)
      || /^[\s_—–-]+$/.test(text);
  }

  function lineBelow(lines, item, maxDistance = 25) {
    return lines
      .filter((line) => line.y < item.y && line.y >= item.y - maxDistance)
      .sort((left, right) => right.y - left.y)
      .find((line) => line.items.some((entry) => entry.x >= item.x - 4 && entry.x < item.x + 220));
  }

  function deliveryDateValue(value) {
    const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!match) return "";
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCDate() === day && date.getUTCMonth() === month - 1 && date.getUTCFullYear() === year
      ? date.toISOString().slice(0, 10)
      : "";
  }

  function readDeliveryQuantity(items, minX, maxX, fallbackUnit) {
    const column = items.filter((item) => item.x >= minX && item.x < maxX);
    const quantityText = column.find((item) => /^-?[\d,]+(?:\.\d+)?$/.test(item.text));
    if (!quantityText) return { quantity: 0, unit: fallbackUnit };
    const unitText = column.find((item) => /^[A-Za-z]+$/.test(item.text));
    const normalizedUnit = unitText?.text.toUpperCase();
    const unit = normalizedUnit === "PC" || normalizedUnit === "PCS" ? "PCS" : normalizedUnit;
    if (!unit || !units.includes(unit)) {
      throw new Error(`The delivery slip contains an unsupported unit: ${unitText?.text || "missing unit"}.`);
    }
    return { quantity: Number(quantityText.text.replaceAll(",", "")), unit };
  }

  async function parseDeliverySlipPdf(buffer) {
    if (!window.pdfjsLib) throw new Error("The offline PDF reader did not load. Reload the website and try again.");
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdfjs/pdf.worker.min.js";
    const document = await window.pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false
    }).promise;
    if (document.numPages > 100) {
      await document.destroy();
      throw new Error("The PDF has more than 100 pages and cannot be imported.");
    }
    const pages = [];
    try {
      for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
        const page = await document.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push(pdfLines(content.items));
      }
    } finally {
      await document.destroy();
    }

    const firstPage = pages[0] || [];
    const shippingLabel = firstPage.flatMap((line) => line.items.map((item) => ({ ...item, y: line.y })))
      .find((item) => /^Shipping Date$/i.test(item.text));
    const shippingLine = shippingLabel && lineBelow(firstPage, shippingLabel);
    const shippingDateText = shippingLine?.items
      .filter((item) => item.x >= shippingLabel.x - 4)
      .map((item) => item.text)
      .join(" ") || "";
    const positionedItems = firstPage.flatMap((line) => line.items.map((item) => ({ ...item, y: line.y })));
    const orderLabel = positionedItems.find((item) => /^Order$/i.test(item.text));
    const orderLine = orderLabel && lineBelow(firstPage, orderLabel);
    const customer = orderLine?.items
      .filter((item) => item.x >= orderLabel.x - 4 && item.x < orderLabel.x + 220)
      .map((item) => item.text)
      .join(" ") || "";
    const branchLabel = positionedItems.find((item) => /^Branch:$/i.test(item.text));
    const branch = branchLabel
      ? firstPage.find((line) => Math.abs(line.y - branchLabel.y) <= 2)?.items
        .filter((item) => item.x > branchLabel.x + branchLabel.width - 4 && item.x < branchLabel.x + 180)
        .map((item) => item.text)
        .join(" ") || ""
      : "";
    const referenceText = firstPage.flatMap((line) => line.items.map((item) => item.text)).join(" ");
    const referenceMatch = referenceText.match(/\b([A-Z0-9]{2,})\s*\/\s*([A-Z0-9]+)\s*\/\s*([\w-]+)\b/i);
    const reference = referenceMatch ? `${referenceMatch[1]}/${referenceMatch[2]}/${referenceMatch[3]}` : "";
    const items = [];

    pages.forEach((lines) => {
      const header = lines.find((line) =>
        line.items.some((item) => item.text.toUpperCase() === "PRODUCT")
        && line.items.some((item) => item.text.toUpperCase() === "ORDERED")
        && line.items.some((item) => item.text.toUpperCase() === "DELIVERED")
      );
      if (!header) return;
      const orderedHeader = header.items.find((item) => item.text.toUpperCase() === "ORDERED");
      const deliveredHeader = header.items.find((item) => item.text.toUpperCase() === "DELIVERED");
      const orderedStart = orderedHeader.x - 25;
      const deliveredStart = deliveredHeader.x - 20;
      const rows = [];
      lines.filter((line) => line.y < header.y && line.y > 50).forEach((line) => {
        const productItems = line.items.filter((item) => item.x < orderedStart);
        const lineText = productItems.map((item) => item.text).join(" ").trim();
        if (isDeliverySlipPlaceholder(lineText)) return;
        const code = productItems.map((item) => item.text).join(" ").match(/^\s*\[([^\]]+)\]/)?.[1];
        if (code) rows.push({ code, lines: [{ line, productItems }] });
        else if (rows.length && productItems.length) rows[rows.length - 1].lines.push({ line, productItems });
      });

      rows.forEach((row) => {
        const firstLine = row.lines[0].line;
        const orderQuantity = readDeliveryQuantity(firstLine.items, orderedStart, deliveredStart, "PCS");
        const deliveredQuantity = readDeliveryQuantity(firstLine.items, deliveredStart, Number.POSITIVE_INFINITY, orderQuantity.unit);
        const catalogProduct = productsByCode.get(row.code.toLocaleLowerCase());
        const descriptions = row.lines.map(({ productItems }) =>
          productItems.map((item) => item.text).join(" ").trim()
        ).filter(Boolean);
        const product = descriptions.join(" ").replace(/\s+/g, " ").trim();
        const qtyItem = catalogProduct?.qtyItems?.length === 1 ? Number(catalogProduct.qtyItems[0]) : NaN;
        let quantities = [{ quantity: deliveredQuantity.quantity, unit: deliveredQuantity.unit }];
        if (isTileProduct(product)) {
          const converter = getTileConverter(product, catalogProduct?.qtyItems?.[0]);
          quantities = converter
            ? convertTileArea(orderQuantity.quantity, converter)
            : tileUnits.map((unit, index) => ({
              quantity: index === 0 ? deliveredQuantity.quantity : 0,
              unit
            }));
        } else if (Number.isFinite(qtyItem) && qtyItem > 0) {
          quantities = [{
            quantity: Math.round(orderQuantity.quantity / qtyItem),
            unit: catalogProduct.unit
          }];
        }
        items.push({
          product,
          ordered: orderQuantity.quantity,
          quantities,
          qtyItem: catalogProduct?.qtyItems?.length === 1 ? catalogProduct.qtyItems[0] : ""
        });
      });
    });
    if (!items.length) throw new Error("No delivery-slip item rows were found. Check that the PDF has PRODUCT, ORDERED, and DELIVERED columns.");
    const date = deliveryDateValue(shippingDateText);
    if (!customer || !date) throw new Error("The delivery slip is missing a readable recipient or shipping date.");
    return {
      customer,
      branch,
      transferId: reference,
      date,
      driver: "",
      driverPhone: "",
      preparedBy: "",
      notes: "",
      items
    };
  }

  async function importOrderPdf(file) {
    const status = $("#pdf-import-status");
    status.hidden = false;
    status.classList.remove("error");
    status.textContent = "Reading order PDF…";
    try {
      const buffer = await file.arrayBuffer();
      if (buffer.byteLength > 25 * 1024 * 1024) throw new Error("The PDF is larger than the 25 MB import limit.");
      const signature = new TextDecoder().decode(buffer.slice(0, 5));
      if (signature !== "%PDF-") throw new Error("Choose a valid PDF file.");
      const source = new TextDecoder("windows-1252").decode(buffer);
      const generatedOrderMarker = [..."CUSTOMER / COMPANY"]
        .map((character) => character.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("");
      const imported = source.includes("CUSTOMER / COMPANY") || source.includes(generatedOrderMarker)
        ? parseGeneratedOrderPdf(buffer)
        : await parseDeliverySlipPdf(buffer);
      resetForm();
      form.elements.customer.value = imported.customer;
      form.elements.branch.value = imported.branch || "";
      form.elements.transferId.value = imported.transferId || "";
      form.elements.date.value = imported.date;
      form.elements.driver.value = imported.driver;
      form.elements.driverPhone.value = imported.driverPhone || "";
      if (imported.preparedBy) form.elements.preparedBy.value = normalizeCreatedBy(imported.preparedBy);
      form.elements.notes.value = imported.notes || "";
      form.elements.category.value = categories[7];
      itemsBody.replaceChildren();
      imported.items.forEach((item) => createItemRow(item, { preserveQuantities: true }));
      updateConverterVisibility();
      refreshPreview();
      setView("new-order");
      $("#order-form-title").textContent = "Review imported order";
      status.textContent = `Imported ${imported.items.length} item lines. Review the order before saving.`;
      showToast("PDF imported. Review the order before saving.");
    } catch (error) {
      console.error("Could not import the order PDF.", error);
      status.classList.add("error");
      status.textContent = error.message || "Could not read this PDF. Please try another file.";
      showToast("Could not import the PDF. See the message on Overview.");
    }
  }

  function setView(name, { recordHistory = true, confirmUnsaved = true } = {}) {
    if (name !== "new-order" && $("#new-order-view").classList.contains("active")
      && confirmUnsaved && !confirmDiscardUnsavedOrder()) return false;
    closeMobileNavigation();
    if (name === "users" && !["owner", "admin"].includes(cloudRole)) {
      showToast("Only workspace admins can manage users.");
      name = "overview";
    }
    if (name === "profile" && (!cloudDeployment || !cloudUser)) name = "overview";
    const activeView = $(".view.active")?.id.replace(/-view$/, "");
    if (recordHistory && activeView && activeView !== name) viewHistory.push(activeView);
    $$(".view").forEach((view) => view.classList.toggle("active", view.id === `${name}-view`));
    $$("[data-view]").forEach((link) => link.classList.toggle("active", link.dataset.view === name));
    $("#app-back-button").hidden = name === "overview";
    const labels = { overview: "Overview", orders: "All orders", catalog: "Product catalog", history: "Order history", "transfer-history": "Transfer history", "item-history": "Item history", "returned-tiles": "Returned tiles", users: "Users", profile: "Your profile", "new-order": editingId ? "Edit order" : "Create an order", "print-preview": "Print preview" };
    $("#breadcrumb-current").textContent = labels[name] || "Overview";
    if (name === "orders") renderAllOrders();
    if (name === "history") renderHistory();
    if (name === "transfer-history") renderTransferHistory();
    if (name === "item-history") renderItemHistory();
    if (name === "returned-tiles") renderReturnedTiles();
    if (name === "overview") renderOverview();
    if (name === "users" && ["owner", "admin"].includes(cloudRole)) loadWorkspaceUsers();
    if (name === "profile") prepareProfileForm();
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  }

  function navigateBack() {
    if ($("#new-order-view").classList.contains("active") && !confirmDiscardUnsavedOrder()) return;
    const currentView = $(".view.active")?.id.replace(/-view$/, "");
    let previousView = viewHistory.pop();
    while (previousView && previousView === currentView) previousView = viewHistory.pop();
    setView(previousView || "overview", { recordHistory: false, confirmUnsaved: false });
  }

  function createItemRow(item = {}, { preserveQuantities = false, afterRow = null } = {}) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="item-index"><button class="item-index-button" type="button" aria-pressed="false"></button></td>
      <td class="item-details" colspan="2">
        <div class="item-entry-layout">
          <div class="item-product-row">
            <label class="item-product-field"><span>PRODUCT / DESCRIPTION</span><textarea class="item-input product-input" aria-label="Product description" maxlength="240" rows="2" placeholder="Search warehouse items or type a product">${escapeAttribute(item.product || "")}</textarea></label>
            <label class="item-ordered-field"><span>ORDERED</span><input class="item-input ordered-input" aria-label="Ordered" type="number" min="0" step="any" placeholder="0" value="${escapeAttribute(item.ordered ?? "")}"></label>
            <label class="item-qty-item-field"><span>QTY/ITEM</span><span class="qty-item-control"></span></label>
          </div>
          <div class="quantity-fields"><span class="quantity-fields-heading">QUANTITIES &amp; UNITS</span><div class="quantity-pairs"></div><small class="qty-calculation-message" role="status" hidden></small></div>
        </div>
      </td>
      <td><button class="remove-item" type="button" aria-label="Remove item">×</button></td>`;
    renderQtyItemField(row, item.qtyItem);
    renderQuantityFields(row, item, [], { showZero: preserveQuantities });
    row.dataset.preserveImportedQuantities = String(preserveQuantities);
    if (afterRow?.parentElement === itemsBody) afterRow.after(row);
    else itemsBody.append(row);
    if (!preserveQuantities) calculateOrderedQuantity(row);
    updateItemIndexes();
    updateItems();
  }

  function renderQuantityFields(row, item = {}, unitDefaults = [], { showZero = false } = {}) {
    const product = $(".product-input", row).value.trim();
    const productData = getCatalogProduct(product);
    const catalogUnit = productData?.unit || units[0];
    const savedQuantities = Array.isArray(item.quantities)
      ? item.quantities
      : [{ quantity: item.quantity, unit: item.unit }];
    const hasQtyItem = !isTileProduct(product) && Boolean(productData?.qtyItems?.length);
    const count = isTileProduct(product) ? 3 : hasQtyItem ? 2 : Math.max(1, savedQuantities.length);
    row.classList.toggle("tile-product", isTileProduct(product));
    $(".quantity-pairs", row).innerHTML = Array.from({ length: count }, (_, index) => {
      const saved = savedQuantities[index] || {};
      const defaultUnit = unitDefaults[index] || (hasQtyItem && index === 1 ? "FIRI" : catalogUnit);
      const unit = units.includes(saved.unit) ? saved.unit : defaultUnit;
      const quantityLabel = hasQtyItem ? (index === 0 ? "QTY" : "FIRI") : `QTY${count === 1 ? "" : ` ${index + 1}`}`;
      const label = count === 1 ? "" : ` ${quantityLabel}`;
      return `
        <div class="quantity-pair">
          <label><span>${quantityLabel}</span><input class="item-input quantity-input" aria-label="${quantityLabel}" type="number" min="0" step="any" placeholder="0" value="${saved.quantity == null || saved.quantity === "" || !showZero && Number(saved.quantity) === 0 ? "" : Number(saved.quantity)}"></label>
          <label><span>UNIT${label}</span><select class="item-input unit-input" aria-label="Unit${label}">${units.map((option) => `<option${unit === option ? " selected" : ""}>${option}</option>`).join("")}</select></label>
        </div>`;
    }).join("");
  }

  function renderQtyItemField(row, selectedValue = "") {
    const product = $(".product-input", row).value.trim();
    const productData = getCatalogProduct(product);
    const values = productData?.qtyItems || [];
    const control = $(".qty-item-control", row);
    if (values.length > 1) {
      const selected = values.includes(String(selectedValue)) ? String(selectedValue) : "";
      control.innerHTML = `<select class="item-input qty-item-input" aria-label="QTY/ITEM" required><option value="" disabled${selected ? "" : " selected"}>Choose value</option>${values.map((value) => `<option value="${escapeAttribute(value)}"${value === selected ? " selected" : ""}>${escapeAttribute(value)}</option>`).join("")}</select>`;
    } else {
      const value = values[0] || "";
      control.innerHTML = `<input class="item-input qty-item-input" aria-label="QTY/ITEM" type="text" readonly value="${escapeAttribute(value)}" placeholder="${product ? "Not available" : "Select product"}">`;
    }
    row.dataset.qtyItemProduct = product.toLocaleLowerCase();
  }

  function escapeAttribute(value) {
    return String(value).replace(/[&"'<>]/g, (character) => ({
      "&": "&amp;", '"': "&quot;", "'": "&#39;", "<": "&lt;", ">": "&gt;"
    })[character]);
  }

  function getItems() {
    return $$("#items-body tr").map((row) => {
      const product = $(".product-input", row).value.trim();
      const orderedValue = $(".ordered-input", row).value;
      const ordered = orderedValue === "" ? "" : Number(orderedValue);
      const qtyItem = $(".qty-item-input", row).value;
      const quantities = $$(".quantity-pair", row).map((pair) => ({
        quantity: Number($(".quantity-input", pair).value) || 0,
        unit: $(".unit-input", pair).value
      }));
      if (quantities.length > 1) return { product, ordered, qtyItem, quantities };
      return { product, ordered, qtyItem, quantity: quantities[0]?.quantity || 0, unit: quantities[0]?.unit || units[0] };
    }).filter((item) => item.product || (item.quantities || [{ quantity: item.quantity }]).some((pair) => pair.quantity > 0));
  }

  function updateItemIndexes() {
    const rows = $$("#items-body tr");
    rows.forEach((row, index) => {
      const number = index + 1;
      const button = $(".item-index-button", row);
      button.textContent = String(number);
      button.setAttribute("aria-label", `Select insertion point after item ${number}`);
      button.setAttribute("aria-pressed", String(row.classList.contains("conversion-insertion-target")));
    });
    $("#item-count").textContent = `${rows.length} ${rows.length === 1 ? "item" : "items"}`;
  }

  function updateItems() {
    renderPreviewItems();
  }

  function fitProductDescriptions(root) {
    const context = document.createElement("canvas").getContext("2d");
    $$(".preview-item-product strong, .print-item-product", root).forEach((element) => {
      element.style.fontSize = "";
      const parentStyle = getComputedStyle(element.parentElement);
      const horizontalPadding = Number.parseFloat(parentStyle.paddingLeft) + Number.parseFloat(parentStyle.paddingRight);
      const availableWidth = Math.max(0, element.parentElement.clientWidth - horizontalPadding);
      const style = getComputedStyle(element);
      if (element.classList.contains("print-item-product") && element.closest(".receipt-mode") && availableWidth > 0) {
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const words = element.textContent.trim().split(/\s+/);
        const lines = [];
        let line = "";
        while (words.length && lines.length < 2) {
          const word = words.pop();
          const candidate = line ? `${word} ${line}` : word;
          if (line && context.measureText(candidate).width > availableWidth) {
            lines.unshift(line);
            line = word;
          } else {
            line = candidate;
          }
        }
        if (line && lines.length < 2) lines.unshift(line);
        element.textContent = lines.join(" ");
        return;
      }
      if (style.whiteSpace !== "nowrap") return;
      const baseSize = Number.parseFloat(style.fontSize);
      context.font = `${style.fontWeight} ${baseSize}px ${style.fontFamily}`;
      const textWidth = context.measureText(element.textContent).width;
      if (textWidth > availableWidth && availableWidth > 0) {
        element.style.fontSize = `${Math.max(0.5, baseSize * availableWidth / textWidth * 0.98)}px`;
      }
    });
  }

  function calculateOrderedQuantity(row) {
    const orderedInput = $(".ordered-input", row);
    const qtyItemInput = $(".qty-item-input", row);
    const quantityInputs = $$(".quantity-input", row);
    const quantityInput = quantityInputs[0];
    const message = $(".qty-calculation-message", row);
    const ordered = Number(orderedInput.value);
    const qtyItem = Number(qtyItemInput.value.trim().replace(",", "."));
    const tileProduct = isTileProduct($(".product-input", row).value);
    if (!orderedInput.value || !Number.isFinite(ordered) || !Number.isFinite(qtyItem) || qtyItem <= 0 || !quantityInput) {
      if (row.dataset.autoCalculated === "true") {
        const autoValues = JSON.parse(row.dataset.autoCalculatedValues || "[]");
        quantityInputs.forEach((input, index) => {
          if (input.value === autoValues[index]) input.value = "";
        });
      }
      delete row.dataset.autoCalculated;
      delete row.dataset.autoCalculatedValues;
      message.hidden = true;
      message.textContent = "";
      return;
    }

    const exactQuantity = ordered / qtyItem;
    const tileConverter = tileProduct
      ? getTileConverter($(".product-input", row).value, qtyItemInput.value)
      : null;
    const tileQuantities = tileConverter ? convertTileArea(ordered, tileConverter) : null;
    const hasFiriQuantity = !tileProduct
      && quantityInputs.length > 1
      && getCatalogProduct($(".product-input", row).value)?.qtyItems?.length;
    const calculatedQuantity = tileQuantities
      ? tileQuantities[0].quantity
      : hasFiriQuantity
      ? Math.floor(exactQuantity + Number.EPSILON)
      : Math.round(exactQuantity);
    const firiQuantity = hasFiriQuantity
      ? Math.max(0, Number((ordered - calculatedQuantity * qtyItem).toFixed(6)))
      : null;
    const calculatedQuantities = tileQuantities || [
      { quantity: calculatedQuantity }
    ];
    quantityInputs.forEach((input, index) => {
      const quantity = calculatedQuantities[index];
      if (quantity) input.value = String(quantity.quantity);
    });
    if (hasFiriQuantity) quantityInputs[1].value = String(firiQuantity);
    row.dataset.autoCalculated = "true";
    const autoValues = tileQuantities
      ? tileQuantities.map(({ quantity }) => quantity)
      : hasFiriQuantity ? [calculatedQuantity, firiQuantity] : [calculatedQuantity];
    row.dataset.autoCalculatedValues = JSON.stringify(autoValues.map(String));
    if (tileQuantities || hasFiriQuantity || Number.isInteger(exactQuantity)) {
      message.hidden = true;
      message.textContent = "";
    } else {
      message.textContent = `Fadlan tirada iska hagaaji. Tirada la soo jeediyay: ${calculatedQuantity}`;
      message.hidden = false;
    }
  }

  function recalculateCatalogProduct(item) {
    const quantities = Array.isArray(item.quantities) ? item.quantities : [];
    const taken = Array.isArray(item.taken) ? item.taken : [];
    const qtyItems = Array.isArray(item.qtyItems) ? item.qtyItems : [];
    item.taken = quantities.map((_, index) => {
      const value = Number(taken[index]);
      return Number.isFinite(value) ? formatCatalogNumber(value) : "0";
    });
    item.rQuantities = quantities.map((value, index) => {
      const quantity = Number(value);
      const used = Number(item.taken[index]);
      if (!Number.isFinite(quantity) || !Number.isFinite(used)) return "";
      return formatCatalogNumber(quantity - used);
    });
    item.uomNs = item.rQuantities.map((value, index) => {
      const remaining = Number(value);
      const qtyItem = Number(qtyItems[index] ?? qtyItems[0]);
      return Number.isFinite(remaining) && Number.isFinite(qtyItem) && qtyItem !== 0
        ? formatCatalogNumber(remaining / qtyItem)
        : "";
    });
    item.statuses = item.rQuantities.map((value) => Number(value) === 0 ? "END" : "DONE");
  }

  function isWarehouseTransfer(order) {
    return /^WH2\/INT(?:\/|$)/i.test(String(order?.transferId || "").trim());
  }

  function applyOrderCatalogDelta(order, multiplier) {
    const changes = [];
    const warehouseTransfer = isWarehouseTransfer(order);
    for (const orderItem of order?.items || []) {
      const ordered = Number(orderItem.ordered);
      if (!Number.isFinite(ordered) || ordered === 0) continue;
      const catalogItem = getCatalogProduct(orderItem.product);
      if (!catalogItem) continue;
      if (!Array.isArray(catalogItem.quantities) || !catalogItem.quantities.length) continue;
      const currentQuantity = Number(catalogItem.quantities[0]);
      const currentTaken = Number(catalogItem.taken?.[0]);
      const previousValue = warehouseTransfer ? currentQuantity : currentTaken;
      const nextValue = (Number.isFinite(previousValue) ? previousValue : 0)
        + (warehouseTransfer ? -ordered : ordered) * multiplier;
      if (warehouseTransfer) {
        catalogItem.quantities = [...catalogItem.quantities];
        catalogItem.quantities[0] = formatCatalogNumber(nextValue);
      } else {
        catalogItem.taken = Array.isArray(catalogItem.taken) ? [...catalogItem.taken] : [];
        catalogItem.taken[0] = formatCatalogNumber(nextValue);
      }
      recalculateCatalogProduct(catalogItem);
      changes.push({
        product: catalogItem.product,
        productId: catalogItem.product.match(/^\s*\[([^\]]+)\]/)?.[1] || catalogItem.product,
        ordered: ordered * multiplier,
        movement: warehouseTransfer ? "Quantity" : "Taken",
        previousValue: Number.isFinite(previousValue) ? previousValue : 0,
        quantity: catalogItem.quantities[0],
        taken: catalogItem.taken?.[0],
        remaining: catalogItem.rQuantities[0],
        uomN: catalogItem.uomNs[0],
        status: catalogItem.statuses[0],
        warehouseTransfer
      });
    }
    return changes;
  }

  async function applyYesterdayOrderTransfers() {
    const yesterday = dateValue(new Date(Date.now() - 86400000));
    const candidates = orders.filter((order) =>
      !order.deletedAt
      && !order.catalogTakenApplied
      && order.createdAt
      && dateValue(new Date(order.createdAt)) === yesterday
    );
    if (!candidates.length) return;
    const previousCatalog = productCatalog.map((item) => ({
      ...item,
      quantities: [...(item.quantities || [])],
      qtyItems: [...(item.qtyItems || [])],
      taken: [...(item.taken || [])],
      rQuantities: [...(item.rQuantities || [])],
      uomNs: [...(item.uomNs || [])],
      statuses: [...(item.statuses || [])]
    }));
    const previousOrders = orders;
    const changedOrders = [];
    try {
      for (const order of candidates) {
        const catalogChanges = applyOrderCatalogDelta(order, 1);
        const updatedOrder = { ...order, catalogTakenApplied: true, history: [...order.history] };
        if (catalogChanges.length) {
          const details = catalogChanges.map((change) =>
            `${change.productId}: Ordered ${formatCatalogNumber(Math.abs(change.ordered))}, ${change.movement} ${formatCatalogNumber(change.movement === "Quantity" ? change.quantity : change.taken)}, R/QUANTITY ${formatCatalogNumber(change.remaining)}, UOM/N ${formatCatalogNumber(change.uomN)}, STS ${change.status}`
          ).join("; ");
          recordOrderHistory(updatedOrder, "Catalog quantities updated", details, { catalogChanges });
        }
        changedOrders.push(updatedOrder);
      }
      if (cloudDeployment) await saveCatalogToCloud(currentCatalogData());
      orders = orders.map((order) => changedOrders.find((changed) => changed.id === order.id) || order);
      for (const order of changedOrders) {
        if (!await persistOrders(order)) throw new Error(`Could not save yesterday's transfer ${order.id}.`);
      }
      renderProductCatalogOptions();
      showToast(`${changedOrders.length} yesterday transfer${changedOrders.length === 1 ? "" : "s"} added to item history.`);
    } catch (error) {
      productCatalog = previousCatalog;
      indexProductCatalog();
      orders = previousOrders;
      console.error("Could not apply yesterday's order transfers to the catalog.", error);
      showToast(error.message || "Could not apply yesterday's transfers.");
    }
  }

  function applyCatalogUnit(input) {
    const product = input.value.trim();
    const item = getCatalogProduct(product);
    const row = input.closest("tr");
    const productChanged = row.dataset.qtyItemProduct !== product.toLocaleLowerCase();
    const previousQtyItem = row.dataset.qtyItemProduct === product.toLocaleLowerCase()
      ? $(".qty-item-input", row).value
      : "";
    renderQtyItemField(row, previousQtyItem);
    const previousQuantities = $$(".quantity-pair", row).map((pair) => ({
      quantity: $(".quantity-input", pair).value,
      unit: $(".unit-input", pair).value
    }));
    if (productChanged && row.dataset.autoCalculated === "true") {
      const autoValues = JSON.parse(row.dataset.autoCalculatedValues || "[]");
      previousQuantities.forEach((quantity, index) => {
        if (quantity.quantity === autoValues[index]) quantity.quantity = "";
      });
      delete row.dataset.autoCalculated;
      delete row.dataset.autoCalculatedValues;
    }
    const tileProduct = isTileProduct(product);
    const hasQtyItem = Boolean(item?.qtyItems?.length);
    const nextCount = tileProduct ? 3 : hasQtyItem ? 2 : 1;
    const currentCount = previousQuantities.length;
    const unitDefaults = tileProduct ? tileUnits
      : hasQtyItem ? [item.unit, "FIRI"]
        : item ? [item.unit] : [previousQuantities[0]?.unit || units[0]];
    if (nextCount !== currentCount) {
      const quantities = tileProduct
        ? previousQuantities.map(({ quantity }) => ({ quantity }))
        : previousQuantities.map((quantity) => productChanged ? { ...quantity, unit: "" } : quantity);
      renderQuantityFields(row, { product, quantities }, unitDefaults);
    } else {
      $$(".unit-input", row).forEach((select, index) => { select.value = unitDefaults[index] || units[0]; });
    }
    if (row.dataset.preserveImportedQuantities !== "true") calculateOrderedQuantity(row);
  }

  function renderPreviewItems() {
    const preview = $("#preview-items");
    const items = getItems().filter((item) => item.product);
    if (!items.length) {
      preview.innerHTML = '<div class="preview-empty">Your items will appear here.</div>';
      return;
    }
    preview.innerHTML = items.map((item) => {
      const quantities = item.quantities || [{ quantity: item.quantity, unit: item.unit }];
      const entered = quantities.filter((pair) => pair.quantity > 0).map((pair) => `${pair.quantity} ${pair.unit}`);
      const ordered = item.ordered === "" || item.ordered == null ? "" : `<small class="preview-item-ordered">Ordered: ${escapeAttribute(item.ordered)}</small>`;
      const tileProduct = isTileProduct(item.product);
      return `<div class="preview-item${tileProduct ? " tile-preview-item" : ""}"><span class="preview-item-product"><strong>${escapeAttribute(item.product)}</strong>${ordered}</span><span class="preview-item-quantities">${entered.length ? escapeAttribute(entered.join(" · ")) : "No quantity"}</span></div>`;
    }).join("");
    fitProductDescriptions(preview);
  }

  function convertTileArea(area, converter) {
    let remaining = area;
    const falakad = Math.floor(remaining / converter.falakad);
    remaining = (remaining % converter.falakad) + 1e-9;
    const cartoon = Math.floor(remaining / converter.cartoon);
    remaining = (remaining % converter.cartoon) + 1e-9;
    const firi = Math.round(remaining / converter.firi);
    return [
      { quantity: falakad, unit: "FLK" },
      { quantity: cartoon, unit: "CRT" },
      { quantity: firi, unit: "FIRI" }
    ];
  }

  function getTileConverter(product, qtyItem) {
    const value = Number(qtyItem);
    if (!Number.isFinite(value) || value <= 0) return null;
    const matches = Object.entries(converters).filter(([, converter]) =>
      Math.abs(converter.falakad - value) < 0.005
    );
    if (matches.length <= 1) return matches[0]?.[1] || null;

    const dimensions = String(product).match(/(\d{2,3})\s*[x×]\s*(\d{2,3})/i);
    if (!dimensions) return null;
    const prefix = `tile-${dimensions[1]}-${dimensions[2]}`;
    const dimensionMatches = matches.filter(([key]) => key.startsWith(prefix));
    return dimensionMatches.length === 1 ? dimensionMatches[0][1] : null;
  }

  function convertGypsumArea(area, converter) {
    const panelPieces = Math.round(area / converter.firiArea);
    const panelsPerCarton = Math.round(converter.panelCartonArea / converter.firiArea);
    const products = [{
      product: `${converter.label} — Panels`,
      quantities: [
        { quantity: Math.floor(panelPieces / panelsPerCarton), unit: "CRT" },
        { quantity: panelPieces % panelsPerCarton, unit: "FIRI" }
      ]
    }];
    converter.structural.forEach((item) => {
      const pieces = Math.round(area * item.factor);
      products.push({
        product: `${converter.label} — ${item.name}`,
        quantities: [
          { quantity: Math.floor(pieces / item.piecesPerCarton), unit: "CRT" },
          { quantity: pieces % item.piecesPerCarton, unit: "FIRI" }
        ]
      });
    });
    return products;
  }

  function converterItems() {
    const mode = $("#converter-mode").value;
    const area = Number($("#converter-area").value);
    if (!Number.isFinite(area) || area <= 0) return [];
    if (converters[mode]) {
      const quantities = convertTileArea(area, converters[mode]);
      return [{
        product: `Tile conversion — ${converters[mode].label} — ${area} m²`,
        quantities
      }];
    }
    if (gypsumConverters[mode]) return convertGypsumArea(area, gypsumConverters[mode]);
    return [];
  }

  function updateConverter() {
    const results = $("#converter-results");
    const items = converterItems();
    $("#add-conversion").disabled = items.length === 0;
    if (!items.length) {
      results.innerHTML = '<div class="converter-empty">Enter an area to see the converted quantities.</div>';
      return;
    }
    results.innerHTML = items.map((item) => {
      const quantities = item.quantities.map((quantity) =>
        `<span class="converter-quantity"><strong>${quantity.quantity}</strong> ${quantity.unit}</span>`
      ).join("");
      return `<div class="converter-result-row"><strong>${escapeAttribute(item.product)}</strong><div>${quantities}</div></div>`;
    }).join("");
  }

  function updateConverterVisibility() {
    const categoryUsesConverter = form.elements.category.value === "Converter";
    $("#converter-panel").hidden = !categoryUsesConverter && !converterPinnedOpen;
    $("#toggle-converter").hidden = categoryUsesConverter;
    $("#toggle-converter").setAttribute("aria-expanded", String(converterPinnedOpen));
    $("#toggle-converter").textContent = converterPinnedOpen ? "Hide area converter" : "Use area converter";
  }

  function addConversionToOrder() {
    const items = converterItems();
    if (!items.length) return;
    const selectedRow = $(".conversion-insertion-target", itemsBody);
    if (selectedRow) {
      let insertionPoint = selectedRow;
      items.forEach((item) => {
        createItemRow(item, { afterRow: insertionPoint });
        insertionPoint = insertionPoint.nextElementSibling;
      });
      showToast(`${items.length} converted ${items.length === 1 ? "item" : "items"} added after item ${$$("tr", itemsBody).indexOf(selectedRow) + 1}.`);
      return;
    }

    const emptyRows = $$("#items-body tr").filter((row) =>
      !$(".product-input", row).value.trim() &&
      !$(".quantity-input", row).value
    );
    items.forEach((item) => {
      const row = emptyRows.shift();
      if (!row) {
        createItemRow(item);
        return;
      }
      $(".product-input", row).value = item.product;
      renderQuantityFields(row, item);
      updateItemIndexes();
      updateItems();
    });
    showToast(`${items.length} converted ${items.length === 1 ? "item added" : "items added"} to the order.`);
  }

  function refreshPreview() {
    const data = new FormData(form);
    $("#preview-customer").textContent = data.get("customer") || "Customer name";
    $("#preview-branch").textContent = data.get("branch") || "—";
    $("#preview-transfer-id").textContent = `Transfer ID: ${data.get("transferId") || "—"}`;
    $("#preview-date").textContent = formatDate(data.get("date"));
    $("#preview-driver").textContent = data.get("driver") || "—";
    $("#preview-driver-phone").textContent = data.get("driverPhone") || "";
    $("#preview-created-by").textContent = data.get("preparedBy") || "—";
    $("#preview-notes").textContent = data.get("notes") || "";
    $("#order-form-title").textContent = editingId ? "Edit order" : "Create an order";
    $("#order-id-label").textContent = editingId || "NEW ORDER";
    $("#preview-id").textContent = editingId || "AG-NEW";
  }

  function renderPrintPreview(order) {
    printPreviewOrder = order;
    $("#paper-order-id").textContent = order.id;
    $("#paper-customer").textContent = order.customer || "—";
    $("#paper-branch").textContent = order.branch || "";
    $("#paper-date").textContent = formatDate(order.date);
    $("#paper-driver").textContent = order.driver || "";
    $("#paper-transfer-id").textContent = order.transferId || "";
    $("#paper-driver-phone").textContent = order.driverPhone || "";
    $("#paper-created-by").textContent = order.preparedBy || "";
    [$("#paper-branch"), $("#paper-driver"), $("#paper-transfer-id"), $("#paper-driver-phone"), $("#paper-created-by")].forEach((value) => {
      value.parentElement.hidden = !value.textContent;
    });
    $("#paper-notes").textContent = order.notes ? `Notes: ${order.notes}` : "";
    $("#preview-back-label").textContent = printPreviewReturnView === "overview" ? "Back to overview" : "Back to order";
    const rows = order.items.map((item, index) => {
      const quantities = item.quantities || [{ quantity: item.quantity, unit: item.unit }];
      const quantityText = quantities
        .filter((pair) => Number(pair.quantity) > 0)
        .map((pair) => `${pair.quantity} ${pair.unit}`)
        .join(" · ");
      const ordered = item.ordered === "" || item.ordered == null ? "" : `<small class="print-item-ordered">${escapeAttribute(item.ordered)}</small>`;
      const quantityDisplay = quantityText ? escapeAttribute(quantityText) : "No quantity";
      const quantityContent = `<span class="print-item-quantity-content"><small class="print-item-quantities">${quantityDisplay}</small></span>`;
      if (isTileProduct(item.product)) {
        return `<tr class="tile-print-item"><td>${index + 1}</td><td colspan="2"><strong class="print-item-product">${escapeAttribute(item.product)}</strong>${ordered}${quantityContent}</td></tr>`;
      }
      return `<tr class="non-tile-print-item"><td>${index + 1}</td><td><strong class="print-item-product">${escapeAttribute(item.product)}</strong>${ordered}</td><td>${quantityContent}</td></tr>`;
    }).join("");
    $("#paper-items").innerHTML = rows;
    fitProductDescriptions($("#paper-items"));
  }

  function openPrintPreview(order, returnView) {
    printPreviewReturnView = returnView;
    renderPrintPreview(order);
    setPrintLayout("full-page");
    setView("print-preview");
    fitProductDescriptions($("#paper-items"));
  }

  function setPrintLayout(layout) {
    printLayout = layout;
    const preview = $("#print-preview-view");
    preview.classList.toggle("receipt-mode", layout === "receipt");
    preview.classList.toggle("full-page-mode", layout === "full-page");
    $("#preview-receipt").classList.toggle("button-primary", layout === "receipt");
    $("#preview-receipt").classList.toggle("button-secondary", layout !== "receipt");
    $("#preview-full-page").classList.toggle("button-primary", layout === "full-page");
    $("#preview-full-page").classList.toggle("button-secondary", layout !== "full-page");
    $("#print-order-now").textContent = layout === "receipt" ? "Print Epson receipt" : "Print HP full page";
    fitProductDescriptions($("#paper-items"));
    $("#print-layout-help").textContent = layout === "receipt"
      ? "Each product appears above its quantities and units. Select the Epson 80 mm receipt roll and 100% scale."
      : "Full-page layout for the HP LaserJet M109-M112. Choose that printer in the print dialog.";
  }

  function closePrintPreview() {
    const returnView = printPreviewReturnView;
    printPreviewOrder = null;
    if (returnView === "overview") {
      resetForm();
      setView("overview");
      return;
    }
    if (returnView === "orders") {
      setView("orders");
      return;
    }
    setView("new-order");
  }

  function createOrderPdf(order, logoImage) {
    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 42;
    const darkGreen = "0.12 0.38 0.25";
    const muted = "0.43 0.49 0.43";
    const ink = "0.16 0.20 0.16";
    const lineColor = "0.88 0.91 0.87";
    const logoCanvas = document.createElement("canvas");
    logoCanvas.width = logoImage.naturalWidth;
    logoCanvas.height = logoImage.naturalHeight;
    const logoContext = logoCanvas.getContext("2d");
    if (!logoContext) throw new Error("Could not prepare the logo for the PDF.");
    logoContext.fillStyle = "#fff";
    logoContext.fillRect(0, 0, logoCanvas.width, logoCanvas.height);
    logoContext.drawImage(logoImage, 0, 0);
    const logoBase64 = logoCanvas.toDataURL("image/jpeg", 0.96).split(",")[1];
    const logoBytes = atob(logoBase64);
    const logoHex = [...logoBytes].map((byte) => byte.charCodeAt(0).toString(16).padStart(2, "0")).join("") + ">";
    const logoWidth = 170;
    const logoHeight = logoWidth * logoImage.naturalHeight / logoImage.naturalWidth;
    const logoTop = 18;
    const logoBottom = pageHeight - logoTop - logoHeight;
    const pages = [];
    let commands;
    let y;

    function wrapText(value, maxCharacters) {
      const words = cleanPdfText(value).split(" ").filter(Boolean);
      const lines = [];
      let line = "";
      words.forEach((word) => {
        while (word.length > maxCharacters) {
          if (line) {
            lines.push(line);
            line = "";
          }
          lines.push(word.slice(0, maxCharacters));
          word = word.slice(maxCharacters);
        }
        if (line && `${line} ${word}`.length > maxCharacters) {
          lines.push(line);
          line = word;
        } else line = line ? `${line} ${word}` : word;
      });
      if (line) lines.push(line);
      return lines.length ? lines : [""];
    }

    function addText(value, x, top, size, font = "F1", color = ink) {
      const safe = cleanPdfText(value);
      const hex = [...safe].map((character) => character.charCodeAt(0).toString(16).padStart(2, "0")).join("");
      commands.push(`${color} rg BT /${font} ${size} Tf ${x} ${pageHeight - top - size} Td <${hex}> Tj ET`);
    }

    const textMeasureContext = document.createElement("canvas").getContext("2d");
    function fitPdfTextSize(value, width, maxSize) {
      textMeasureContext.font = `${maxSize}px Helvetica`;
      const measuredWidth = textMeasureContext.measureText(cleanPdfText(value)).width * 0.75;
      return measuredWidth > width && measuredWidth > 0
        ? Math.max(0.5, maxSize * width / measuredWidth * 0.96)
        : maxSize;
    }

    function addCenteredText(value, centerX, top, size, font = "F1", color = ink) {
      const safe = cleanPdfText(value);
      textMeasureContext.font = `${font === "F2" ? "bold " : ""}${size}pt Helvetica`;
      const width = textMeasureContext.measureText(safe).width * 0.75;
      addText(safe, centerX - width / 2, top, size, font, color);
    }

    function addLine(x1, top, x2, color = lineColor, width = 1) {
      const pdfY = pageHeight - top;
      commands.push(`${color} RG ${width} w ${x1} ${pdfY} m ${x2} ${pdfY} l S`);
    }

    function addRect(x, top, width, height, color) {
      commands.push(`${color} rg ${x} ${pageHeight - top - height} ${width} ${height} re f`);
    }

    function addTableHeader(top) {
      addRect(margin, top, pageWidth - margin * 2, 27, "0.96 0.97 0.95");
      addCenteredText("#", margin + 19, top + 8, 8, "F2", muted);
      addCenteredText("PRODUCT / DESCRIPTION", (margin + 31 + pageWidth - margin) / 2, top + 8, 8, "F2", muted);
      addLine(margin, top + 27, pageWidth - margin, lineColor);
    }

    function addPage(firstPage) {
      commands = [];
      pages.push(commands);
      commands.push(`q ${logoWidth} 0 0 ${logoHeight} ${margin} ${logoBottom} cm /Logo Do Q`);
      addText("ORDER FORM", pageWidth - margin - 72, 32, 9, "F2", muted);
      addText(order.id, pageWidth - margin - 72, 51, 10, "F2", darkGreen);
      addLine(margin, 108, pageWidth - margin, darkGreen, 2);

      if (firstPage) {
        const fields = [
          { label: "CUSTOMER / COMPANY", value: order.customer || "-", x: margin, width: 260, labelTop: 124, valueTop: 140 },
          { label: "ORDER DATE", value: formatDate(order.date), x: 340, width: 210, labelTop: 124, valueTop: 140 },
          { label: "BRANCH", value: order.branch || "-", x: margin, width: 260, labelTop: 168, valueTop: 184 },
          { label: "DELIVERED BY", value: order.driver || "-", x: 340, width: 210, labelTop: 168, valueTop: 184 },
          { label: "TRANSFER ID", value: order.transferId || "-", x: margin, width: 260, labelTop: 207, valueTop: 223 },
          { label: "DRIVER PHONE", value: order.driverPhone || "-", x: 340, width: 210, labelTop: 207, valueTop: 223 }
        ];
        fields.forEach(({ label, value, x, width, labelTop, valueTop }) => {
          if (label === "TRANSFER ID" && !order.transferId) return;
          if (label === "DRIVER PHONE" && !order.driverPhone) return;
          const centerX = x + width / 2;
          addCenteredText(label, centerX, labelTop, 7, "F2", muted);
          wrapText(value, Math.floor(width / 5.2)).slice(0, 2).forEach((line, index) => {
            addCenteredText(line, centerX, valueTop + index * 12, 9, "F2", ink);
          });
        });
        y = 250;
      } else y = 122;
      addTableHeader(y);
      y += 27;
    }

    addPage(true);
    order.items.forEach((item, index) => {
      const quantities = item.quantities || [{ quantity: item.quantity, unit: item.unit }];
      const quantityText = quantities.map((pair) => `${pair.quantity || "-"} ${pair.unit || ""}`).join(" | ");
      const tileProduct = isTileProduct(item.product || "");
      const productText = cleanPdfText(item.product || "-");
      const productLines = wrapText(productText, tileProduct ? 68 : 40).slice(-2);
      const orderedLines = item.ordered === "" || item.ordered == null ? [] : wrapText(String(item.ordered), tileProduct ? 68 : 40);
      const productBlockLines = productLines.length;
      const quantityLines = wrapText(quantityText, tileProduct ? 68 : 27);
      const quantityFontSize = tileProduct ? 11 : 9;
      const quantityLineHeight = tileProduct ? 15 : 13;
      const productLineHeight = 13;
      const contentLineCount = tileProduct ? productBlockLines + quantityLines.length : Math.max(productBlockLines, quantityLines.length);
      const rowHeight = contentLineCount * Math.max(productLineHeight, quantityLineHeight) + 14;
      if (y + rowHeight > 765) {
        addPage(false);
      }
      const itemCenterX = (margin + 31 + pageWidth - margin) / 2;
      addCenteredText(String(index + 1), margin + 19, y + 7, 9, "F1", muted);
      if (tileProduct) {
        productLines.forEach((line, lineIndex) => addCenteredText(line, itemCenterX, y + 7 + lineIndex * productLineHeight, fitPdfTextSize(line, pageWidth - margin * 2 - 31, 9)));
        orderedLines.forEach((line, lineIndex) => addCenteredText(line, itemCenterX, y + 7 + (productBlockLines + lineIndex) * productLineHeight, 8, "F1", muted));
        quantityLines.forEach((line, lineIndex) => addCenteredText(line, itemCenterX, y + 7 + (productBlockLines + orderedLines.length + lineIndex) * quantityLineHeight, quantityFontSize, "F2"));
      } else {
        const productCenterX = (margin + 31 + 300) / 2;
        const quantityCenterX = (300 + pageWidth - margin) / 2;
        productLines.forEach((line, lineIndex) => addCenteredText(line, productCenterX, y + 7 + lineIndex * productLineHeight, fitPdfTextSize(line, 300 - margin - 31, 9)));
        orderedLines.forEach((line, lineIndex) => addCenteredText(line, quantityCenterX + 35, y + 7 + lineIndex * quantityLineHeight, 8, "F1", muted));
        quantityLines.forEach((line, lineIndex) => addCenteredText(line, quantityCenterX, y + 7 + lineIndex * quantityLineHeight, quantityFontSize));
      }
      y += rowHeight;
      addLine(margin, y, pageWidth - margin);
    });

    if (order.notes) {
      const noteLines = wrapText(`Notes: ${order.notes}`, 92);
      if (y + 28 > 765) {
        addPage(false);
      }
      addCenteredText("ORDER NOTES", pageWidth / 2, y + 14, 8, "F2", muted);
      y += 29;
      noteLines.forEach((line) => {
        if (y + 13 > 765) {
          addPage(false);
          y += 12;
        }
        addCenteredText(line, pageWidth / 2, y, 9);
        y += 13;
      });
    }

    if (order.preparedBy) {
      if (y + 40 > 765) addPage(false);
      const createdByCenter = margin + 130;
      addCenteredText("CREATED BY", createdByCenter, y + 10, 7, "F2", muted);
      addCenteredText(order.preparedBy, createdByCenter, y + 23, 9, "F2", ink);
    }

    pages.forEach((page, index) => {
      addTextToPage(page, `Page ${index + 1} of ${pages.length}`, pageWidth / 2, 794, 8, "F1", muted, pageWidth);
    });

    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      `<< /Type /Pages /Kids [${pages.map((_, index) => `${6 + index * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
      `<< /Type /XObject /Subtype /Image /Width ${logoImage.naturalWidth} /Height ${logoImage.naturalHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${logoHex.length} >>\nstream\n${logoHex}\nendstream`
    ];
    pages.forEach((page, index) => {
      const pageObject = 6 + index * 2;
      const streamObject = pageObject + 1;
      const stream = page.join("\n");
      objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Logo 5 0 R >> >> /Contents ${streamObject} 0 R >>`);
      objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    });

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return new TextEncoder().encode(pdf);
  }

  function addTextToPage(page, value, centerX, top, size, font, color, pageWidth) {
    const safe = String(value).replace(/[^\x20-\x7e]/g, "?");
    const hex = [...safe].map((character) => character.charCodeAt(0).toString(16).padStart(2, "0")).join("");
    const context = document.createElement("canvas").getContext("2d");
    context.font = `${font === "F2" ? "bold " : ""}${size}pt Helvetica`;
    const x = Math.max(0, Math.min(pageWidth, centerX) - context.measureText(safe).width * 0.375);
    page.push(`${color} rg BT /${font} ${size} Tf ${x} ${842 - top - size} Td <${hex}> Tj ET`);
  }

  function downloadOrderPdf(order = printPreviewOrder, openInViewer = false) {
    if (!order) return;
    try {
      const viewerWindow = openInViewer ? window.open("about:blank", "_blank") : null;
      const logoImage = $(".print-sheet-logo");
      if (!logoImage.complete || !logoImage.naturalWidth) {
        throw new Error("The SHAAFICI Warehouse 200 logo has not loaded.");
      }
      const pdf = createOrderPdf(order, logoImage);
      if (printPreviewPdfUrl) URL.revokeObjectURL(printPreviewPdfUrl);
      printPreviewPdfUrl = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
      const openPdf = $("#open-pdf");
      openPdf.href = printPreviewPdfUrl;
      openPdf.hidden = false;
      const link = document.createElement("a");
      link.href = printPreviewPdfUrl;
      link.download = `${order.id}-order.pdf`;
      document.body.append(link);
      link.click();
      link.remove();
      if (openInViewer) {
        if (viewerWindow) {
          viewerWindow.location.href = printPreviewPdfUrl;
          showToast("PDF downloaded and opened. Use the PDF viewer's print button.");
        } else {
          showToast("PDF downloaded. If it did not open, choose Open PDF to print.");
        }
      } else {
        showToast("PDF downloaded. Open it to print your order.");
      }
    } catch (error) {
      console.error("Could not create the order PDF.", error);
      showToast("Could not create the PDF. Please try again.");
    }
  }

  async function takeReceiptScreenshot() {
    return takeReceiptScreenshotReceiptCanvas();

    /*
    if (!printPreviewOrder) throw new Error("There is no order to capture.");
    if (!navigator.clipboard?.write || typeof ClipboardItem !== "function") {
      throw new Error("Image clipboard access is unavailable. Allow clipboard access in Firefox, then try again.");
    }
    const order = printPreviewOrder;
    const width = 286;
    const scale = 4;
    const padding = 10;
    const contentWidth = width - padding * 2;
    const canvas = document.createElement("canvas");
    const measure = canvas.getContext("2d");
    if (!measure) throw new Error("Could not create the screenshot image.");
    const wrap = (value, font, maxWidth) => {
      measure.font = font;
      const lines = [];
      let line = "";
      for (const word of String(value || "-").split(/\s+/)) {
        const candidate = line ? `${line} ${word}` : word;
        if (line && measure.measureText(candidate).width > maxWidth) {
          lines.push(line);
          line = word;
        } else line = candidate;
      }
      if (line) lines.push(line);
      return lines;
    };
    const fields = [
      ["ORDER DATE", formatDate(order.date)], ["CUSTOMER / COMPANY", order.customer],
      ["DELIVERED BY", order.driver], ["BRANCH", order.branch],
      ["DRIVER PHONE", order.driverPhone], ["TRANSFER ID", order.transferId]
    ];
    const itemData = order.items.map((item, index) => {
      const product = wrap(item.product, "700 11px Arial", 230).slice(-2);
      const quantities = (item.quantities || [{ quantity: item.quantity, unit: item.unit }])
        .filter((pair) => Number(pair.quantity) > 0)
        .map((pair) => `${pair.quantity} ${pair.unit}`).join(" · ");
      return { index: index + 1, product, quantities: wrap(quantities || "No quantity", "700 10px Arial", 230) };
    });
    const itemHeight = itemData.reduce((total, item) => total + Math.max(item.product.length, item.quantities.length) * 15 + 14, 0);
    const height = 18 + Math.ceil(fields.length / 2) * 39 + 18 + 24 + itemHeight + (order.preparedBy ? 54 : 18);
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create the screenshot image.");
    context.scale(scale, scale);
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.textBaseline = "top";
    let y = 12;
    for (let index = 0; index < fields.length; index += 2) {
      fields.slice(index, index + 2).forEach(([label, value], column) => {
        const x = padding + column * (contentWidth / 2);
        context.textAlign = "center";
        context.fillStyle = "#333";
        context.font = "700 7px Arial";
        context.fillText(label, x + contentWidth / 4, y);
        context.fillStyle = "#111";
        context.font = "600 10px Arial";
        wrap(value, "600 10px Arial", contentWidth / 2 - 8).slice(0, 2)
          .forEach((line, lineIndex) => context.fillText(line, x + contentWidth / 4, y + 13 + lineIndex * 12));
      });
      y += 39;
    }
    y += 8;
    context.fillStyle = "#eee";
    context.fillRect(padding, y, contentWidth, 24);
    context.fillStyle = "#222";
    context.font = "700 7px Arial";
    context.textAlign = "left";
    context.fillText("#", padding + 8, y + 8);
    context.fillText("PRODUCT / DESCRIPTION", padding + 24, y + 8);
    y += 24;
    itemData.forEach((item) => {
      const rowHeight = Math.max(item.product.length, item.quantities.length) * 15 + 14;
      context.fillStyle = "#111";
      context.font = "600 9px Arial";
      context.textAlign = "left";
      context.fillText(String(item.index), padding + 4, y + 8);
      context.font = "700 11px Arial";
      item.product.forEach((line, index) => context.fillText(line, padding + 24, y + 7 + index * 15));
      context.font = "700 10px Arial";
      item.quantities.forEach((line, index) => context.fillText(line, padding + 24, y + 7 + (item.product.length + index) * 15));
      y += rowHeight;
      context.fillStyle = "#777";
      context.fillRect(padding, y, contentWidth, 1);
    });
    if (order.preparedBy) {
      y += 20;
      context.textAlign = "right";
      context.fillStyle = "#777";
      context.font = "700 7px Arial";
      context.fillText("CREATED BY", width - padding, y);
      context.fillStyle = "#222";
      context.font = "600 9px Arial";
      context.fillText(order.preparedBy, width - padding, y + 14);
    }
    const png = new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not encode the screenshot image.")), "image/png");
    });
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
    return true;

    const order = printPreviewOrder;
    const width = 302;
    const scale = 2;
    const padding = 12;
    const contentWidth = width - padding * 2;
    const measurementCanvas = document.createElement("canvas");
    const measure = measurementCanvas.getContext("2d");
    if (!measure) throw new Error("Could not prepare the screenshot.");

    function wrap(text, font, maxWidth) {
      measure.font = font;
      const lines = [];
      let line = "";
      String(text).split(/\s+/).forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (line && measure.measureText(candidate).width > maxWidth) {
          lines.push(line);
          line = word;
        } else line = candidate;
      });
      if (line) lines.push(line);
      return lines;
    }

    const fields = [
      { label: "ORDER DATE", value: formatDate(order.date) },
      { label: "CUSTOMER / COMPANY", value: order.customer },
      { label: "DELIVERED BY", value: order.driver },
      { label: "BRANCH", value: order.branch },
      { label: "DRIVER PHONE", value: order.driverPhone },
      { label: "TRANSFER ID", value: order.transferId }
    ];
    const columnGap = 10;
    const columnWidth = (contentWidth - columnGap) / 2;
    const fieldRows = [];
    for (let index = 0; index < fields.length; index += 2) {
      const rowFields = fields.slice(index, index + 2).map((field) => ({
        ...field,
        lines: wrap(field.value, "600 12px Arial, sans-serif", columnWidth - 8)
      }));
      fieldRows.push({
        fields: rowFields,
        height: Math.max(...rowFields.map((field) => 11 + 4 + field.lines.length * 15 + 6))
      });
    }

    const itemRows = order.items.map((item, index) => {
      const productLines = wrap(item.product, "600 13px Arial, sans-serif", 145);
      if (productLines.length > 2) {
        productLines.splice(0, productLines.length - 2);
      }
      const orderedLines = item.ordered === "" || item.ordered == null
        ? []
        : wrap(String(item.ordered), "10px Arial, sans-serif", 40);
      const quantities = (item.quantities || [{ quantity: item.quantity, unit: item.unit }])
        .filter((pair) => Number(pair.quantity) > 0)
        .map((pair) => `${pair.quantity} ${pair.unit}`)
        .join(" · ") || "No quantity";
      const quantityLines = wrap(quantities, "600 13px Arial, sans-serif", 95);
      return {
        index: index + 1,
        productLines,
        orderedLines,
        quantityLines,
        height: Math.max(productLines.length * 17, orderedLines.length * 17, quantityLines.length * 17) + 14
      };
    });

    let height = padding + 10;
    fieldRows.forEach((row) => { height += row.height; });
    height += 10 + 26;
    itemRows.forEach((row) => { height += row.height; });
    if (order.notes) height += 12 + wrap(`Notes: ${order.notes}`, "11px Arial, sans-serif", contentWidth).length * 15;
    if (order.preparedBy) height += 20 + 11 + 4 + wrap(order.preparedBy, "600 12px Arial, sans-serif", contentWidth).length * 15;
    height += padding;
    if (height * scale > 32767) throw new Error("This receipt is too long to capture as one image.");

    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create the screenshot image.");
    context.scale(scale, scale);
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.textBaseline = "top";
    let y = padding + 4;

    fieldRows.forEach((row) => {
      row.fields.forEach((field, index) => {
        const x = padding + index * (columnWidth + columnGap);
        context.fillStyle = "#333";
        context.font = "700 8px Arial, sans-serif";
        context.textAlign = "center";
        context.fillText(field.label, x + columnWidth / 2, y);
        context.fillStyle = "#111";
        context.font = "600 12px Arial, sans-serif";
        field.lines.forEach((line, lineIndex) => context.fillText(line, x + columnWidth / 2, y + 15 + lineIndex * 15));
      });
      y += row.height;
    });

    y += 6;
    context.fillStyle = "#f0f0f0";
    context.fillRect(padding, y, contentWidth, 26);
    context.fillStyle = "#111";
    context.font = "700 9px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText("#", padding + 13, y + 9);
    context.textAlign = "left";
    context.fillText("PRODUCT / DESCRIPTION", padding + 30, y + 9);
    y += 26;

    itemRows.forEach((row) => {
      const rowTop = y;
      context.fillStyle = "#111";
      context.font = "500 10px Arial, sans-serif";
      context.textAlign = "left";
      context.fillText(String(row.index), padding + 7, rowTop + 8);
      context.font = "600 13px Arial, sans-serif";
      row.productLines.forEach((line, index) => context.fillText(line, padding + 30, rowTop + 8 + index * 17));
      context.fillStyle = "#666";
      context.font = "10px Arial, sans-serif";
      context.fillStyle = "#111";
      context.font = "600 13px Arial, sans-serif";
      context.textAlign = "left";
      row.quantityLines.forEach((line, index) => context.fillText(line, padding + 30 + 145, rowTop + 8 + index * 17));
      context.fillStyle = "#666";
      context.font = "10px Arial, sans-serif";
      context.textAlign = "right";
      row.orderedLines.forEach((line, index) => context.fillText(line, width - padding - 4, rowTop + 8 + index * 17));
      y += row.height;
      context.fillStyle = "#777";
      context.fillRect(padding, y, contentWidth, 1);
    });

    if (order.notes) {
      y += 12;
      context.fillStyle = "#111";
      context.font = "11px Arial, sans-serif";
      context.textAlign = "left";
      wrap(`Notes: ${order.notes}`, "11px Arial, sans-serif", contentWidth)
        .forEach((line, index) => context.fillText(line, padding, y + index * 15));
      y += wrap(`Notes: ${order.notes}`, "11px Arial, sans-serif", contentWidth).length * 15;
    }
    if (order.preparedBy) {
      y += 20;
      context.fillStyle = "#555";
      context.font = "700 8px Arial, sans-serif";
      context.textAlign = "right";
      context.fillText("CREATED BY", width - padding, y);
      context.fillStyle = "#111";
      context.font = "600 12px Arial, sans-serif";
      wrap(order.preparedBy, "600 12px Arial, sans-serif", contentWidth)
        .forEach((line, index) => context.fillText(line, width - padding, y + 15 + index * 15));
    }

    if (!navigator.clipboard?.write || typeof ClipboardItem !== "function") {
      throw new Error("Image clipboard access is unavailable. Allow clipboard access in Firefox, then try again.");
    }
    const png = new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not encode the screenshot image.")), "image/png");
    });
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
    return true;
    */
  }

  async function takeReceiptScreenshotReceiptCanvas() {
    if (!printPreviewOrder) throw new Error("There is no order to capture.");
    if (!navigator.clipboard?.write || typeof ClipboardItem !== "function") {
      throw new Error("Image clipboard access is unavailable. Allow clipboard access in Firefox, then try again.");
    }

    const order = printPreviewOrder;
    const width = 302;
    const scale = 2;
    const padding = 12;
    const contentWidth = width - padding * 2;
    const canvas = document.createElement("canvas");
    const measure = canvas.getContext("2d");
    if (!measure) throw new Error("Could not create the screenshot image.");

    const wrap = (value, font, maxWidth) => {
      measure.font = font;
      const lines = [];
      let line = "";
      String(value || "-").split(/\s+/).forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (line && measure.measureText(candidate).width > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      });
      if (line) lines.push(line);
      return lines;
    };

    const fields = [
      ["ORDER DATE", formatDate(order.date)],
      ["CUSTOMER / COMPANY", order.customer],
      ["DELIVERED BY", order.driver],
      ["BRANCH", order.branch],
      ["DRIVER PHONE", order.driverPhone],
      ["TRANSFER ID", order.transferId]
    ].filter(([, value]) => value);
    const columnGap = 10;
    const columnWidth = (contentWidth - columnGap) / 2;
    const fieldRows = [];
    for (let index = 0; index < fields.length; index += 2) {
      const row = fields.slice(index, index + 2).map(([label, value]) => ({
        label,
        lines: wrap(value, "600 12px Arial", columnWidth - 8)
      }));
      fieldRows.push({
        fields: row,
        height: Math.max(...row.map((field) => 11 + field.lines.length * 15 + 3))
      });
    }

    const itemRows = order.items.map((item, index) => {
      const productLines = wrap(item.product, "600 13px Arial", contentWidth - 76).slice(0, 2);
      const orderedLines = item.ordered === "" || item.ordered == null
        ? []
        : wrap(String(item.ordered), "9px Arial", contentWidth - 76).slice(0, 1);
      const quantities = (item.quantities || [{ quantity: item.quantity, unit: item.unit }])
        .filter((pair) => Number(pair.quantity) > 0)
        .map((pair) => `${pair.quantity} ${pair.unit}`)
        .join(" · ") || "No quantity";
      return {
        index: index + 1,
        productLines,
        orderedLines,
        quantityLines: wrap(quantities, "600 11px Arial", 58),
        height: Math.max(productLines.length * 17 + orderedLines.length * 13, quantities.length ? 17 : 0) + 14
      };
    });

    let height = 16;
    fieldRows.forEach((row) => { height += row.height + 7; });
    height += 6 + 26;
    itemRows.forEach((row) => { height += row.height; });
    if (order.notes) height += 10 + wrap(`Notes: ${order.notes}`, "11px Arial", contentWidth).length * 15;
    if (order.preparedBy) height += 20 + 11 + 4 + wrap(order.preparedBy, "600 11px Arial", contentWidth).length * 14;
    if (height * scale > 32767) throw new Error("This receipt is too long to capture as one image.");

    canvas.width = width * scale;
    canvas.height = Math.ceil(height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create the screenshot image.");
    context.scale(scale, scale);
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.textBaseline = "top";
    let y = 16;

    fieldRows.forEach((row) => {
      row.fields.forEach((field, index) => {
        const x = padding + index * (columnWidth + columnGap);
        context.textAlign = "center";
        context.fillStyle = "#333";
        context.font = "700 8px Arial";
        context.fillText(field.label, x + columnWidth / 2, y);
        context.fillStyle = "#111";
        context.font = "600 12px Arial";
        field.lines.forEach((line, lineIndex) => {
          context.fillText(line, x + columnWidth / 2, y + 14 + lineIndex * 15);
        });
      });
      y += row.height + 7;
    });

    context.fillStyle = "#f0f0f0";
    context.fillRect(padding, y, contentWidth, 26);
    context.fillStyle = "#111";
    context.font = "700 8px Arial";
    context.textAlign = "center";
    context.fillText("#", padding + 11, y + 8);
    context.textAlign = "left";
    context.fillText("PRODUCT / DESCRIPTION", padding + 24, y + 8);
    y += 26;

    itemRows.forEach((row) => {
      const rowTop = y;
      context.fillStyle = "#111";
      context.font = "500 10px Arial";
      context.textAlign = "center";
      context.fillText(String(row.index), padding + 11, rowTop + 8);
      context.textAlign = "left";
      context.font = "600 13px Arial";
      row.productLines.forEach((line, index) => context.fillText(line, padding + 24, rowTop + 8 + index * 17));
      context.fillStyle = "#333";
      context.font = "9px Arial";
      row.orderedLines.forEach((line, index) => context.fillText(line, padding + 24, rowTop + 8 + row.productLines.length * 17 + index * 13));
      context.fillStyle = "#111";
      context.font = "600 11px Arial";
      context.textAlign = "right";
      row.quantityLines.forEach((line, index) => context.fillText(line, width - padding - 4, rowTop + 8 + index * 15));
      context.fillStyle = "#777";
      context.fillRect(padding, rowTop + row.height - 1, contentWidth, 1);
      y += row.height;
    });

    if (order.notes) {
      y += 10;
      context.fillStyle = "#111";
      context.font = "11px Arial";
      context.textAlign = "left";
      wrap(`Notes: ${order.notes}`, "11px Arial", contentWidth)
        .forEach((line, index) => context.fillText(line, padding, y + index * 15));
    }
    if (order.preparedBy) {
      y += order.notes ? 20 : 10;
      context.fillStyle = "#777";
      context.font = "700 8px Arial";
      context.textAlign = "right";
      context.fillText("CREATED BY", width - padding, y);
      context.fillStyle = "#111";
      context.font = "600 11px Arial";
      wrap(order.preparedBy, "600 11px Arial", contentWidth)
        .forEach((line, index) => context.fillText(line, width - padding, y + 15 + index * 14));
    }

    const png = new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not encode the screenshot image.")), "image/png");
    });
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
    return true;
  }

  async function takeReceiptScreenshotPreview() {
    if (!printPreviewOrder) throw new Error("There is no order to capture.");
    if (!navigator.clipboard?.write || typeof ClipboardItem !== "function") {
      throw new Error("Image clipboard access is unavailable. Allow clipboard access in Firefox, then try again.");
    }
    const source = $(".print-sheet");
    if (!source) throw new Error("The print preview is not available.");
    await document.fonts?.ready;
    const bounds = source.getBoundingClientRect();
    const width = Math.ceil(bounds.width);
    const height = Math.ceil(source.scrollHeight);
    const clone = source.cloneNode(true);
    clone.querySelector("#take-receipt-screenshot")?.remove();
    const copyStyles = (original, copy) => {
      const computed = getComputedStyle(original);
      for (const property of computed) {
        copy.style.setProperty(property, computed.getPropertyValue(property));
      }
      [...original.children].forEach((child, index) => {
        if (copy.children[index]) copyStyles(child, copy.children[index]);
      });
    };
    copyStyles(source, clone);
    clone.style.width = `${width}px`;
    clone.style.height = `${height}px`;
    clone.style.minHeight = "0";
    clone.style.margin = "0";
    clone.style.boxShadow = "none";
    for (const image of clone.querySelectorAll("img")) {
      const original = source.querySelector(`img[src="${image.getAttribute("src")}"]`);
      if (!original?.complete || !original.naturalWidth) {
        image.remove();
        continue;
      }
      try {
        const response = await fetch(new URL(original.getAttribute("src"), document.baseURI));
        if (!response.ok) throw new Error(`Image request failed with status ${response.status}.`);
        const blob = await response.blob();
        image.src = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("Could not read the preview logo."));
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.warn("Could not embed the preview logo; omitting it from the screenshot.", error);
        image.remove();
      }
    }
    const serialized = new XMLSerializer().serializeToString(clone);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="${width}" height="${height}"><foreignObject width="100%" height="100%"><xhtml:div xmlns="http://www.w3.org/1999/xhtml">${serialized}</xhtml:div></foreignObject></svg>`;
    const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    try {
      const image = new Image();
      image.src = svgUrl;
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("Could not render the print preview screenshot."));
      });
      const scale = Math.min(10, Math.max(2, 3200 / width));
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(width * scale);
      canvas.height = Math.ceil(height * scale);
      if (canvas.width > 32767 || canvas.height > 32767) {
        throw new Error("This receipt is too long to capture at high resolution.");
      }
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not create the screenshot image.");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const png = new Promise((resolve, reject) => {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Could not encode the screenshot image.")), "image/png");
      });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }

  function printOrderNow() {
    if (!printPreviewOrder) return;
    const receiptPageStyle = printLayout === "receipt" ? document.createElement("style") : null;
    if (receiptPageStyle) {
      const sheet = $(".print-sheet");
      const contentHeight = Math.max(0, sheet.scrollHeight - 40);
      const pageHeight = Math.ceil(contentHeight * 25.4 / 96 + 5);
      receiptPageStyle.textContent = `@page receipt { size: 80mm ${pageHeight}mm; margin: 0; }`;
      document.head.append(receiptPageStyle);
    }
    const cleanup = () => {
      window.removeEventListener("afterprint", cleanup);
      receiptPageStyle?.remove();
    };
    window.addEventListener("afterprint", cleanup);
    try {
      window.print();
    } catch (error) {
      cleanup();
      console.error("Could not open the print dialog.", error);
      showToast("Could not open the print dialog. Try opening the downloaded PDF.");
    }
  }

  function readForm() {
    const data = new FormData(form);
    return {
      id: editingId || nextOrderId(),
      customer: data.get("customer").trim(),
      branch: data.get("branch").trim(),
      category: data.get("category"),
      transferId: data.get("transferId").trim(),
      date: data.get("date"),
      driver: data.get("driver").trim(),
      driverPhone: data.get("driverPhone").trim(),
      preparedBy: data.get("preparedBy").trim(),
      notes: data.get("notes").trim(),
      status: editingId ? (orders.find((order) => order.id === editingId)?.status || "Open") : "Open",
      items: getItems(),
      createdAt: editingId ? orders.find((order) => order.id === editingId)?.createdAt || Date.now() : Date.now()
    };
  }

  function currentOrderFormSnapshot() {
    const data = new FormData(form);
    return JSON.stringify({
      customer: data.get("customer"),
      branch: data.get("branch"),
      category: data.get("category"),
      transferId: data.get("transferId"),
      date: data.get("date"),
      driver: data.get("driver"),
      driverPhone: data.get("driverPhone"),
      preparedBy: data.get("preparedBy"),
      notes: data.get("notes"),
      items: getItems()
    });
  }

  function hasUnsavedOrderChanges() {
    return orderFormSnapshot !== "" && currentOrderFormSnapshot() !== orderFormSnapshot;
  }

  function confirmDiscardUnsavedOrder() {
    return !hasUnsavedOrderChanges()
      || window.confirm("This order has not been saved. Discard the changes?");
  }

  function statusClass(status) {
    return status.toLowerCase().replaceAll(" ", "-");
  }

  function isDeletedOrder(order) {
    return Boolean(order.deletedAt)
      || (order.history || []).some((entry) =>
        entry.action === "Order deleted" || entry.action === "Catalog quantities restored"
      );
  }

  function orderRow(order) {
    const row = document.createElement("tr");
    row.className = "clickable-order-row";
    row.tabIndex = 0;
    row.setAttribute("aria-label", `Open order ${order.id}`);
    row.innerHTML = `
      <td><span class="order-number">${escapeAttribute(order.id)}</span></td>
      <td class="customer-cell">${escapeAttribute(order.customer)}</td>
      <td>${escapeAttribute(order.transferId || "—")}</td>
      <td>${formatDate(order.date)}</td>
      <td><button class="status-pill status-${statusClass(order.status)}" type="button" aria-label="Change status for ${escapeAttribute(order.id)}" title="Click to change status">${escapeAttribute(order.status)}</button></td>
      <td class="row-actions"><button class="icon-button" type="button" aria-label="Open order ${escapeAttribute(order.id)}" title="Open order">↗</button><button class="order-action-button" type="button" data-action="history" aria-label="View history for ${escapeAttribute(order.id)}">History</button><button class="order-action-button order-delete-button" type="button" data-action="delete" aria-label="Delete order ${escapeAttribute(order.id)}">Delete</button></td>`;
    row.addEventListener("click", (event) => {
      if (event.target.closest("button, a, input, select, textarea")) return;
      editOrder(order.id);
    });
    row.addEventListener("keydown", (event) => {
      if ((event.key === "Enter" || event.key === " ") && event.target === row) {
        event.preventDefault();
        editOrder(order.id);
      }
    });
    $(".icon-button", row).addEventListener("click", () => editOrder(order.id));
    $(".status-pill", row).addEventListener("click", () => changeStatus(order.id));
    $('[data-action="history"]', row).addEventListener("click", () => showOrderHistory(order.id));
    $('[data-action="delete"]', row).addEventListener("click", () => deleteOrder(order.id));
    return row;
  }

  function orderSortValue(order, key) {
    if (key === "date") return order.date || "";
    if (key === "createdAt") return Number(order.createdAt) || 0;
    return String(order[key] || "").toLocaleLowerCase();
  }

  function sortOrders(list) {
    return [...list].sort((a, b) => {
      const first = orderSortValue(a, orderSort.key);
      const second = orderSortValue(b, orderSort.key);
      const comparison = typeof first === "number" && typeof second === "number"
        ? first - second
        : String(first).localeCompare(String(second), undefined, { numeric: true, sensitivity: "base" });
      return (orderSort.direction === "asc" ? 1 : -1) * (comparison || (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
    });
  }

  function updateOrderSortHeaders() {
    $$("[data-order-sort]").forEach((header) => {
      const active = header.dataset.orderSort === orderSort.key;
      header.classList.toggle("sort-active", active);
      header.dataset.sortDirection = active ? orderSort.direction : "";
      header.setAttribute("aria-sort", active
        ? orderSort.direction === "asc" ? "ascending" : "descending"
        : "none");
      header.title = active
        ? `Sorted ${orderSort.direction === "asc" ? "ascending" : "descending"}. Double-click to sort ${orderSort.direction === "asc" ? "descending" : "ascending"}.`
        : "Click to sort ascending. Double-click to sort descending.";
    });
  }

  function renderOverview() {
    const activeOrders = orders.filter((order) => !order.deletedAt);
    const sorted = sortOrders(activeOrders);
    $("#stat-total").textContent = String(activeOrders.length);
    $("#stat-open").textContent = String(activeOrders.filter((order) => order.status !== "Completed").length);
    $("#stat-completed").textContent = String(activeOrders.filter((order) => order.status === "Completed").length);
    $("#nav-order-count").textContent = String(activeOrders.length);
    const target = $("#recent-orders");
    target.replaceChildren(...sorted.slice(0, 5).map(orderRow));
    labelTableRows(target);
    $("#recent-empty").hidden = sorted.length > 0;
  }

  function renderAllOrders() {
    const query = $("#order-search").value.trim().toLowerCase();
    const status = $("#status-filter").value;
    const date = $("#order-date-filter").value;
    const filtered = sortOrders(orders.filter((order) => !order.deletedAt)).filter((order) =>
      (status === "all" || order.status === status) &&
      (!date || order.date === date) &&
      `${order.id} ${order.customer} ${order.transferId || ""} ${order.category}`.toLowerCase().includes(query)
    );
    const target = $("#all-orders");
    target.replaceChildren(...filtered.map(orderRow));
    labelTableRows(target);
    $("#orders-empty").hidden = filtered.length > 0;
    updateOrderSortHeaders();
  }

  function showOrderHistory(id) {
    historyOrderFilter = id;
    $("#history-search").value = "";
    setView("history");
  }

  function renderHistory() {
    const query = $("#history-search").value.trim().toLowerCase();
    const selectedOrder = orders.find((order) => order.id === historyOrderFilter);
    $("#history-filter-label").textContent = selectedOrder
      ? `Showing ${selectedOrder.id} — ${selectedOrder.customer}${selectedOrder.deletedAt ? " (deleted)" : ""}`
      : "";
    const entries = orders.filter((order) => !order.deletedAt).flatMap((order) => (order.history || []).map((entry) => ({
      ...entry,
      orderId: order.id,
      customer: order.customer,
      actor: entry.actor || normalizeCreatedBy(order.preparedBy) || "Unknown user",
      deleted: false
    }))).filter((entry) =>
      (!historyOrderFilter || entry.orderId === historyOrderFilter)
      && `${entry.orderId} ${entry.customer} ${entry.action} ${entry.details}`.toLowerCase().includes(query)
    ).sort((a, b) => b.timestamp - a.timestamp);
    const rows = entries.map((entry) => {
      const row = document.createElement("tr");
      const when = document.createElement("td");
      when.textContent = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(entry.timestamp);
      const actor = document.createElement("td");
      actor.textContent = entry.actor
        ? `${entry.actor}${entry.actorEmail ? ` (${entry.actorEmail})` : ""}`
        : entry.actorEmail || "Unknown user";
      const orderId = document.createElement("td");
      orderId.textContent = `${entry.orderId}${entry.deleted ? " (deleted)" : ""}`;
      const customer = document.createElement("td");
      customer.textContent = entry.customer || "—";
      const activity = document.createElement("td");
      activity.textContent = entry.details ? `${entry.action}: ${entry.details}` : entry.action;
      row.append(when, actor, orderId, customer, activity);
      return row;
    });
    $("#order-history").replaceChildren(...rows);
    labelTableRows($("#order-history"));
    $("#history-empty").hidden = entries.length > 0;
  }

  function renderTransferHistory() {
    const query = $("#transfer-history-search").value.trim().toLowerCase();
    const selectedDate = $("#transfer-history-date").value;
    const activeOrders = orders.filter((order) => !isDeletedOrder(order));
    const structuredEntries = activeOrders.flatMap((order) => (order.history || [])
      .filter((entry) => entry.action === "Catalog quantities updated" && Array.isArray(entry.catalogChanges))
      .flatMap((entry) => entry.catalogChanges.map((change) => ({
        ...change,
        timestamp: entry.timestamp,
        orderId: order.id,
        transferId: order.transferId,
        customer: order.customer,
        deleted: Boolean(order.deletedAt)
      }))));
    const structuredOrderIds = new Set(structuredEntries.map((entry) => entry.orderId));
    const legacyEntries = activeOrders
      .filter((order) => order.catalogTakenApplied && !structuredOrderIds.has(order.id))
      .flatMap((order) => order.items.map((item) => {
        const ordered = Number(item.ordered);
        const catalogItem = getCatalogProduct(item.product);
        if (!catalogItem || !Number.isFinite(ordered) || ordered === 0) return null;
        return {
          timestamp: order.createdAt,
          orderId: order.id,
          transferId: order.transferId,
          customer: order.customer,
          deleted: Boolean(order.deletedAt),
          productId: catalogItem.product.match(/^\s*\[([^\]]+)\]/)?.[1] || catalogItem.product,
          ordered,
          movement: isWarehouseTransfer(order) ? "Quantity" : "Taken",
          quantity: catalogItem.quantities?.[0],
          taken: catalogItem.taken?.[0],
          remaining: catalogItem.rQuantities?.[0],
          uomN: catalogItem.uomNs?.[0],
          status: catalogItem.statuses?.[0]
        };
      }).filter(Boolean));
    const entries = [...structuredEntries, ...legacyEntries].filter((entry) =>
        (!selectedDate || dateValue(new Date(entry.timestamp)) === selectedDate)
        && `${entry.orderId} ${entry.transferId || ""} ${entry.customer} ${entry.productId}`.toLowerCase().includes(query)
      ).sort((a, b) => b.timestamp - a.timestamp);
    const rows = entries.map((entry) => {
      const row = document.createElement("tr");
      if (isWarehouseTransfer({ transferId: entry.transferId })) row.classList.add("warehouse-transfer-row");
      [
        new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(entry.timestamp),
        entry.transferId || entry.orderId,
        entry.customer || "—",
        entry.productId || entry.product || "—",
        formatCatalogNumber(entry.ordered),
        formatCatalogNumber(entry.movement === "Quantity" ? entry.quantity : entry.taken),
        formatCatalogNumber(entry.remaining),
        formatCatalogNumber(entry.uomN),
        entry.status || "—"
      ].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      const actions = document.createElement("td");
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "order-action-button order-delete-button";
      deleteButton.textContent = "Delete";
      deleteButton.disabled = !entry.orderId || entry.deleted;
      deleteButton.addEventListener("click", () => deleteOrder(entry.orderId));
      actions.append(deleteButton);
      row.append(actions);
      return row;
    });
    $("#transfer-history").replaceChildren(...rows);
    labelTableRows($("#transfer-history"));
    $("#transfer-history-empty").hidden = entries.length > 0;
  }

  function renderItemHistory() {
    const query = $("#item-history-search").value.trim().toLowerCase();
    const selectedCatalogProduct = itemHistoryProductFilter
      ? getCatalogProduct(itemHistoryProductFilter)
      : null;
    const matchesItemHistoryProduct = (product) => {
      if (!itemHistoryProductFilter) return true;
      const catalogProduct = getCatalogProduct(product);
      if (selectedCatalogProduct && catalogProduct) return catalogProduct === selectedCatalogProduct;
      return String(product || "").trim().toLocaleLowerCase()
        === itemHistoryProductFilter.trim().toLocaleLowerCase();
    };
    const visibleDates = new Set([
      dateValue(new Date()),
      dateValue(new Date(Date.now() - 86400000))
    ]);
    const orderEntries = orders
      .filter((order) => !order.deletedAt)
      .flatMap((order) => order.items.flatMap((item) => {
        const createdAt = Number(order.createdAt) || 0;
        const warehouseTransfer = isWarehouseTransfer(order);
        if (!matchesItemHistoryProduct(item.product)) return [];
        if (!createdAt || !itemHistoryProductFilter && !warehouseTransfer
          && !visibleDates.has(dateValue(new Date(createdAt)))) return [];
        const ordered = Number(item.ordered);
        if (!Number.isFinite(ordered) || ordered <= 0) return [];
        const catalogItem = getCatalogProduct(item.product);
        return [{
          orderId: order.id,
          timestamp: createdAt,
          date: order.date || order.createdAt,
          reference: order.transferId || order.id,
          warehouseTransfer,
          product: item.product || "—",
          from: warehouseTransfer ? "Partners/Vendors" : "WH2/Warehouse 200k",
          to: warehouseTransfer ? "WH2/Warehouse 200k" : order.branch || order.customer || "—",
          quantity: ordered,
          unit: catalogItem?.unit || item.unit || "—",
          quantityHighlight: warehouseTransfer
        }];
      }))
      ;
    const adjustmentEntries = catalogAdjustments
      .filter((entry) => matchesItemHistoryProduct(entry.product))
      .map((entry) => ({
        ...entry,
        timestamp: entry.timestamp,
        reference: entry.reference || "Manual adjustment",
        from: entry.amount > 0 ? "Manual adjustment" : "WH2/Warehouse 200k",
        to: entry.amount > 0 ? "WH2/Warehouse 200k" : "Manual adjustment",
        quantity: Math.abs(entry.amount),
        warehouseTransfer: false,
        quantityHighlight: true,
        adjustmentDirection: entry.amount > 0 ? "added" : "subtracted"
      }));
    const returnedTileEntries = returnedTiles
      .filter((entry) => matchesItemHistoryProduct(entry.product)
        && (itemHistoryProductFilter
          || visibleDates.has(entry.returnedDate || dateValue(new Date(entry.createdAt || 0)))))
      .map((entry) => {
        const dateTime = /^\d{4}-\d{2}-\d{2}$/.test(entry.returnedDate || "")
          ? new Date(`${entry.returnedDate}T12:00:00`).getTime()
          : Number(entry.createdAt) || 0;
        const quantity = `${formatCatalogNumber(entry.cartons || 0)} CRT + ${formatCatalogNumber(entry.firi || 0)} FIRI`;
        const receivedEntry = {
          id: entry.id,
          timestamp: dateTime,
          date: entry.returnedDate,
          product: entry.product,
          reference: `Returned tiles${entry.sourceNo ? ` · ${entry.sourceNo}` : ""}`,
          from: [entry.returnedFrom, entry.branch].filter(Boolean).join(" · ") || "Customer",
          to: "WH2/Warehouse 200k",
          quantity,
          unit: "Returned",
          returnedTile: true,
          recordedBy: entry.recordedBy
        };
        return receivedEntry;
      });
    const catalogEditEntries = catalogEditHistory
      .filter((entry) => matchesItemHistoryProduct(entry.product)
        || matchesItemHistoryProduct(entry.previousProduct))
      .flatMap((entry) => (entry.changes || []).map((change) => ({
        id: entry.id,
        timestamp: entry.timestamp,
        product: entry.product,
        previousProduct: entry.previousProduct,
        reference: `Catalog edit: ${change.field}`,
        from: change.before || "—",
        to: change.after || "—",
        quantity: "—",
        unit: "—",
        catalogEdit: true
      })));
    const entries = [...orderEntries, ...adjustmentEntries, ...returnedTileEntries, ...catalogEditEntries]
      .filter((entry) => `${entry.reference} ${entry.product} ${entry.previousProduct || ""} ${entry.from} ${entry.to} ${entry.reason || ""}`.toLowerCase().includes(query))
      .sort((left, right) => right.timestamp - left.timestamp);
    const rows = entries.map((entry) => {
      const row = document.createElement("tr");
      if (entry.warehouseTransfer) row.classList.add("warehouse-transfer-row");
      if (entry.adjustmentDirection) row.classList.add(`manual-adjustment-${entry.adjustmentDirection}`);
      if (entry.catalogEdit) row.classList.add("catalog-edit-history-row");
      const openOrder = () => editOrder(entry.orderId);
      if (entry.orderId) {
        row.classList.add("clickable-history-row");
        row.tabIndex = 0;
        row.setAttribute("role", "button");
        row.setAttribute("aria-label", `Open transfer ${entry.reference}`);
        row.addEventListener("click", openOrder);
        row.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openOrder();
          }
        });
      }
      const date = entry.date && /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
        ? `${entry.date} ${new Intl.DateTimeFormat("en", { timeStyle: "medium" }).format(entry.timestamp)}`
        : new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "medium" }).format(entry.timestamp);
      const values = [
        entry.product,
        entry.from,
        entry.to,
        formatCatalogNumber(entry.quantity),
        entry.unit
      ];
      const dateCell = document.createElement("td");
      dateCell.textContent = date;
      row.append(dateCell);
      const referenceCell = document.createElement("td");
      if (entry.catalogEdit || entry.returnedTile) {
        referenceCell.textContent = entry.reference;
      } else {
        const referenceButton = document.createElement("button");
        referenceButton.type = "button";
        referenceButton.className = "item-history-reference-button";
        referenceButton.textContent = entry.reference;
        referenceButton.title = "Edit reference";
        referenceButton.addEventListener("click", (event) => {
          event.stopPropagation();
          editItemHistoryReference(referenceCell, entry);
        });
        referenceCell.append(referenceButton);
      }
      row.append(referenceCell);
      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        if (entry.quantityHighlight && cell.cellIndex === 5) cell.classList.add("item-history-quantity");
        row.append(cell);
      });
      return row;
    });
    $("#item-history").replaceChildren(...rows);
    labelTableRows($("#item-history"));
    $("#item-history-empty").hidden = entries.length > 0;
  }

  function editItemHistoryReference(cell, entry) {
    if (cell.querySelector("input")) return;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "item-history-reference-input";
    input.value = entry.reference || "";
    input.maxLength = 120;
    const save = document.createElement("button");
    save.type = "button";
    save.className = "order-action-button";
    save.textContent = "Save";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "order-action-button";
    cancel.textContent = "Cancel";
    const finish = (restore) => {
      if (restore) {
        cell.replaceChildren(Object.assign(document.createElement("button"), {
          type: "button",
          className: "item-history-reference-button",
          textContent: entry.reference || "—"
        }));
        const button = cell.firstChild;
        button.title = "Edit reference";
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          editItemHistoryReference(cell, entry);
        });
      } else {
        renderItemHistory();
      }
    };
    save.addEventListener("click", async (event) => {
      event.stopPropagation();
      const reference = input.value.trim();
      if (!reference) {
        showToast("Reference cannot be empty.");
        input.focus();
        return;
      }
      if (entry.orderId) {
        const order = orders.find((candidate) => candidate.id === entry.orderId);
        if (!order) {
          showToast("The related order could not be found.");
          return;
        }
        const previous = order.transferId;
        order.transferId = reference;
        if (!await persistOrders(order)) {
          order.transferId = previous;
          return;
        }
      } else if (entry.id) {
        const adjustment = catalogAdjustments.find((candidate) => candidate.id === entry.id);
        if (!adjustment) {
          showToast("The adjustment could not be found.");
          return;
        }
        const previous = adjustment.reference;
        adjustment.reference = reference;
        try {
          await saveCatalogToCloud(currentCatalogData(), false);
        } catch (error) {
          adjustment.reference = previous;
          console.error("Could not save item history reference.", error);
          showToast(error.message || "Could not save the reference.");
          return;
        }
      }
      showToast("Reference updated.");
      renderItemHistory();
    });
    cancel.addEventListener("click", (event) => {
      event.stopPropagation();
      finish(true);
    });
    cell.replaceChildren(input, save, cancel);
    input.focus();
    input.select();
  }

  function resetForm() {
    form.reset();
    editingId = null;
    converterPinnedOpen = false;
    form.elements.preparedBy.value = currentPreparedBy;
    $("#order-date").value = dateValue();
    $("#category-select").value = categories[0];
    itemsBody.replaceChildren();
    createItemRow();
    updateConverterVisibility();
    updateConverter();
    refreshPreview();
    $("#order-form-title").textContent = "Create an order";
    $("#order-id-label").textContent = "NEW ORDER";
    updateOrderNavigation();
    orderFormSnapshot = currentOrderFormSnapshot();
  }

  function updateOrderNavigation() {
    const previousButton = $("#previous-order");
    const nextButton = $("#next-order");
    const activeOrders = orders.filter((order) => !order.deletedAt).sort((a, b) => b.createdAt - a.createdAt);
    const currentIndex = activeOrders.findIndex((order) => order.id === editingId);
    const isEditingOrder = currentIndex >= 0;
    previousButton.hidden = !isEditingOrder;
    nextButton.hidden = !isEditingOrder;
    previousButton.disabled = !isEditingOrder || currentIndex === 0;
    nextButton.disabled = !isEditingOrder || currentIndex === activeOrders.length - 1;
  }

  function navigateOrder(offset) {
    const activeOrders = orders.filter((order) => !order.deletedAt).sort((a, b) => b.createdAt - a.createdAt);
    const currentIndex = activeOrders.findIndex((order) => order.id === editingId);
    const nextOrder = activeOrders[currentIndex + offset];
    if (nextOrder) editOrder(nextOrder.id);
  }

  function openNewOrder(category = categories[0]) {
    if ($("#new-order-view").classList.contains("active") && !confirmDiscardUnsavedOrder()) return;
    resetForm();
    $("#category-select").value = category;
    updateConverterVisibility();
    refreshPreview();
    setView("new-order");
  }

  function editOrder(id) {
    if ($("#new-order-view").classList.contains("active") && !confirmDiscardUnsavedOrder()) return;
    const order = orders.find((entry) => entry.id === id);
    if (!order || order.deletedAt) return;
    editingId = id;
    form.elements.customer.value = order.customer;
    form.elements.branch.value = order.branch || "";
    form.elements.category.value = order.category;
    form.elements.transferId.value = order.transferId || "";
    form.elements.date.value = order.date;
    form.elements.driver.value = order.driver || "";
    form.elements.driverPhone.value = order.driverPhone || "";
    form.elements.preparedBy.value = normalizeCreatedBy(order.preparedBy);
    form.elements.notes.value = order.notes || "";
    itemsBody.replaceChildren();
    (order.items.length ? order.items : [{}]).forEach(createItemRow);
    updateConverterVisibility();
    refreshPreview();
    updateOrderNavigation();
    orderFormSnapshot = currentOrderFormSnapshot();
    setView("new-order");
  }

  function recordOrderHistory(order, action, details = "", metadata = {}) {
    order.history = Array.isArray(order.history) ? order.history : [];
    const actor = cloudUser ? usernameForUser(cloudUser) : "";
    const actorEmail = String(cloudUser?.email || "").trim();
    order.history.push({
      timestamp: Date.now(),
      action,
      details,
      actor: actor || order.preparedBy || "Unknown user",
      actorEmail,
      ...metadata
    });
  }

  function changedOrderFields(previous, next) {
    const fields = [
      ["Customer", "customer"],
      ["Branch", "branch"],
      ["Category", "category"],
      ["Transfer ID", "transferId"],
      ["Order date", "date"],
      ["Delivered by", "driver"],
      ["Driver phone", "driverPhone"],
      ["Created by", "preparedBy"],
      ["Notes", "notes"],
      ["Items", "items"]
    ];
    return fields.filter(([, key]) => JSON.stringify(previous[key] ?? "") !== JSON.stringify(next[key] ?? ""))
      .map(([label]) => label);
  }

  async function saveOrder(event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (orderFormSnapshot && currentOrderFormSnapshot() === orderFormSnapshot) {
      showToast("This order has already been saved.");
      const savedOrder = orders.find((order) => order.id === editingId && !order.deletedAt);
      if (savedOrder) openPrintPreview(savedOrder, "overview");
      return;
    }
    const order = readForm();
    const invalidItem = order.items.find((item) => {
      const quantities = item.quantities || [{ quantity: item.quantity }];
      return !item.product || !quantities.some((pair) => pair.quantity > 0);
    });
    if (!order.items.length || invalidItem) {
      showToast("Add a product and a quantity greater than zero.");
      $(".product-input", itemsBody)?.focus();
      return;
    }
    const index = orders.findIndex((entry) => entry.id === order.id && !entry.deletedAt);
    const previousOrders = orders;
    const previousOrder = index >= 0 ? orders[index] : null;
    const previousCatalog = productCatalog.map((item) => ({
      ...item,
      quantities: [...(item.quantities || [])],
      qtyItems: [...(item.qtyItems || [])],
      taken: [...(item.taken || [])],
      rQuantities: [...(item.rQuantities || [])],
      uomNs: [...(item.uomNs || [])],
      statuses: [...(item.statuses || [])]
    }));
    let catalogChanges = [];
    if (previousOrder?.catalogTakenApplied) {
      catalogChanges = applyOrderCatalogDelta(previousOrder, -1);
    }
    const orderCatalogChanges = applyOrderCatalogDelta(order, 1);
    catalogChanges = [...catalogChanges, ...orderCatalogChanges];
    const catalogChanged = catalogChanges.length > 0;
    if (catalogChanged && cloudDeployment) {
      try {
        await saveCatalogToCloud(currentCatalogData());
      } catch (error) {
        productCatalog = previousCatalog;
        indexProductCatalog();
        console.error("Could not save order quantities to the catalog.", error);
        showToast(error.message || "Could not update product quantities in the catalog.");
        return;
      }
    }
    order.catalogTakenApplied = true;
    order.history = previousOrder ? [...previousOrder.history] : [];
    if (catalogChanged) {
      const historyChanges = new Map();
      catalogChanges.forEach((change) => historyChanges.set(change.productId, change));
      const details = [...historyChanges.values()].map((change) =>
        `${change.productId}: Ordered ${formatCatalogNumber(Math.abs(change.ordered))}, ${change.movement} ${formatCatalogNumber(change.movement === "Quantity" ? change.quantity : change.taken)}, R/QUANTITY ${formatCatalogNumber(change.remaining)}, UOM/N ${formatCatalogNumber(change.uomN)}, STS ${change.status}`
      ).join("; ");
      recordOrderHistory(order, "Catalog quantities updated", details, {
        catalogChanges: orderCatalogChanges
      });
    }
    if (previousOrder) {
      const changedFields = changedOrderFields(previousOrder, order);
      if (changedFields.length) recordOrderHistory(order, "Order updated", `Changed: ${changedFields.join(", ")}.`);
    } else recordOrderHistory(order, "Order created", "Order saved.");
    orders = [...orders];
    if (index >= 0) orders[index] = order;
    else orders.push(order);
    if (!await persistOrders(order)) {
      orders = previousOrders;
      if (catalogChanged) {
        productCatalog = previousCatalog;
        indexProductCatalog();
        try {
          await saveCatalogToCloud(currentCatalogData());
        } catch (error) {
          console.error("Could not restore the catalog after the order save failed.", error);
        }
      }
      return;
    }
    if (catalogChanged) {
      renderProductCatalogOptions();
      refreshPreview();
    }
    orderFormSnapshot = currentOrderFormSnapshot();
    renderOverview();
    showToast(index >= 0 ? "Order updated successfully." : "Order saved successfully.");
    editingId = order.id;
    refreshPreview();
    openPrintPreview(order, "overview");
  }

  async function changeStatus(id) {
    const order = orders.find((entry) => entry.id === id);
    if (!order || order.deletedAt) return;
    const statuses = ["Open", "In progress", "Completed"];
    const previousStatus = order.status;
    const nextStatus = statuses[(statuses.indexOf(order.status) + 1) % statuses.length];
    const updatedOrder = { ...order, status: nextStatus, history: [...order.history] };
    recordOrderHistory(updatedOrder, "Status changed", `${previousStatus} → ${nextStatus}.`);
    const index = orders.indexOf(order);
    const previousOrders = orders;
    orders = [...orders];
    orders[index] = updatedOrder;
    if (!await persistOrders(updatedOrder)) {
      orders = previousOrders;
      return;
    }
    renderOverview();
    renderAllOrders();
    showToast(`${updatedOrder.id} marked ${updatedOrder.status.toLowerCase()}.`);
  }

  async function deleteOrder(id) {
    const order = orders.find((entry) => entry.id === id);
    if (!order || order.deletedAt) return;
    if (!window.confirm(`Delete order ${order.id} for ${order.customer}? Its catalog changes and history will be deleted.`)) return;
    const previousCatalog = productCatalog.map((item) => ({
      ...item,
      quantities: [...(item.quantities || [])],
      qtyItems: [...(item.qtyItems || [])],
      taken: [...(item.taken || [])],
      rQuantities: [...(item.rQuantities || [])],
      uomNs: [...(item.uomNs || [])],
      statuses: [...(item.statuses || [])]
    }));
    const catalogChanges = order.catalogTakenApplied
      ? applyOrderCatalogDelta(order, -1)
      : [];
    const deletedOrder = { ...order, deletedAt: Date.now(), history: [] };
    if (catalogChanges.length && cloudDeployment) {
      try {
        await saveCatalogToCloud(currentCatalogData());
      } catch (error) {
        productCatalog = previousCatalog;
        indexProductCatalog();
        console.error("Could not restore catalog quantities for the deleted order.", error);
        showToast(error.message || "Could not undo the catalog quantities for this transfer.");
        return;
      }
    }
    const index = orders.indexOf(order);
    const previousOrders = orders;
    orders = [...orders];
    orders[index] = deletedOrder;
    if (!await persistOrders(deletedOrder)) {
      orders = previousOrders;
      if (catalogChanges.length) {
        productCatalog = previousCatalog;
        indexProductCatalog();
        try {
          await saveCatalogToCloud(currentCatalogData());
        } catch (error) {
          console.error("Could not restore catalog quantities after deletion failed.", error);
        }
      }
      return;
    }
    if (catalogChanges.length) {
      renderProductCatalogOptions();
      refreshPreview();
    }
    renderOverview();
    renderAllOrders();
    renderHistory();
    showToast(`${order.id} deleted. Its history was also deleted.`);
  }

  function handleAction(action) {
    if (action === "new-order") openNewOrder();
    if (action === "all-orders") setView("orders");
    if (action === "cancel-order" && confirmDiscardUnsavedOrder()) { resetForm(); setView("overview"); }
  }

  $$("[data-action]").forEach((button) => button.addEventListener("click", () => handleAction(button.dataset.action)));
  $("#app-back-button").addEventListener("click", navigateBack);
  function setMobileNavigationOpen(open) {
    const shell = $("#app-shell");
    const toggle = $("#mobile-menu-toggle");
    const backdrop = $("#mobile-nav-backdrop");
    shell.classList.toggle("mobile-nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    backdrop.hidden = !open;
    document.body.classList.toggle("mobile-nav-open", open);
  }
  function closeMobileNavigation() {
    setMobileNavigationOpen(false);
  }
  $("#mobile-menu-toggle").addEventListener("click", () => {
    setMobileNavigationOpen(!$("#app-shell").classList.contains("mobile-nav-open"));
  });
  $("#mobile-nav-backdrop").addEventListener("click", closeMobileNavigation);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && $("#app-shell").classList.contains("mobile-nav-open")) {
      closeMobileNavigation();
      $("#mobile-menu-toggle").focus();
    }
  });
  $$("[data-order-sort]").forEach((header) => {
    header.tabIndex = 0;
    header.addEventListener("click", () => {
      orderSort = { key: header.dataset.orderSort, direction: "asc" };
      renderOverview();
      renderAllOrders();
    });
    header.addEventListener("dblclick", () => {
      orderSort = { key: header.dataset.orderSort, direction: "desc" };
      renderOverview();
      renderAllOrders();
    });
    header.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      orderSort = { key: header.dataset.orderSort, direction: "asc" };
      renderOverview();
      renderAllOrders();
    });
  });
  updateOrderSortHeaders();
  $$("[data-view]").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    setView(link.dataset.view);
  }));
  $("#history-search").addEventListener("input", renderHistory);
  $("#transfer-history-search").addEventListener("input", renderTransferHistory);
  $("#transfer-history-date").addEventListener("change", renderTransferHistory);
  $("#transfer-history-clear-date").addEventListener("click", () => {
    $("#transfer-history-date").value = "";
    renderTransferHistory();
  });
  $("#item-history-search").addEventListener("input", () => {
    itemHistoryProductFilter = "";
    renderItemHistory();
  });
  $("#history-show-all").addEventListener("click", () => {
    historyOrderFilter = "";
    $("#history-search").value = "";
    renderHistory();
  });
  $("#user-form").addEventListener("submit", saveWorkspaceUser);
  $("#users-refresh").addEventListener("click", loadWorkspaceUsers);
  $("#cancel-user-edit").addEventListener("click", resetManagedUserForm);
  $$("[data-category]").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.category === "Converter" && $("#new-order-view").classList.contains("active")) {
      converterPinnedOpen = true;
      updateConverterVisibility();
      $("#converter-panel").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    openNewOrder(button.dataset.category);
  }));
  $("#upload-order-pdf").addEventListener("click", () => $("#order-pdf-file").click());
  $("#upload-order-pdf-form").addEventListener("click", () => $("#order-pdf-file").click());
  $("#export-data").addEventListener("click", exportLocalBackup);
  $("#import-data").addEventListener("click", () => $("#data-backup-file").click());
  $("#data-backup-file").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) importOnlineBackup(file);
    event.target.value = "";
  });
  $("#save-driver").addEventListener("click", saveDriver);
  $("#order-driver").addEventListener("input", fillSavedDriverPhone);
  $("#order-driver").addEventListener("change", fillSavedDriverPhone);
  $("#order-pdf-file").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) importOrderPdf(file);
    event.target.value = "";
  });
  $("#add-item").addEventListener("click", () => createItemRow());
  $("#converter-mode").addEventListener("change", updateConverter);
  $("#converter-area").addEventListener("input", updateConverter);
  $("#add-conversion").addEventListener("click", addConversionToOrder);
  $("#toggle-converter").addEventListener("click", () => {
    converterPinnedOpen = !converterPinnedOpen;
    updateConverterVisibility();
    if (converterPinnedOpen) $("#converter-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  itemsBody.addEventListener("input", (event) => {
    if (event.target.matches(".product-input")) applyCatalogUnit(event.target);
    if (event.target.matches(".ordered-input")) calculateOrderedQuantity(event.target.closest("tr"));
    if (event.target.matches(".quantity-input")) {
      const row = event.target.closest("tr");
      const index = $$(".quantity-input", row).indexOf(event.target);
      const autoValues = JSON.parse(row.dataset.autoCalculatedValues || "[]");
      if (event.target.value !== autoValues[index]) {
        delete row.dataset.autoCalculated;
        delete row.dataset.autoCalculatedValues;
      }
    }
    updateItems();
  });
  itemsBody.addEventListener("change", (event) => {
    if (event.target.matches(".product-input")) applyCatalogUnit(event.target);
    if (event.target.matches(".ordered-input, .qty-item-input")) calculateOrderedQuantity(event.target.closest("tr"));
    updateItems();
  });
  itemsBody.addEventListener("click", (event) => {
    const indexButton = event.target.closest(".item-index-button");
    if (indexButton) {
      $$(".conversion-insertion-target", itemsBody).forEach((row) => row.classList.remove("conversion-insertion-target"));
      indexButton.closest("tr").classList.add("conversion-insertion-target");
      updateItemIndexes();
      showToast(`Converted items will be added after item ${$$("tr", itemsBody).indexOf(indexButton.closest("tr")) + 1}.`);
      return;
    }
    const button = event.target.closest(".remove-item");
    if (!button) return;
    if (itemsBody.children.length === 1) {
      const row = itemsBody.firstElementChild;
      row.classList.remove("conversion-insertion-target");
      $$(".item-input", row).forEach((input) => { input.value = input.tagName === "SELECT" ? units[0] : ""; });
    } else button.closest("tr").remove();
    updateItemIndexes();
    updateItems();
  });
  form.addEventListener("input", refreshPreview);
  form.addEventListener("change", (event) => {
    refreshPreview();
    if (event.target === $("#category-select")) updateConverterVisibility();
  });
  form.addEventListener("submit", saveOrder);
  $("#invite-signup-form").addEventListener("submit", finishInvitedSignup);
  $("#profile-form").addEventListener("submit", saveOwnProfile);
  $("#profile-cancel").addEventListener("click", () => setView("overview"));
   $("#account-avatar").addEventListener("click", () => setView("profile"));
   $("#sidebar-account-profile").addEventListener("click", () => setView("profile"));
  $("#profile-avatar-file").addEventListener("change", (event) => {
    const file = event.target.files[0];
    const preview = $("#profile-avatar-preview");
    try {
      validateAvatarFile(file);
      if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
      profilePreviewUrl = file ? URL.createObjectURL(file) : "";
      const url = profilePreviewUrl || getProfileAvatarUrl(cloudUser);
      preview.hidden = !url;
      if (url) preview.src = url;
      else preview.removeAttribute("src");
    } catch (error) {
      event.target.value = "";
      resetProfilePreview();
      $("#profile-status").textContent = error.message;
      $("#profile-status").classList.add("error");
    }
  });
  $("#auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = $("#auth-submit");
    submit.disabled = true;
    setAuthStatus("Signing in…");
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: $("#auth-email").value.trim(),
        password: $("#auth-password").value
      });
      if (error) throw error;
      if (!data.user) throw new Error("Supabase did not return a signed-in user.");
      await activateCloudSession(data.user);
    } catch (error) {
      console.error("Could not sign in to the online workspace.", error);
      setAuthStatus(error.message || "Could not sign in.", true);
    } finally {
      submit.disabled = false;
    }
  });
  $("#sign-out").addEventListener("click", async () => {
    if (!supabaseClient) return;
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      console.error("Could not sign out of the online workspace.", error);
      showToast(`Could not sign out: ${error.message}`);
      return;
    }
    lockCloudApp();
  });
  $("#print-order").addEventListener("click", () => {
    if (!form.reportValidity()) return;
    const order = readForm();
    const invalidItem = order.items.find((item) => {
      const quantities = item.quantities || [{ quantity: item.quantity }];
      return !item.product || !quantities.some((pair) => pair.quantity > 0);
    });
    if (!order.items.length || invalidItem) {
      showToast("Add a product and a quantity greater than zero.");
      $(".product-input", itemsBody)?.focus();
      return;
    }
    openPrintPreview(order, "new-order");
  });
  $("#previous-order").addEventListener("click", () => navigateOrder(-1));
  $("#next-order").addEventListener("click", () => navigateOrder(1));
  $("#back-from-preview").addEventListener("click", closePrintPreview);
  $("#preview-receipt").addEventListener("click", () => setPrintLayout("receipt"));
  $("#preview-full-page").addEventListener("click", () => setPrintLayout("full-page"));
  $("#take-receipt-screenshot").addEventListener("click", () => {
    takeReceiptScreenshot()
      .then(() => showToast("Receipt copied. Paste it into your PDF with Ctrl+V."))
      .catch((error) => {
        console.error("Could not take the receipt screenshot.", error);
        showToast(error.name === "NotAllowedError"
          ? "Firefox blocked clipboard access. Allow clipboard access for this page, then try again."
          : error.message || "Could not copy the receipt. Allow clipboard access in Firefox and try again.");
      });
  });
  $("#print-order-now").addEventListener("click", printOrderNow);
  $("#download-pdf").addEventListener("click", () => downloadOrderPdf());
  $("#upload-workbook").addEventListener("click", () => $("#workbook-file").click());
  $("#workbook-file").addEventListener("change", (event) => {
    const file = event.target.files[0];
    event.target.value = "";
    uploadWorkbook(file);
  });
  $("#add-catalog-product").addEventListener("click", beginCatalogAdd);
  $("#export-catalog").addEventListener("click", exportCatalogToExcel);
  $("#catalog-edit-form").addEventListener("submit", saveCatalogEdit);
  $("#catalog-edit-cancel").addEventListener("click", closeCatalogEdit);
  $("#catalog-adjust-form").addEventListener("submit", saveCatalogAdjustment);
  $("#catalog-adjust-cancel").addEventListener("click", closeCatalogAdjustment);
  $("#returned-tile-form").addEventListener("submit", saveReturnedTile);
  $("#cancel-returned-tile-edit").addEventListener("click", closeReturnedTileEdit);
  $("#returned-tiles-search").addEventListener("input", renderReturnedTiles);
  $("#import-returned-tiles").addEventListener("click", () => $("#returned-tiles-file").click());
  $("#returned-tiles-file").addEventListener("change", (event) => {
    const file = event.target.files[0];
    event.target.value = "";
    importReturnedTiles(file);
  });
  ["quantities", "taken", "qty-items"].forEach((field) => {
    $(`#catalog-edit-${field}`).addEventListener("input", updateCatalogDerivedFields);
  });
  $("#order-search").addEventListener("input", renderAllOrders);
  $("#status-filter").addEventListener("change", renderAllOrders);
  $("#order-date-filter").addEventListener("change", renderAllOrders);
  $("#catalog-search").addEventListener("input", renderProductCatalogTable);
  $("#catalog-filter-apply").addEventListener("click", applyCatalogFilterPanel);
  $("#catalog-filter-cancel").addEventListener("click", cancelCatalogFilterPanel);
  $$("[data-catalog-filter-operator]").forEach((operator) => {
    operator.addEventListener("change", () => {
      const second = $(`[data-catalog-filter-second='${operator.dataset.catalogFilterOperator}']`);
      if (second) second.hidden = operator.value !== "between";
    });
  });
  $("#catalog-preview-close").addEventListener("click", closeCatalogPreview);
  $("#catalog-preview").addEventListener("click", (event) => {
    if (event.target.id === "catalog-preview") closeCatalogPreview();
  });
  $$("[data-catalog-filter]").forEach((filter) => {
    filter.addEventListener("input", renderProductCatalogTable);
    filter.addEventListener("change", renderProductCatalogTable);
  });
  window.addEventListener("resize", () => {
    fitProductDescriptions($("#preview-items"));
    fitProductDescriptions($("#paper-items"));
  });
  window.addEventListener("beforeunload", (event) => {
    if (!hasUnsavedOrderChanges()) return;
    event.preventDefault();
    event.returnValue = "";
  });

  function renderLoadedApp() {
    $("#app-shell").hidden = false;
    $("#auth-gate").hidden = true;
    $("#sign-out").hidden = !cloudDeployment;
    $("#users-nav-link").hidden = !cloudDeployment || !["owner", "admin"].includes(cloudRole);
    $("#account-avatar").hidden = !cloudDeployment;
    renderAccountAvatar(cloudUser);
    $("#welcome-greeting").textContent = greetingForTime();
    $("#welcome-user").textContent = usernameForUser(cloudUser);
    $("#export-data").hidden = cloudDeployment;
    $("#import-data").hidden = !cloudDeployment;
    $("#storage-description").textContent = cloudDeployment
      ? `Signed in as ${cloudUser?.email || "workspace member"}.`
      : "Your orders are saved on this device.";
    $("#today-label").textContent = new Intl.DateTimeFormat("en", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    }).format(new Date());
    renderProductCatalogOptions();
    renderSavedDrivers();
    $("#order-date").value = dateValue();
    $("#return-date").value = dateValue();
    renderReturnedTiles();
    if (!itemsBody.children.length) createItemRow();
    updateConverterVisibility();
    updateConverter();
    if (needsMoneyDataCleanup && !cloudDeployment) persistOrders();
    renderOverview();
    refreshPreview();
    if (!cloudDeployment && (location.protocol === "file:"
      || location.protocol === "http:" && ["127.0.0.1", "localhost"].includes(location.hostname))) {
      syncSourceData();
      window.setInterval(() => syncSourceData(), 3000);
    }
  }

  if (cloudDeployment) {
    initializeOnlineMode();
  } else {
    orders = loadOrders();
    drivers = loadDrivers();
    applyYesterdayOrderTransfers().finally(renderLoadedApp);
  }
})();
