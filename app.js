(() => {
  const STORAGE_KEY = "ahmed-gurey-orders-v1";
  const DRIVERS_STORAGE_KEY = "ahmed-gurey-drivers-v1";
  const THEME_STORAGE_KEY = "shaafici-order-desk-theme";
  const ACTIVE_LOCATION_KEY = "shaafici-order-desk-active-location-v1";
  const OFFLINE_CACHE_DB = "shaafici-order-desk-offline-v2";
  const OFFLINE_CACHE_STORE = "workspace";
  const OFFLINE_CACHE_KEY = "shaafici-order-desk-offline-info-v2";
  const WORKSPACE_LOCATIONS = [
    { id: "warehouse-200", name: "Warehouse 200", type: "warehouse" },
    { id: "warehouse-150", name: "Warehouse 150", type: "warehouse" },
    { id: "main-branch-store", name: "Main Branch Store", type: "store" },
    { id: "jjr-store", name: "JJR Store", type: "store" },
    { id: "idc-store", name: "IDC Store", type: "store" },
    { id: "nh-store", name: "NH Store", type: "store" },
    { id: "dum-store", name: "Dum Store", type: "store" },
    { id: "borama-store", name: "Borama Store", type: "store" },
    { id: "elec-store", name: "ELEC Store", type: "store" }
  ];
  const WORKSPACE_LOCATION_NAMES = new Map(WORKSPACE_LOCATIONS.map(({ id, name }) => [id, name]));
  const LEGACY_BRANCH_LOCATION_ALIASES = new Map([
    ["warehouse200", "warehouse-200"],
    ["warehouse200k", "warehouse-200"],
    ["wh2", "warehouse-200"],
    ["wh200", "warehouse-200"],
    ["warehouse150", "warehouse-150"],
    ["warehouse150k", "warehouse-150"],
    ["wh150", "warehouse-150"],
    ["mainbranch", "main-branch-store"],
    ["mainbranchstore", "main-branch-store"],
    ["jjr", "jjr-store"],
    ["jjrstore", "jjr-store"],
    ["idc", "idc-store"],
    ["idcstore", "idc-store"],
    ["nh", "nh-store"],
    ["nhstore", "nh-store"],
    ["dum", "dum-store"],
    ["dumstore", "dum-store"],
    ["borama", "borama-store"],
    ["boramastore", "borama-store"],
    ["elec", "elec-store"],
    ["elecstore", "elec-store"]
  ]);
  const DEFAULT_LOCATION_ID = "warehouse-200";
  function workspaceLocalStorageKey(key) {
    return cloudDeployment && cloudUser?.id
      ? `${key}:${cloudUser.id}:${activeLocationId}`
      : key;
  }
  let currentTheme = localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = currentTheme;
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
  const DEFAULT_CONVERTERS = Object.fromEntries(Object.entries(converters)
    .map(([key, value]) => [key, { ...value }]));
  const DEFAULT_GYPSUM_CONVERTERS = Object.fromEntries(Object.entries(gypsumConverters)
    .map(([key, value]) => [key, {
      ...value,
      structural: value.structural.map((item) => ({ ...item }))
    }]));
  let productCatalog = window.AHMED_GUREY_PRODUCTS;
  let catalogStockFilter = "all";
  let scheduledReportFrequency = "off";
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
  function extractCatalogCode(value) {
    const text = String(value || "");
    const match = text.match(/\[((?:[a-z]\s*)?\d+(?:\s*[/-]\s*[a-z0-9]+)*)\]/i)
      || text.match(/^\s*((?:[a-z]\s*)?\d+(?:\s*[/-]\s*[a-z0-9]+)*)\b/i);
    return match?.[1].replace(/\s+/g, "").toLocaleLowerCase() || "";
  }
  function getCatalogCodeFamily(code) {
    return String(code || "").replace(/\/\d+$/, "").toLocaleLowerCase();
  }
  const productsByName = new Map();
  const productsByPdfName = new Map();
  const productsByCode = new Map();
  const productsByCodeFamily = new Map();
  const catalogSearchText = new WeakMap();
  const catalogRemainingStock = new WeakMap();
  const catalogUomNValues = new WeakMap();
  const catalogProductIndexes = new WeakMap();
  let catalogReservationIndexOrders = null;
  let catalogReservationIndex = null;
  const TABLE_PAGE_SIZE = 20;
  const LOW_STOCK_MIN_UOM_N = 1;
  const LOW_STOCK_MAX_UOM_N = 20;
  const tablePaginationStates = new WeakMap();
  let lastSyncedVersion = "";
  let syncInProgress = false;
  let lastSyncError = "";
  const externalScriptPromises = new Map();
  let supabaseClient = null;
  let cloudUser = null;
  let cloudRole = "staff";
  let cloudDriverKey = "";
  let cloudLocationId = "";
  let activeLocationId = WORKSPACE_LOCATION_NAMES.has(localStorage.getItem(ACTIVE_LOCATION_KEY))
    ? localStorage.getItem(ACTIVE_LOCATION_KEY)
    : DEFAULT_LOCATION_ID;
  let unassignedOrders = [];
  let offlineReadOnly = false;
  let preferredOfflineUserId = "";
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
  let catalogApprovals = [];
  let returnedTiles = [];
  let returnedTilesSetupError = "";
  let editingReturnedTileId = "";
  let viewHistory = [];
  let orderFormSnapshot = "";
  function catalogNumericValues(values) {
    return (Array.isArray(values) ? values : [values])
      .map((value) => String(value ?? "").trim())
      .filter(Boolean)
      .map(Number)
      .filter(Number.isFinite);
  }

  function indexCatalogProduct(item, index = catalogProductIndexes.get(item) ?? -1) {
    const values = [
      item.product,
      ...(item.quantities || []),
      ...(item.qtyItems || []),
      ...(item.taken || []),
      ...(item.rQuantities || []),
      ...(item.uomNs || []),
      ...(item.statuses || []),
      item.unit
    ];
    catalogSearchText.set(item, values.join(" ").toLocaleLowerCase());
    const remaining = catalogNumericValues(item.rQuantities);
    catalogRemainingStock.set(item, remaining);
    catalogUomNValues.set(item, catalogNumericValues(item.uomNs));
    catalogProductIndexes.set(item, index);
  }

  function indexProductCatalog() {
    productsByName.clear();
    productsByPdfName.clear();
    productsByCode.clear();
    productsByCodeFamily.clear();
    productCatalog.forEach((item, index) => {
      indexCatalogProduct(item, index);
      const nameKey = item.product.toLocaleLowerCase();
      const pdfNameKey = cleanPdfText(item.product).toLocaleLowerCase();
      const namedMatches = productsByName.get(nameKey) || [];
      namedMatches.push(item);
      productsByName.set(nameKey, namedMatches);
      const pdfNameMatches = productsByPdfName.get(pdfNameKey) || [];
      pdfNameMatches.push(item);
      productsByPdfName.set(pdfNameKey, pdfNameMatches);
      const code = extractCatalogCode(item.product);
      if (code) {
        const matches = productsByCode.get(code) || [];
        matches.push(item);
        productsByCode.set(code, matches);
        const familyCode = getCatalogCodeFamily(code);
        const familyMatches = productsByCodeFamily.get(familyCode) || [];
        familyMatches.push(item);
        productsByCodeFamily.set(familyCode, familyMatches);
      }
    });
  }
  indexProductCatalog();
  function getCatalogProductsByCode(code) {
    const normalizedCode = String(code || "").replace(/\s+/g, "").toLocaleLowerCase();
    const exactMatches = productsByCode.get(normalizedCode) || [];
    if (exactMatches.length) return exactMatches;
    return productsByCodeFamily.get(getCatalogCodeFamily(normalizedCode)) || [];
  }
  function getCatalogMatchChoices(product) {
    const code = extractCatalogCode(product);
    const matches = getCatalogProductsByCode(code);
    return matches.length > 1 ? matches : [];
  }
  function getCatalogProductMatches(product) {
    const normalized = String(product || "").toLocaleLowerCase();
    const code = extractCatalogCode(product);
    return productsByName.get(normalized)
      || productsByPdfName.get(cleanPdfText(product).toLocaleLowerCase())
      || getCatalogProductsByCode(code)
      || [];
  }
  function sameCatalogQtyItem(left, right) {
    const leftValue = String(left ?? "").trim();
    const rightValue = String(right ?? "").trim();
    if (!leftValue || !rightValue) return false;
    const leftNumber = Number(leftValue.replace(",", "."));
    const rightNumber = Number(rightValue.replace(",", "."));
    return Number.isFinite(leftNumber) && Number.isFinite(rightNumber)
      ? leftNumber === rightNumber
      : leftValue.toLocaleLowerCase() === rightValue.toLocaleLowerCase();
  }
  function getCatalogQtyItemOptions(product) {
    return getCatalogProductMatches(product).flatMap((item) => item.qtyItems || [])
      .reduce((values, value) => {
        if (!values.some((existing) => sameCatalogQtyItem(existing, value))) values.push(String(value));
        return values;
      }, []);
  }
  function getCatalogProduct(product, qtyItem = "") {
    const matches = getCatalogProductMatches(product);
    if (String(qtyItem ?? "").trim()) {
      const selectedMatches = matches.filter((item) =>
        (item.qtyItems || []).some((value) => sameCatalogQtyItem(value, qtyItem))
      );
      return selectedMatches.length === 1 ? selectedMatches[0] : undefined;
    }
    return matches.length === 1 ? matches[0] : undefined;
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

  const CATALOG_PAGE_SIZE = TABLE_PAGE_SIZE;
  const catalogFilterFields = [
    ["product", "PRODUCT"], ["quantities", "QUANTITY"], ["qtyItems", "Q/ITEM"],
    ["taken", "TAKEN"], ["rQuantities", "R/QUANTITY"], ["uomNs", "UOM/N"],
    ["unit", "UOM"], ["statuses", "STS"]
  ];
  let catalogPage = 1;
  let catalogActionMenuCleanup = null;
  let catalogSearchFrame = 0;

  function getFilteredCatalogRows() {
    const query = $("#catalog-search").value.trim().toLocaleLowerCase();
    const filtered = [];
    for (const item of productCatalog) {
      if (query && !catalogSearchText.get(item).includes(query)) continue;
      if (!matchesCatalogStockFilter(item)) continue;
      const matchesFilters = catalogFilterFields.every(([field]) => {
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
      if (matchesFilters) filtered.push(item);
    }
    return filtered;
  }

  function remainingStockValues(item) {
    const cached = catalogRemainingStock.get(item);
    if (cached) return cached;
    const remaining = catalogNumericValues(item.rQuantities);
    catalogRemainingStock.set(item, remaining);
    return remaining;
  }

  function isCatalogLowStock(item) {
    return !isCatalogEnded(item) && catalogUomNValuesFor(item).some((value) =>
      value >= LOW_STOCK_MIN_UOM_N && value <= LOW_STOCK_MAX_UOM_N
    );
  }

  function isCatalogEnded(item) {
    const hasZeroRemaining = remainingStockValues(item).some((value) => value === 0);
    const statuses = Array.isArray(item.statuses) ? item.statuses : [item.statuses];
    return hasZeroRemaining || statuses.some((status) =>
      String(status ?? "").trim().toLocaleUpperCase() === "END"
    );
  }

  function isCatalogCritical(item) {
    return remainingStockValues(item).some((value) => value < 0);
  }

  function catalogUomNValuesFor(item) {
    const cached = catalogUomNValues.get(item);
    if (cached) return cached;
    const values = catalogNumericValues(item.uomNs);
    catalogUomNValues.set(item, values);
    return values;
  }

  function matchesCatalogStockFilter(item) {
    if (catalogStockFilter === "low-stock") return isCatalogLowStock(item);
    if (catalogStockFilter === "ended") return isCatalogEnded(item);
    if (catalogStockFilter === "critical") return isCatalogCritical(item);
    return true;
  }

  function renderProductCatalogTable({ preservePage = false } = {}) {
    catalogActionMenuCleanup?.();
    if (!preservePage) catalogPage = 1;
    const headings = $("#catalog-headings");
    if (!headings.childElementCount) {
      headings.replaceChildren(
        ...catalogFilterFields.map(([, label]) => Object.assign(document.createElement("th"), { textContent: label })),
        ...["RESERVED", "AVAILABLE"].map((label) =>
          Object.assign(document.createElement("th"), { textContent: label })),
        Object.assign(document.createElement("th"), { innerHTML: '<span class="sr-only">Actions</span>' })
      );
    }
    const filtered = getFilteredCatalogRows();
    const pageCount = Math.max(1, Math.ceil(filtered.length / CATALOG_PAGE_SIZE));
    catalogPage = Math.min(Math.max(1, catalogPage), pageCount);
    const firstItem = (catalogPage - 1) * CATALOG_PAGE_SIZE;
    const visible = filtered.slice(firstItem, firstItem + CATALOG_PAGE_SIZE);
    const reservationIndex = visible.length ? getCatalogReservationIndex() : null;
    const target = $("#catalog-products");
    target.replaceChildren(...visible.map((item, index) => {
      const productIndex = catalogProductIndexes.get(item) ?? -1;
      const row = document.createElement("tr");
      if (isCatalogLowStock(item)) row.classList.add("low-stock-row");
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
      const reserved = document.createElement("td");
      reserved.textContent = formatCatalogNumber(String(reservedQuantityFor(item, true, reservationIndex)));
      const available = document.createElement("td");
      available.textContent = formatCatalogNumber(String(availableStockAfterReservations(item, reservationIndex)));
      const uomN = document.createElement("td");
      uomN.textContent = formatCatalogValues(item.uomNs);
      const unit = document.createElement("td");
      unit.textContent = item.unit;
      const status = document.createElement("td");
      status.textContent = (item.statuses || []).join(", ") || "—";
      const actions = document.createElement("td");
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "order-action-button catalog-edit-button";
      edit.setAttribute("aria-label", "Edit product");
      edit.title = "Edit product";
      edit.textContent = "Edit";
      edit.addEventListener("click", (event) => {
        event.stopPropagation();
        beginCatalogEdit(productIndex);
      });
      const add = document.createElement("button");
      add.type = "button";
      add.className = "order-action-button catalog-add-button";
      add.setAttribute("aria-label", "Add quantity");
      add.title = "Add quantity";
      add.textContent = "Add";
      add.addEventListener("click", (event) => {
        event.stopPropagation();
        beginCatalogAdjustment(productIndex, 1);
      });
      const history = document.createElement("button");
      history.type = "button";
      history.className = "order-action-button catalog-history-button";
      history.setAttribute("aria-label", "View product history");
      history.title = "Show this product's item history";
      history.textContent = "History";
      history.addEventListener("click", (event) => {
        event.stopPropagation();
        itemHistoryProductFilter = item.product;
        $("#item-history-search").value = item.product;
        setView("item-history");
      });
      const deleteProduct = document.createElement("button");
      deleteProduct.type = "button";
      deleteProduct.className = "order-action-button catalog-delete-button";
      deleteProduct.setAttribute("aria-label", "Delete product");
      deleteProduct.title = "Delete this product from the catalog";
      deleteProduct.textContent = "Delete";
      deleteProduct.addEventListener("click", (event) => {
        event.stopPropagation();
        deleteCatalogProduct(productIndex);
      });
      const actionButtons = document.createElement("div");
      actionButtons.className = "catalog-row-action-buttons";
      actionButtons.hidden = true;
      const expand = document.createElement("button");
      expand.type = "button";
      expand.className = "catalog-row-expand-button";
      expand.setAttribute("aria-expanded", "false");
      expand.setAttribute("aria-controls", `catalog-row-actions-${index}`);
      expand.setAttribute("aria-label", `Show actions for ${item.product}`);
      expand.title = "Show product actions";
      const expandIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      expandIcon.setAttribute("class", "catalog-row-expand-icon");
      expandIcon.setAttribute("viewBox", "0 0 30 22");
      expandIcon.setAttribute("aria-hidden", "true");
      expandIcon.setAttribute("focusable", "false");
      [
        ["catalog-row-arrow-chevron-1", "M 2 2 L 9 11 L 2 20"],
        ["catalog-row-arrow-chevron-2", "M 11 2 L 18 11 L 11 20"],
        ["catalog-row-arrow-chevron-3", "M 20 2 L 27 11 L 20 20"]
      ].forEach(([className, pathData]) => {
        const chevron = document.createElementNS("http://www.w3.org/2000/svg", "path");
        chevron.setAttribute("class", `catalog-row-arrow-chevron ${className}`);
        chevron.setAttribute("d", pathData);
        expandIcon.append(chevron);
      });
      expand.append(expandIcon);
      actionButtons.id = `catalog-row-actions-${index}`;
      expand.addEventListener("click", (event) => {
        event.stopPropagation();
        const expanded = !actionButtons.hidden;
        if (expanded) {
          catalogActionMenuCleanup?.();
          return;
        }

        catalogActionMenuCleanup?.();
        actionButtons.hidden = false;
        actions.classList.add("catalog-row-actions-open");
        expand.setAttribute("aria-expanded", "true");
        expand.setAttribute("aria-label", `Hide actions for ${item.product}`);
        expand.title = "Hide product actions";

        const anchorBounds = actions.getBoundingClientRect();
        const menuBounds = actionButtons.getBoundingClientRect();
        const viewportPadding = 12;
        const menuGap = 5;
        const spaceBelow = window.innerHeight - anchorBounds.bottom - viewportPadding;
        const spaceAbove = anchorBounds.top - viewportPadding;
        const placeBelow = spaceBelow >= menuBounds.height + menuGap || spaceBelow >= spaceAbove;
        const proposedTop = placeBelow
          ? anchorBounds.bottom + menuGap
          : anchorBounds.top - menuBounds.height - menuGap;
        const maxTop = Math.max(viewportPadding, window.innerHeight - menuBounds.height - viewportPadding);
        const left = Math.min(
          Math.max(viewportPadding, anchorBounds.right - menuBounds.width),
          Math.max(viewportPadding, window.innerWidth - menuBounds.width - viewportPadding)
        );
        actionButtons.style.top = `${Math.min(Math.max(viewportPadding, proposedTop), maxTop)}px`;
        actionButtons.style.left = `${left}px`;

        const closeOnViewportChange = (changeEvent) => {
          if (changeEvent.type === "scroll" && actionButtons.contains(changeEvent.target)) return;
          catalogActionMenuCleanup?.();
        };
        const closeMenu = () => {
          window.removeEventListener("scroll", closeOnViewportChange, true);
          window.removeEventListener("resize", closeOnViewportChange);
          actionButtons.hidden = true;
          actionButtons.style.removeProperty("top");
          actionButtons.style.removeProperty("left");
          actions.classList.remove("catalog-row-actions-open");
          expand.setAttribute("aria-expanded", "false");
          expand.setAttribute("aria-label", `Show actions for ${item.product}`);
          expand.title = "Show product actions";
          if (catalogActionMenuCleanup === closeMenu) catalogActionMenuCleanup = null;
        };
        catalogActionMenuCleanup = closeMenu;
        window.addEventListener("scroll", closeOnViewportChange, true);
        window.addEventListener("resize", closeOnViewportChange);
      });
      if (!cloudDeployment || ["owner", "admin"].includes(cloudRole)) actionButtons.append(edit);
      actionButtons.append(add, history);
      if (!cloudDeployment || ["owner", "admin"].includes(cloudRole)) actionButtons.append(deleteProduct);
      actions.append(actionButtons);
      actions.append(expand);
      row.append(product, quantity, qtyItem, taken, rQuantity, uomN, unit, status, reserved, available, actions);
      return row;
    }));
    labelTableRows(target);
    $("#catalog-view-count").textContent = filtered.length.toLocaleString("en");
    const showing = visible.length;
    const firstShown = filtered.length ? firstItem + 1 : 0;
    const lastShown = firstItem + showing;
    $("#catalog-results-status").textContent = filtered.length
      ? `Showing ${firstShown.toLocaleString("en")}–${lastShown.toLocaleString("en")} of ${filtered.length.toLocaleString("en")} products`
      : "";
    $("#catalog-page-status").textContent = `Page ${catalogPage.toLocaleString("en")} of ${pageCount.toLocaleString("en")}`;
    $("#catalog-page-first").disabled = catalogPage <= 1;
    $("#catalog-page-previous").disabled = catalogPage <= 1;
    $("#catalog-page-next").disabled = catalogPage >= pageCount;
    $("#catalog-page-last").disabled = catalogPage >= pageCount;
    $("#catalog-page-controls").hidden = filtered.length === 0;
    const stockFilterDetails = {
      all: {
        title: "Product catalog",
        description: "Products and quantities loaded from the warehouse Excel workbook."
      },
      "low-stock": {
        title: "Low-stock products",
        description: "Products with UOM/N from 1 through 20, excluding ended products.",
        filterLabel: "Showing only non-ended products with UOM/N values from 1 through 20"
      },
      ended: {
        title: "Ended products",
        description: "Products with R/QUANTITY 0 or STS END.",
        filterLabel: "Showing only products with R/QUANTITY 0 or STS END"
      },
      critical: {
        title: "Critical condition products",
        description: "Products with negative R/QUANTITY values.",
        filterLabel: "Showing only products with negative R/QUANTITY values"
      }
    };
    const stockFilter = stockFilterDetails[catalogStockFilter] || stockFilterDetails.all;
    $("#catalog-title").textContent = stockFilter.title;
    $("#catalog-view .page-heading .welcome-copy").textContent = stockFilter.description;
    $("#breadcrumb-current").textContent = stockFilter.title;
    $("#catalog-overview-filter").hidden = catalogStockFilter === "all";
    if (catalogStockFilter !== "all") {
      $("#catalog-overview-filter-label").textContent = stockFilter.filterLabel;
    }
    $("#catalog-empty").hidden = filtered.length > 0;
  }

  function scheduleCatalogSearchRender() {
    catalogPage = 1;
    if (catalogSearchFrame) window.cancelAnimationFrame(catalogSearchFrame);
    catalogSearchFrame = window.requestAnimationFrame(() => {
      catalogSearchFrame = 0;
      renderProductCatalogTable({ preservePage: true });
    });
  }

  async function deleteCatalogProduct(index) {
    if (cloudDeployment && !["owner", "admin"].includes(cloudRole)) {
      showToast("Only workspace admins can delete catalog products.");
      return;
    }
    if (!cloudUser || !supabaseClient) {
      showToast("Sign in to delete catalog products.");
      return;
    }
    const item = productCatalog[index];
    if (!item) return;
    if (!window.confirm(`Delete "${item.product}" from the catalog? Existing orders and item history will be kept.`)) return;

    const currentIndex = productCatalog.indexOf(item);
    if (currentIndex < 0) {
      showToast("This product is no longer in the catalog. Refresh and try again.");
      return;
    }
    const previousProducts = productCatalog;
    const previousHistory = catalogEditHistory;
    const historyEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
      product: item.product,
      previousProduct: item.product,
      actor: usernameForUser(cloudUser),
      actorEmail: String(cloudUser.email || "").trim(),
      changes: [{ field: "Product / description", before: item.product, after: "Deleted from catalog" }]
    };
    productCatalog = productCatalog.filter((product) => product !== item);
    catalogEditHistory = [...catalogEditHistory, historyEntry];
    try {
      await saveCatalogToCloud(currentCatalogData());
      indexProductCatalog();
      renderProductCatalogOptions();
      renderCatalogFilterOptions();
      renderProductCatalogTable();
      renderItemHistory();
      refreshPreview();
      showToast("Product deleted from the catalog. Existing orders and item history were kept.");
    } catch (error) {
      productCatalog = previousProducts;
      catalogEditHistory = previousHistory;
      indexProductCatalog();
      renderProductCatalogOptions();
      renderCatalogFilterOptions();
      renderProductCatalogTable();
      console.error("Could not delete the catalog product.", error);
      showToast(error.message || "Could not delete the catalog product.");
    }
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
    const container = tbody.closest(".table-view-container");
    const pagination = container && tablePaginationStates.get(container);
    if (pagination) pagination.page = 1;
    refreshTablePagination(tbody);
  }

  function refreshTablePagination(tbody) {
    const container = tbody.closest(".table-view-container");
    const state = container && tablePaginationStates.get(container);
    if (!state) return;
    const rows = [...tbody.rows].filter((row) => !row.classList.contains("catalog-row-details"));
    const pageCount = Math.max(1, Math.ceil(rows.length / TABLE_PAGE_SIZE));
    state.page = Math.min(Math.max(1, state.page), pageCount);
    container.dataset.tablePage = String(state.page);
    const firstRow = (state.page - 1) * TABLE_PAGE_SIZE;
    rows.forEach((row, index) => {
      const pageHidden = index < firstRow || index >= firstRow + TABLE_PAGE_SIZE;
      if (pageHidden) row.dataset.pageHidden = "true";
      else delete row.dataset.pageHidden;
      const detailsRow = row.nextElementSibling;
      if (detailsRow?.classList.contains("catalog-row-details")) {
        if (pageHidden) detailsRow.dataset.pageHidden = "true";
        else delete detailsRow.dataset.pageHidden;
      }
    });
    state.status.textContent = rows.length
      ? `Page ${state.page} of ${pageCount} · ${rows.length.toLocaleString("en")} rows`
      : "No rows";
    state.previous.disabled = state.page <= 1;
    state.next.disabled = state.page >= pageCount;
    state.controls.hidden = rows.length === 0;
  }

  function addTablePagination(container, tableScroll, tbody) {
    if (!tbody || ["catalog-products", "recent-orders"].includes(tbody.id)) return;
    const controls = document.createElement("nav");
    controls.className = "table-pagination";
    controls.setAttribute("aria-label", "Table pages");
    const previous = document.createElement("button");
    previous.type = "button";
    previous.className = "table-pagination-arrow";
    previous.setAttribute("aria-label", "Previous page");
    previous.textContent = "‹";
    const status = document.createElement("span");
    status.className = "table-pagination-status";
    const next = document.createElement("button");
    next.type = "button";
    next.className = "table-pagination-arrow";
    next.setAttribute("aria-label", "Next page");
    next.textContent = "›";
    const state = { page: 1, controls, previous, next, status };
    tablePaginationStates.set(container, state);
    new MutationObserver(() => {
      state.page = 1;
      refreshTablePagination(tbody);
    }).observe(tbody, { childList: true });
    previous.addEventListener("click", () => {
      state.page -= 1;
      refreshTablePagination(tbody);
    });
    next.addEventListener("click", () => {
      state.page += 1;
      refreshTablePagination(tbody);
    });
    controls.append(previous, status, next);
    container.insertBefore(controls, tableScroll.nextSibling);
    refreshTablePagination(tbody);
  }

  function createTableViewIcon(view) {
    const namespace = "http://www.w3.org/2000/svg";
    const icon = document.createElementNS(namespace, "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    if (view === "table") {
      icon.innerHTML = '<rect x="4" y="5" width="16" height="14" rx="1"></rect><path d="M4 10h16M10 10v9"></path>';
    } else {
      icon.innerHTML = '<path d="M5 6h14M5 12h14M5 18h14"></path>';
    }
    return icon;
  }

  function setColorTheme(theme, persist = false) {
    currentTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = currentTheme;
    const isDark = currentTheme === "dark";
    const themeToggle = $("#theme-toggle");
    const label = `Switch to ${isDark ? "light" : "dark"} mode`;
    themeToggle.setAttribute("aria-label", label);
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.title = label;
    $("#theme-toggle-icon").textContent = isDark ? "☀" : "☾";
    $$(".theme-aware-logo").forEach((logo) => {
      logo.src = isDark ? logo.dataset.darkSrc : logo.dataset.lightSrc;
    });
    const themeColor = $('meta[name="theme-color"]');
    themeColor.content = isDark ? "#111a14" : "#f5f6f2";
    if (persist) localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
  }

  function setupTableViewControls() {
    $$(".table-scroll").forEach((tableScroll, index) => {
      const table = $("table", tableScroll);
      if (!table) return;
      const container = tableScroll.parentElement;
      if (!container || $(".table-view-controls", container)) return;
      const tableBody = $("tbody", table);
      const tableKey = tableBody?.id || table.id || `table-${index + 1}`;
      const storageKey = `shaafici-order-desk-table-view-${encodeURIComponent(tableKey)}`;
      const savedView = localStorage.getItem(storageKey);
      let currentView = savedView === "cards" ? "cards" : "table";

      container.classList.add("table-view-container");
      container.dataset.tableView = currentView;

      const controls = document.createElement("div");
      controls.className = "table-view-controls";
      controls.setAttribute("role", "group");
      controls.setAttribute("aria-label", "Choose table display");

      [["table", "Show the full table"], ["cards", "Show stacked cards"]].forEach(([view, label]) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "table-view-button";
        button.dataset.tableView = view;
        button.setAttribute("aria-label", label);
        button.title = label;
        button.setAttribute("aria-pressed", String(currentView === view));
        button.append(createTableViewIcon(view));
        button.addEventListener("click", () => {
          currentView = view;
          localStorage.setItem(storageKey, view);
          container.dataset.tableView = view;
          $$("button[data-table-view]", controls).forEach((viewButton) => {
            viewButton.setAttribute("aria-pressed", String(viewButton.dataset.tableView === currentView));
          });
        });
        controls.append(button);
      });

      container.insertBefore(controls, tableScroll);
      addTablePagination(container, tableScroll, tableBody);
    });
  }

  function openCatalogPreview(item) {
    const reservationIndex = getCatalogReservationIndex();
    const details = [
      ["Product", item.product],
      ["Quantity", formatCatalogValues(item.quantities)],
      ["Q/ITEM", formatCatalogValues(item.qtyItems)],
      ["Taken", formatCatalogValues(item.taken)],
      ["R/QUANTITY", formatCatalogValues(item.rQuantities)],
      ["Reserved", formatCatalogNumber(String(reservedQuantityFor(item, true, reservationIndex)))],
      ["Available after reservations", formatCatalogNumber(String(availableStockAfterReservations(item, reservationIndex)))],
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
    if (cloudDeployment && cloudRole === "staff") {
      $("#catalog-edit-status").textContent = "Staff must request admin approval for catalog stock changes.";
      $("#catalog-edit-status").classList.add("error");
      return;
    }
    if (!cloudUser || !supabaseClient) {
      $("#catalog-edit-status").textContent = "Sign in to save catalog changes.";
      $("#catalog-edit-status").classList.add("error");
      return;
    }
    const product = $("#catalog-edit-product").value.trim();
    const unit = $("#catalog-edit-unit").value.trim();
    const qtyItems = splitCatalogValues($("#catalog-edit-qty-items").value);
    const duplicate = productCatalog.some((item, index) => {
      if (index === editingCatalogIndex || item.product.toLocaleLowerCase() !== product.toLocaleLowerCase()) return false;
      const existingQtyItems = item.qtyItems || [];
      return !qtyItems.length || !existingQtyItems.length
        || qtyItems.some((value) => existingQtyItems.some((existing) => sameCatalogQtyItem(existing, value)));
    });
    if (!unit) {
      $("#catalog-edit-status").textContent = "Select at least one UOM.";
      $("#catalog-edit-status").classList.add("error");
      return;
    }
    if (duplicate) {
      $("#catalog-edit-status").textContent = "A product with this description already uses one of those Q/ITEM values.";
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
      qtyItems,
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
      actor: usernameForUser(cloudUser),
      actorEmail: String(cloudUser.email || "").trim(),
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
    const sourceLocations = [...new Set([
      "Partners/Vendors",
      ...orders.map((order) => String(order.branch || "").trim()),
      ...returnedTiles.map((entry) => String(entry.branch || "").trim()),
      ...catalogAdjustments.map((entry) => String(entry.fromLocation || "").trim())
    ].filter(Boolean))].sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
    const fromSelect = $("#catalog-adjust-from");
    fromSelect.replaceChildren(
      ...sourceLocations.map((location) => new Option(location, location)),
      new Option("Other location…", "__other__")
    );
    fromSelect.value = sourceLocations.includes("Partners/Vendors") ? "Partners/Vendors" : sourceLocations[0];
    $("#catalog-adjust-other-from").value = "";
    $("#catalog-adjust-other-from-field").hidden = true;
    $("#catalog-adjust-other-from").required = false;
    $("#catalog-adjust-from-field").hidden = direction < 0;
    $("#catalog-adjust-to-field").hidden = direction < 0;
    $("#catalog-adjust-from").required = direction > 0;
    $("#catalog-adjust-reason").value = "";
    $("#catalog-adjust-request-approval").checked = cloudDeployment && cloudRole === "staff";
    $("#catalog-adjust-request-approval").disabled = cloudDeployment && cloudRole === "staff";
    $("#catalog-adjust-request-approval").closest(".field").hidden = !cloudDeployment || cloudRole !== "staff";
    $("#catalog-adjust-status").textContent = "";
    $("#catalog-adjust-status").classList.remove("error");
    $("#catalog-adjust-amount").focus();
    $("#catalog-adjust-form").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectedCatalogAdjustmentSource() {
    const selected = $("#catalog-adjust-from").value;
    return selected === "__other__"
      ? $("#catalog-adjust-other-from").value.trim()
      : selected;
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
    const fromLocation = direction > 0 ? selectedCatalogAdjustmentSource() : "WH2/Warehouse 200k";
    const toLocation = direction > 0 ? "WH2/Warehouse 200k" : "Manual adjustment";
    const quantity = Number(item.quantities?.[0]);
    if (!item || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(direction)
      || !Number.isFinite(quantity) || !date || !reason || !fromLocation) {
      if (direction > 0 && !fromLocation) {
        $("#catalog-adjust-status").textContent = "Choose or enter a source location.";
        $("#catalog-adjust-status").classList.add("error");
      }
      return;
    }
    if (cloudRole === "staff") {
      const request = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        timestamp: Date.now(),
        product: item.product,
        amount: amount * direction,
        date,
        fromLocation,
        toLocation,
        reason,
        unit: item.unit || "—",
        requestedBy: usernameForUser(cloudUser),
        requestedById: cloudUser.id,
        status: "pending"
      };
      catalogApprovals = [...catalogApprovals, request];
      try {
        await saveCatalogToCloud(currentCatalogData(), false);
        renderApprovalRequests();
        closeCatalogAdjustment();
        showToast("Stock adjustment request sent to an admin; stock has not changed.");
      } catch (error) {
        catalogApprovals = catalogApprovals.filter((entry) => entry.id !== request.id);
        console.error("Could not save stock adjustment request.", error);
        $("#catalog-adjust-status").textContent = error.message || "Could not submit the request.";
        $("#catalog-adjust-status").classList.add("error");
      }
      return;
    }
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
      previousQuantity: quantity,
      updatedQuantity: nextQuantity,
      actor: usernameForUser(cloudUser),
      actorEmail: String(cloudUser.email || "").trim(),
      reason,
      fromLocation,
      toLocation,
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

  function normalizeReturnedTileBranch(value) {
    const branch = String(value || "").trim();
    const aliases = { DUM: "DMQ", IDC1: "IDC", NH: "NHG" };
    return aliases[branch.toLocaleUpperCase()] || branch;
  }

  function normalizeReturnedTileDriver(value) {
    const driver = String(value || "").trim();
    const aliases = { XASSAN: "HASSAN", XUSEEN: "HUSSEIN", HUSEIN: "HUSSEIN" };
    return aliases[driver.toLocaleUpperCase()] || driver;
  }

  function renderReturnedTileSuggestions() {
    [
      ["branch", "#returned-tile-branches"],
      ["driver", "#returned-tile-drivers"]
    ].forEach(([field, selector]) => {
      const values = [...new Set(returnedTiles
        .map((entry) => field === "branch"
          ? normalizeReturnedTileBranch(entry[field])
          : normalizeReturnedTileDriver(entry[field]))
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" })))];
      $(selector).replaceChildren(...values.map((value) => {
        const option = document.createElement("option");
        option.value = value;
        return option;
      }));
    });
  }

  function renderReturnedTiles() {
    renderReturnedTileSuggestions();
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
    const columnQueries = $$("[data-returned-tile-filter]")
      .map((input) => ({ index: Number(input.dataset.returnedTileFilter), query: input.value.trim().toLocaleLowerCase() }))
      .filter((filter) => filter.query);
    const valuesForEntry = (entry) => [
      entry.returnedFrom || "—",
      entry.product || "—",
      normalizeReturnedTileBranch(entry.branch) || "—",
      normalizeReturnedTileDriver(entry.driver) || "—",
      returnedTileDate(entry.returnedDate),
      formatCatalogNumber(entry.cartons),
      formatCatalogNumber(entry.firi),
      returnedTileDate(entry.deliveredDate),
      entry.returnedBy || "—",
      entry.recordedBy || "—"
    ];
    const entries = [...returnedTiles]
      .filter((entry) => [
        entry.returnedFrom, entry.product, normalizeReturnedTileBranch(entry.branch), normalizeReturnedTileDriver(entry.driver),
        entry.returnedBy, entry.recordedBy, entry.sourceNo
      ].join(" ").toLocaleLowerCase().includes(query))
      .filter((entry) => {
        const values = valuesForEntry(entry);
        return columnQueries.every(({ index, query: columnQuery }) => {
          const dateSearchValue = index === 4 ? entry.returnedDate : index === 7 ? entry.deliveredDate : "";
          return `${values[index]} ${dateSearchValue}`.toLocaleLowerCase().includes(columnQuery);
        });
      })
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
      valuesForEntry(entry).forEach((value) => {
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

  async function exportVisibleReturnedTiles() {
    const table = $(".returned-tiles-table");
    const rows = [...$("#returned-tiles").rows];
    if (!rows.length) {
      showToast("There are no visible returned tiles to export.");
      return;
    }
    try {
      const xlsx = await loadXlsxLibrary();
      const headers = [...table.tHead.rows[0].cells].map((cell) => cell.textContent.trim());
      const data = rows.map((row) => [...row.cells].map((cell) => cell.textContent.trim()));
      const worksheet = xlsx.utils.aoa_to_sheet([headers, ...data]);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, "Returned Tiles");
      xlsx.writeFile(workbook, `returned-tiles-${dateValue()}.xlsx`);
      showToast(`${rows.length.toLocaleString("en")} visible returned tiles exported.`);
    } catch (error) {
      console.error("Could not load the Excel export library.", error);
      showToast(`Excel export unavailable: ${error.message}`);
    }
  }

  function beginReturnedTileEdit(id) {
    const entry = returnedTiles.find((candidate) => candidate.id === id);
    if (!entry) return;
    editingReturnedTileId = id;
    $("#returned-tile-form-title").textContent = "Edit returned tile";
    $("#return-customer").value = entry.returnedFrom || "";
    $("#return-product").value = entry.product || "";
    $("#return-branch").value = normalizeReturnedTileBranch(entry.branch);
    $("#return-driver").value = normalizeReturnedTileDriver(entry.driver);
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
    if (offlineReadOnly) {
      status.textContent = "Offline access is read-only. Reconnect and reload before making changes.";
      status.classList.add("error");
      return;
    }
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
      locationId: existing?.locationId || activeLocationId,
      createdAt: existing?.createdAt || now,
      returnedFrom: $("#return-customer").value.trim(),
      product: $("#return-product").value.trim(),
      branch: normalizeReturnedTileBranch($("#return-branch").value),
      driver: normalizeReturnedTileDriver($("#return-driver").value),
      cartons,
      firi,
      deliveredDate: $("#return-delivered-date").value,
      returnedDate: $("#return-date").value,
      returnedBy: $("#return-returned-by").value.trim(),
      recordedBy: existing?.recordedBy || usernameForUser(cloudUser),
      ...(existing ? {
        returnEditedAt: now,
        returnEditedBy: usernameForUser(cloudUser)
      } : {})
    });
    const priorHistory = Array.isArray(existing?.history)
      ? [...existing.history]
      : existing ? [{
        timestamp: Number(existing.createdAt) || now,
        action: "Return created",
        actor: existing.recordedBy || "Unknown user",
        details: "Return saved."
      }] : [];
    priorHistory.push({
      timestamp: now,
      action: existing ? "Return edited" : "Return created",
      actor: usernameForUser(cloudUser),
      details: existing ? "Return details updated." : "Return saved."
    });
    entry.history = priorHistory;
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
          .insert({ id: entry.id, location_id: activeLocationId, data: entry })
          .select("id")
          .maybeSingle();
      if (error) throw error;
      if (!savedEntry) throw new Error("The returned-tile record was not saved. Refresh the list and try again.");
      closeReturnedTileEdit();
      status.textContent = existing
        ? "Return changes saved. Catalog stock was not changed."
        : "Return saved. Catalog stock was not changed.";
      await saveOfflineSnapshot();
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

  function returnedTileWorkbookCellText(value) {
    return value == null ? "" : String(value).trim();
  }

  function returnedTileWorkbookDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return [
        value.getFullYear(),
        String(value.getMonth() + 1).padStart(2, "0"),
        String(value.getDate()).padStart(2, "0")
      ].join("-");
    }
    if (typeof value === "number" && value > 20000 && value < 100000) {
      const date = window.XLSX.SSF.parse_date_code(value);
      if (date) {
        return [
          date.y,
          String(date.m).padStart(2, "0"),
          String(date.d).padStart(2, "0")
        ].join("-");
      }
    }
    const text = returnedTileWorkbookCellText(value);
    const match = text.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s*-\s*(\d{4})$/);
    if (!match) return text;
    const [, dayText, monthText, yearText] = match;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      : text;
  }

  async function readReturnedTileWorkbook(file) {
    const xlsx = await loadXlsxLibrary();
    const workbook = xlsx.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const worksheet = workbook.Sheets.SalesData || workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet) throw new Error("The workbook does not contain a worksheet.");
    const range = xlsx.utils.decode_range(worksheet["!ref"] || "A1:A1");
    const rows = xlsx.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: true,
      defval: "",
      blankrows: true
    });
    const aliases = {
      sourceNo: ["NO"],
      returnedFrom: ["RETURNED FROM"],
      product: ["NAME OF THE TILE"],
      branch: ["BRANCH"],
      driver: ["DRIVER", "DELIVERED DRIVER", "RETURNED DRIVER"],
      cartons: ["CARTOONS", "CARTONS", "CRT"],
      firi: ["FIRI"],
      deliveredDate: ["DELIVERED DATE"],
      returnedDate: ["RETURNED DATE"],
      returnedBy: ["DRIVER RETURNED", "RETURNED BY"],
      recordedBy: ["TRAN.CREATER", "TRAN. CREATER", "TRAN.CREATOR", "TRAN. CREATOR", "CREATED BY"]
    };
    let columns = null;
    let headerOffset = 0;
    for (let rowIndex = 0; rowIndex < Math.min(rows.length, 21); rowIndex += 1) {
      const headers = new Map(rows[rowIndex].map((value, index) => [
        returnedTileWorkbookCellText(value).toLocaleUpperCase(),
        index
      ]).filter(([name]) => name));
      const candidate = Object.fromEntries(Object.entries(aliases).map(([field, names]) => [
        field,
        names.map((name) => headers.get(name)).find((index) => index !== undefined)
      ]));
      if (candidate.returnedFrom !== undefined && candidate.product !== undefined) {
        columns = candidate;
        headerOffset = rowIndex;
        break;
      }
    }
    if (!columns) {
      throw new Error("No returned-tile data table was found. Expected RETURNED FROM and NAME OF THE TILE columns.");
    }
    const cell = (row, field) => columns[field] === undefined
      ? ""
      : row[columns[field]];
    const number = (value) => {
      const parsed = typeof value === "number" ? value : Number(returnedTileWorkbookCellText(value));
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const records = [];
    const ids = new Set();
    for (let rowIndex = headerOffset + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const product = returnedTileWorkbookCellText(cell(row, "product"));
      const returnedFrom = returnedTileWorkbookCellText(cell(row, "returnedFrom"));
      if (!product || !returnedFrom) continue;
      const sourceNo = returnedTileWorkbookCellText(cell(row, "sourceNo"))
        || `row-${range.s.r + rowIndex + 1}`;
      const locationPrefix = activeLocationId === DEFAULT_LOCATION_ID ? "" : `${activeLocationId}-`;
      const id = `return-legacy-${locationPrefix}${sourceNo}`;
      if (ids.has(id)) throw new Error(`The workbook contains duplicate return number "${sourceNo}".`);
      ids.add(id);
      records.push({
        id,
        sourceNo,
        returnedFrom,
        product,
        branch: normalizeReturnedTileBranch(returnedTileWorkbookCellText(cell(row, "branch"))),
        driver: normalizeReturnedTileDriver(returnedTileWorkbookCellText(cell(row, "driver"))),
        cartons: number(cell(row, "cartons")),
        firi: number(cell(row, "firi")),
        deliveredDate: returnedTileWorkbookDate(cell(row, "deliveredDate")),
        returnedDate: returnedTileWorkbookDate(cell(row, "returnedDate")),
        returnedBy: returnedTileWorkbookCellText(cell(row, "returnedBy")),
        recordedBy: returnedTileWorkbookCellText(cell(row, "recordedBy")),
        createdAt: 0,
        imported: true
      });
    }
    if (!records.length) throw new Error("No returned-tile records were found in the worksheet.");
    return records;
  }

  async function importReturnedTiles(file) {
    const status = $("#returned-tiles-import-status");
    status.hidden = false;
    status.classList.remove("error");
    try {
      if (offlineReadOnly) throw new Error("Offline access is read-only. Reconnect and reload before making changes.");
      if (!file) return;
      if (!cloudUser || !supabaseClient) throw new Error("Sign in before importing returned-tile history.");
      if (returnedTilesSetupError) throw new Error(returnedTilesSetupError);
      if (file.size > 25 * 1024 * 1024) throw new Error("Choose a workbook smaller than 25 MB.");
      status.textContent = "Reading returned-tile history…";
      const workbookReturns = await readReturnedTileWorkbook(file);
      if (!Array.isArray(workbookReturns) || workbookReturns.some((entry) =>
        !entry || typeof entry.product !== "string" || typeof entry.returnedFrom !== "string"
      )) {
        throw new Error("The workbook does not contain valid returned-tile rows.");
      }
      const existingById = new Map(returnedTiles.map((entry) => [entry.id, entry]));
      const imported = workbookReturns
        .filter((entry) => !existingById.has(entry.id))
        .map((entry) => ({
          ...entry,
          locationId: activeLocationId,
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
      let savedRows = 0;
      try {
        const rows = [...recorderUpdates, ...imported].map((entry) => ({
          id: entry.id,
          location_id: entry.locationId || activeLocationId,
          data: entry
        }));
        for (let offset = 0; offset < rows.length; offset += 500) {
          status.textContent = `Saving returned-tile history… ${Math.min(offset + 500, rows.length).toLocaleString("en")} of ${rows.length.toLocaleString("en")}`;
          const { error } = await supabaseClient.from("returned_tile_records")
            .upsert(rows.slice(offset, offset + 500), { onConflict: "id" });
          if (error) throw error;
          savedRows += Math.min(500, rows.length - offset);
        }
      } catch (error) {
        returnedTiles = previousEntries;
        if (savedRows) {
          throw new Error(`Import paused after saving ${savedRows.toLocaleString("en")} records. Re-import the workbook to continue. ${error.message}`);
        }
        throw error;
      }
      const messages = [];
      if (imported.length) messages.push(`Imported ${imported.length.toLocaleString("en")} return records`);
      if (recorderUpdates.length) {
        messages.push(`loaded recorder names for ${recorderUpdates.length.toLocaleString("en")} existing returns`);
      }
      status.textContent = `${messages.join(" and ")}. Catalog stock was not changed.`;
      await saveOfflineSnapshot();
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

  function openOfflineCacheDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error("This browser does not support offline storage."));
        return;
      }
      const request = window.indexedDB.open(OFFLINE_CACHE_DB, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(OFFLINE_CACHE_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open offline storage."));
      request.onblocked = () => reject(new Error("Offline storage is blocked by another browser tab."));
    });
  }

  function readOfflineCacheInfo() {
    try {
      const stored = localStorage.getItem(OFFLINE_CACHE_KEY);
      if (!stored) return null;
      const info = JSON.parse(stored);
      return info && info.version === 2 && typeof info.userId === "string"
        && WORKSPACE_LOCATION_NAMES.has(info.locationId) && typeof info.email === "string"
        && Number.isFinite(info.savedAt)
        ? info
        : null;
    } catch (error) {
      console.warn("Could not read the offline workspace information.", error);
      return null;
    }
  }

  function updateOfflineAccessButton() {
    const button = $("#offline-open");
    const note = $("#offline-cache-note");
    const label = $("#offline-open-label-full");
    if (!button || !note || !label) return;
    const info = readOfflineCacheInfo();
    const available = Boolean(info && (!preferredOfflineUserId || info.userId === preferredOfflineUserId));
    button.hidden = !available;
    note.hidden = !available;
    if (available) {
      label.textContent = `Open cached workspace for ${info.email} (read-only)`;
    }
  }

  async function saveOfflineSnapshot() {
    if (!cloudDeployment || !cloudUser?.id || offlineReadOnly) return false;
    const snapshot = {
      version: 2,
      savedAt: Date.now(),
      locationId: activeLocationId,
      user: {
        id: cloudUser.id,
        email: cloudUser.email || "",
        user_metadata: cloudUser.user_metadata || {}
      },
      role: cloudRole,
      driverKey: cloudDriverKey,
      orders,
      drivers,
      unassignedOrders: cloudRole === "owner" ? unassignedOrders : [],
      catalog: cloudRole === "driver" ? null : currentCatalogData(),
      returnedTiles: cloudRole === "driver" ? [] : returnedTiles,
      returnedTilesSetupError,
      catalogApprovals: cloudRole === "driver" ? [] : catalogApprovals,
      workspaceUsers: cloudRole === "owner" ? workspaceUsers : []
    };
    let database;
    try {
      database = await openOfflineCacheDatabase();
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(OFFLINE_CACHE_STORE, "readwrite");
        transaction.objectStore(OFFLINE_CACHE_STORE).put(snapshot, `${snapshot.user.id}:${snapshot.locationId}`);
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error("Could not save the offline workspace."));
        transaction.onabort = () => reject(transaction.error || new Error("Offline workspace storage was aborted."));
      });
      localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify({
        version: 2,
        userId: snapshot.user.id,
        locationId: snapshot.locationId,
        email: snapshot.user.email,
        savedAt: snapshot.savedAt
      }));
      updateOfflineAccessButton();
      return true;
    } catch (error) {
      console.error("Could not save the read-only offline workspace.", error);
      setSyncStatus(`Offline copy unavailable — ${error.message}`, true);
      return false;
    } finally {
      database?.close();
    }
  }

  async function loadOfflineSnapshot() {
    const info = readOfflineCacheInfo();
    if (!info || preferredOfflineUserId && info.userId !== preferredOfflineUserId) {
      throw new Error("No offline copy is available for this signed-in account.");
    }
    const database = await openOfflineCacheDatabase();
    try {
      const snapshot = await new Promise((resolve, reject) => {
        const transaction = database.transaction(OFFLINE_CACHE_STORE, "readonly");
        const request = transaction.objectStore(OFFLINE_CACHE_STORE)
          .get(`${info.userId}:${info.locationId}`);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Could not read the offline workspace."));
      });
      if (!snapshot || snapshot.version !== 2 || snapshot.locationId !== info.locationId
        || snapshot.user?.id !== info.userId
        || !Number.isFinite(snapshot.savedAt) || snapshot.savedAt <= 0
        || !["owner", "admin", "staff", "driver"].includes(snapshot.role)
        || !Array.isArray(snapshot.orders) || !Array.isArray(snapshot.drivers)) {
        throw new Error("The saved offline workspace is incomplete. Connect to the internet and sign in to refresh it.");
      }
      return snapshot;
    } finally {
      database.close();
    }
  }

  async function clearOfflineSnapshot() {
    try {
      localStorage.removeItem(OFFLINE_CACHE_KEY);
    } catch (error) {
      console.error("Could not clear offline workspace information.", error);
    }
    updateOfflineAccessButton();
    if (!window.indexedDB) return;
    let database;
    try {
      database = await openOfflineCacheDatabase();
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(OFFLINE_CACHE_STORE, "readwrite");
        transaction.objectStore(OFFLINE_CACHE_STORE).clear();
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error || new Error("Could not clear the offline workspace."));
        transaction.onabort = () => reject(transaction.error || new Error("Offline workspace cleanup was aborted."));
      });
    } catch (error) {
      console.error("Could not clear the cached offline workspace.", error);
      showToast("Could not completely clear this device's offline workspace.");
    } finally {
      database?.close();
    }
  }

  function validateSyncedSourceData(data) {
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
  }

  function applySyncedSourceData(data) {
    validateSyncedSourceData(data);
    productCatalog = data.products;
    if (["off", "daily", "weekly"].includes(data.scheduledReportFrequency)) {
      scheduledReportFrequency = data.scheduledReportFrequency;
    }
    if (Array.isArray(data.adjustments)) catalogAdjustments = data.adjustments;
    if (Array.isArray(data.catalogEditHistory)) catalogEditHistory = data.catalogEditHistory;
    if (Array.isArray(data.catalogApprovals)) catalogApprovals = data.catalogApprovals;
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

  function clearCatalogForLocation() {
    productCatalog = [];
    catalogAdjustments = [];
    catalogEditHistory = [];
    catalogApprovals = [];
    scheduledReportFrequency = "off";
    Object.keys(DEFAULT_CONVERTERS).forEach((key) => {
      converters[key] = { ...DEFAULT_CONVERTERS[key] };
    });
    Object.keys(DEFAULT_GYPSUM_CONVERTERS).forEach((key) => {
      const source = DEFAULT_GYPSUM_CONVERTERS[key];
      gypsumConverters[key] = {
        ...source,
        structural: source.structural.map((item) => ({ ...item }))
      };
    });
    $("#scheduled-report-frequency").value = scheduledReportFrequency;
    window.AHMED_GUREY_PRODUCTS = productCatalog;
    indexProductCatalog();
    renderProductCatalogOptions();
    renderCatalogFilterOptions();
    renderProductCatalogTable();
    updateConverter();
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
      catalogEditHistory,
      catalogApprovals,
      lowStockThreshold: LOW_STOCK_MAX_UOM_N,
      scheduledReportFrequency
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
    if (offlineReadOnly) throw new Error("Offline access is read-only. Reconnect and reload before making changes.");
    if (!supabaseClient || !cloudUser) {
      throw new Error("Sign in to save catalog changes to the database.");
    }
    const { error } = await supabaseClient.from("workspace_catalog").upsert({
      catalog_key: "default",
      location_id: activeLocationId,
      data,
      updated_at: new Date().toISOString()
    }, { onConflict: "location_id,catalog_key" });
    if (error) throw error;
    if (syncWorkbook && activeLocationId === DEFAULT_LOCATION_ID) await syncCatalogToWorkbook(data);
    await saveOfflineSnapshot();
  }

  async function loadCatalogFromCloud() {
    const { data, error } = await supabaseClient
      .from("workspace_catalog")
      .select("data")
      .eq("catalog_key", "default")
      .eq("location_id", activeLocationId)
      .maybeSingle();
    if (error) throw error;
    if (data?.data && catalogHasWorkbookColumns(data.data)) applySyncedSourceData(data.data);
    else clearCatalogForLocation();
    return Boolean(data?.data);
  }

  function exportCatalogToExcel() {
    const headers = ["PRODUCT / DESCRIPTION", "QUANTITY", "Q/ITEM", "TAKEN", "R/QUANTITY", "UOM/N", "UOM", "STS", "RESERVED", "AVAILABLE"];
    const valueForExcel = (value) => escapeAttribute(Array.isArray(value) ? value.join(", ") : value ?? "");
    const reservationIndex = getCatalogReservationIndex();
    const rows = getFilteredCatalogRows().map((item) => [
      item.product,
      item.quantities,
      item.qtyItems,
      item.taken,
      item.rQuantities,
      item.uomNs,
      item.unit,
      item.statuses,
      reservedQuantityFor(item, true, reservationIndex),
      availableStockAfterReservations(item, reservationIndex)
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

  async function readCatalogWorkbook(file) {
    const xlsx = await loadXlsxLibrary();
    const workbook = xlsx.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    const worksheet = workbook.Sheets.SalesData || workbook.Sheets[workbook.SheetNames[0]];
    if (!worksheet) throw new Error("The workbook does not contain a worksheet.");
    const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: "" });
    const normalizeHeader = (value) => String(value ?? "").toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
    const aliases = {
      product: ["product", "description", "productdescription"],
      quantities: ["quantity", "qty"],
      qtyItems: ["qitem", "qtyitem", "quantityitem"],
      taken: ["taken"],
      rQuantities: ["rquantity", "rqty", "requiredquantity"],
      uomNs: ["uomn", "uomnumber"],
      unit: ["uom", "unit"],
      statuses: ["sts", "status"]
    };
    let columns = null;
    let headerRow = -1;
    for (let rowIndex = 0; rowIndex < Math.min(rows.length, 20); rowIndex += 1) {
      const headers = new Map(rows[rowIndex].map((value, index) => [normalizeHeader(value), index]));
      const candidate = Object.fromEntries(Object.entries(aliases).map(([field, names]) => [
        field,
        names.map((name) => headers.get(name)).find((index) => index !== undefined)
      ]));
      if (candidate.product !== undefined && candidate.quantities !== undefined) {
        columns = candidate;
        headerRow = rowIndex;
        break;
      }
    }
    if (!columns) {
      throw new Error("No catalog table was found. Include PRODUCT/DESCRIPTION and QUANTITY columns.");
    }
    const text = (value) => value == null ? "" : String(value).trim();
    const number = (value) => {
      const raw = text(value).replaceAll(",", "");
      if (!raw) return null;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const format = (value) => Number.isFinite(value) ? String(Number(value.toFixed(2))) : "";
    const catalogByProduct = new Map();
    for (const row of rows.slice(headerRow + 1)) {
      const value = (field) => columns[field] === undefined ? "" : row[columns[field]];
      const product = text(value("product"));
      if (!product) continue;
      const quantityText = text(value("quantities"));
      const qtyItemText = text(value("qtyItems"));
      const takenText = text(value("taken"));
      const sourceRemainder = text(value("rQuantities"));
      const quantity = number(quantityText);
      const taken = number(takenText);
      const qtyItem = number(qtyItemText);
      const remainder = quantity !== null && taken !== null
        ? format(quantity - taken)
        : sourceRemainder;
      const remainderNumber = number(remainder);
      const uomN = remainderNumber !== null && qtyItem !== null && qtyItem !== 0
        ? format(remainderNumber / qtyItem)
        : text(value("uomNs"));
      const entry = catalogByProduct.get(product.toLocaleLowerCase()) || {
        product,
        quantity: "",
        quantities: [],
        qtyItems: [],
        taken: [],
        rQuantities: [],
        uomNs: [],
        unit: "",
        statuses: []
      };
      const addUnique = (field, item) => {
        if (item && !entry[field].includes(item)) entry[field].push(item);
      };
      addUnique("quantities", quantityText);
      addUnique("qtyItems", qtyItemText);
      addUnique("taken", takenText);
      addUnique("rQuantities", remainder);
      addUnique("uomNs", uomN);
      addUnique("statuses", text(value("statuses")));
      const sourceUnit = text(value("unit")) || "PCS";
      if (!entry.unit || entry.unit === "PCS" && sourceUnit !== "PCS") entry.unit = sourceUnit;
      entry.quantity = entry.quantities[0] || "";
      catalogByProduct.set(product.toLocaleLowerCase(), entry);
    }
    const products = [...catalogByProduct.values()];
    if (!products.length) throw new Error("No products were found in the catalog worksheet.");
    return products;
  }

  async function uploadWorkbook(file) {
    if (offlineReadOnly) {
      setSyncStatus("Offline access is read-only. Reconnect and reload before uploading a workbook.", true);
      return;
    }
    if (!file) return;
    const fileApp = location.protocol === "file:";
    const localServer = fileApp || location.protocol === "http:" && ["127.0.0.1", "localhost"].includes(location.hostname);
    if (!cloudUser || !supabaseClient || !["owner", "admin"].includes(cloudRole)) {
      setSyncStatus("Sign in as an owner or admin before uploading a catalog.", true);
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setSyncStatus("Choose an Excel workbook smaller than 25 MB.", true);
      return;
    }
    if (!window.confirm(`Replace the ${locationName(activeLocationId)} catalog with the products in this workbook?`)) return;
    setSyncStatus("Uploading Excel workbook…");
    try {
      let products;
      let catalogData;
      if (activeLocationId === DEFAULT_LOCATION_ID && localServer) {
        const apiBase = fileApp ? "http://127.0.0.1:8765" : "";
        const response = await fetch(`${apiBase}/api/upload-workbook`, {
          method: "POST",
          body: file,
          cache: "no-store",
          mode: fileApp ? "cors" : "same-origin"
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.error || "Could not upload the workbook.");
        products = result.data.products;
        catalogData = result.data;
        lastSyncedVersion = result.data.version;
      } else {
        products = await readCatalogWorkbook(file);
        catalogData = { ...currentCatalogData(), products };
      }
      applySyncedSourceData(catalogData);
      await saveCatalogToCloud(catalogData, false);
      renderOverview();
      setSyncStatus(`${locationName(activeLocationId)} catalog updated · ${products.length.toLocaleString("en")} products.`);
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
    updateOfflineAccessButton();
  }

  async function openOfflineWorkspace() {
    const button = $("#offline-open");
    button.disabled = true;
    try {
      const snapshot = await loadOfflineSnapshot();
      cloudUser = snapshot.user;
      cloudRole = snapshot.role;
      cloudDriverKey = snapshot.driverKey || "";
      cloudLocationId = snapshot.locationId;
      activeLocationId = snapshot.locationId;
      preferredOfflineUserId = snapshot.user.id;
      orders = loadOrders(snapshot.orders);
      drivers = loadDrivers(snapshot.drivers);
      unassignedOrders = Array.isArray(snapshot.unassignedOrders) ? snapshot.unassignedOrders : [];
      returnedTiles = Array.isArray(snapshot.returnedTiles) ? snapshot.returnedTiles : [];
      returnedTilesSetupError = snapshot.returnedTilesSetupError || "";
      catalogApprovals = Array.isArray(snapshot.catalogApprovals) ? snapshot.catalogApprovals : [];
      workspaceUsers = Array.isArray(snapshot.workspaceUsers) ? snapshot.workspaceUsers : [];
      if (snapshot.catalog) applySyncedSourceData(snapshot.catalog);
      if (cloudRole === "driver") {
        selectedShaaficiDriverPhone = drivers.find((driver) =>
          driver.phone.replace(/\D/g, "") === cloudDriverKey.replace(/\D/g, "")
        )?.phone || drivers[0]?.phone || "";
        selectedShaaficiOrderIndex = 0;
      }

      offlineReadOnly = true;
      $("#auth-gate").hidden = true;
      $("#app-shell").hidden = false;
      renderLoadedApp();
      $("#app-shell").classList.add("offline-read-only");
      $("#offline-read-only-banner").hidden = false;
      $("#offline-reload").hidden = !navigator.onLine;
      $("#storage-description").textContent = `Offline read-only copy for ${snapshot.user.email || "workspace member"}.`;
      setSyncStatus(`Offline · read-only copy saved ${new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(snapshot.savedAt)}.`, true);
    } catch (error) {
      console.error("Could not open the offline workspace.", error);
      setAuthStatus(error.message || "Could not open the cached workspace.", true);
    } finally {
      button.disabled = false;
      updateOfflineAccessButton();
    }
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
    if (offlineReadOnly) {
      $("#profile-status").textContent = "Offline access is read-only. Reconnect and reload before making changes.";
      $("#profile-status").classList.add("error");
      return;
    }
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
      await saveOfflineSnapshot();
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

  function loadExternalScript(url) {
    const existing = externalScriptPromises.get(url);
    if (existing) return existing;
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        externalScriptPromises.delete(url);
        reject(new Error(`Could not load ${new URL(url).hostname}.`));
      };
      document.head.append(script);
    });
    externalScriptPromises.set(url, promise);
    return promise;
  }

  function loadXlsxLibrary() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return loadExternalScript("https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js")
      .then(() => {
        if (!window.XLSX) throw new Error("The Excel library loaded without initializing.");
        return window.XLSX;
      });
  }

  function renderLoadedWorkspaceData() {
    renderSavedDrivers();
    renderOverview();
    renderAllOrders();
    renderUnassignedOrders();
    renderHistory();
    if ($("#catalog-view").classList.contains("active")) renderProductCatalogTable();
    if ($("#returned-tiles-view").classList.contains("active")) renderReturnedTiles();
    if ($("#reports-view").classList.contains("active")) renderReports();
    refreshPreview();
  }

  async function loadCloudData(importLocalData, { render = true, saveSnapshot = true } = {}) {
    const isOwner = cloudRole === "owner";
    let orderQuery = supabaseClient.from("orders").select("id,data,location_id").order("id");
    orderQuery = isOwner
      ? orderQuery.or(`location_id.eq.${activeLocationId},location_id.is.null`)
      : orderQuery.eq("location_id", activeLocationId);
    const driverQuery = supabaseClient.from("drivers")
      .select("driver_key,name,phone,location_id")
      .order("name");
    const returnQuery = supabaseClient.from("returned_tile_records")
      .select("id,data,location_id")
      .eq("location_id", activeLocationId)
      .order("id");
    const onlineOrderIdsQuery = importLocalData && isOwner
      ? supabaseClient.from("orders").select("id")
      : Promise.resolve({ data: null, error: null });
    const [orderResult, driverResult, catalogResult, returnResult, onlineOrderIdsResult] = await Promise.all([
      orderQuery,
      driverQuery,
      supabaseClient.from("workspace_catalog").select("data")
        .eq("catalog_key", "default").eq("location_id", activeLocationId).maybeSingle(),
      returnQuery,
      onlineOrderIdsQuery
    ]);
    if (orderResult.error) throw orderResult.error;
    if (driverResult.error) throw driverResult.error;
    if (catalogResult.error) throw catalogResult.error;
    if (onlineOrderIdsResult.error) throw onlineOrderIdsResult.error;
    if (returnResult.error) {
      if (["42P01", "PGRST205"].includes(returnResult.error.code)) {
        returnedTiles = [];
        returnedTilesSetupError = "Run supabase-returned-tiles.sql in Supabase SQL Editor, then reload this app to enable returned tiles.";
      } else {
        throw returnResult.error;
      }
    } else {
      returnedTilesSetupError = "";
      returnedTiles = returnResult.data.map((row) => ({ ...row.data, locationId: row.location_id || "" }));
      if (returnedTiles.some((entry) => !entry || typeof entry.id !== "string"
        || typeof entry.returnedFrom !== "string" || typeof entry.product !== "string")) {
        throw new Error("The shared returned-tile history contains an invalid record.");
      }
      const branchUpdates = returnResult.data.flatMap((row, index) => {
        const branch = row.data.branch ? normalizeReturnedTileBranch(row.data.branch) : row.data.branch;
        const driver = row.data.driver ? normalizeReturnedTileDriver(row.data.driver) : row.data.driver;
        if (branch === row.data.branch && driver === row.data.driver) return [];
        returnedTiles[index] = { ...returnedTiles[index], branch, driver };
        return [{
          id: row.id,
          location_id: row.location_id,
          data: returnedTiles[index],
          updated_at: new Date().toISOString()
        }];
      });
      for (let offset = 0; offset < branchUpdates.length; offset += 500) {
        const { error } = await supabaseClient.from("returned_tile_records")
          .upsert(branchUpdates.slice(offset, offset + 500), { onConflict: "id" });
        if (error) throw new Error(`Could not normalize existing returned-tile branch names: ${error.message}`);
      }
    }
    if (catalogResult.data?.data && catalogHasWorkbookColumns(catalogResult.data.data)) {
      applySyncedSourceData(catalogResult.data.data);
    } else clearCatalogForLocation();

    unassignedOrders = isOwner
      ? orderResult.data.filter((row) => !WORKSPACE_LOCATION_NAMES.has(row.location_id || ""))
        .map((row) => ({ ...row.data, id: row.id, locationId: "" }))
      : [];
    let orderData = orderResult.data
      .filter((row) => row.location_id === activeLocationId)
      .map((row) => ({ ...row.data, id: row.id, locationId: row.location_id }));
    if (importLocalData) {
      const localOrders = loadOrders();
      if (isOwner && activeLocationId === DEFAULT_LOCATION_ID) {
        const legacyOrders = loadOrders(localStorage.getItem(STORAGE_KEY) || "[]");
        const knownIds = new Set(localOrders.map((order) => order.id));
        localOrders.push(...legacyOrders.filter((order) => !knownIds.has(order.id)));
      }
      const scopedLocalOrders = localOrders.map((order) => ({
        ...order,
        locationId: WORKSPACE_LOCATION_NAMES.has(order.locationId)
          ? order.locationId
          : DEFAULT_LOCATION_ID
      }));
      const onlineOrderIds = new Set(
        (onlineOrderIdsResult.data || orderResult.data).map((row) => row.id)
      );
      const missingOrders = scopedLocalOrders.filter((order) =>
        !onlineOrderIds.has(order.id)
        && (isOwner || order.locationId === activeLocationId)
      );
      if (missingOrders.length) {
        const { error } = await supabaseClient.from("orders").upsert(
          missingOrders.map((order) => ({
            id: order.id,
            location_id: order.locationId || null,
            data: order
          })),
          { onConflict: "id" }
        );
        if (error) throw error;
        orderData.push(...missingOrders.filter((order) => order.locationId === activeLocationId));
        unassignedOrders.push(...missingOrders.filter((order) => !order.locationId));
        showToast(`${missingOrders.length} existing ${missingOrders.length === 1 ? "order was" : "orders were"} imported online.`);
      }
    }

    const driverData = driverResult.data.map(({ driver_key, name, phone }) => ({
      driverKey: driver_key,
      name,
      phone
    }));
    if (importLocalData) {
      const knownDrivers = new Set(driverData.map((driver) => driverPhoneDigits(driver.phone)));
      const localDrivers = loadDrivers();
      if (isOwner && activeLocationId === DEFAULT_LOCATION_ID) {
        const knownPhones = new Set(localDrivers.map((driver) => driver.phone.trim()));
        localDrivers.push(...loadDrivers(localStorage.getItem(DRIVERS_STORAGE_KEY) || "[]")
          .filter((driver) => !knownPhones.has(driver.phone.trim())));
      }
      const missingDriversByPhone = new Map();
      let invalidLocalDriverCount = 0;
      localDrivers.forEach((driver) => {
        const phoneDigits = driverPhoneDigits(driver.phone);
        if (!phoneDigits) {
          invalidLocalDriverCount += 1;
          return;
        }
        if (!knownDrivers.has(phoneDigits) && !missingDriversByPhone.has(phoneDigits)) {
          missingDriversByPhone.set(phoneDigits, driver);
        }
      });
      const missingDrivers = [...missingDriversByPhone.values()];
      if (invalidLocalDriverCount) {
        showToast(`${invalidLocalDriverCount} saved driver${invalidLocalDriverCount === 1 ? " was" : "s were"} skipped because the phone number is invalid.`);
      }
      if (missingDrivers.length) {
        const { error } = await supabaseClient.from("drivers").insert(
          missingDrivers.map((driver) => ({
            driver_key: globalDriverKey(driver.phone),
            name: driver.name,
            phone: driver.phone,
            location_id: null
          }))
        );
        if (error) throw error;
        driverData.push(...missingDrivers.map((driver) => ({
          ...driver,
          driverKey: globalDriverKey(driver.phone)
        })));
      }
    }

    orders = loadOrders(orderData);
    drivers = loadDrivers(driverData);
    try {
      localStorage.setItem(workspaceLocalStorageKey(STORAGE_KEY), JSON.stringify(orders));
      localStorage.setItem(workspaceLocalStorageKey(DRIVERS_STORAGE_KEY), JSON.stringify(drivers));
    } catch (error) {
      console.warn("Could not keep a local backup of online data.", error);
    }
    if (render) {
      renderLoadedWorkspaceData();
      setSyncStatus("Online · orders and drivers sync across signed-in devices.");
    }
    if (saveSnapshot) await saveOfflineSnapshot();
  }

  async function loadDriverCloudData() {
    if (!cloudDriverKey) throw new Error("This driver account has no linked saved driver.");
    const [orderResult, driverResult] = await Promise.all([
      supabaseClient.from("orders").select("id,data,location_id")
        .eq("location_id", activeLocationId).order("id"),
      supabaseClient.from("drivers").select("driver_key,name,phone,location_id")
        .is("location_id", null).eq("phone", cloudDriverKey).maybeSingle()
    ]);
    if (orderResult.error) throw orderResult.error;
    if (driverResult.error) throw driverResult.error;
    if (!driverResult.data) throw new Error("The driver linked to this account is no longer saved in the workspace.");

    orders = loadOrders(orderResult.data.map((row) => ({
      ...row.data,
      locationId: row.location_id || ""
    })));
    drivers = loadDrivers([{
      driverKey: driverResult.data.driver_key,
      name: driverResult.data.name,
      phone: driverResult.data.phone
    }]);
    if (!drivers.length) throw new Error("The linked driver record is invalid.");
    returnedTiles = [];
    returnedTilesSetupError = "";
    catalogApprovals = [];
    selectedShaaficiDriverPhone = drivers[0].phone;
    selectedShaaficiOrderIndex = 0;
    renderSavedDrivers();
    renderAllOrders();
    setSyncStatus("Online · showing orders assigned to your linked driver.");
    await saveOfflineSnapshot();
  }

  function setUsersStatus(message, isError = false) {
    const status = $("#users-status");
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  async function invokeUserManagement(body) {
    if (offlineReadOnly) throw new Error("Offline access is read-only. Reconnect and reload before making changes.");
    const { data, error } = await supabaseClient.functions.invoke("manage-users", { body });
    const explainError = (message) => {
      if (message === "Unknown user-management action." && body.action === "create") {
        return "The deployed user-management function is out of date. Deploy the latest manage-users function, then try again.";
      }
      if (body.role === "driver" && message === "Choose a valid workspace role.") {
        return "Driver accounts aren't enabled on Supabase yet. Run the updated supabase-schema.sql and deploy the updated manage-users function.";
      }
      return message;
    };
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
      throw new Error(explainError(message));
    }
    if (data?.error) throw new Error(explainError(data.error));
    return data;
  }

  async function invokeWorkflowManagement(body) {
    if (offlineReadOnly) throw new Error("Offline access is read-only. Reconnect and reload before making changes.");
    const { data, error } = await supabaseClient.functions.invoke("manage-workflows", { body });
    if (error) {
      let message = error.message || "Could not complete the workflow request.";
      if (error.context instanceof Response) {
        try {
          const responseData = await error.context.clone().json();
          if (typeof responseData.error === "string") message = responseData.error;
        } catch (parseError) {
          console.error("Could not read the workflow error response.", parseError);
        }
      }
      throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function invokeDriverDelivery(body) {
    if (offlineReadOnly) throw new Error("Offline access is read-only. Reconnect and reload before making changes.");
    const { data, error } = await supabaseClient.functions.invoke("manage-driver-deliveries", { body });
    if (error) {
      let message = error.message || "Could not submit the delivery confirmation.";
      if (error.context instanceof Response) {
        try {
          const responseData = await error.context.clone().json();
          if (typeof responseData.error === "string") message = responseData.error;
        } catch (parseError) {
          console.error("Could not read the delivery confirmation error response.", parseError);
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

  function renderManagedUserDriverOptions(selectedPhone = "") {
    const select = $("#managed-user-driver");
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = drivers.length ? "Choose a saved driver" : "No saved drivers available";
    select.append(placeholder);
    drivers.forEach((driver) => {
      const option = document.createElement("option");
      option.value = driver.phone;
      option.textContent = `${driver.name} — ${driver.phone}`;
      select.append(option);
    });
    select.value = selectedPhone;
  }

  function locationName(locationId) {
    return WORKSPACE_LOCATION_NAMES.get(locationId) || "Needs location review";
  }

  function locationIdFromBranch(branch) {
    const normalized = String(branch || "").trim().toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
    if (normalized === "200" || normalized.includes("warehouse200")
      || normalized.includes("wh200") || normalized === "wh2" || normalized.startsWith("wh2")) {
      return "warehouse-200";
    }
    if (normalized === "150" || normalized.includes("warehouse150") || normalized.includes("wh150")) {
      return "warehouse-150";
    }
    return LEGACY_BRANCH_LOCATION_ALIASES.get(normalized) || "";
  }

  function renderUnassignedOrders() {
    const panel = $("#unassigned-orders-panel");
    const body = $("#unassigned-orders");
    if (!panel || !body) return;
    const canReview = cloudDeployment && cloudRole === "owner";
    panel.hidden = !canReview;
    body.replaceChildren();
    $("#unassigned-orders-empty").hidden = !canReview || unassignedOrders.length > 0;
    if (!canReview) return;
    unassignedOrders.forEach((order) => {
      const row = document.createElement("tr");
      [order.id, order.customer || "—", order.branch || "—", order.date || "—"].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      const assignmentCell = document.createElement("td");
      const controls = document.createElement("div");
      controls.className = "location-review-controls";
      const select = document.createElement("select");
      select.setAttribute("aria-label", `Assign order ${order.id} to a location`);
      select.required = true;
      select.disabled = offlineReadOnly;
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Choose location";
      select.append(placeholder);
      WORKSPACE_LOCATIONS.forEach((location) => {
        const option = document.createElement("option");
        option.value = location.id;
        option.textContent = location.name;
        option.selected = location.id === locationIdFromBranch(order.branch);
        select.append(option);
      });
      if (!select.value) placeholder.selected = true;
      const assignButton = document.createElement("button");
      assignButton.type = "button";
      assignButton.className = "button button-secondary";
      assignButton.textContent = "Assign";
      assignButton.disabled = !select.value;
      assignButton.hidden = offlineReadOnly;
      select.addEventListener("change", () => { assignButton.disabled = !select.value; });
      assignButton.addEventListener("click", () => assignUnassignedOrder(order, select, assignButton));
      controls.append(select, assignButton);
      assignmentCell.append(controls);
      row.append(assignmentCell);
      body.append(row);
    });
    labelTableRows(body);
  }

  async function assignUnassignedOrder(order, select, button) {
    const status = $("#unassigned-orders-status");
    const locationId = select.value;
    if (!WORKSPACE_LOCATION_NAMES.has(locationId)) {
      status.textContent = "Choose a valid location.";
      status.classList.add("error");
      return;
    }
    button.disabled = true;
    status.classList.remove("error");
    status.textContent = `Assigning ${order.id}…`;
    try {
      const updatedOrder = { ...order, locationId };
      const { data, error } = await supabaseClient.from("orders")
        .update({ location_id: locationId, data: updatedOrder, updated_at: new Date().toISOString() })
        .eq("id", order.id)
        .is("location_id", null)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("This order was updated elsewhere. Reload the workspace and try again.");
      await loadCloudData(false);
      renderAllOrders();
      renderUnassignedOrders();
      status.textContent = `${order.id} assigned to ${locationName(locationId)}.`;
      showToast(`Order assigned to ${locationName(locationId)}.`);
    } catch (error) {
      console.error("Could not assign the order location.", error);
      status.textContent = error.message || "Could not assign this order.";
      status.classList.add("error");
      button.disabled = false;
    }
  }

  function renderManagedUserLocationOptions(selectedLocationId = "") {
    const select = $("#managed-user-location");
    select.replaceChildren();
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Choose branch / location";
    select.append(placeholder);
    WORKSPACE_LOCATIONS.forEach((location) => {
      const option = document.createElement("option");
      option.value = location.id;
      option.textContent = location.name;
      select.append(option);
    });
    select.value = WORKSPACE_LOCATION_NAMES.has(selectedLocationId)
      ? selectedLocationId
      : "";
  }

  function updateManagedUserLocationField() {
    const role = $("#managed-user-role").value;
    const requiresLocation = ["admin", "staff", "driver"].includes(role);
    $("#managed-user-location-field").hidden = !requiresLocation;
    $("#managed-user-location").required = requiresLocation;
  }

  function resetManagedUserForm() {
    $("#user-form").reset();
    $("#managed-user-id").value = "";
    $("#managed-user-password-fields").hidden = false;
    $("#managed-user-password").required = true;
    $("#managed-user-password-confirm").required = true;
    $("#user-form-title").textContent = "Create a user";
    $("#user-form-help").textContent = "Set an initial password, then share it with the user securely.";
    $("#save-managed-user").textContent = "Create user";
    $("#cancel-user-edit").hidden = true;
    $("#managed-user-email").readOnly = false;
    $("#managed-user-role").value = "staff";
    $("#managed-user-role-field").hidden = cloudRole !== "owner";
    $("#managed-user-role").querySelector('option[value="owner"]').hidden = true;
    $("#managed-user-role").disabled = false;
    renderManagedUserLocationOptions();
    updateManagedUserLocationField();
    renderManagedUserDriverOptions();
    $("#managed-user-driver-field").hidden = true;
    $("#managed-user-driver").required = false;
    $("#user-role-help").textContent = "Admin, staff, and driver accounts are assigned to one branch. Branch admins can manage branch data but not users; the owner can access all branches and manage users.";
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
        user.role === "owner"
          ? "All locations"
          : user.locationName || locationName(user.locationId),
        user.driverName || user.driverKey || "—",
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
    labelTableRows(body);
  }

  async function loadWorkspaceUsers() {
    if (offlineReadOnly) {
      renderWorkspaceUsers();
      setUsersStatus("Showing the last cached user list. Reconnect and reload to refresh it.");
      return;
    }
    if (cloudRole !== "owner") {
      setUsersStatus("Only the workspace owner can manage users.", true);
      return;
    }
    $("#users-refresh").disabled = true;
    setUsersStatus("Loading workspace users…");
    try {
      const result = await invokeUserManagement({ action: "list" });
      workspaceUsers = result.users;
      renderWorkspaceUsers();
      resetManagedUserForm();
      await saveOfflineSnapshot();
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
    if (cloudRole !== "owner") {
      setUsersStatus("Only the workspace owner can manage users.", true);
      return;
    }
    $("#managed-user-id").value = user.id;
    $("#managed-user-name").value = user.name;
    $("#managed-user-email").value = user.email;
    $("#managed-user-role").value = user.role;
    $("#managed-user-role-field").hidden = cloudRole !== "owner";
    $("#managed-user-role").querySelector('option[value="owner"]').hidden = user.role !== "owner";
    $("#managed-user-role").disabled = user.role === "owner";
    renderManagedUserLocationOptions(user.locationId || "");
    updateManagedUserLocationField();
    renderManagedUserDriverOptions(user.driverKey || "");
    $("#managed-user-driver-field").hidden = user.role !== "driver";
    $("#managed-user-driver").required = user.role === "driver";
    $("#user-role-help").textContent = user.role === "driver"
      ? "This account is limited to the assigned branch and can view only the linked driver's orders."
      : user.role === "admin"
        ? "This admin can manage data only in the assigned branch. Only the owner can manage users."
        : user.role === "owner"
          ? "The owner can access all branches and manage users."
          : "This staff account can access only the assigned branch.";
    $("#managed-user-password-fields").hidden = true;
    $("#managed-user-password").required = false;
    $("#managed-user-password-confirm").required = false;
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
    if (offlineReadOnly) {
      setUsersStatus("Offline access is read-only. Reconnect and reload before making changes.", true);
      return;
    }
    if (cloudRole !== "owner") {
      setUsersStatus("Only the workspace owner can manage users.", true);
      return;
    }
    const submit = $("#save-managed-user");
    const userId = $("#managed-user-id").value;
    const password = $("#managed-user-password").value;
    const passwordConfirmation = $("#managed-user-password-confirm").value;
    const role = cloudRole === "owner" ? $("#managed-user-role").value : "staff";
    const driverKey = role === "driver" ? $("#managed-user-driver").value : "";
    const locationId = ["admin", "staff", "driver"].includes(role) ? $("#managed-user-location").value : "";
    const payload = {
      name: $("#managed-user-name").value.trim(),
      email: $("#managed-user-email").value.trim(),
      role,
      driverKey,
      locationId
    };
    if (["admin", "staff", "driver"].includes(role) && !WORKSPACE_LOCATION_NAMES.has(locationId)) {
      setUsersStatus("Choose a location for this user.", true);
      return;
    }
    if (role === "driver" && !driverKey) {
      setUsersStatus("Choose a saved driver for this account.", true);
      return;
    }
    if (!userId && password.length < 8) {
      setUsersStatus("Use an initial password with at least 8 characters.", true);
      return;
    }
    if (!userId && password !== passwordConfirmation) {
      setUsersStatus("The initial passwords do not match.", true);
      return;
    }
    submit.disabled = true;
    setUsersStatus(userId ? "Saving user changes…" : "Creating user account…");
    try {
      const result = await invokeUserManagement(userId
        ? { action: "update", userId, ...payload }
        : { action: "create", ...payload, password });
      resetManagedUserForm();
      const successMessage = userId
        ? result.emailChangePending
          ? "User updated. A confirmation email was sent to the new address."
          : "User updated."
        : "User created and saved to the workspace. Share the initial password securely.";
      await loadWorkspaceUsers();
      setUsersStatus(successMessage);
    } catch (error) {
      console.error("Could not save workspace user.", error);
      setUsersStatus(error.message, true);
    } finally {
      submit.disabled = false;
    }
  }

  function downloadWorkspaceBackup(backup) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json"
    }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `shaafici-order-desk-backup-${dateValue()}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportWorkspaceBackup() {
    if (cloudDeployment && (!cloudUser || !["owner", "admin"].includes(cloudRole))) {
      showToast("Only workspace admins can export a full backup.");
      return;
    }
    const backup = {
      format: "shaafici-order-desk-backup",
      version: 2,
      exportedAt: new Date().toISOString(),
      locationId: activeLocationId,
      orders,
      drivers: drivers.map((driver) => ({ ...driver, locationId: null })),
      returnedTiles,
      catalog: currentCatalogData()
    };
    downloadWorkspaceBackup(backup);
    showToast(`Backup exported with ${orders.length} orders, ${drivers.length} drivers, and ${returnedTiles.length} returns. Keep the file safe.`);
  }

  async function importOnlineBackup(file) {
    const status = $("#data-backup-status");
    status.hidden = false;
    status.classList.remove("error");
    try {
      if (offlineReadOnly) throw new Error("Offline access is read-only. Reconnect and reload before restoring a backup.");
      if (!cloudDeployment || !cloudUser || !["owner", "admin"].includes(cloudRole)) {
        throw new Error("Only signed-in workspace admins can restore a backup.");
      }
      if (file.size > 25 * 1024 * 1024) throw new Error("The backup file is larger than the 25 MB import limit.");
      const backup = JSON.parse(await file.text());
      if (!backup || backup.format !== "shaafici-order-desk-backup" || ![1, 2].includes(backup.version)
        || !Array.isArray(backup.orders) || !Array.isArray(backup.drivers)) {
        throw new Error("This is not a supported Order Desk backup file.");
      }
      const backupReturns = backup.version === 2 ? backup.returnedTiles : [];
      if (backup.version === 2 && (!Array.isArray(backupReturns) || !backup.catalog
        || !Array.isArray(backup.catalog.products))) {
        throw new Error("The full backup is missing its returned tiles or product catalog.");
      }
      if (backup.orders.some((order) => !order || typeof order.id !== "string" || !order.id.trim()
        || !Array.isArray(order.items))) {
        throw new Error("The backup contains an invalid order.");
      }
      if (backup.drivers.some((driver) => !driver || typeof driver.name !== "string"
        || typeof driver.phone !== "string" || !driver.name.trim() || !driver.phone.trim())) {
        throw new Error("The backup contains an invalid saved driver.");
      }
      if (backupReturns.some((entry) => !entry || typeof entry.id !== "string" || !entry.id.trim()
        || typeof entry.returnedFrom !== "string" || typeof entry.product !== "string")) {
        throw new Error("The backup contains an invalid returned-tile record.");
      }
      if (new Set(backupReturns.map((entry) => entry.id)).size !== backupReturns.length) {
        throw new Error("The backup contains duplicate returned-tile IDs.");
      }
      if (backup.version === 2 && !catalogHasWorkbookColumns(backup.catalog)) {
        throw new Error("The backup contains an invalid product catalog.");
      }
      if (backup.version === 2) validateSyncedSourceData(backup.catalog);
      if (!window.confirm("Restore this backup by adding records that are missing online? Existing orders, drivers, returns, and matching products will be kept. Saved catalog settings will be restored.")) {
        status.textContent = "Restore cancelled.";
        return;
      }
      const { data, error } = await supabaseClient.functions.invoke("manage-backups", { body: { backup } });
      if (error) {
        let message = error.message || "Could not restore this backup.";
        if (error.context instanceof Response) {
          try {
            const responseData = await error.context.clone().json();
            if (typeof responseData.error === "string") message = responseData.error;
          } catch (parseError) {
            console.error("Could not read the backup-restore error response.", parseError);
          }
        }
        throw new Error(message);
      }
      if (!data?.ok || !data.restored) throw new Error("The backup restore returned an invalid response.");
      await loadCloudData(false);
      const { orders: restoredOrders, drivers: restoredDrivers, returns: restoredReturns, products: restoredProducts } = data.restored;
      status.textContent = `Restored ${restoredOrders} orders, ${restoredDrivers} drivers, ${restoredReturns} returns, and ${restoredProducts} products. Existing online records were kept.`;
      showToast(`Backup restored. ${restoredOrders + restoredDrivers + restoredReturns + restoredProducts} new records added.`);
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
        if (cloudRole === "driver") await loadDriverCloudData();
        else await loadCloudData(false);
      } catch (error) {
        console.error("Could not refresh shared online data.", error);
        if (cloudRole === "driver") {
          orders = [];
          drivers = [];
          selectedShaaficiDriverPhone = "";
          selectedShaaficiOrderIndex = 0;
          renderSavedDrivers();
        }
        setSyncStatus(`Online refresh failed — ${error.message}`, true);
      }
    }, 250);
  }

  function subscribeToCloudChanges() {
    if (cloudChannel) supabaseClient.removeChannel(cloudChannel);
    let channel = supabaseClient.channel("order-desk-shared-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, scheduleCloudRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, scheduleCloudRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "workspace_catalog" }, scheduleCloudRefresh);
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
      offlineReadOnly = false;
      preferredOfflineUserId = user.id;
      $("#app-shell").classList.remove("offline-read-only");
      $("#offline-read-only-banner").hidden = true;
      updateOfflineAccessButton();
      cloudUser = user;
      workspaceUsers = [];
      currentPreparedBy = createdByForUser(user);
      form.elements.preparedBy.value = currentPreparedBy;
      setAuthStatus("Loading your online orders…");
      try {
        const roleResult = await supabaseClient.from("workspace_user_roles")
          .select("role,driver_key,location_id").eq("user_id", user.id).maybeSingle();
        if (roleResult.error) {
          const missingLocationSchema = ["42703", "PGRST204"].includes(roleResult.error.code)
            && /driver_key|location_id/i.test(roleResult.error.message);
          if (missingLocationSchema) {
            throw new Error("Location access is not configured yet. Ask the workspace owner to run the multi-location Supabase migration.");
          }
          throw new Error(`Could not load your workspace role: ${roleResult.error.message}`);
        }
        if (!roleResult.data?.role) throw new Error("Your workspace account has no assigned role. Ask the workspace owner to configure it.");
        cloudRole = roleResult.data.role;
        cloudDriverKey = cloudRole === "driver" ? roleResult.data.driver_key || "" : "";
        cloudLocationId = roleResult.data.location_id || "";
        if (["admin", "staff", "driver"].includes(cloudRole)) {
          if (!WORKSPACE_LOCATION_NAMES.has(cloudLocationId)) {
            throw new Error("Your account has no valid assigned location. Ask the workspace owner to assign one.");
          }
          activeLocationId = cloudLocationId;
        } else if (cloudRole === "owner") {
          if (!WORKSPACE_LOCATION_NAMES.has(activeLocationId)) activeLocationId = DEFAULT_LOCATION_ID;
        } else {
          throw new Error("Your workspace account has an unsupported role.");
        }
        localStorage.setItem(ACTIVE_LOCATION_KEY, activeLocationId);
        if (cloudRole === "driver" && !cloudDriverKey) {
          throw new Error("This driver account is not linked to a saved driver. Ask the workspace owner to link it.");
        }
        if (cloudRole === "driver") await loadDriverCloudData();
        else {
          await loadCloudData(true);
          await applyYesterdayOrderTransfers();
        }
        if (cloudRole === "owner") await loadWorkspaceUsers();
        $("#auth-gate").hidden = true;
        $("#app-shell").hidden = false;
        $("#storage-description").textContent = `Signed in as ${user.email || "workspace member"}.`;
        renderLoadedApp();
        subscribeToCloudChanges();
        await saveOfflineSnapshot();
      } catch (error) {
        cloudUser = null;
        cloudRole = "staff";
        cloudDriverKey = "";
        cloudLocationId = "";
        unassignedOrders = [];
        cloudLocationId = "";
        unassignedOrders = [];
        unassignedOrders = [];
        orders = [];
        drivers = [];
        returnedTiles = [];
        catalogApprovals = [];
        $("#app-shell").hidden = true;
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
    offlineReadOnly = false;
    preferredOfflineUserId = "";
    $("#app-shell").classList.remove("offline-read-only");
    $("#offline-read-only-banner").hidden = true;
    void clearOfflineSnapshot();
    resetForm();
    cloudUser = null;
    cloudRole = "staff";
    cloudDriverKey = "";
    setView("overview");
    orders = [];
    drivers = [];
    selectedShaaficiDriverPhone = "";
    selectedShaaficiOrderIndex = 0;
    catalogApprovals = [];
    scheduledReportFrequency = "off";
    showAuthGate("Sign in to load your shared online workspace.");
  }

  async function initializeOnlineMode() {
    const config = window.ORDER_DESK_SUPABASE || {};
    const validConfig = typeof config.url === "string" && config.url.startsWith("https://")
      && typeof config.anonKey === "string" && config.anonKey.length > 20;
    if (!validConfig) {
      disableAuthForm();
      showAuthGate("Online storage is not configured. Add your Supabase Project URL and anon key to supabase-config.js.", true);
      return;
    }
    if (!window.supabase?.createClient) {
      disableAuthForm();
      showAuthGate("Loading secure workspace sign-in…");
      try {
        await loadExternalScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
      } catch (error) {
        console.error("Could not load the Supabase client library.", error);
        showAuthGate(`Could not load secure sign-in: ${error.message} Check your internet connection and try again.`, true);
        return;
      }
    }
    if (!window.supabase?.createClient) {
      disableAuthForm();
      showAuthGate("The Supabase client library loaded but could not start. Reload the website and try again.", true);
      return;
    }

    supabaseClient = window.supabase.createClient(config.url, config.anonKey);
    $("#auth-email").disabled = false;
    $("#auth-password").disabled = false;
    $("#auth-submit").disabled = false;
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
      else {
        preferredOfflineUserId = "";
        showAuthGate("Sign in to load your shared online workspace.");
      }
    }).catch((error) => {
      console.error("Could not check the online sign-in session.", error);
      showAuthGate(`Could not connect to Supabase: ${error.message}`, true);
    });
  }

  const isTileProduct = (product) => /\btile(?:s)?\b|\bmarmar\b/i.test(product);
  const normalizeOrderStatus = (status) => {
    const value = String(status || "").trim().toLowerCase();
    if (value === "open" || value === "pending") return "Pending";
    if (value === "in progress") return "In progress";
    if (value === "completed" || value === "delivered") return "Delivered";
    if (value === "cancelled" || value === "canceled") return "Cancelled";
    return "Pending";
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const form = $("#order-form");
  const itemsBody = $("#items-body");
  let needsMoneyDataCleanup = false;
  let orders = [];
  let drivers = [];
  let driversDirectoryVisible = false;
  let selectedShaaficiDriverPhone = "";
  let selectedShaaficiOrderIndex = 0;
  let editingId = null;
  let orderSort = { key: "createdAt", direction: "desc" };
  let historyOrderFilter = "";
  let itemHistoryProductFilter = "";
  let converterPinnedOpen = false;
  let printPreviewOrder = null;
  let printPreviewReturnView = "new-order";
  let printPreviewPdfUrl = null;
  let receiptScreenshotPromise = null;
  let receiptScreenshotCacheKey = "";
  let printLayout = "full-page";
  let toastTimer;
  function loadOrders(savedValue) {
    try {
      const source = savedValue === undefined
        ? localStorage.getItem(workspaceLocalStorageKey(STORAGE_KEY)) || "[]"
        : savedValue;
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
          locationId: WORKSPACE_LOCATION_NAMES.has(order.locationId) ? order.locationId : "",
          customer: order.customer || "",
          branch: order.branch || "",
          category: order.category || categories[0],
          transferId: order.transferId || "",
          date: order.date || "",
          driver: order.driver || "",
          driverPhone: order.driverPhone || "",
          preparedBy: order.preparedBy || "",
          notes: order.notes || "",
          priority: Boolean(order.priority),
          status: normalizeOrderStatus(order.status),
          approvalStatus: ["pending", "approved", "rejected"].includes(order.approvalStatus)
            ? order.approvalStatus : "",
          approvalRequestedBy: order.approvalRequestedBy || "",
          approvalRequestedById: order.approvalRequestedById || "",
          approvalRequestedAt: Number(order.approvalRequestedAt) || 0,
          approvalDecidedBy: order.approvalDecidedBy || "",
          approvalDecidedAt: Number(order.approvalDecidedAt) || 0,
          deliveryConfirmationStatus: ["pending", "approved", "rejected"].includes(order.deliveryConfirmationStatus)
            ? order.deliveryConfirmationStatus : "",
          deliveryConfirmationRequestedBy: order.deliveryConfirmationRequestedBy || "",
          deliveryConfirmationRequestedById: order.deliveryConfirmationRequestedById || "",
          deliveryConfirmationRequestedAt: Number(order.deliveryConfirmationRequestedAt) || 0,
          deliveryConfirmationDecidedBy: order.deliveryConfirmationDecidedBy || "",
          deliveryConfirmationDecidedAt: Number(order.deliveryConfirmationDecidedAt) || 0,
          deliveredTo: order.deliveredTo || "",
          deliveredToPhone: order.deliveredToPhone || "",
          deliveryNote: typeof order.deliveryNote === "string" ? order.deliveryNote : "",
          deliveredAt: Number(order.deliveredAt) || 0,
          takenAt: Number(order.takenAt) || 0,
          deletedAt: Number(order.deletedAt) || 0,
          catalogTakenApplied: Boolean(order.catalogTakenApplied),
          history,
          items: order.items.map((item) => item || {}).map((item) => {
          const product = item.product || "";
          const catalogProduct = getCatalogProduct(product, item.qtyItem);
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
    if (offlineReadOnly) {
      showToast("Offline access is read-only. Reconnect and reload before making changes.");
      return false;
    }
    if (cloudDeployment) {
      if (!supabaseClient || !cloudUser) {
        showToast("Sign in before saving orders online.");
        return false;
      }
      const savedOrders = changedOrder ? [changedOrder] : orders;
      const { error } = await supabaseClient.from("orders").upsert(
        savedOrders.map((order) => {
          const locationId = WORKSPACE_LOCATION_NAMES.has(order.locationId)
            ? order.locationId
            : activeLocationId;
          return {
            id: order.id,
            location_id: locationId,
            data: { ...order, locationId }
          };
        }),
        { onConflict: "id" }
      );
      if (error) {
        console.error("Could not save orders online.", error);
        showToast(`Could not save online: ${error.message}`);
        return false;
      }
      try {
        localStorage.setItem(workspaceLocalStorageKey(STORAGE_KEY), JSON.stringify(orders));
      } catch (error) {
        console.warn("Could not keep a local order backup.", error);
      }
      await saveOfflineSnapshot();
      return true;
    }
    try {
      localStorage.setItem(workspaceLocalStorageKey(STORAGE_KEY), JSON.stringify(orders));
    } catch (error) {
      console.error("Could not save orders in this browser.", error);
      showToast("Could not save. Check this browser's storage settings.");
      return false;
    }
    return true;
  }

  function loadDrivers(savedValue) {
    try {
      const source = savedValue === undefined
        ? localStorage.getItem(workspaceLocalStorageKey(DRIVERS_STORAGE_KEY)) || "[]"
        : savedValue;
      const saved = typeof source === "string" ? JSON.parse(source) : source;
      if (!Array.isArray(saved)) throw new Error("Saved driver data is not a list.");
      return saved.filter((driver) =>
        driver && typeof driver.name === "string" && typeof driver.phone === "string"
        && driver.name.trim() && driver.phone.trim()
      ).map((driver) => ({
        driverKey: typeof driver.driverKey === "string" ? driver.driverKey : "",
        name: driver.name.trim(),
        phone: driver.phone.trim()
      }));
    } catch (error) {
      console.error("Could not load saved drivers.", error);
      showToast("Could not load saved drivers from this browser.");
      return [];
    }
  }

  function driverPhoneDigits(phone) {
    return phone.replace(/\D/g, "");
  }

  function globalDriverKey(phone) {
    return `global:${driverPhoneDigits(phone)}`;
  }

  async function persistDrivers(driver) {
    if (offlineReadOnly) {
      showToast("Offline access is read-only. Reconnect and reload before making changes.");
      return false;
    }
    if (cloudDeployment) {
      if (!supabaseClient || !cloudUser) {
        showToast("Sign in before saving drivers online.");
        return false;
      }
      const { error } = await supabaseClient.from("drivers").insert({
        driver_key: globalDriverKey(driver.phone),
        name: driver.name,
        phone: driver.phone,
        location_id: null
      });
      if (error) {
        console.error("Could not save drivers online.", error);
        showToast(`Could not save driver online: ${error.message}`);
        return false;
      }
      try {
        localStorage.setItem(workspaceLocalStorageKey(DRIVERS_STORAGE_KEY), JSON.stringify(drivers));
      } catch (error) {
        console.warn("Could not keep a local driver backup.", error);
      }
      await saveOfflineSnapshot();
      return true;
    }
    try {
      localStorage.setItem(workspaceLocalStorageKey(DRIVERS_STORAGE_KEY), JSON.stringify(drivers));
    } catch (error) {
      console.error("Could not save drivers in this browser.", error);
      showToast("Could not save the driver. Check this browser's storage settings.");
      return false;
    }
    return true;
  }

  function canManageSharedDrivers() {
    return cloudDeployment && cloudRole === "owner" && !offlineReadOnly;
  }

  function driverAccounts(driver) {
    const phoneDigits = driverPhoneDigits(driver.phone);
    return workspaceUsers.filter((user) =>
      user.role === "driver" && driverPhoneDigits(user.driverKey || "") === phoneDigits
    );
  }

  function cacheDriverDirectory() {
    try {
      localStorage.setItem(workspaceLocalStorageKey(DRIVERS_STORAGE_KEY), JSON.stringify(drivers));
    } catch (error) {
      console.warn("Could not keep a local driver backup.", error);
    }
    void saveOfflineSnapshot();
  }

  async function updateSavedDriver(originalDriver, name, phone) {
    if (!canManageSharedDrivers()) return false;
    if (!name || name.length > 80 || !phone || !driverPhoneDigits(phone)) {
      showToast("Enter a driver name and a valid phone number.");
      return false;
    }
    const phoneDigits = driverPhoneDigits(phone);
    if (drivers.some((driver) => driver.driverKey !== originalDriver.driverKey
      && driverPhoneDigits(driver.phone) === phoneDigits)) {
      showToast("This phone number is already registered to another driver.");
      return false;
    }
    const linkedAccounts = driverAccounts(originalDriver);
    if (phone !== originalDriver.phone && linkedAccounts.length
      && !window.confirm(`Changing this phone number will disconnect ${linkedAccounts.length} linked Driver account${linkedAccounts.length === 1 ? "" : "s"} until you update their saved-driver assignment. Existing orders will keep their saved details. Continue?`)) {
      return false;
    }
    const nextDriver = {
      ...originalDriver,
      driverKey: globalDriverKey(phone),
      name,
      phone
    };
    try {
      const { data, error } = await supabaseClient.from("drivers")
        .update({
          driver_key: nextDriver.driverKey,
          name: nextDriver.name,
          phone: nextDriver.phone
        })
        .eq("driver_key", originalDriver.driverKey)
        .select("driver_key")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("The driver was not found. Refresh the list and try again.");
      drivers = drivers.map((driver) =>
        driver.driverKey === originalDriver.driverKey ? nextDriver : driver
      );
      renderSavedDrivers();
      cacheDriverDirectory();
      showToast("Driver details updated for all branches.");
      return true;
    } catch (error) {
      console.error("Could not update the shared driver.", error);
      showToast(`Could not update driver: ${error.message}`);
      return false;
    }
  }

  async function deleteSavedDriver(driver) {
    if (!canManageSharedDrivers()) return;
    const linkedAccounts = driverAccounts(driver);
    const warning = linkedAccounts.length
      ? ` ${linkedAccounts.length} linked Driver account${linkedAccounts.length === 1 ? "" : "s"} will lose access until reassigned.`
      : "";
    if (!window.confirm(`Delete ${driver.name} (${driver.phone}) from the shared driver list? Existing orders will keep their saved details.${warning}`)) return;
    try {
      const { data, error } = await supabaseClient.from("drivers")
        .delete()
        .eq("driver_key", driver.driverKey)
        .select("driver_key")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("The driver was not found. Refresh the list and try again.");
      drivers = drivers.filter((entry) => entry.driverKey !== driver.driverKey);
      renderSavedDrivers();
      cacheDriverDirectory();
      showToast("Driver deleted from all branches.");
    } catch (error) {
      console.error("Could not delete the shared driver.", error);
      showToast(`Could not delete driver: ${error.message}`);
    }
  }

  function renderDriverDirectory() {
    const list = $("#drivers-directory-list");
    const canEdit = canManageSharedDrivers();
    $("#drivers-directory-actions-header").hidden = !canEdit;
    const query = $("#drivers-directory-search").value.trim().toLocaleLowerCase();
    const matchingDrivers = drivers.filter((driver) =>
      `${driver.name} ${driver.phone}`.toLocaleLowerCase().includes(query)
    );
    list.replaceChildren();
    sortDriversByOrderCount(matchingDrivers).forEach((driver) => {
      const row = document.createElement("tr");
      const nameCell = document.createElement("td");
      const phoneCell = document.createElement("td");
      const actionsCell = document.createElement("td");
      nameCell.textContent = driver.name;
      phoneCell.textContent = driver.phone;
      if (canEdit) {
        actionsCell.className = "user-row-actions";
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "button button-secondary";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => {
          const nameInput = document.createElement("input");
          nameInput.type = "text";
          nameInput.maxLength = 80;
          nameInput.value = driver.name;
          nameInput.setAttribute("aria-label", `Edit ${driver.name} name`);
          const phoneInput = document.createElement("input");
          phoneInput.type = "tel";
          phoneInput.maxLength = 30;
          phoneInput.value = driver.phone;
          phoneInput.setAttribute("aria-label", `Edit ${driver.name} phone number`);
          nameCell.replaceChildren(nameInput);
          phoneCell.replaceChildren(phoneInput);
          const saveButton = document.createElement("button");
          saveButton.type = "button";
          saveButton.className = "button button-primary";
          saveButton.textContent = "Save";
          saveButton.addEventListener("click", async () => {
            saveButton.disabled = true;
            const saved = await updateSavedDriver(driver, nameInput.value.trim(), phoneInput.value.trim());
            if (!saved) renderDriverDirectory();
          });
          const cancelButton = document.createElement("button");
          cancelButton.type = "button";
          cancelButton.className = "button button-secondary";
          cancelButton.textContent = "Cancel";
          cancelButton.addEventListener("click", renderDriverDirectory);
          actionsCell.replaceChildren(saveButton, cancelButton);
        });
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "button button-secondary";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteSavedDriver(driver));
        actionsCell.append(editButton, deleteButton);
      }
      row.append(nameCell, phoneCell);
      if (canEdit) row.append(actionsCell);
      list.append(row);
    });
    labelTableRows(list);
    $("#drivers-directory-count").textContent = query
      ? `${matchingDrivers.length} of ${drivers.length} ${drivers.length === 1 ? "driver" : "drivers"} found`
      : drivers.length
        ? `${drivers.length} ${drivers.length === 1 ? "driver" : "drivers"} saved`
      : "No drivers saved yet.";
    $("#drivers-directory-search-wrap").hidden = !driversDirectoryVisible || drivers.length === 0;
    $("#drivers-directory-table").hidden = !driversDirectoryVisible || matchingDrivers.length === 0;
    $("#drivers-directory-empty").hidden = !driversDirectoryVisible || matchingDrivers.length > 0;
    $("#drivers-directory-empty strong").textContent = drivers.length
      ? "No matching drivers"
      : "No drivers saved yet";
    $("#drivers-directory-empty span").textContent = drivers.length
      ? "Try a different name or phone number."
      : "Save a driver from an order form to make them available here.";
    $("#toggle-driver-directory").textContent = driversDirectoryVisible ? "Hide drivers" : "View drivers";
    $("#toggle-driver-directory").setAttribute("aria-expanded", String(driversDirectoryVisible));
  }

  function getDriverDateRange() {
    const period = $("#shaafici-driver-period").value;
    const dateInput = $("#shaafici-driver-date");
    if (!dateInput.value) dateInput.value = dateValue();
    dateInput.disabled = period === "all";

    if (period === "all") {
      $("#shaafici-driver-period-summary").textContent = "All time";
      return null;
    }

    const referenceDate = new Date(`${dateInput.value}T00:00:00`);
    const start = new Date(referenceDate);
    const end = new Date(referenceDate);
    if (period === "week") {
      const daysSinceMonday = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - daysSinceMonday);
      end.setTime(start.getTime());
      end.setDate(start.getDate() + 6);
    } else if (period === "month") {
      start.setDate(1);
      end.setFullYear(end.getFullYear(), end.getMonth() + 1, 0);
    } else if (period === "year") {
      start.setMonth(0, 1);
      end.setMonth(11, 31);
    }

    const range = { startDate: dateValue(start), endDate: dateValue(end) };
    const rangeLabel = period === "day"
      ? `Orders on ${formatDate(range.startDate)}`
      : period === "week"
        ? `Week of ${formatDate(range.startDate)} – ${formatDate(range.endDate)}`
        : period === "month"
          ? `Orders in ${referenceDate.toLocaleDateString("en", { month: "long", year: "numeric" })}`
          : `Orders in ${referenceDate.getFullYear()}`;
    $("#shaafici-driver-period-summary").textContent = rangeLabel;
    return range;
  }

  function getOrderDateForDriverFilter(order) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(order.date)) return order.date;
    const createdAt = Number(order.createdAt);
    return createdAt ? dateValue(new Date(createdAt)) : "";
  }

  function getOrdersForDriver(driver, dateRange = null) {
    const driverName = driver.name.trim().toLocaleLowerCase();
    const driverPhone = driver.phone.replace(/\D/g, "");
    return orders.filter((order) => {
      if (order.deletedAt) return false;
      const orderPhone = order.driverPhone.replace(/\D/g, "");
      const assignedToDriver = order.driver.trim().toLocaleLowerCase() === driverName
        || Boolean(driverPhone && orderPhone === driverPhone);
      if (!assignedToDriver || !dateRange) return assignedToDriver;
      const orderDate = getOrderDateForDriverFilter(order);
      return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
    }).sort((left, right) =>
      Number(Boolean(right.priority)) - Number(Boolean(left.priority))
      || (Number(right.createdAt) || 0) - (Number(left.createdAt) || 0)
    );
  }

  function isDriverDeliveryApproved(order) {
    return order.deliveryConfirmationStatus === "approved";
  }

  function deliveryProgressLabel(order) {
    if (isDriverDeliveryApproved(order)) return "Delivered";
    if (order.deliveryConfirmationStatus === "pending") return "Awaiting approval";
    if (order.deliveryConfirmationStatus === "rejected") return "Rejected — retry";
    if (normalizeOrderStatus(order.status) === "Cancelled") return "Cancelled";
    return "Not delivered";
  }

  function updateDriverDeliverySummary(assigned, delivered, awaiting, notDelivered) {
    $("#shaafici-summary-assigned").textContent = String(assigned);
    $("#shaafici-summary-delivered").textContent = String(delivered);
    $("#shaafici-summary-awaiting").textContent = String(awaiting);
    $("#shaafici-summary-not-delivered").textContent = String(notDelivered);
  }

  function renderDriverAnalytics(driverOrders) {
    const branchOrders = new Map();
    const dailyOrders = new Map();
    driverOrders.forEach((order) => {
      const branch = String(order.branch || "").trim() || "Unassigned";
      branchOrders.set(branch, (branchOrders.get(branch) || 0) + 1);
      const orderDate = getOrderDateForDriverFilter(order);
      if (orderDate) {
        dailyOrders.set(orderDate, (dailyOrders.get(orderDate) || 0) + 1);
      }
    });
    const dailyActivity = new Map([...dailyOrders.entries()]
      .map(([date, count]) => [formatDate(date), count]));
    renderOverviewChart(
      $("#shaafici-driver-branch-chart"),
      $("#shaafici-driver-branch-empty"),
      branchOrders,
      "transfers"
    );
    renderOverviewChart(
      $("#shaafici-driver-day-chart"),
      $("#shaafici-driver-day-empty"),
      dailyActivity,
      "transfers",
      7
    );
  }

  function sortDriversByOrderCount(driverList, dateRange = null) {
    return driverList
      .map((driver, index) => ({
        driver,
        index,
        orderCount: getOrdersForDriver(driver, dateRange).length
      }))
      .sort((left, right) => right.orderCount - left.orderCount || left.index - right.index)
      .map(({ driver }) => driver);
  }

  function renderShaaficiDrivers() {
    const options = $("#shaafici-driver-options");
    const optionsEmpty = $("#shaafici-driver-options-empty");
    const orderEmpty = $("#shaafici-driver-order-empty");
    const orderDetails = $("#shaafici-driver-order-details");
    const deliveryFilter = $("#shaafici-driver-delivery-filter").value;
    $$(".driver-delivery-summary [data-driver-delivery-filter]").forEach((card) => {
      card.setAttribute("aria-pressed", String(card.dataset.driverDeliveryFilter === deliveryFilter));
    });
    const query = $("#shaafici-driver-search").value.trim().toLocaleLowerCase();
    const dateRange = getDriverDateRange();
    const orderedDrivers = sortDriversByOrderCount(drivers.filter((driver) =>
      `${driver.name} ${driver.phone}`.toLocaleLowerCase().includes(query)
    ), dateRange);
    options.replaceChildren();
    optionsEmpty.hidden = orderedDrivers.length > 0;
    $("#shaafici-driver-options-empty strong").textContent = drivers.length
      ? "No matching drivers"
      : "No saved drivers";
    $("#shaafici-driver-options-empty span").textContent = drivers.length
      ? "Try a different name or phone number."
      : "No drivers are available yet.";

    if (!orderedDrivers.some((driver) => driver.phone === selectedShaaficiDriverPhone)) {
      selectedShaaficiDriverPhone = orderedDrivers[0]?.phone || "";
      selectedShaaficiOrderIndex = 0;
    }

    orderedDrivers.forEach((driver) => {
      const driverOrders = getOrdersForDriver(driver, dateRange);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "shaafici-driver-option";
      button.classList.toggle("active", driver.phone === selectedShaaficiDriverPhone);
      button.setAttribute("aria-pressed", String(driver.phone === selectedShaaficiDriverPhone));

      const identity = document.createElement("span");
      identity.className = "shaafici-driver-identity";
      const name = document.createElement("strong");
      name.textContent = driver.name;
      const phone = document.createElement("small");
      phone.textContent = driver.phone;
      identity.append(name, phone);

      const orderCount = document.createElement("span");
      orderCount.className = "shaafici-driver-order-total";
      orderCount.textContent = `${driverOrders.length} ${driverOrders.length === 1 ? "order" : "orders"}`;
      button.append(identity, orderCount);
      button.addEventListener("click", () => {
        selectedShaaficiDriverPhone = driver.phone;
        selectedShaaficiOrderIndex = 0;
        renderShaaficiDrivers();
      });
      options.append(button);
    });

    const selectedDriver = orderedDrivers.find((driver) => driver.phone === selectedShaaficiDriverPhone);
    if (!selectedDriver) {
      $("#shaafici-driver-activity").hidden = true;
      updateDriverDeliverySummary(0, 0, 0, 0);
      $("#shaafici-driver-take").hidden = true;
      $("#shaafici-driver-delivery-form").hidden = true;
      $("#shaafici-delivery-feedback").hidden = true;
      orderDetails.hidden = true;
      orderEmpty.hidden = false;
      orderEmpty.textContent = drivers.length
        ? query ? "No drivers match your search." : "Choose a driver to see their orders."
        : "No drivers are available yet.";
      return;
    }

    const driverOrders = getOrdersForDriver(selectedDriver, dateRange);
    $("#shaafici-driver-activity").hidden = false;
    renderDriverAnalytics(driverOrders);
    if (!driverOrders.length) {
      updateDriverDeliverySummary(0, 0, 0, 0);
      $("#shaafici-delivery-counts").textContent = "0 transfers";
      $("#shaafici-driver-delivery-list").replaceChildren();
      $("#shaafici-driver-delivery-list-empty").hidden =
        $("#shaafici-driver-delivery-filter").value === "all";
      $("#shaafici-driver-take").hidden = true;
      $("#shaafici-driver-delivery-form").hidden = true;
      $("#shaafici-delivery-feedback").hidden = true;
      orderDetails.hidden = true;
      orderEmpty.hidden = false;
      orderEmpty.textContent = dateRange
        ? `${selectedDriver.name} has no orders in this period.`
        : `${selectedDriver.name} has no saved orders yet.`;
      return;
    }

    const deliveredCount = driverOrders.filter(isDriverDeliveryApproved).length;
    const awaitingCount = driverOrders.filter((order) => order.deliveryConfirmationStatus === "pending").length;
    const notDeliveredCount = driverOrders.length - deliveredCount;
    updateDriverDeliverySummary(driverOrders.length, deliveredCount, awaitingCount, notDeliveredCount);
    $("#shaafici-driver-order-count").textContent =
      `${driverOrders.length} assigned · ${deliveredCount} delivered · ${awaitingCount} awaiting approval · ${notDeliveredCount} not delivered${dateRange ? " in selected period" : ""}`;
    const deliverySearchQuery = $("#shaafici-driver-delivery-search").value.trim().toLocaleLowerCase();
    const visibleOrders = driverOrders.map((order, index) => ({ order, index })).filter(({ order }) => {
      const matchesStatus = deliveryFilter === "delivered"
        ? isDriverDeliveryApproved(order)
        : deliveryFilter === "awaiting"
          ? order.deliveryConfirmationStatus === "pending"
          : deliveryFilter === "not-delivered"
            ? !isDriverDeliveryApproved(order)
            : true;
      if (!matchesStatus) return false;
      const searchableText = [
        order.id,
        order.transferId,
        order.customer,
        order.deliveredTo
      ].map((value) => String(value || "")).join(" ").toLocaleLowerCase();
      return !deliverySearchQuery || searchableText.includes(deliverySearchQuery);
    });
    if (visibleOrders.length && !visibleOrders.some(({ index }) => index === selectedShaaficiOrderIndex)) {
      selectedShaaficiOrderIndex = visibleOrders[0].index;
    }
    const deliveryList = $("#shaafici-driver-delivery-list");
    deliveryList.replaceChildren(...visibleOrders.map(({ order: listedOrder, index }) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "driver-delivery-list-item";
      button.classList.toggle("driver-delivery-list-item-priority", Boolean(listedOrder.priority));
      button.setAttribute("aria-pressed", String(index === selectedShaaficiOrderIndex));
      const identity = document.createElement("span");
      identity.className = "driver-delivery-list-identity";
      const orderId = document.createElement("strong");
      orderId.textContent = listedOrder.id;
      const priorityBadge = document.createElement("span");
      priorityBadge.className = "driver-priority-badge";
      priorityBadge.textContent = "PRIORITY";
      priorityBadge.hidden = !listedOrder.priority;
      const details = document.createElement("small");
      details.textContent = [listedOrder.transferId, listedOrder.customer].filter(Boolean).join(" · ") || "No transfer details";
      const status = document.createElement("span");
      const deliveryStatusClass = listedOrder.deliveryConfirmationStatus === "pending"
        ? "awaiting"
        : isDriverDeliveryApproved(listedOrder)
          ? "delivered"
          : listedOrder.deliveryConfirmationStatus === "rejected"
            ? "rejected"
            : "not-delivered";
      status.className = `driver-delivery-list-status driver-delivery-list-status-${deliveryStatusClass}`;
      status.textContent = deliveryProgressLabel(listedOrder);
      identity.append(orderId, priorityBadge, details);
      button.append(identity, status);
      button.addEventListener("click", () => {
        selectedShaaficiOrderIndex = index;
        renderShaaficiDrivers();
      });
      item.append(button);
      return item;
    }));
    $("#shaafici-delivery-counts").textContent =
      `${deliveredCount} delivered · ${awaitingCount} awaiting approval · ${notDeliveredCount} not delivered`;
    $("#shaafici-driver-delivery-list-empty").hidden = visibleOrders.length > 0;
    $("#shaafici-driver-delivery-list-empty").textContent = deliverySearchQuery
      ? "No transfers match your search and selected status."
      : "No transfers match this status.";
    $("#shaafici-driver-selected-order").hidden = visibleOrders.length === 0;

    selectedShaaficiOrderIndex = Math.min(selectedShaaficiOrderIndex, driverOrders.length - 1);
    const order = driverOrders[selectedShaaficiOrderIndex];
    orderEmpty.hidden = true;
    orderDetails.hidden = false;
    $("#shaafici-driver-order-title").textContent = `${selectedDriver.name} — ${selectedDriver.phone}`;
    $("#shaafici-order-number").textContent = order.id || "—";
    $("#shaafici-order-date").textContent = formatDate(order.date);
    $("#shaafici-order-customer").textContent = order.customer || "—";
    $("#shaafici-order-branch").textContent = order.branch || "—";
    $("#shaafici-order-transfer").textContent = order.transferId || "—";
    $("#shaafici-order-status").textContent = deliveryProgressLabel(order);
    $("#shaafici-order-position").textContent = `Order ${selectedShaaficiOrderIndex + 1} of ${driverOrders.length}`;

    const items = $("#shaafici-order-items");
    items.replaceChildren();
    order.items.forEach((item) => {
      const line = document.createElement("li");
      const product = document.createElement("strong");
      product.textContent = item.product || "Unnamed item";
      const quantities = Array.isArray(item.quantities)
        ? item.quantities
          .filter((quantity) => Number(quantity.quantity) > 0)
          .map((quantity) => `${quantity.quantity} ${quantity.unit || ""}`.trim())
        : Number(item.quantity) > 0 ? [`${item.quantity} ${item.unit || ""}`.trim()] : [];
      const details = document.createElement("span");
      const ordered = item.ordered ? `Ordered: ${item.ordered}` : "";
      details.textContent = [ordered, ...quantities].filter(Boolean).join(" · ") || "No quantity entered";
      line.append(product, details);
      items.append(line);
    });

    $("#shaafici-order-previous").disabled = selectedShaaficiOrderIndex === 0;
    $("#shaafici-order-next").disabled = selectedShaaficiOrderIndex >= driverOrders.length - 1;
    const deliveryForm = $("#shaafici-driver-delivery-form");
    const isAssignedDriver = cloudDeployment && cloudRole === "driver";
    const orderStatus = normalizeOrderStatus(order.status);
    const canSubmitDelivery = isAssignedDriver
      && ["In progress", "Delivered"].includes(orderStatus)
      && order.deliveryConfirmationStatus !== "pending"
      && !isDriverDeliveryApproved(order);
    $("#shaafici-driver-take").hidden = !isAssignedDriver || orderStatus !== "Pending"
      || order.approvalStatus === "pending";
    deliveryForm.hidden = !canSubmitDelivery;
    $("#shaafici-delivered-to").value = order.deliveredTo || "";
    $("#shaafici-delivered-to-phone").value = order.deliveredToPhone || "";
    $("#shaafici-delivery-note").value = order.deliveryNote || "";
    $("#shaafici-delivery-status").textContent = "";
    const deliveryFeedback = $("#shaafici-delivery-feedback");
    deliveryFeedback.textContent = order.deliveryConfirmationStatus === "pending"
      ? "Delivery submitted; waiting for owner/admin approval."
      : order.deliveryConfirmationStatus === "rejected"
        ? "Delivery rejected. Correct the recipient details and resubmit."
        : order.deliveryConfirmationStatus === "approved"
          ? `Delivery approved${order.deliveryConfirmationDecidedBy ? ` by ${order.deliveryConfirmationDecidedBy}` : ""}.`
          : orderStatus === "Pending"
            ? "Mark this transfer as taken when you start delivering it."
            : "";
    deliveryFeedback.hidden = !deliveryFeedback.textContent;
    const recipientValue = [order.deliveredTo, order.deliveredToPhone].filter(Boolean).join(" · ");
    const canViewRecipient = isAssignedDriver || ["owner", "admin"].includes(cloudRole);
    $("#shaafici-delivery-recipient-value").textContent = recipientValue;
    $("#shaafici-delivery-recipient").hidden =
      !canViewRecipient || !order.deliveryConfirmationStatus || !recipientValue;
    $("#shaafici-delivery-note-value").textContent = order.deliveryNote || "";
    $("#shaafici-delivery-note-view").hidden =
      !canViewRecipient || !order.deliveryConfirmationStatus || !order.deliveryNote;
  }

  async function saveShaaficiDriverOrderAction(order, action, details = {}) {
    if (offlineReadOnly) throw new Error("Offline access is read-only. Reconnect and reload before making changes.");
    const result = await invokeDriverDelivery({ action, orderId: order.id, ...details });
    if (!result?.order || result.order.id !== order.id) {
      throw new Error("The transfer update was submitted, but the updated transfer was not returned. Reload to check its status.");
    }
    const orderIndex = orders.findIndex((entry) => entry.id === order.id);
    if (orderIndex < 0) {
      throw new Error("The transfer update was submitted, but this transfer is no longer in the driver list. Reload to check its status.");
    }
    const updatedOrders = [...orders];
    updatedOrders[orderIndex] = result.order;
    orders = loadOrders(updatedOrders);
    try {
      localStorage.setItem(workspaceLocalStorageKey(STORAGE_KEY), JSON.stringify(orders));
    } catch (error) {
      console.warn("Could not keep a local backup of the driver transfer update.", error);
    }
    await saveOfflineSnapshot();
    renderSavedDrivers();
    renderAllOrders();
    showToast(action === "take"
      ? "Transfer marked as taken. Submit delivery for approval when it arrives."
      : "Delivery submitted. It will be marked delivered after owner/admin approval.");
  }

  async function submitShaaficiDriverDelivery(event) {
    event.preventDefault();
    const status = $("#shaafici-delivery-status");
    const submit = $("#shaafici-delivery-submit");
    if (cloudRole !== "driver") {
      status.textContent = "Only the assigned driver can submit a delivery.";
      status.classList.add("error");
      return;
    }
    const driver = drivers.find((entry) => entry.phone === cloudDriverKey);
    const driverOrders = driver && getOrdersForDriver(driver, getDriverDateRange());
    const order = driverOrders?.[selectedShaaficiOrderIndex];
    if (!order || !["In progress", "Delivered"].includes(normalizeOrderStatus(order.status))
      || order.deliveryConfirmationStatus === "pending"
      || isDriverDeliveryApproved(order)) {
      status.textContent = "This transfer cannot be submitted for delivery approval.";
      status.classList.add("error");
      return;
    }
    if (!$("#shaafici-driver-delivery-form").reportValidity()) return;

    submit.disabled = true;
    status.classList.remove("error");
    status.textContent = "Submitting delivery for approval…";
    try {
      await saveShaaficiDriverOrderAction(order, "deliver", {
        deliveredTo: $("#shaafici-delivered-to").value.trim(),
        deliveredToPhone: $("#shaafici-delivered-to-phone").value.trim(),
        deliveryNote: $("#shaafici-delivery-note").value.trim()
      });
    } catch (error) {
      console.error("Could not submit the driver delivery confirmation.", error);
      status.textContent = error.message || "Could not submit the delivery confirmation.";
      status.classList.add("error");
    } finally {
      submit.disabled = false;
    }
  }

  async function markShaaficiDriverOrderTaken() {
    const status = $("#shaafici-delivery-feedback");
    const button = $("#shaafici-driver-take");
    const driver = drivers.find((entry) => entry.phone === cloudDriverKey);
    const order = driver && getOrdersForDriver(driver, getDriverDateRange())[selectedShaaficiOrderIndex];
    if (cloudRole !== "driver" || !order) {
      status.textContent = "Only the assigned driver can update this transfer.";
      status.hidden = false;
      return;
    }
    button.disabled = true;
    try {
      await saveShaaficiDriverOrderAction(order, "take");
    } catch (error) {
      console.error("Could not mark the driver transfer as taken.", error);
      status.textContent = error.message || "Could not update this transfer.";
      status.hidden = false;
    } finally {
      button.disabled = false;
    }
  }
  function renderSavedDrivers() {
    $("#drivers-status").textContent = drivers.length
      ? `${drivers.length} ${drivers.length === 1 ? "driver" : "drivers"} saved`
      : "No drivers saved yet.";
    renderDriverDirectory();
    if (!$("#shaafici-driver-panel").hidden) renderShaaficiDrivers();
    const suggestions = $("#saved-driver-options");
    if (!suggestions.hidden) renderDriverSuggestions($("#order-driver").value);
  }

  function renderDriverSuggestions(query = "") {
    const input = $("#order-driver");
    const list = $("#saved-driver-options");
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const matchingDrivers = drivers.filter((driver) =>
      `${driver.name} ${driver.phone}`.toLocaleLowerCase().includes(normalizedQuery)
    );
    list.replaceChildren();
    if (!matchingDrivers.length) {
      const empty = document.createElement("div");
      empty.className = "driver-suggestions-empty";
      empty.textContent = drivers.length ? "No matching saved drivers." : "No saved drivers yet.";
      list.append(empty);
    } else {
      sortDriversByOrderCount(matchingDrivers).forEach((driver) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "driver-suggestion";
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", "false");
        const name = document.createElement("strong");
        name.textContent = driver.name;
        const phone = document.createElement("span");
        phone.textContent = driver.phone;
        option.append(name, phone);
        option.addEventListener("click", () => {
          input.value = driver.name;
          $("#driver-phone").value = driver.phone;
          hideDriverSuggestions();
          refreshPreview();
          input.focus();
        });
        list.append(option);
      });
    }
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function hideDriverSuggestions() {
    $("#saved-driver-options").hidden = true;
    $("#order-driver").setAttribute("aria-expanded", "false");
  }

  function fillSavedDriverPhone() {
    const selectedName = $("#order-driver").value.trim().toLocaleLowerCase();
    const driver = drivers.find((entry) => entry.name.toLocaleLowerCase() === selectedName);
    if (driver) $("#driver-phone").value = driver.phone;
  }

  async function saveDriver(nameInput, phoneInput, assignToOrder = false) {
    if (offlineReadOnly) {
      showToast("Offline access is read-only. Reconnect and reload before making changes.");
      return false;
    }
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    if (!name || !phone || !driverPhoneDigits(phone)) {
      showToast("Enter a driver name and a valid phone number.");
      return;
    }

    const phoneAlreadyRegistered = drivers.some((driver) =>
      driverPhoneDigits(driver.phone) === driverPhoneDigits(phone)
    );
    if (phoneAlreadyRegistered) {
      showToast("This driver is already registered.");
      return;
    }
    const previousDrivers = drivers;
    drivers = [...drivers, {
      driverKey: globalDriverKey(phone),
      name,
      phone
    }];
    if (!await persistDrivers(drivers[drivers.length - 1])) {
      drivers = previousDrivers;
      renderSavedDrivers();
      return;
    }

    renderSavedDrivers();
    nameInput.value = "";
    phoneInput.value = "";
    if (assignToOrder) {
      $("#order-driver").value = name;
      $("#driver-phone").value = phone;
      refreshPreview();
    }
    showToast("Driver saved for all branches.");
  }

  function dateValue(date = new Date()) {
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  }

  function orderStatusStartDate(order) {
    const statusChange = [...(order.history || [])].reverse()
      .find((entry) => entry.action === "Status changed");
    const timestamp = Number(statusChange?.timestamp) || Number(order.createdAt) || 0;
    return dateValue(new Date(timestamp));
  }

  function isOrderOverdue(order) {
    const now = new Date();
    const status = normalizeOrderStatus(order.status);
    const allowedDays = status === "Pending" ? 2 : status === "In progress" ? 1 : 0;
    if (!allowedDays || order.deletedAt) return false;
    const start = Date.parse(`${orderStatusStartDate(order)}T00:00:00Z`);
    const today = Date.parse(`${dateValue(now)}T00:00:00Z`);
    return Number.isFinite(start) && Math.floor((today - start) / 86400000) >= allowedDays;
  }

  function buildCatalogReservationIndex() {
    const byCode = new Map();
    const byUncodedName = new Map();
    const byName = new Map();
    const unappliedByCode = new Map();
    const unappliedByUncodedName = new Map();
    const unappliedByName = new Map();
    const addQuantity = (map, key, quantity) => map.set(key, (map.get(key) || 0) + quantity);

    orders.forEach((order) => {
      if (order.deletedAt || !["Pending", "In progress"].includes(normalizeOrderStatus(order.status))) return;
      const unapplied = !order.catalogTakenApplied;
      (order.items || []).forEach((orderItem) => {
        const name = String(orderItem.product || "").toLocaleLowerCase();
        const code = String(orderItem.product || "").match(/^\s*\[([^\]]+)\]/)?.[1]?.toLocaleLowerCase();
        const quantity = Math.max(0, Number(orderItem.ordered) || 0);
        addQuantity(byName, name, quantity);
        if (unapplied) addQuantity(unappliedByName, name, quantity);
        if (code) {
          addQuantity(byCode, code, quantity);
          if (unapplied) addQuantity(unappliedByCode, code, quantity);
        } else {
          addQuantity(byUncodedName, name, quantity);
          if (unapplied) addQuantity(unappliedByUncodedName, name, quantity);
        }
      });
    });

    return { byCode, byUncodedName, byName, unappliedByCode, unappliedByUncodedName, unappliedByName };
  }

  function getCatalogReservationIndex() {
    if (catalogReservationIndex && catalogReservationIndexOrders === orders) return catalogReservationIndex;
    catalogReservationIndex = buildCatalogReservationIndex();
    catalogReservationIndexOrders = orders;
    return catalogReservationIndex;
  }

  function reservedQuantityFor(item, includeApplied = true, reservationIndex = getCatalogReservationIndex()) {
    const productCode = item.product.match(/^\s*\[([^\]]+)\]/)?.[1]?.toLocaleLowerCase();
    const productName = item.product.toLocaleLowerCase();
    if (productCode) {
      const codeTotals = includeApplied ? reservationIndex.byCode : reservationIndex.unappliedByCode;
      const nameTotals = includeApplied ? reservationIndex.byUncodedName : reservationIndex.unappliedByUncodedName;
      return (codeTotals.get(productCode) || 0) + (nameTotals.get(productName) || 0);
    }
    const nameTotals = includeApplied ? reservationIndex.byName : reservationIndex.unappliedByName;
    return nameTotals.get(productName) || 0;
  }

  function availableStockAfterReservations(item, reservationIndex = getCatalogReservationIndex()) {
    const remaining = remainingStockValues(item);
    const currentRemaining = remaining.length ? Math.min(...remaining) : 0;
    return Math.max(0, currentRemaining - reservedQuantityFor(item, false, reservationIndex));
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
        const catalogMatches = getCatalogProductMatches(extractedProduct);
        const catalogProduct = getCatalogProduct(extractedProduct);
        const catalogChoices = getCatalogMatchChoices(extractedProduct).map((item) => item.product);
        const catalogNames = [...new Set(catalogMatches.map((item) => item.product))];
        const product = catalogProduct?.product || (catalogNames.length === 1 ? catalogNames[0] : extractedProduct);
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
          catalogChoices,
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
    const columnText = column.map((item) => item.text).join(" ");
    const quantityMatch = columnText.match(/-?[\d,]+(?:\.\d+)?/);
    if (!quantityMatch) return { quantity: 0, unit: fallbackUnit };
    const quantityText = quantityMatch[0];
    const unitMatch = columnText.match(/\b(PCS|PC|MTR|M2|M3|M|SQM|SQFT|BOX|CTN|CARTON|ROLL|LTR|KG)\b/i);
    const normalizedUnit = unitMatch?.[1].toUpperCase();
    const unit = normalizedUnit === "PC" || normalizedUnit === "PCS" ? "PCS" : normalizedUnit;
    if (!unit || !units.includes(unit)) {
      throw new Error(`The delivery slip contains an unsupported unit: ${unitText?.text || "missing unit"}.`);
    }
    return { quantity: Number(quantityText.replaceAll(",", "")), unit };
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
        const code = extractCatalogCode(productItems.map((item) => item.text).join(" "));
        if (code) rows.push({ code, lines: [{ line, productItems }] });
        else if (rows.length && productItems.length) rows[rows.length - 1].lines.push({ line, productItems });
      });

      rows.forEach((row) => {
        const firstLine = row.lines[0].line;
        const orderQuantity = readDeliveryQuantity(firstLine.items, orderedStart, deliveredStart, "PCS");
        const deliveredQuantity = readDeliveryQuantity(firstLine.items, deliveredStart, Number.POSITIVE_INFINITY, orderQuantity.unit);
        const catalogMatches = getCatalogProductsByCode(row.code);
        const descriptions = row.lines.map(({ productItems }) =>
          productItems.map((item) => item.text).join(" ").trim()
        ).filter(Boolean);
        const product = descriptions.join(" ").replace(/\s+/g, " ").trim();
        const normalizedProduct = cleanPdfText(product).toLocaleLowerCase();
        const exactMatches = catalogMatches.filter((item) =>
          cleanPdfText(item.product).toLocaleLowerCase() === normalizedProduct
        );
        const catalogProduct = exactMatches.length === 1
          ? exactMatches[0]
          : exactMatches.length === 0 && catalogMatches.length === 1 ? catalogMatches[0] : undefined;
        const catalogNames = [...new Set(catalogMatches.map((item) => item.product))];
        const catalogChoices = catalogMatches.length > 1
          ? catalogMatches.map((item) => item.product)
          : [];
        const selectedProduct = catalogProduct?.product
          || (catalogNames.length === 1 ? catalogNames[0] : product);
        const qtyItem = catalogProduct?.qtyItems?.length === 1 ? Number(catalogProduct.qtyItems[0]) : NaN;
        let quantities = [{ quantity: deliveredQuantity.quantity, unit: deliveredQuantity.unit }];
        if (isTileProduct(selectedProduct)) {
          const converter = getTileConverter(selectedProduct, catalogProduct?.qtyItems?.[0]);
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
          product: selectedProduct,
          ordered: orderQuantity.quantity,
          quantities,
          catalogChoices,
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

  function findDuplicateTransferOrder(transferId, excludedOrderId = "") {
    const normalizedTransferId = String(transferId || "").trim().toLocaleLowerCase();
    if (!normalizedTransferId) return null;
    return orders.find((order) => order.id !== excludedOrderId
      && !order.deletedAt
      && String(order.transferId || "").trim().toLocaleLowerCase() === normalizedTransferId) || null;
  }

  function clearPdfImportStatus() {
    const status = $("#pdf-import-status");
    status.hidden = true;
    status.classList.remove("error", "duplicate-warning");
    status.textContent = "";
  }

  async function importOrderPdf(file) {
    if (offlineReadOnly) {
      showToast("Offline access is read-only. Reconnect and reload before importing an order.");
      return;
    }
    const status = $("#pdf-import-status");
    status.hidden = false;
    status.classList.remove("error", "duplicate-warning");
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
      const duplicateTransfer = findDuplicateTransferOrder(imported.transferId);
      resetForm();
      status.hidden = false;
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
      if (duplicateTransfer) {
        status.classList.add("duplicate-warning");
        status.textContent = `Transfer ID ${imported.transferId} has already been uploaded and saved. You may review the PDF, but this order cannot be saved again.`;
        showToast(`Transfer ID ${imported.transferId} has already been saved.`);
      } else {
        status.textContent = `Imported ${imported.items.length} item lines. Review the order before saving.`;
        showToast("PDF imported. Review the order before saving.");
      }
    } catch (error) {
      console.error("Could not import the order PDF.", error);
      status.classList.add("error");
      status.textContent = error.message || "Could not read this PDF. Please try another file.";
      showToast("Could not import the PDF. See the message on Overview.");
    }
  }

  function setView(name, { recordHistory = true, confirmUnsaved = true } = {}) {
    if (cloudDeployment && cloudRole === "driver" && name !== "drivers" && name !== "profile") {
      name = "drivers";
      recordHistory = false;
      confirmUnsaved = false;
    }
    if (name !== "new-order" && $("#new-order-view").classList.contains("active")
      && confirmUnsaved && !confirmDiscardUnsavedOrder()) return false;
    closeMobileNavigation();
    if (name === "users" && cloudRole !== "owner") {
      showToast("Only the workspace owner can manage users.");
      name = "overview";
    }
    if (name === "profile" && (!cloudDeployment || !cloudUser)) name = "overview";
    const activeView = $(".view.active")?.id.replace(/-view$/, "");
    if (recordHistory && activeView && activeView !== name) viewHistory.push(activeView);
    $$(".view").forEach((view) => view.classList.toggle("active", view.id === `${name}-view`));
    $$("[data-view]").forEach((link) => link.classList.toggle("active", link.dataset.view === name));
    $("#app-back-button").hidden = name === "overview";
    const labels = { overview: "Overview", orders: "All orders", catalog: "Product catalog", history: "User activity log", notifications: "Notifications", reports: "Reports", "transfer-history": "Transfer history", "item-history": "Item history", "returned-tiles": "Returned tiles", drivers: "Drivers", users: "Users", profile: "Your profile", "new-order": editingId ? "Edit order" : "Create an order", "print-preview": "Print preview" };
    $("#breadcrumb-current").textContent = labels[name] || "Overview";
    if (name === "orders") renderAllOrders();
    if (name === "history") renderHistory();
    if (name === "notifications") renderNotifications();
    if (name === "reports") renderReports();
    if (name === "catalog") renderProductCatalogTable();
    if (name === "transfer-history") renderTransferHistory();
    if (name === "item-history") renderItemHistory();
    if (name === "returned-tiles") renderReturnedTiles();
    if (name === "drivers") {
      renderDriverDirectory();
      if (!$("#shaafici-driver-panel").hidden) renderShaaficiDrivers();
    }
    if (name === "overview") renderOverview();
    if (name === "users" && cloudRole === "owner") loadWorkspaceUsers();
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
            <label class="item-catalog-match-field" hidden><span>SELECT CATALOG ITEM — TAKEN WILL BE SUBTRACTED HERE</span><select class="item-input catalog-match-input" aria-label="Catalog item to subtract taken from"></select></label>
            <label class="item-ordered-field"><span>ORDERED</span><input class="item-input ordered-input" aria-label="Ordered" type="number" min="0" step="any" placeholder="0" value="${escapeAttribute(item.ordered ?? "")}"></label>
            <label class="item-qty-item-field"><span>QTY/ITEM</span><span class="qty-item-control"></span></label>
          </div>
          <div class="quantity-fields"><span class="quantity-fields-heading">QUANTITIES &amp; UNITS</span><div class="quantity-pairs"></div><small class="qty-calculation-message" role="status" hidden></small></div>
        </div>
      </td>
      <td><button class="remove-item" type="button" aria-label="Remove item">×</button></td>`;
    renderCatalogMatchField(row, item.catalogChoices, item.product);
    renderQtyItemField(row, item.qtyItem);
    renderQuantityFields(row, item, [], { showZero: preserveQuantities });
    row.dataset.preserveImportedQuantities = String(preserveQuantities);
    if (afterRow?.parentElement === itemsBody) afterRow.after(row);
    else itemsBody.append(row);
    if (!preserveQuantities) calculateOrderedQuantity(row);
    updateItemIndexes();
    updateItems();
  }

  function renderCatalogMatchField(row, choices = [], selectedProduct = "") {
    const field = $(".item-catalog-match-field", row);
    const select = $(".catalog-match-input", row);
    const uniqueChoices = [...new Set(choices)];
    field.hidden = uniqueChoices.length < 2;
    select.required = uniqueChoices.length > 1;
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.disabled = true;
    placeholder.textContent = "Choose the product variant";
    select.replaceChildren(placeholder, ...uniqueChoices.map((product) => {
      const option = document.createElement("option");
      option.value = product;
      option.textContent = product;
      return option;
    }));
    select.value = uniqueChoices.includes(selectedProduct) ? selectedProduct : "";
  }

  function syncCatalogMatchSelection(row) {
    const select = $(".catalog-match-input", row);
    if (!select) return;
    const product = $(".product-input", row).value.trim();
    select.value = [...select.options].some((option) => option.value === product) ? product : "";
  }

  function renderQuantityFields(row, item = {}, unitDefaults = [], { showZero = false } = {}) {
    const product = $(".product-input", row).value.trim();
    const productData = getCatalogProduct(product, item.qtyItem) || getCatalogProductMatches(product)[0];
    const catalogUnit = productData?.unit || units[0];
    const savedQuantities = Array.isArray(item.quantities)
      ? item.quantities
      : [{ quantity: item.quantity, unit: item.unit }];
    const hasQtyItem = !isTileProduct(product) && getCatalogQtyItemOptions(product).length > 0;
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
    const values = getCatalogQtyItemOptions(product);
    const control = $(".qty-item-control", row);
    if (values.length > 1) {
      const selected = values.find((value) => sameCatalogQtyItem(value, selectedValue)) || "";
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
      && getCatalogProduct($(".product-input", row).value, qtyItemInput.value)?.qtyItems?.length;
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
    indexCatalogProduct(item);
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
      const catalogItem = getCatalogProduct(orderItem.product, orderItem.qtyItem);
      if (!catalogItem) continue;
      if (!Array.isArray(catalogItem.quantities) || !catalogItem.quantities.length) continue;
      const qtyItemIndex = (catalogItem.qtyItems || [])
        .findIndex((value) => sameCatalogQtyItem(value, orderItem.qtyItem));
      const stockIndex = qtyItemIndex >= 0 ? qtyItemIndex : 0;
      const currentQuantity = Number(catalogItem.quantities[stockIndex]);
      const currentTaken = Number(catalogItem.taken?.[stockIndex]);
      const previousValue = warehouseTransfer ? currentQuantity : currentTaken;
      const nextValue = (Number.isFinite(previousValue) ? previousValue : 0)
        + (warehouseTransfer ? -ordered : ordered) * multiplier;
      if (warehouseTransfer) {
        catalogItem.quantities = [...catalogItem.quantities];
        catalogItem.quantities[stockIndex] = formatCatalogNumber(nextValue);
      } else {
        catalogItem.taken = Array.isArray(catalogItem.taken) ? [...catalogItem.taken] : [];
        catalogItem.taken[stockIndex] = formatCatalogNumber(nextValue);
      }
      recalculateCatalogProduct(catalogItem);
      changes.push({
        product: catalogItem.product,
        productId: catalogItem.product.match(/^\s*\[([^\]]+)\]/)?.[1] || catalogItem.product,
        ordered: ordered * multiplier,
        movement: warehouseTransfer ? "Quantity" : "Taken",
        qtyItem: catalogItem.qtyItems?.[stockIndex] || "",
        previousValue: Number.isFinite(previousValue) ? previousValue : 0,
        quantity: catalogItem.quantities[stockIndex],
        taken: catalogItem.taken?.[stockIndex],
        remaining: catalogItem.rQuantities[stockIndex],
        uomN: catalogItem.uomNs[stockIndex],
        status: catalogItem.statuses[stockIndex],
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
            `${change.productId}${change.qtyItem ? ` (Q/ITEM ${change.qtyItem})` : ""}: Ordered ${formatCatalogNumber(Math.abs(change.ordered))}, ${change.movement} ${formatCatalogNumber(change.movement === "Quantity" ? change.quantity : change.taken)}, R/QUANTITY ${formatCatalogNumber(change.remaining)}, UOM/N ${formatCatalogNumber(change.uomN)}, STS ${change.status}`
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
    const row = input.closest("tr");
    const productChanged = row.dataset.qtyItemProduct !== product.toLocaleLowerCase();
    const previousQtyItem = productChanged ? "" : $(".qty-item-input", row).value;
    const item = getCatalogProduct(product, previousQtyItem)
      || getCatalogProduct(product)
      || getCatalogProductMatches(product)[0];
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
    const hasQtyItem = getCatalogQtyItemOptions(product).length > 0;
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
    receiptScreenshotPromise = null;
    receiptScreenshotCacheKey = "";
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
    if (layout === "receipt") requestAnimationFrame(prepareReceiptScreenshot);
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
    return takeReceiptScreenshotReceiptPreview();

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
    const width = 282;
    const scale = 1;
    const padding = 4;
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

  function getReceiptScreenshotBlob() {
    if (!printPreviewOrder) throw new Error("There is no order to capture.");
    const sheet = $(".print-sheet");
    if (!sheet) throw new Error("The Epson receipt preview is unavailable.");
    const bounds = sheet.getBoundingClientRect();
    const cacheKey = `${printPreviewOrder.id}:${bounds.width}:${bounds.height}`;
    if (receiptScreenshotPromise && receiptScreenshotCacheKey === cacheKey) return receiptScreenshotPromise;

    receiptScreenshotCacheKey = cacheKey;
    const screenshotPromise = Promise.resolve().then(async () => {
      if (typeof window.html2canvas !== "function") {
        const bundledScript = new URL("vendor/html2canvas/html2canvas.min.js", location.href).href;
        try {
          await loadExternalScript(bundledScript);
        } catch (error) {
          console.warn("Could not load the bundled receipt screenshot library; trying the CDN copy.", error);
          await loadExternalScript("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js");
        }
      }
      const screenshotter = window.html2canvas;
      if (typeof screenshotter !== "function") {
        throw new Error("The receipt screenshot library did not initialize. Check your internet connection and try again.");
      }
      const canvas = await screenshotter(sheet, {
        backgroundColor: "#fff",
        scale: 2,
        logging: false,
        onclone: (captureDocument) => {
          captureDocument.querySelector("#take-receipt-screenshot")?.remove();
          captureDocument.querySelector(".print-sheet-header")?.remove();
          captureDocument.querySelector(".print-sheet-rule")?.remove();
          captureDocument.querySelectorAll(".print-item-product").forEach((product) => {
            if (!/[\u0590-\u08ff]/.test(product.textContent || "")) {
              product.style.direction = "ltr";
              product.style.unicodeBidi = "normal";
            }
          });
          captureDocument.querySelectorAll(".print-item-ordered").forEach((ordered) => {
            ordered.style.direction = "ltr";
            ordered.style.unicodeBidi = "normal";
          });
        }
      });
      return new Promise((resolve, reject) => {
        if (canvas.width > 32767 || canvas.height > 32767) {
          reject(new Error("This receipt is too large to capture as one image."));
          return;
        }
        canvas.toBlob((blob) => blob
          ? resolve(blob)
          : reject(new Error("Could not encode the screenshot image.")), "image/png");
      });
    }).catch((error) => {
      if (receiptScreenshotPromise === screenshotPromise) {
        receiptScreenshotPromise = null;
        receiptScreenshotCacheKey = "";
      }
      throw error;
    });
    receiptScreenshotPromise = screenshotPromise;
    return screenshotPromise;
  }

  function prepareReceiptScreenshot() {
    if (!printPreviewOrder || printLayout !== "receipt") return;
    getReceiptScreenshotBlob().catch((error) => {
      console.error("Could not pre-capture the Epson receipt.", error);
    });
  }

  async function takeReceiptScreenshotReceiptPreview() {
    if (!printPreviewOrder) throw new Error("There is no order to capture.");
    if (!navigator.clipboard?.write || typeof ClipboardItem !== "function") {
      throw new Error("Image clipboard access is unavailable. Allow clipboard access in Firefox, then try again.");
    }
    if (printLayout !== "receipt") setPrintLayout("receipt");

    const png = getReceiptScreenshotBlob();
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
    return true;
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
    const previousOrder = orders.find((order) => order.id === editingId);
    return {
      id: editingId || nextOrderId(),
      locationId: previousOrder?.locationId || activeLocationId,
      customer: data.get("customer").trim(),
      branch: data.get("branch").trim(),
      category: data.get("category"),
      transferId: data.get("transferId").trim(),
      date: data.get("date"),
      driver: data.get("driver").trim(),
      driverPhone: data.get("driverPhone").trim(),
      preparedBy: data.get("preparedBy").trim(),
      notes: data.get("notes").trim(),
      priority: $("#order-priority").checked,
      status: editingId ? normalizeOrderStatus(previousOrder?.status) : "Pending",
      approvalStatus: previousOrder?.approvalStatus || "",
      approvalRequestedBy: previousOrder?.approvalRequestedBy || "",
      approvalRequestedById: previousOrder?.approvalRequestedById || "",
      approvalRequestedAt: previousOrder?.approvalRequestedAt || 0,
      approvalDecidedBy: previousOrder?.approvalDecidedBy || "",
      approvalDecidedAt: previousOrder?.approvalDecidedAt || 0,
      deliveryConfirmationStatus: previousOrder?.deliveryConfirmationStatus || "",
      deliveryConfirmationRequestedBy: previousOrder?.deliveryConfirmationRequestedBy || "",
      deliveryConfirmationRequestedById: previousOrder?.deliveryConfirmationRequestedById || "",
      deliveryConfirmationRequestedAt: previousOrder?.deliveryConfirmationRequestedAt || 0,
      deliveryConfirmationDecidedBy: previousOrder?.deliveryConfirmationDecidedBy || "",
      deliveryConfirmationDecidedAt: previousOrder?.deliveryConfirmationDecidedAt || 0,
      deliveredTo: previousOrder?.deliveredTo || "",
      deliveredToPhone: previousOrder?.deliveredToPhone || "",
      deliveryNote: previousOrder?.deliveryNote || "",
      deliveredAt: previousOrder?.deliveredAt || 0,
      takenAt: previousOrder?.takenAt || 0,
      items: getItems(),
      createdAt: editingId ? previousOrder?.createdAt || Date.now() : Date.now()
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
      priority: $("#order-priority").checked,
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
    const status = normalizeOrderStatus(order.status);
    const overdue = isOrderOverdue(order);
    const deliveryRecipientNotice = ["owner", "admin"].includes(cloudRole)
      && ["pending", "approved", "rejected"].includes(order.deliveryConfirmationStatus)
      ? `<small class="delivery-recipient-detail">Recipient: ${escapeAttribute(order.deliveredTo || "—")} · ${escapeAttribute(order.deliveredToPhone || "—")}</small>`
      : "";
    const deliveryNoteNotice = ["owner", "admin"].includes(cloudRole)
      && ["pending", "approved", "rejected"].includes(order.deliveryConfirmationStatus)
      && order.deliveryNote
      ? `<small class="delivery-recipient-detail">Delivery note: ${escapeAttribute(order.deliveryNote)}</small>`
      : "";
    const approvalNotice = order.approvalStatus === "pending"
      ? "Awaiting order approval"
      : order.deliveryConfirmationStatus === "pending"
        ? "Delivery awaiting approval"
        : order.deliveryConfirmationStatus === "rejected"
          ? "Delivery rejected — driver may resubmit"
          : "";
    const row = document.createElement("tr");
    row.className = "clickable-order-row";
    if (overdue) row.classList.add("order-overdue-row");
    row.tabIndex = 0;
    row.setAttribute("aria-label", `Open order ${order.id}`);
    row.innerHTML = `
      <td><span class="order-number">${escapeAttribute(order.id)}</span>${order.priority ? '<span class="order-priority-badge">PRIORITY</span>' : ""}</td>
      <td class="customer-cell">${escapeAttribute(order.customer)}${overdue ? '<small class="overdue-label">OVERDUE</small>' : ""}</td>
      <td>${escapeAttribute(order.transferId || "—")}</td>
      <td>${formatDate(order.date)}</td>
      <td><button class="status-pill status-${statusClass(status)}" type="button" aria-label="Change status for ${escapeAttribute(order.id)}" title="Click to change status">${escapeAttribute(status)}</button>${approvalNotice ? `<small class="approval-state">${escapeAttribute(approvalNotice)}</small>` : ""}${deliveryRecipientNotice}${deliveryNoteNotice}</td>
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
    if (key === "status") return normalizeOrderStatus(order.status).toLocaleLowerCase();
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

  function overviewDateRange(period, selectedDate) {
    const date = new Date(`${selectedDate}T00:00:00`);
    let start = selectedDate;
    if (period === "week") {
      start = dateValue(new Date(date.getFullYear(), date.getMonth(), date.getDate() - ((date.getDay() + 6) % 7)));
    } else if (period === "month") {
      start = dateValue(new Date(date.getFullYear(), date.getMonth(), 1));
    } else if (period === "year") {
      start = dateValue(new Date(date.getFullYear(), 0, 1));
    }
    return { start, end: selectedDate };
  }

  function renderOverviewChart(target, empty, values, unit, limit = 5) {
    const entries = [...values.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], undefined, { sensitivity: "base" }))
      .slice(0, limit);
    target.replaceChildren(...entries.map(([label, count]) => {
      const row = document.createElement("li");
      row.className = "analytics-row";
      const heading = document.createElement("div");
      heading.className = "analytics-row-heading";
      const name = document.createElement("span");
      name.className = "analytics-row-label";
      name.textContent = label;
      name.title = label;
      const value = document.createElement("span");
      value.className = "analytics-row-value";
      const countLabel = `${count.toLocaleString("en")} ${count === 1 ? unit.replace(/s$/, "") : unit}`;
      value.textContent = countLabel;
      heading.append(name, value);
      const track = document.createElement("div");
      track.className = "analytics-bar-track";
      track.setAttribute("role", "meter");
      track.setAttribute("aria-label", `${label}: ${countLabel}`);
      track.setAttribute("aria-valuemin", "0");
      track.setAttribute("aria-valuemax", String(entries[0][1]));
      track.setAttribute("aria-valuenow", String(count));
      const bar = document.createElement("span");
      bar.className = "analytics-bar";
      bar.style.width = `${Math.max(4, (count / entries[0][1]) * 100)}%`;
      track.append(bar);
      row.append(heading, track);
      return row;
    }));
    empty.hidden = entries.length > 0;
  }

  function renderOverviewAnalytics(activeOrders) {
    const period = $("#overview-period").value;
    const dateInput = $("#overview-date");
    if (!dateInput.value) dateInput.value = dateValue();
    const selectedDate = dateInput.value;
    const range = overviewDateRange(period, selectedDate);
    const matchingOrders = activeOrders.filter((order) =>
      normalizeOrderStatus(order.status) !== "Cancelled"
      && typeof order.date === "string"
      && order.date >= range.start && order.date <= range.end
    );
    const productOrders = new Map();
    const branchOrders = new Map();
    matchingOrders.forEach((order) => {
      const productsInOrder = new Set((order.items || [])
        .map((item) => String(item.product || "").trim())
        .filter(Boolean));
      productsInOrder.forEach((product) => {
        productOrders.set(product, (productOrders.get(product) || 0) + 1);
      });
      const branch = String(order.branch || "").trim() || "Unassigned";
      branchOrders.set(branch, (branchOrders.get(branch) || 0) + 1);
    });
    const periodLabels = { day: "Day", week: "Week to date", month: "Month to date", year: "Year to date" };
    $("#overview-analytics-period").textContent = `${periodLabels[period]} · ${formatDate(range.start)}–${formatDate(range.end)}`;
    renderOverviewChart($("#overview-product-sales"), $("#overview-products-empty"), productOrders, "orders");
    renderOverviewChart($("#overview-branch-activity"), $("#overview-branches-empty"), branchOrders, "orders");
  }

  function renderOverview() {
    const activeOrders = orders.filter((order) => !order.deletedAt);
    renderOverviewAnalytics(activeOrders);
    const sorted = sortOrders(activeOrders);
    $("#stat-total").textContent = String(activeOrders.length);
    $("#stat-items").textContent = productCatalog.length.toLocaleString("en");
    $("#stat-pending").textContent = String(activeOrders.filter((order) => normalizeOrderStatus(order.status) === "Pending").length);
    $("#stat-in-progress").textContent = String(activeOrders.filter((order) => normalizeOrderStatus(order.status) === "In progress").length);
    $("#stat-delivered").textContent = String(activeOrders.filter((order) => normalizeOrderStatus(order.status) === "Delivered").length);
    $("#stat-cancelled").textContent = String(activeOrders.filter((order) => normalizeOrderStatus(order.status) === "Cancelled").length);
    $("#stat-overdue").textContent = String(activeOrders.filter(isOrderOverdue).length);
    $("#stat-low-stock").textContent = String(productCatalog.filter(isCatalogLowStock).length);
    $("#stat-ended-products").textContent = String(productCatalog.filter(isCatalogEnded).length);
    $("#stat-critical-stock").textContent = String(productCatalog.filter(isCatalogCritical).length);
    $("#nav-order-count").textContent = String(activeOrders.length);
    const target = $("#recent-orders");
    target.replaceChildren(...sorted.slice(0, 5).map(orderRow));
    labelTableRows(target);
    $("#recent-empty").hidden = sorted.length > 0;
    renderApprovalRequests();
    renderNotifications();
  }

  const DELIVERY_APPROVAL_REMINDER_MS = 4 * 60 * 60 * 1000;

  function formatApprovalWait(timestamp) {
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    const hours = Math.floor(elapsedMinutes / 60);
    const minutes = elapsedMinutes % 60;
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  function refreshApprovalReminderIndicators() {
    const canReviewDeliveryDetails = ["owner", "admin"].includes(cloudRole);
    let overdueCount = 0;
    $$("#approval-requests tr[data-request-type]").forEach((row) => {
      const timestamp = Number(row.dataset.requestTimestamp) || 0;
      const overdue = canReviewDeliveryDetails
        && row.dataset.requestType === "Delivery confirmation"
        && timestamp > 0
        && Date.now() - timestamp >= DELIVERY_APPROVAL_REMINDER_MS;
      const statusCell = row.children[4];
      if (statusCell) {
        statusCell.textContent = overdue ? `Review overdue · ${formatApprovalWait(timestamp)}` : "Pending";
        statusCell.classList.toggle("approval-reminder-overdue", overdue);
      }
      row.classList.toggle("approval-reminder-overdue-row", overdue);
      if (overdue) overdueCount += 1;
    });

    const summary = $("#approval-reminder-summary");
    if (!summary) return;
    summary.textContent = canReviewDeliveryDetails && overdueCount
      ? `${overdueCount} delivery confirmation${overdueCount === 1 ? " has" : "s have"} waited at least 4 hours.`
      : "Delivery confirmations waiting at least 4 hours are flagged here.";
    summary.classList.toggle("has-overdue", canReviewDeliveryDetails && overdueCount > 0);
  }

  function renderApprovalRequests() {
    const target = $("#approval-requests");
    if (!target) return;
    const canReviewDeliveryDetails = ["owner", "admin"].includes(cloudRole);
    const requests = [
      ...orders.filter((order) => !order.deletedAt && order.approvalStatus === "pending")
        .map((order) => ({
          type: "Order",
          id: order.id,
          summary: `${order.id} · ${order.customer}`,
          requester: order.approvalRequestedBy || "Unknown user",
          timestamp: Number(order.approvalRequestedAt) || Number(order.createdAt) || 0
        })),
      ...orders.filter((order) => !order.deletedAt && order.deliveryConfirmationStatus === "pending")
        .map((order) => ({
          type: "Delivery confirmation",
          id: order.id,
          summary: [
            `${order.id} · ${order.transferId || "No transfer ID"} · ${order.customer}`,
            canReviewDeliveryDetails && order.deliveredTo
              ? `Recipient: ${order.deliveredTo}${order.deliveredToPhone ? ` (${order.deliveredToPhone})` : ""}`
              : "",
            canReviewDeliveryDetails && order.deliveryNote ? `Note: ${order.deliveryNote}` : ""
          ].filter(Boolean).join(" · "),
          requester: order.deliveryConfirmationRequestedBy || order.driver || "Driver",
          timestamp: Number(order.deliveryConfirmationRequestedAt) || Number(order.createdAt) || 0
        })),
      ...catalogApprovals.filter((request) => request.status === "pending")
        .map((request) => ({
          type: "Stock adjustment",
          id: request.id,
          summary: `${request.product} · ${formatCatalogNumber(request.amount)} ${request.unit || ""} · ${request.reason}`,
          requester: request.requestedBy || "Unknown user",
          timestamp: Number(request.timestamp) || 0
        }))
    ].sort((left, right) => right.timestamp - left.timestamp);
    target.replaceChildren(...requests.map((request) => {
      const row = document.createElement("tr");
      row.dataset.requestType = request.type;
      row.dataset.requestTimestamp = String(request.timestamp || 0);
      [request.type, request.summary, request.requester,
        request.timestamp ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(request.timestamp) : "—",
        "Pending"].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      const actions = document.createElement("td");
      if (["owner", "admin"].includes(cloudRole)) {
        ["approve", "reject"].forEach((decision) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "order-action-button";
          button.textContent = decision === "approve" ? "Approve" : "Reject";
          button.addEventListener("click", () => decideApproval(request, decision));
          actions.append(button);
        });
      } else {
        actions.textContent = "Admin review required";
      }
      row.append(actions);
      return row;
    }));
    refreshApprovalReminderIndicators();
    labelTableRows(target);
    $("#approvals-empty").hidden = requests.length > 0;
  }

  async function decideApproval(request, decision) {
    if (!["owner", "admin"].includes(cloudRole)) {
      showToast("Only workspace admins can decide approval requests.");
      return;
    }
    try {
      const body = request.type === "Order"
        ? { action: "decide-order", orderId: request.id, decision }
        : request.type === "Delivery confirmation"
          ? { action: "decide-delivery", orderId: request.id, decision }
          : { action: "decide-adjustment", requestId: request.id, decision, locationId: activeLocationId };
      await invokeWorkflowManagement(body);
      await loadCloudData(false);
      renderProductCatalogOptions();
      renderApprovalRequests();
      renderAllOrders();
      renderOverview();
      showToast(`${request.type} request ${decision === "approve" ? "approved" : "rejected"}.`);
    } catch (error) {
      console.error("Could not decide approval request.", error);
      showToast(error.message || "Could not update the approval request.");
    }
  }

  function renderAllOrders() {
    const query = $("#order-search").value.trim().toLowerCase();
    const status = $("#status-filter").value;
    const branch = $("#order-branch-filter").value.trim().toLocaleLowerCase();
    const driver = $("#order-driver-filter").value.trim().toLocaleLowerCase();
    const from = $("#order-date-from-filter").value;
    const to = $("#order-date-to-filter").value;
    const filtered = sortOrders(orders.filter((order) => !order.deletedAt)).filter((order) =>
      (status === "all" || (status === "__overdue__" ? isOrderOverdue(order) : normalizeOrderStatus(order.status) === status)) &&
      (!from || (order.date || "") >= from) &&
      (!to || (order.date || "") <= to) &&
      (!branch || String(order.branch || "").toLocaleLowerCase().includes(branch)) &&
      (!driver || String(order.driver || "").toLocaleLowerCase().includes(driver)) &&
      `${order.id} ${order.customer} ${order.transferId || ""} ${order.category} ${order.branch || ""} ${order.driver || ""} ${(order.items || []).map((item) => item.product).join(" ")}`.toLocaleLowerCase().includes(query)
    );
    const target = $("#all-orders");
    target.replaceChildren(...filtered.map(orderRow));
    labelTableRows(target);
    $("#orders-empty").hidden = filtered.length > 0;
    updateOrderSortHeaders();
    renderApprovalRequests();
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
    const orderEntries = orders.flatMap((order) => (order.history || []).map((entry) => ({
      ...entry,
      orderId: order.id,
      customer: order.customer,
      actor: entry.actor || normalizeCreatedBy(order.preparedBy) || "Unknown user",
      deleted: Boolean(order.deletedAt)
    })));
    const returnEntries = returnedTiles.flatMap((entry) => {
      const base = {
        orderId: `Return ${entry.id}`,
        customer: entry.returnedFrom || "—",
        details: `${entry.product || "Product"} · ${formatCatalogNumber(entry.cartons)} cartons, ${formatCatalogNumber(entry.firi)} FIRI`,
        deleted: false
      };
      if (Array.isArray(entry.history) && entry.history.length) {
        return entry.history.map((activity) => ({
          ...base,
          ...activity,
          actor: activity.actor || entry.recordedBy || "Unknown user"
        }));
      }
      return [{
        ...base,
        timestamp: Number(entry.createdAt) || 0,
        action: "Return created",
        actor: entry.recordedBy || "Unknown user"
      }, ...(entry.returnEditedAt ? [{
        ...base,
        timestamp: Number(entry.returnEditedAt),
        action: "Return edited",
        actor: entry.returnEditedBy || "Unknown user"
      }] : [])];
    });
    const entries = [...orderEntries, ...returnEntries].filter((entry) =>
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

  function getNotificationEvents() {
    const orderEvents = orders.filter((order) => !order.deletedAt).flatMap((order) =>
      (order.history || []).flatMap((entry) => {
        if (entry.action === "Order created") {
          return [{ ...entry, orderId: order.id, customer: order.customer, message: "Order created" }];
        }
        if (entry.action === "Order updated") {
          return [{
            ...entry,
            orderId: order.id,
            customer: order.customer,
            message: "Order updated"
          }];
        }
        if (entry.action === "Status changed") {
          const nextStatus = String(entry.details || "").split("→").pop()?.trim();
          return [{
            ...entry,
            orderId: order.id,
            customer: order.customer,
            message: nextStatus === "In progress" ? "Ready for delivery" : `Order status changed to ${nextStatus || "updated"}`
          }];
        }
        if (entry.action === "Approval requested") {
          return [{
            ...entry,
            orderId: order.id,
            customer: order.customer,
            message: "Order approval requested"
          }];
        }
        return [];
      })
    );
    const overdueEvents = orders.filter(isOrderOverdue).map((order) => {
      const status = normalizeOrderStatus(order.status);
      const ageDays = status === "Pending" ? 2 : 1;
      const timestamp = Date.parse(`${orderStatusStartDate(order)}T00:00:00`) + ageDays * 86400000;
      return {
        timestamp,
        orderId: order.id,
        customer: order.customer,
        actor: "Order Desk",
        message: `${status} order overdue`
      };
    });
    let scheduledEvents = [];
    try {
      scheduledEvents = JSON.parse(localStorage.getItem(scheduledReportKey("events")) || "[]");
      if (!Array.isArray(scheduledEvents)) throw new Error("Scheduled report history is not a list.");
    } catch (error) {
      console.error("Could not read scheduled report notifications.", error);
    }
    return [...orderEvents, ...overdueEvents, ...scheduledEvents]
      .sort((left, right) => Number(right.timestamp) - Number(left.timestamp));
  }

  function notificationStorageKey() {
    return `shaafici-order-desk-notifications-read-${cloudUser?.id || "local"}`;
  }

  function renderNotifications() {
    const events = getNotificationEvents();
    const storedReadAt = localStorage.getItem(notificationStorageKey());
    const readAt = storedReadAt == null ? Date.now() : Number(storedReadAt);
    if (storedReadAt == null) localStorage.setItem(notificationStorageKey(), String(readAt));
    const unreadCount = events.filter((entry) => Number(entry.timestamp) > readAt).length;
    const badge = $("#nav-notification-count");
    badge.textContent = String(unreadCount);
    badge.hidden = unreadCount === 0;
    const rows = events.map((entry) => {
      const row = document.createElement("tr");
      if (Number(entry.timestamp) > readAt) row.classList.add("notification-unread");
      [
        new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(entry.timestamp),
        entry.message,
        entry.orderId,
        entry.customer || "—",
        entry.actor || "Unknown user"
      ].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      });
      return row;
    });
    $("#notifications-list").replaceChildren(...rows);
    $("#notifications-empty").hidden = events.length > 0;
  }

  function markNotificationsRead() {
    localStorage.setItem(notificationStorageKey(), String(Date.now()));
    renderNotifications();
  }

  let reportRows = [];
  function renderReports() {
    const from = $("#report-date-from").value;
    const to = $("#report-date-to").value;
    const productQuery = $("#report-product-filter").value.trim().toLocaleLowerCase();
    const branchQuery = $("#report-branch-filter").value.trim().toLocaleLowerCase();
    const matchesDate = (date) => (!from || date >= from) && (!to || date <= to);
    const rows = [];
    const orderIds = new Set();
    const transferIds = new Set();
    const returnIds = new Set();
    let orderedQuantity = 0;
    let returnedCartons = 0;
    let returnedFiri = 0;

    orders.filter((order) => !order.deletedAt && matchesDate(order.date || ""))
      .forEach((order) => {
        if (branchQuery && !String(order.branch || "").toLocaleLowerCase().includes(branchQuery)) return;
        const matchingItems = (order.items || []).filter((item) =>
          String(item.product || "").toLocaleLowerCase().includes(productQuery)
        );
        if (!matchingItems.length) return;
        orderIds.add(order.id);
        if (isWarehouseTransfer(order)) transferIds.add(order.id);
        matchingItems.forEach((item) => {
          const quantity = Number(item.ordered) || 0;
          orderedQuantity += quantity;
          rows.push({
            type: isWarehouseTransfer(order) ? "Transfer" : "Order",
            date: order.date || "",
            reference: order.transferId || order.id,
            branch: order.branch || "",
            product: item.product || "",
            quantity: formatCatalogNumber(quantity),
            unit: "units"
          });
        });
      });

    returnedTiles.filter((entry) => matchesDate(entry.returnedDate || ""))
      .filter((entry) => !branchQuery || String(entry.branch || "").toLocaleLowerCase().includes(branchQuery))
      .filter((entry) => String(entry.product || "").toLocaleLowerCase().includes(productQuery))
      .forEach((entry) => {
        returnIds.add(entry.id);
        returnedCartons += Number(entry.cartons) || 0;
        returnedFiri += Number(entry.firi) || 0;
        rows.push({
          type: "Return",
          date: entry.returnedDate || "",
          reference: entry.id,
          branch: entry.branch || "",
          product: entry.product || "",
          quantity: `${formatCatalogNumber(entry.cartons)} cartons; ${formatCatalogNumber(entry.firi)} FIRI`,
          unit: "mixed"
        });
      });

    reportRows = rows.sort((left, right) => right.date.localeCompare(left.date)
      || left.reference.localeCompare(right.reference, undefined, { numeric: true }));
    $("#report-order-count").textContent = String(orderIds.size);
    $("#report-transfer-count").textContent = String(transferIds.size);
    $("#report-return-count").textContent = String(returnIds.size);
    $("#report-ordered-quantity").textContent = formatCatalogNumber(orderedQuantity);
    $("#report-returned-quantity").textContent = `${formatCatalogNumber(returnedCartons)} / ${formatCatalogNumber(returnedFiri)}`;
    const tableRows = reportRows.map((entry) => {
      const row = document.createElement("tr");
      [entry.type, entry.date, entry.reference, entry.branch || "—", entry.product || "—", entry.quantity, entry.unit]
        .forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.append(cell);
        });
      return row;
    });
    $("#report-rows").replaceChildren(...tableRows);
    $("#reports-empty").hidden = reportRows.length > 0;
  }

  function scheduledReportKey(kind) {
    return `shaafici-order-desk-scheduled-report-${kind}-${cloudUser?.id || "local"}`;
  }

  async function saveScheduledReport(event) {
    event.preventDefault();
    if (offlineReadOnly) {
      $("#scheduled-report-status").textContent = "Offline access is read-only. Reconnect and reload before making changes.";
      $("#scheduled-report-status").classList.add("error");
      return;
    }
    const frequency = $("#scheduled-report-frequency").value;
    if (!["off", "daily", "weekly"].includes(frequency)) {
      $("#scheduled-report-status").textContent = "Choose a valid report schedule.";
      $("#scheduled-report-status").classList.add("error");
      return;
    }
    const previousFrequency = scheduledReportFrequency;
    scheduledReportFrequency = frequency;
    try {
      if (cloudDeployment) await saveCatalogToCloud(currentCatalogData(), false);
      else localStorage.setItem("shaafici-order-desk-scheduled-report-frequency", frequency);
      localStorage.setItem(scheduledReportKey("last"), String(Date.now()));
      $("#scheduled-report-status").textContent = frequency === "off"
        ? "Scheduled summaries turned off."
        : `A ${frequency} summary will appear the next time this app is open after the interval.`;
      $("#scheduled-report-status").classList.remove("error");
    } catch (error) {
      scheduledReportFrequency = previousFrequency;
      $("#scheduled-report-frequency").value = previousFrequency;
      console.error("Could not save the scheduled report setting.", error);
      $("#scheduled-report-status").textContent = error.message || "Could not save the report schedule.";
      $("#scheduled-report-status").classList.add("error");
    }
  }

  function runScheduledReports() {
    const frequency = scheduledReportFrequency;
    if (frequency === "off") return;
    const interval = frequency === "daily" ? 86400000 : 7 * 86400000;
    const now = Date.now();
    const last = Number(localStorage.getItem(scheduledReportKey("last")));
    if (!Number.isFinite(last) || last <= 0) {
      localStorage.setItem(scheduledReportKey("last"), String(now));
      return;
    }
    if (now - last < interval) return;
    const active = orders.filter((order) => !order.deletedAt);
    const pending = active.filter((order) => normalizeOrderStatus(order.status) === "Pending").length;
    const overdue = active.filter(isOrderOverdue).length;
    const lowStock = productCatalog.filter(isCatalogLowStock).length;
    const event = {
      timestamp: now,
      message: `${frequency === "daily" ? "Daily" : "Weekly"} report: ${active.length} orders, ${pending} pending, ${overdue} overdue, ${lowStock} low-stock products.`,
      orderId: "Scheduled report",
      customer: "Workspace summary",
      actor: "Order Desk"
    };
    const key = scheduledReportKey("events");
    const priorEvents = JSON.parse(localStorage.getItem(key) || "[]");
    localStorage.setItem(key, JSON.stringify([event, ...priorEvents].slice(0, 50)));
    localStorage.setItem(scheduledReportKey("last"), String(now));
    renderNotifications();
    showToast(event.message);
  }

  function exportReportCsv() {
    if (!reportRows.length) {
      showToast("There is no report data to export.");
      return;
    }
    const columns = ["type", "date", "reference", "branch", "product", "quantity", "unit"];
    const csv = [columns.join(","), ...reportRows.map((row) =>
      columns.map((key) => `"${String(row[key] ?? "").replaceAll('"', '""')}"`).join(",")
    )].join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `shaafici-report-${dateValue()}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(`${reportRows.length.toLocaleString("en")} report rows exported.`);
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
        const catalogItem = getCatalogProduct(item.product, item.qtyItem);
        if (!catalogItem || !Number.isFinite(ordered) || ordered === 0) return null;
        const qtyItemIndex = (catalogItem.qtyItems || [])
          .findIndex((value) => sameCatalogQtyItem(value, item.qtyItem));
        const stockIndex = qtyItemIndex >= 0 ? qtyItemIndex : 0;
        return {
          timestamp: order.createdAt,
          orderId: order.id,
          transferId: order.transferId,
          customer: order.customer,
          deleted: Boolean(order.deletedAt),
          productId: catalogItem.product.match(/^\s*\[([^\]]+)\]/)?.[1] || catalogItem.product,
          ordered,
          movement: isWarehouseTransfer(order) ? "Quantity" : "Taken",
          quantity: catalogItem.quantities?.[stockIndex],
          taken: catalogItem.taken?.[stockIndex],
          remaining: catalogItem.rQuantities?.[stockIndex],
          uomN: catalogItem.uomNs?.[stockIndex],
          status: catalogItem.statuses?.[stockIndex]
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
    const selectedCatalogProduct = getCatalogProduct(itemHistoryProductFilter || query);
    const productFilter = itemHistoryProductFilter || (selectedCatalogProduct ? query : "");
    const exactProductFilter = productFilter && !selectedCatalogProduct
      ? productFilter
      : null;
    const matchesItemHistoryProduct = (product) => {
      if (!productFilter) return true;
      const catalogProduct = getCatalogProduct(product);
      if (selectedCatalogProduct && catalogProduct) return catalogProduct === selectedCatalogProduct;
      if (!exactProductFilter) return true;
      return String(product || "").trim().toLocaleLowerCase()
        === exactProductFilter.trim().toLocaleLowerCase();
    };
    const matchesSearch = (entry) => {
      if (!query) return true;
      if (`${entry.reference} ${entry.product} ${entry.previousProduct || ""} ${entry.from} ${entry.to} ${entry.reason || ""}`.toLowerCase().includes(query)) {
        return true;
      }
      if (!selectedCatalogProduct) return false;
      return [entry.product, entry.previousProduct]
        .some((product) => product && getCatalogProduct(product) === selectedCatalogProduct);
    };
    const orderEntries = orders
      .filter((order) => !order.deletedAt)
      .flatMap((order) => order.items.flatMap((item) => {
        const createdAt = Number(order.createdAt) || 0;
        const warehouseTransfer = isWarehouseTransfer(order);
        if (!matchesItemHistoryProduct(item.product)) return [];
        if (!createdAt) return [];
        const ordered = Number(item.ordered);
        if (!Number.isFinite(ordered) || ordered <= 0) return [];
        const catalogItem = getCatalogProduct(item.product, item.qtyItem);
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
          quantityHighlight: warehouseTransfer,
          changedBy: normalizeCreatedBy(order.preparedBy) || "—"
        }];
      }))
      ;
    const adjustmentEntries = catalogAdjustments
      .filter((entry) => matchesItemHistoryProduct(entry.product))
      .map((entry) => ({
        ...entry,
        timestamp: entry.timestamp,
        reference: entry.reference || (entry.amount > 0 ? "Direct quantity addition" : "Direct quantity reduction"),
        from: entry.amount > 0
          ? entry.fromLocation || "Partners/Vendors"
          : entry.fromLocation || "WH2/Warehouse 200k",
        to: entry.amount > 0
          ? "WH2/Warehouse 200k"
          : entry.toLocation || "Manual adjustment",
        quantity: Math.abs(entry.amount),
        warehouseTransfer: false,
        quantityHighlight: true,
        changedBy: entry.actor || usernameForUser(cloudUser),
        adjustmentDirection: entry.amount > 0 ? "added" : "subtracted"
      }));
    const returnedTileEntries = returnedTiles
      .filter((entry) => matchesItemHistoryProduct(entry.product))
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
          recordedBy: entry.recordedBy,
          changedBy: entry.recordedBy || "—"
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
        quantity: change.field === "Quantity" || change.field === "Taken" || change.field === "R/QUANTITY"
          ? `${change.before || "—"} → ${change.after || "—"}`
          : "—",
        unit: "—",
        catalogEdit: true,
        changedBy: entry.actor || usernameForUser(cloudUser)
      })));
    const entries = [...orderEntries, ...adjustmentEntries, ...returnedTileEntries, ...catalogEditEntries]
      .filter(matchesSearch)
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
        entry.unit,
        entry.changedBy || "—"
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
    clearPdfImportStatus();
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
    clearPdfImportStatus();
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
    $("#order-priority").checked = Boolean(order.priority);
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
      ["Status", "status"],
      ["Delivered by", "driver"],
      ["Driver phone", "driverPhone"],
      ["Created by", "preparedBy"],
      ["Notes", "notes"],
      ["Priority", "priority"],
      ["Approval request", "approvalStatus"],
      ["Delivery confirmation", "deliveryConfirmationStatus"],
      ["Items", "items"]
    ];
    return fields.filter(([, key]) => JSON.stringify(previous[key] ?? "") !== JSON.stringify(next[key] ?? ""))
      .map(([label]) => label);
  }

  async function saveOrder(event) {
    event.preventDefault();
    const transferId = form.elements.transferId.value.trim();
    const duplicateTransfer = findDuplicateTransferOrder(transferId, editingId);
    if (duplicateTransfer) {
      const message = `Transfer ID ${transferId} is already uploaded and saved. This order was not saved again.`;
      const status = $("#pdf-import-status");
      if (!status.hidden) {
        status.classList.remove("error");
        status.classList.add("duplicate-warning");
        status.textContent = message;
      }
      showToast(message);
      return;
    }
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
    if (previousOrder?.deliveryConfirmationStatus === "pending") {
      showToast("This transfer has a delivery awaiting approval. Decide the request before editing it.");
      return;
    }
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
    const pendingApproval = order.approvalStatus === "pending";
    const orderCatalogChanges = pendingApproval || order.status === "Cancelled"
      ? [] : applyOrderCatalogDelta(order, 1);
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
    order.catalogTakenApplied = !pendingApproval && order.status !== "Cancelled";
    order.history = previousOrder ? [...previousOrder.history] : [];
    if (catalogChanged) {
      const historyChanges = new Map();
      catalogChanges.forEach((change) => historyChanges.set(`${change.productId}:${change.qtyItem}`, change));
      const details = [...historyChanges.values()].map((change) =>
        `${change.productId}${change.qtyItem ? ` (Q/ITEM ${change.qtyItem})` : ""}: Ordered ${formatCatalogNumber(Math.abs(change.ordered))}, ${change.movement} ${formatCatalogNumber(change.movement === "Quantity" ? change.quantity : change.taken)}, R/QUANTITY ${formatCatalogNumber(change.remaining)}, UOM/N ${formatCatalogNumber(change.uomN)}, STS ${change.status}`
      ).join("; ");
      recordOrderHistory(order, "Catalog quantities updated", details, {
        catalogChanges: orderCatalogChanges
      });
    }
    if (previousOrder) {
      const changedFields = changedOrderFields(previousOrder, order);
      if (changedFields.length) recordOrderHistory(order, "Order updated", `Changed: ${changedFields.join(", ")}.`);
      if (previousOrder.status !== order.status) {
        recordOrderHistory(order, "Status changed", `${previousOrder.status} → ${order.status}.`);
      }
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
    renderApprovalRequests();
    showToast(pendingApproval
      ? "Order submitted for admin approval; stock has not changed."
      : index >= 0 ? "Order updated successfully." : "Order saved successfully.");
    editingId = order.id;
    refreshPreview();
    openPrintPreview(order, "overview");
  }

  async function changeStatus(id) {
    const order = orders.find((entry) => entry.id === id);
    if (!order || order.deletedAt) return;
    if (order.approvalStatus === "pending") {
      showToast("This order is waiting for admin approval before its status can change.");
      return;
    }
    if (order.deliveryConfirmationStatus === "pending") {
      showToast("This delivery is waiting for admin approval before its status can change.");
      return;
    }
    const previousStatus = normalizeOrderStatus(order.status);
    const statuses = ["Pending", "In progress", "Delivered", "Cancelled"];
    const nextStatus = statuses[(statuses.indexOf(previousStatus) + 1) % statuses.length];
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
    let catalogTakenApplied = Boolean(order.catalogTakenApplied);
    if (nextStatus === "Cancelled" && catalogTakenApplied) {
      catalogChanges = applyOrderCatalogDelta(order, -1);
      catalogTakenApplied = false;
    } else if (previousStatus === "Cancelled" && nextStatus === "Pending"
      && !catalogTakenApplied && order.approvalStatus !== "pending") {
      catalogChanges = applyOrderCatalogDelta(order, 1);
      catalogTakenApplied = true;
    }
    if (catalogChanges.length && cloudDeployment) {
      try {
        await saveCatalogToCloud(currentCatalogData());
      } catch (error) {
        productCatalog = previousCatalog;
        indexProductCatalog();
        console.error("Could not update stock for the order status change.", error);
        showToast(error.message || "Could not update stock for this order status change.");
        return;
      }
    }
    const updatedOrder = { ...order, status: nextStatus, catalogTakenApplied, history: [...order.history] };
    recordOrderHistory(updatedOrder, "Status changed", `${previousStatus} → ${nextStatus}.`);
    if (catalogChanges.length) {
      recordOrderHistory(updatedOrder, "Catalog quantities updated",
        `Stock released or reserved for ${updatedOrder.id}.`, { catalogChanges });
    }
    const index = orders.indexOf(order);
    const previousOrders = orders;
    orders = [...orders];
    orders[index] = updatedOrder;
    if (!await persistOrders(updatedOrder)) {
      orders = previousOrders;
      if (catalogChanges.length) {
        productCatalog = previousCatalog;
        indexProductCatalog();
        try {
          await saveCatalogToCloud(currentCatalogData());
        } catch (error) {
          console.error("Could not restore stock after the order status save failed.", error);
        }
      }
      return;
    }
    if (catalogChanges.length) renderProductCatalogOptions();
    renderOverview();
    renderAllOrders();
    showToast(`${updatedOrder.id} marked ${updatedOrder.status.toLowerCase()}.`);
  }

  async function deleteOrder(id) {
    const order = orders.find((entry) => entry.id === id);
    if (!order || order.deletedAt) return;
    if (!window.confirm(`Delete order ${order.id} for ${order.customer}? Its catalog changes will be restored; its activity history will be retained.`)) return;
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
    const deletedOrder = { ...order, deletedAt: Date.now(), history: [...order.history] };
    recordOrderHistory(deletedOrder, "Order deleted", "Order deleted; activity history retained.");
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
  setupTableViewControls();
  setColorTheme(currentTheme);
  $("#theme-toggle").addEventListener("click", () => {
    setColorTheme(currentTheme === "dark" ? "light" : "dark", true);
  });
  $("#overview-period").addEventListener("change", () => {
    renderOverviewAnalytics(orders.filter((order) => !order.deletedAt));
  });
  $("#overview-date").addEventListener("change", () => {
    renderOverviewAnalytics(orders.filter((order) => !order.deletedAt));
  });
  $$("[data-view]").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    setView(link.dataset.view);
  }));
  $$("[data-overview-stat]").forEach((card) => card.addEventListener("click", () => {
    const target = card.dataset.overviewStat;
    if (["total-items", "low-stock", "ended-products", "critical-stock"].includes(target)) {
      if (!setView("catalog")) return;
      catalogStockFilter = target === "total-items"
        ? "all"
        : target === "ended-products"
          ? "ended"
          : target === "critical-stock"
            ? "critical"
            : "low-stock";
      $("#catalog-search").value = "";
      Object.keys(catalogValueFilters).forEach((key) => delete catalogValueFilters[key]);
      renderCatalogFilterPanel();
      renderProductCatalogTable();
      return;
    }
    if (!setView("orders")) return;
    const statuses = {
      pending: "Pending",
      "in-progress": "In progress",
      delivered: "Delivered",
      cancelled: "Cancelled",
      overdue: "__overdue__"
    };
    $("#status-filter").value = statuses[target] || "all";
    $("#order-search").value = "";
    $("#order-branch-filter").value = "";
    $("#order-driver-filter").value = "";
    $("#order-date-from-filter").value = "";
    $("#order-date-to-filter").value = "";
    renderAllOrders();
  }));
  $("#catalog-overview-filter-clear").addEventListener("click", () => {
    catalogStockFilter = "all";
    renderProductCatalogTable();
  });
  $("#history-search").addEventListener("input", renderHistory);
  $("#notifications-mark-read").addEventListener("click", markNotificationsRead);
  ["report-date-from", "report-date-to", "report-product-filter", "report-branch-filter"]
    .forEach((id) => $(`#${id}`).addEventListener("input", renderReports));
  $("#report-clear-filters").addEventListener("click", () => {
    $("#report-date-from").value = "";
    $("#report-date-to").value = "";
    $("#report-product-filter").value = "";
    $("#report-branch-filter").value = "";
    renderReports();
  });
  $("#export-report").addEventListener("click", exportReportCsv);
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
  $("#managed-user-role").addEventListener("change", () => {
    const isDriver = cloudRole === "owner" && $("#managed-user-role").value === "driver";
    $("#managed-user-driver-field").hidden = !isDriver;
    $("#managed-user-driver").required = isDriver;
    if (!isDriver) $("#managed-user-driver").value = "";
    updateManagedUserLocationField();
  });
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
  $("#export-data").addEventListener("click", exportWorkspaceBackup);
  $("#import-data").addEventListener("click", () => $("#data-backup-file").click());
  $("#data-backup-file").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) importOnlineBackup(file);
    event.target.value = "";
  });
  $("#save-driver").addEventListener("click", () => {
    saveDriver($("#saved-driver-name"), $("#saved-driver-phone"), true);
  });
  $("#toggle-driver-directory").addEventListener("click", () => {
    driversDirectoryVisible = !driversDirectoryVisible;
    renderDriverDirectory();
  });
  $("#drivers-directory-search").addEventListener("input", renderDriverDirectory);
  $("#show-shaafici-drivers").addEventListener("click", (event) => {
    const button = event.currentTarget;
    const panel = $("#shaafici-driver-panel");
    panel.hidden = !panel.hidden;
    button.setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) renderShaaficiDrivers();
  });
  $("#shaafici-order-previous").addEventListener("click", () => {
    selectedShaaficiOrderIndex = Math.max(0, selectedShaaficiOrderIndex - 1);
    renderShaaficiDrivers();
  });
  $("#shaafici-order-next").addEventListener("click", () => {
    const driver = drivers.find((entry) => entry.phone === selectedShaaficiDriverPhone);
    if (!driver) return;
    const driverOrders = getOrdersForDriver(driver, getDriverDateRange());
    selectedShaaficiOrderIndex = Math.min(
      driverOrders.length - 1,
      selectedShaaficiOrderIndex + 1
    );
    renderShaaficiDrivers();
  });
  $("#shaafici-driver-period").addEventListener("change", renderShaaficiDrivers);
  $("#shaafici-driver-date").addEventListener("change", renderShaaficiDrivers);
  $("#shaafici-driver-delivery-filter").addEventListener("change", renderShaaficiDrivers);
  $$(".driver-delivery-summary [data-driver-delivery-filter]").forEach((card) => {
    card.addEventListener("click", () => {
      $("#shaafici-driver-delivery-filter").value = card.dataset.driverDeliveryFilter;
      $("#shaafici-driver-delivery-search").value = "";
      renderShaaficiDrivers();
      $("#shaafici-driver-delivery-list").scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
  $("#shaafici-driver-delivery-search").addEventListener("input", renderShaaficiDrivers);
  $("#shaafici-driver-search").addEventListener("input", renderShaaficiDrivers);
  $("#shaafici-driver-delivery-form").addEventListener("submit", submitShaaficiDriverDelivery);
  $("#shaafici-driver-take").addEventListener("click", markShaaficiDriverOrderTaken);
  $("#order-driver").addEventListener("focus", () => renderDriverSuggestions($("#order-driver").value));
  $("#order-driver").addEventListener("click", () => renderDriverSuggestions($("#order-driver").value));
  $("#order-driver").addEventListener("input", () => {
    fillSavedDriverPhone();
    renderDriverSuggestions($("#order-driver").value);
  });
  $("#order-driver").addEventListener("change", fillSavedDriverPhone);
  $(".driver-autocomplete").addEventListener("keydown", (event) => {
    const options = $$(".driver-suggestion", $("#saved-driver-options"));
    const currentIndex = options.indexOf(document.activeElement);
    if (event.key === "Escape") {
      hideDriverSuggestions();
      $("#order-driver").focus();
    } else if (event.key === "ArrowDown" && options.length) {
      event.preventDefault();
      options[Math.min(currentIndex + 1, options.length - 1)].focus();
    } else if (event.key === "ArrowUp" && options.length) {
      event.preventDefault();
      if (currentIndex <= 0) $("#order-driver").focus();
      else options[currentIndex - 1].focus();
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (!$(".driver-autocomplete").contains(event.target)) hideDriverSuggestions();
  });
  $("#order-pdf-file").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) importOrderPdf(file);
    event.target.value = "";
  });
  form.elements.transferId.addEventListener("input", () => {
    const status = $("#pdf-import-status");
    if (!status.classList.contains("duplicate-warning")) return;
    const transferId = form.elements.transferId.value.trim();
    const duplicateTransfer = findDuplicateTransferOrder(transferId, editingId);
    if (duplicateTransfer) {
      status.textContent = `Transfer ID ${transferId} has already been uploaded and saved. You may review the order, but this order cannot be saved again.`;
      return;
    }
    status.classList.remove("duplicate-warning");
    status.textContent = "Transfer ID changed. Review the order before saving.";
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
    if (event.target.matches(".product-input")) {
      syncCatalogMatchSelection(event.target.closest("tr"));
      applyCatalogUnit(event.target);
    }
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
    if (event.target.matches(".catalog-match-input")) {
      const row = event.target.closest("tr");
      const productInput = $(".product-input", row);
      productInput.value = event.target.value;
      applyCatalogUnit(productInput);
      if ($(".qty-item-input", row).value) calculateOrderedQuantity(row);
    } else if (event.target.matches(".qty-item-input")) {
      applyCatalogUnit($(".product-input", event.target.closest("tr")));
    } else if (event.target.matches(".product-input")) {
      syncCatalogMatchSelection(event.target.closest("tr"));
      applyCatalogUnit(event.target);
    }
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
      renderCatalogMatchField(row);
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
    if (offlineReadOnly) {
      lockCloudApp();
      showToast("Offline copy cleared from this device.");
      return;
    }
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
      .then(() => showToast("Epson receipt screenshot copied. Paste it into your PDF with Ctrl+V."))
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
  $("#catalog-adjust-from").addEventListener("change", () => {
    const isOther = $("#catalog-adjust-from").value === "__other__";
    $("#catalog-adjust-other-from-field").hidden = !isOther;
    $("#catalog-adjust-other-from").required = isOther;
    if (isOther) $("#catalog-adjust-other-from").focus();
  });
  $("#returned-tile-form").addEventListener("submit", saveReturnedTile);
  $("#cancel-returned-tile-edit").addEventListener("click", closeReturnedTileEdit);
  $("#returned-tiles-search").addEventListener("input", renderReturnedTiles);
  $("#export-returned-tiles").addEventListener("click", exportVisibleReturnedTiles);
  $(".returned-tiles-column-filters").addEventListener("input", (event) => {
    if (event.target.matches("[data-returned-tile-filter]")) renderReturnedTiles();
  });
  $("#import-returned-tiles").addEventListener("click", () => $("#returned-tiles-file").click());
  $("#returned-tiles-file").addEventListener("change", (event) => {
    const file = event.target.files[0];
    event.target.value = "";
    importReturnedTiles(file);
  });
  ["quantities", "taken", "qty-items"].forEach((field) => {
    $(`#catalog-edit-${field}`).addEventListener("input", updateCatalogDerivedFields);
  });
  ["order-search", "order-branch-filter", "order-driver-filter", "order-date-from-filter", "order-date-to-filter"]
    .forEach((id) => $(`#${id}`).addEventListener("input", renderAllOrders));
  ["status-filter", "order-date-from-filter", "order-date-to-filter"]
    .forEach((id) => $(`#${id}`).addEventListener("change", renderAllOrders));
  $("#catalog-search").addEventListener("input", scheduleCatalogSearchRender);
  $("#catalog-page-first").addEventListener("click", () => {
    catalogPage = 1;
    renderProductCatalogTable({ preservePage: true });
  });
  $("#catalog-page-previous").addEventListener("click", () => {
    catalogPage -= 1;
    renderProductCatalogTable({ preservePage: true });
  });
  $("#catalog-page-next").addEventListener("click", () => {
    catalogPage += 1;
    renderProductCatalogTable({ preservePage: true });
  });
  $("#catalog-page-last").addEventListener("click", () => {
    catalogPage = Math.max(1, Math.ceil(getFilteredCatalogRows().length / CATALOG_PAGE_SIZE));
    renderProductCatalogTable({ preservePage: true });
  });
  $("#scheduled-report-form").addEventListener("submit", saveScheduledReport);
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
  window.setInterval(runScheduledReports, 60000);
  window.setInterval(refreshApprovalReminderIndicators, 60000);
  window.addEventListener("focus", runScheduledReports);
  window.addEventListener("focus", refreshApprovalReminderIndicators);
  window.addEventListener("beforeunload", (event) => {
    if (!hasUnsavedOrderChanges()) return;
    event.preventDefault();
    event.returnValue = "";
  });

  function renderWorkspaceLocation() {
    const canSwitchLocation = cloudDeployment && cloudRole === "owner"
      && !offlineReadOnly;
    const switcher = $("#workspace-location-switcher");
    const locationLabel = $("#workspace-location-name");
    const select = $("#workspace-location-select");
    switcher.hidden = !canSwitchLocation;
    locationLabel.hidden = !cloudDeployment || canSwitchLocation;
    locationLabel.textContent = cloudDeployment ? locationName(activeLocationId) : "";
    if (canSwitchLocation) {
      select.replaceChildren(...WORKSPACE_LOCATIONS.map((location) => {
        const option = document.createElement("option");
        option.value = location.id;
        option.textContent = location.name;
        return option;
      }));
      select.value = activeLocationId;
    }
    $("#catalog-location-description").textContent =
      `Inventory and Excel imports for ${locationName(activeLocationId)}.`;
    $("#upload-workbook").textContent = `Upload ${locationName(activeLocationId)} Excel`;
  }

  async function switchWorkspaceLocation(locationId) {
    if (cloudRole !== "owner"
      || !WORKSPACE_LOCATION_NAMES.has(locationId)
      || locationId === activeLocationId) return;
    if (hasUnsavedOrderChanges() && !confirmDiscardUnsavedOrder()) {
      $("#workspace-location-select").value = activeLocationId;
      return;
    }
    const previousLocationId = activeLocationId;
    $("#workspace-location-select").disabled = true;
    activeLocationId = locationId;
    localStorage.setItem(ACTIVE_LOCATION_KEY, activeLocationId);
    setSyncStatus(`Loading ${locationName(activeLocationId)}…`);
    try {
      await loadCloudData(false, { render: false, saveSnapshot: false });
      await applyYesterdayOrderTransfers();
      renderWorkspaceLocation();
      renderLoadedWorkspaceData();
      setSyncStatus(`Online · showing ${locationName(activeLocationId)} data.`);
      void saveOfflineSnapshot();
    } catch (error) {
      console.error(`Could not load ${locationName(locationId)} data.`, error);
      activeLocationId = previousLocationId;
      localStorage.setItem(ACTIVE_LOCATION_KEY, activeLocationId);
      $("#workspace-location-select").value = activeLocationId;
      try {
        await loadCloudData(false, { render: false, saveSnapshot: false });
        renderWorkspaceLocation();
        renderLoadedWorkspaceData();
        void saveOfflineSnapshot();
      } catch (restoreError) {
        console.error(`Could not restore ${locationName(previousLocationId)} data.`, restoreError);
      }
      setSyncStatus(`Could not switch locations — ${error.message}`, true);
    } finally {
      $("#workspace-location-select").disabled = false;
    }
  }

  $("#workspace-location-select").addEventListener("change", (event) => {
    switchWorkspaceLocation(event.currentTarget.value);
  });

  function renderLoadedApp() {
    renderWorkspaceLocation();
    renderUnassignedOrders();
    const isDriver = cloudDeployment && cloudRole === "driver";
    const canManageUsers = cloudDeployment && cloudRole === "owner";
    $("#app-shell").hidden = false;
    $("#app-shell").classList.toggle("offline-read-only", offlineReadOnly);
    $("#offline-read-only-banner").hidden = !offlineReadOnly;
    $("#auth-gate").hidden = true;
    $("#sign-out").hidden = !cloudDeployment;
    $$("[data-view]").forEach((link) => {
      link.hidden = isDriver
        ? link.dataset.view !== "drivers"
        : link.dataset.view === "users" && !canManageUsers;
    });
    $("#users-view").hidden = !canManageUsers;
    $("#add-catalog-product").hidden = cloudDeployment && !["owner", "admin"].includes(cloudRole);
    $("#upload-workbook").hidden = cloudDeployment && !["owner", "admin"].includes(cloudRole);
    $("#approvals-panel").hidden = !cloudDeployment || isDriver;
    $("#account-avatar").hidden = !cloudDeployment;
    $("#sidebar-account-profile").hidden = false;
    $(".drivers-layout").hidden = isDriver;
    $("#show-shaafici-drivers").hidden = isDriver;
    $("#shaafici-driver-panel").hidden = !isDriver;
    $("#drivers-view").classList.toggle("driver-self-view", isDriver);
    $("#shaafici-driver-search-wrap").hidden = isDriver;
    if (isDriver) $("#shaafici-driver-search").value = "";
    $("#shaafici-driver-chooser").setAttribute("aria-label", isDriver ? "Delivery period filters" : "Driver filters and selection");
    $("#show-shaafici-drivers").setAttribute("aria-expanded", String(isDriver));
    $("#drivers-title").textContent = isDriver ? "My deliveries" : "Drivers";
    $("#drivers-view .page-heading .welcome-copy").textContent = isDriver
      ? "Review your assigned transfers and delivery status."
      : "Browse saved drivers and review their orders.";
    $("#shaafici-driver-panel-title").textContent = isDriver ? "My delivery queue" : "SHAAFICI Drivers";
    $("#shaafici-driver-panel-description").textContent = isDriver
      ? "Your assigned transfers and delivery progress."
      : "Select a driver to review their orders one at a time.";
    renderAccountAvatar(cloudUser);
    $("#welcome-greeting").textContent = greetingForTime();
    $("#welcome-user").textContent = usernameForUser(cloudUser);
    $("#export-data").hidden = cloudDeployment && (isDriver || !["owner", "admin"].includes(cloudRole));
    $("#import-data").hidden = !cloudDeployment || isDriver || !["owner", "admin"].includes(cloudRole);
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
    if (!cloudDeployment) {
      scheduledReportFrequency = localStorage.getItem("shaafici-order-desk-scheduled-report-frequency") || "off";
    }
    $("#scheduled-report-frequency").value = scheduledReportFrequency;
    renderSavedDrivers();
    $("#order-date").value = dateValue();
    $("#return-date").value = dateValue();
    renderReturnedTiles();
    if (!itemsBody.children.length) createItemRow();
    updateConverterVisibility();
    updateConverter();
    if (needsMoneyDataCleanup && !cloudDeployment) persistOrders();
    renderOverview();
    if (!isDriver && !offlineReadOnly) runScheduledReports();
    refreshPreview();
    if (!cloudDeployment && (location.protocol === "file:"
      || location.protocol === "http:" && ["127.0.0.1", "localhost"].includes(location.hostname))) {
      syncSourceData();
      window.setInterval(() => syncSourceData(), 3000);
    }
    if (isDriver) setView("drivers", { recordHistory: false, confirmUnsaved: false });
  }

  function isOfflineReadOnlyButtonAllowed(button) {
    const safeButtons = [
      "#mobile-menu-toggle", "#mobile-nav-backdrop", "#app-back-button", "#theme-toggle",
      "#account-avatar", "#sidebar-account-profile", "#sign-out", "#offline-reload",
      "[data-overview-stat]", '[data-action="all-orders"]', '[data-action="cancel-order"]',
      "#notifications-mark-read", "#history-show-all", "#export-data", "#export-catalog",
      "#export-returned-tiles", "#export-report", "#catalog-filter-apply", "#catalog-filter-cancel",
      "#catalog-overview-filter-clear", ".table-pagination-arrow", ".table-view-button",
      "#transfer-history-clear-date", "#report-clear-filters", "#users-refresh",
      "#toggle-driver-directory", "#show-shaafici-drivers", "#shaafici-driver-options button",
      ".driver-delivery-summary > button",
      "#shaafici-driver-delivery-list button", "#shaafici-order-previous", "#shaafici-order-next",
      "#previous-order", "#next-order", ".icon-button", '[data-action="history"]',
      "#catalog-preview-close", ".catalog-history-button", ".catalog-product-history-link",
      ".catalog-row-expand-button", "#print-order", "#back-from-preview", "#preview-receipt",
      "#preview-full-page", "#print-order-now", "#download-pdf", "#take-receipt-screenshot",
      "#profile-cancel", "#cancel-user-edit", "#catalog-edit-cancel", "#catalog-adjust-cancel",
      "#cancel-returned-tile-edit", ".catalog-filter-menu button",
      ".catalog-filter-submenu button", ".catalog-filter-actions button"
    ];
    return button.matches(safeButtons.join(","))
      || button.matches("[aria-expanded], [aria-label^='Open'], [aria-label^='View']");
  }

  document.addEventListener("submit", (event) => {
    if (!offlineReadOnly || !(event.target instanceof HTMLFormElement)
      || !event.target.closest("#app-shell")) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showToast("Offline access is read-only. Reconnect and reload before making changes.");
  }, true);
  document.addEventListener("click", (event) => {
    if (!offlineReadOnly || !(event.target instanceof Element)) return;
    const button = event.target.closest("button");
    if (!button || !button.closest("#app-shell") || isOfflineReadOnlyButtonAllowed(button)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showToast("Offline access is read-only. Reconnect and reload before making changes.");
  }, true);
  document.addEventListener("change", (event) => {
    if (!offlineReadOnly || !(event.target instanceof HTMLInputElement)
      || event.target.type !== "file" || !event.target.closest("#app-shell")) return;
    event.preventDefault();
    event.target.value = "";
    showToast("File imports are unavailable in read-only offline mode.");
  }, true);

  window.addEventListener("offline", () => {
    if (!cloudUser || cloudActivationPromise || offlineReadOnly) return;
    const cacheSave = saveOfflineSnapshot();
    offlineReadOnly = true;
    $("#app-shell").classList.add("offline-read-only");
    $("#offline-read-only-banner").hidden = false;
    $("#offline-reload").hidden = true;
    $("#storage-description").textContent = `Offline read-only copy for ${cloudUser.email || "workspace member"}.`;
    setSyncStatus("Offline · cached workspace is read-only. Reconnect and reload to edit.", true);
    void cacheSave;
  });
  window.addEventListener("online", () => {
    if (!offlineReadOnly) return;
    $("#offline-reload").hidden = false;
    setSyncStatus("Connection restored · reload to refresh data and resume editing.");
  });
  $("#offline-reload").addEventListener("click", () => location.reload());
  $("#offline-open").addEventListener("click", openOfflineWorkspace);

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("service-worker.js")
      .catch((error) => console.warn("Could not enable offline app caching.", error));
  }

  if (cloudDeployment) {
    initializeOnlineMode();
  } else {
    orders = loadOrders();
    drivers = loadDrivers();
    applyYesterdayOrderTransfers().finally(renderLoadedApp);
  }
})();
