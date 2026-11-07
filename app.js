(() => {
  const STORAGE_KEY = "ahmed-gurey-orders-v1";
  const DRIVERS_STORAGE_KEY = "ahmed-gurey-drivers-v1";
  const isLocalRuntime = location.protocol === "file:"
    || location.protocol === "http:" && ["127.0.0.1", "localhost"].includes(location.hostname);
  const cloudDeployment = !isLocalRuntime;
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
  let cloudChannel = null;
  let cloudActivationPromise = null;
  let cloudRefreshTimer = null;
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
  }

  function setSyncStatus(message, isError = false) {
    const status = $("#sync-status");
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  function applySyncedSourceData(data) {
    if (!Array.isArray(data.products) || !data.products.length
      || data.products.some((item) => !item || typeof item.product !== "string"
        || typeof item.unit !== "string" || !Array.isArray(item.qtyItems))) {
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
    updateConverter();
    refreshPreview();
  }

  async function syncSourceData(force = false) {
    if (cloudDeployment) return;
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
    setAuthStatus(message, isError);
  }

  function disableAuthForm() {
    $("#auth-email").disabled = true;
    $("#auth-password").disabled = true;
    $("#auth-submit").disabled = true;
  }

  async function loadCloudData(importLocalData) {
    const [orderResult, driverResult] = await Promise.all([
      supabaseClient.from("orders").select("id,data").order("id"),
      supabaseClient.from("drivers").select("driver_key,name,phone").order("name")
    ]);
    if (orderResult.error) throw orderResult.error;
    if (driverResult.error) throw driverResult.error;

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
      const knownDrivers = new Set(driverData.map((driver) => driver.name.toLocaleLowerCase()));
      const missingDrivers = loadDrivers().filter((driver) =>
        !knownDrivers.has(driver.name.toLocaleLowerCase())
      );
      if (missingDrivers.length) {
        const { error } = await supabaseClient.from("drivers").upsert(
          missingDrivers.map((driver) => ({
            driver_key: driver.name.trim().toLocaleLowerCase(),
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
        const key = driver.name.trim().toLocaleLowerCase();
        if (existingDriverKeys.has(key) || knownDriverKeys.has(key)) return false;
        knownDriverKeys.add(key);
        return true;
      });
      if (missingDrivers.length) {
        const { error } = await supabaseClient.from("drivers").upsert(
          missingDrivers.map((driver) => ({
            driver_key: driver.name.trim().toLocaleLowerCase(),
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
    cloudChannel = supabaseClient.channel("order-desk-shared-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, scheduleCloudRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, scheduleCloudRefresh)
      .subscribe((status, error) => {
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
      setAuthStatus("Loading your online orders…");
      try {
        await loadCloudData(true);
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
        window.setTimeout(() => activateCloudSession(session.user), 0);
      }
    });
    supabaseClient.auth.getSession().then(({ data, error }) => {
      if (error) throw error;
      if (data.session?.user) activateCloudSession(data.session.user);
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
  let historyOrderFilter = "";
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

    const previousDrivers = drivers;
    const index = drivers.findIndex((driver) => driver.name.toLocaleLowerCase() === name.toLocaleLowerCase());
    if (index >= 0) drivers[index] = { name, phone };
    else drivers.push({ name, phone });
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
    showToast(index >= 0 ? "Driver details updated." : "Driver saved for future orders.");
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
        const originalDescription = descriptions.join(" - ");
        const catalogDescription = catalogProduct?.product.replace(/^\[[^\]]+\]\s*/, "");
        const detailDescriptions = descriptions.slice(1).filter((description) => {
          const normalized = cleanPdfText(description).toLocaleLowerCase();
          return normalized && !cleanPdfText(catalogDescription || "").toLocaleLowerCase().includes(normalized);
        });
        const product = [descriptions[0], ...detailDescriptions].filter(Boolean).join(" - ") || originalDescription;
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

  function setView(name) {
    $$(".view").forEach((view) => view.classList.toggle("active", view.id === `${name}-view`));
    $$("[data-view]").forEach((link) => link.classList.toggle("active", link.dataset.view === name));
    const labels = { overview: "Overview", orders: "All orders", history: "Order history", "new-order": editingId ? "Edit order" : "Create an order", "print-preview": "Print preview" };
    $("#breadcrumb-current").textContent = labels[name] || "Overview";
    if (name === "orders") renderAllOrders();
    if (name === "history") renderHistory();
    if (name === "overview") renderOverview();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function createItemRow(item = {}, { preserveQuantities = false, afterRow = null } = {}) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="item-index"><button class="item-index-button" type="button" aria-pressed="false"></button></td>
      <td class="item-details" colspan="2">
        <div class="item-product-row">
          <label class="item-product-field"><span>PRODUCT / DESCRIPTION</span><input class="item-input product-input" aria-label="Product description" list="product-catalog" autocomplete="off" maxlength="120" placeholder="Search warehouse items or type a product" value="${escapeAttribute(item.product || "")}"></label>
          <label class="item-ordered-field"><span>ORDERED</span><input class="item-input ordered-input" aria-label="Ordered" type="number" min="0" step="any" placeholder="0" value="${escapeAttribute(item.ordered ?? "")}"></label>
          <label class="item-qty-item-field"><span>QTY/ITEM</span><span class="qty-item-control"></span></label>
        </div>
        <div class="quantity-fields"><span class="quantity-fields-heading">QUANTITIES &amp; UNITS</span><div class="quantity-pairs"></div><small class="qty-calculation-message" role="status" hidden></small></div>
      </td>
      <td><button class="remove-item" type="button" aria-label="Remove item">×</button></td>`;
    renderQtyItemField(row, item.qtyItem);
    renderQuantityFields(row, item, [], { showZero: preserveQuantities });
    if (afterRow?.parentElement === itemsBody) afterRow.after(row);
    else itemsBody.append(row);
    if (!preserveQuantities) calculateOrderedQuantity(row);
    updateItemIndexes();
    updateItems();
  }

  function renderQuantityFields(row, item = {}, unitDefaults = [], { showZero = false } = {}) {
    const product = $(".product-input", row).value.trim();
    const catalogUnit = getCatalogProduct(product)?.unit || units[0];
    const savedQuantities = Array.isArray(item.quantities)
      ? item.quantities
      : [{ quantity: item.quantity, unit: item.unit }];
    const count = isTileProduct(product) ? 3 : Math.max(1, savedQuantities.length);
    row.classList.toggle("tile-product", isTileProduct(product));
    $(".quantity-pairs", row).innerHTML = Array.from({ length: count }, (_, index) => {
      const saved = savedQuantities[index] || {};
      const unit = units.includes(saved.unit) ? saved.unit : unitDefaults[index] || catalogUnit;
      const label = count === 1 ? "" : ` ${index + 1}`;
      return `
        <div class="quantity-pair">
          <label><span>QTY${label}</span><input class="item-input quantity-input" aria-label="Quantity${label}" type="number" min="0" step="any" placeholder="0" value="${saved.quantity == null || saved.quantity === "" || !showZero && Number(saved.quantity) === 0 ? "" : Number(saved.quantity)}"></label>
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
    const quantityInput = $(".quantity-input", row);
    const message = $(".qty-calculation-message", row);
    const ordered = Number(orderedInput.value);
    const qtyItem = Number(qtyItemInput.value.trim().replace(",", "."));
    if (!orderedInput.value || !Number.isFinite(ordered) || !Number.isFinite(qtyItem) || qtyItem <= 0 || !quantityInput) {
      if (row.dataset.autoCalculated === "true" && quantityInput?.value === row.dataset.autoCalculatedValue) {
        quantityInput.value = "";
      }
      delete row.dataset.autoCalculated;
      delete row.dataset.autoCalculatedValue;
      message.hidden = true;
      message.textContent = "";
      return;
    }

    const exactQuantity = ordered / qtyItem;
    const roundedQuantity = Math.round(exactQuantity);
    quantityInput.value = String(roundedQuantity);
    row.dataset.autoCalculated = "true";
    row.dataset.autoCalculatedValue = String(roundedQuantity);
    if (Number.isInteger(exactQuantity)) {
      message.hidden = true;
      message.textContent = "";
    } else {
      message.textContent = `Fadlan tirada iska hagaaji. Tirada la soo jeediyay: ${roundedQuantity}`;
      message.hidden = false;
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
    if (productChanged && row.dataset.autoCalculated === "true" && previousQuantities[0]) {
      previousQuantities[0].quantity = "";
      delete row.dataset.autoCalculated;
      delete row.dataset.autoCalculatedValue;
    }
    const tileProduct = isTileProduct(product);
    const nextCount = tileProduct ? 3 : 1;
    const currentCount = previousQuantities.length;
    const unitDefaults = tileProduct ? tileUnits : item ? [item.unit] : [previousQuantities[0]?.unit || units[0]];
    if (nextCount !== currentCount) {
      const quantities = tileProduct
        ? previousQuantities.map(({ quantity }) => ({ quantity }))
        : previousQuantities;
      renderQuantityFields(row, { product, quantities }, unitDefaults);
    } else {
      $$(".unit-input", row).forEach((select, index) => { select.value = unitDefaults[index] || units[0]; });
    }
    calculateOrderedQuantity(row);
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
      const ordered = item.ordered === "" || item.ordered == null ? "" : `<small class="print-item-ordered">Ordered: ${escapeAttribute(item.ordered)}</small>`;
      const quantityDisplay = quantityText ? escapeAttribute(quantityText) : "No quantity";
      if (isTileProduct(item.product)) {
        return `<tr class="tile-print-item"><td>${index + 1}</td><td colspan="2"><strong class="print-item-product">${escapeAttribute(item.product)}</strong>${ordered}<small class="print-item-quantities">${quantityDisplay}</small></td></tr>`;
      }
      return `<tr class="non-tile-print-item"><td>${index + 1}</td><td><strong class="print-item-product">${escapeAttribute(item.product)}</strong>${ordered}</td><td class="print-item-quantities">${quantityDisplay}</td></tr>`;
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
      const productLines = [productText];
      const orderedLines = item.ordered === "" || item.ordered == null ? [] : wrapText(`Ordered: ${item.ordered}`, tileProduct ? 68 : 40);
      const productBlockLines = productLines.length + orderedLines.length;
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
        addCenteredText(productText, itemCenterX, y + 7, fitPdfTextSize(productText, pageWidth - margin * 2 - 31, 9));
        orderedLines.forEach((line, lineIndex) => addCenteredText(line, itemCenterX, y + 7 + (productLines.length + lineIndex) * productLineHeight, 8, "F1", muted));
        quantityLines.forEach((line, lineIndex) => addCenteredText(line, itemCenterX, y + 7 + (productBlockLines + lineIndex) * quantityLineHeight, quantityFontSize, "F2"));
      } else {
        const productCenterX = (margin + 31 + 300) / 2;
        const quantityCenterX = (300 + pageWidth - margin) / 2;
        addCenteredText(productText, productCenterX, y + 7, fitPdfTextSize(productText, 300 - margin - 31, 9));
        orderedLines.forEach((line, lineIndex) => addCenteredText(line, productCenterX, y + 7 + (productLines.length + lineIndex) * productLineHeight, 8, "F1", muted));
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
    if (!printPreviewOrder) throw new Error("There is no order to capture.");
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
      const productLines = wrap(item.product, "600 12px Arial, sans-serif", 132);
      const orderedLines = item.ordered === "" || item.ordered == null
        ? []
        : wrap(`Ordered: ${item.ordered}`, "10px Arial, sans-serif", 132);
      const quantities = (item.quantities || [{ quantity: item.quantity, unit: item.unit }])
        .filter((pair) => Number(pair.quantity) > 0)
        .map((pair) => `${pair.quantity} ${pair.unit}`)
        .join(" · ") || "No quantity";
      const quantityLines = wrap(quantities, "600 12px Arial, sans-serif", 90);
      return {
        index: index + 1,
        productLines,
        orderedLines,
        quantityLines,
        height: Math.max((productLines.length + orderedLines.length) * 16, quantityLines.length * 16) + 14
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
    context.font = "700 8px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText("#", padding + 13, y + 9);
    context.fillText("PRODUCT / DESCRIPTION", padding + 91, y + 9);
    y += 26;

    itemRows.forEach((row) => {
      const rowTop = y;
      context.fillStyle = "#111";
      context.font = "600 12px Arial, sans-serif";
      context.textAlign = "left";
      context.fillText(String(row.index), padding + 7, rowTop + 8);
      context.textAlign = "center";
      row.productLines.forEach((line, index) => context.fillText(line, padding + 91, rowTop + 8 + index * 16));
      context.fillStyle = "#666";
      context.font = "10px Arial, sans-serif";
      row.orderedLines.forEach((line, index) => context.fillText(line, padding + 91, rowTop + 8 + (row.productLines.length + index) * 16));
      context.fillStyle = "#111";
      context.font = "600 12px Arial, sans-serif";
      row.quantityLines.forEach((line, index) => context.fillText(line, width - padding - 39, rowTop + 8 + index * 16));
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

  function statusClass(status) {
    return status.toLowerCase().replaceAll(" ", "-");
  }

  function orderRow(order) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td><span class="order-number">${escapeAttribute(order.id)}</span></td>
      <td class="customer-cell">${escapeAttribute(order.customer)}</td>
      <td>${escapeAttribute(order.transferId || "—")}</td>
      <td>${formatDate(order.date)}</td>
      <td><button class="status-pill status-${statusClass(order.status)}" type="button" aria-label="Change status for ${escapeAttribute(order.id)}" title="Click to change status">${escapeAttribute(order.status)}</button></td>
      <td class="row-actions"><button class="icon-button" type="button" aria-label="Open order ${escapeAttribute(order.id)}" title="Open order">↗</button><button class="order-action-button" type="button" data-action="history" aria-label="View history for ${escapeAttribute(order.id)}">History</button><button class="order-action-button order-delete-button" type="button" data-action="delete" aria-label="Delete order ${escapeAttribute(order.id)}">Delete</button></td>`;
    $(".icon-button", row).addEventListener("click", () => editOrder(order.id));
    $(".status-pill", row).addEventListener("click", () => changeStatus(order.id));
    $('[data-action="history"]', row).addEventListener("click", () => showOrderHistory(order.id));
    $('[data-action="delete"]', row).addEventListener("click", () => deleteOrder(order.id));
    return row;
  }

  function renderOverview() {
    const activeOrders = orders.filter((order) => !order.deletedAt);
    const sorted = [...activeOrders].sort((a, b) => b.createdAt - a.createdAt);
    $("#stat-total").textContent = String(activeOrders.length);
    $("#stat-open").textContent = String(activeOrders.filter((order) => order.status !== "Completed").length);
    $("#stat-completed").textContent = String(activeOrders.filter((order) => order.status === "Completed").length);
    $("#nav-order-count").textContent = String(activeOrders.length);
    const target = $("#recent-orders");
    target.replaceChildren(...sorted.slice(0, 5).map(orderRow));
    $("#recent-empty").hidden = sorted.length > 0;
  }

  function renderAllOrders() {
    const query = $("#order-search").value.trim().toLowerCase();
    const status = $("#status-filter").value;
    const filtered = orders.filter((order) => !order.deletedAt).sort((a, b) => b.createdAt - a.createdAt).filter((order) =>
      (status === "all" || order.status === status) &&
      `${order.id} ${order.customer} ${order.transferId || ""} ${order.category}`.toLowerCase().includes(query)
    );
    const target = $("#all-orders");
    target.replaceChildren(...filtered.map(orderRow));
    $("#orders-empty").hidden = filtered.length > 0;
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
    const entries = orders.flatMap((order) => (order.history || []).map((entry) => ({
      ...entry,
      orderId: order.id,
      customer: order.customer,
      deleted: Boolean(order.deletedAt)
    }))).filter((entry) =>
      (!historyOrderFilter || entry.orderId === historyOrderFilter)
      && `${entry.orderId} ${entry.customer} ${entry.action} ${entry.details}`.toLowerCase().includes(query)
    ).sort((a, b) => b.timestamp - a.timestamp);
    const rows = entries.map((entry) => {
      const row = document.createElement("tr");
      const when = document.createElement("td");
      when.textContent = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(entry.timestamp);
      const orderId = document.createElement("td");
      orderId.textContent = `${entry.orderId}${entry.deleted ? " (deleted)" : ""}`;
      const customer = document.createElement("td");
      customer.textContent = entry.customer || "—";
      const activity = document.createElement("td");
      activity.textContent = entry.details ? `${entry.action}: ${entry.details}` : entry.action;
      row.append(when, orderId, customer, activity);
      return row;
    });
    $("#order-history").replaceChildren(...rows);
    $("#history-empty").hidden = entries.length > 0;
  }

  function resetForm() {
    form.reset();
    editingId = null;
    converterPinnedOpen = false;
    $("#order-date").value = dateValue();
    $("#category-select").value = categories[0];
    itemsBody.replaceChildren();
    createItemRow();
    updateConverterVisibility();
    updateConverter();
    refreshPreview();
    $("#order-form-title").textContent = "Create an order";
    $("#order-id-label").textContent = "NEW ORDER";
  }

  function openNewOrder(category = categories[0]) {
    resetForm();
    $("#category-select").value = category;
    updateConverterVisibility();
    refreshPreview();
    setView("new-order");
  }

  function editOrder(id) {
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
    setView("new-order");
  }

  function recordOrderHistory(order, action, details = "") {
    order.history = Array.isArray(order.history) ? order.history : [];
    order.history.push({ timestamp: Date.now(), action, details });
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
    order.history = previousOrder ? [...previousOrder.history] : [];
    if (previousOrder) {
      const changedFields = changedOrderFields(previousOrder, order);
      if (changedFields.length) recordOrderHistory(order, "Order updated", `Changed: ${changedFields.join(", ")}.`);
    } else recordOrderHistory(order, "Order created", "Order saved.");
    orders = [...orders];
    if (index >= 0) orders[index] = order;
    else orders.push(order);
    if (!await persistOrders(order)) {
      orders = previousOrders;
      return;
    }
    renderOverview();
    showToast(index >= 0 ? "Order updated successfully." : "Order saved successfully.");
    editingId = order.id;
    refreshPreview();
    openPrintPreview(order, "overview");
    downloadOrderPdf(order, true);
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
    if (!window.confirm(`Delete order ${order.id} for ${order.customer}? It will be removed from active orders, but its history will be kept.`)) return;
    const deletedOrder = { ...order, deletedAt: Date.now(), history: [...order.history] };
    recordOrderHistory(deletedOrder, "Order deleted", "Removed from active orders.");
    const index = orders.indexOf(order);
    const previousOrders = orders;
    orders = [...orders];
    orders[index] = deletedOrder;
    if (!await persistOrders(deletedOrder)) {
      orders = previousOrders;
      return;
    }
    renderOverview();
    renderAllOrders();
    renderHistory();
    showToast(`${order.id} deleted. Its history is retained.`);
  }

  function handleAction(action) {
    if (action === "new-order") openNewOrder();
    if (action === "all-orders") setView("orders");
    if (action === "cancel-order") { resetForm(); setView("overview"); }
  }

  $$("[data-action]").forEach((button) => button.addEventListener("click", () => handleAction(button.dataset.action)));
  $$("[data-view]").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    setView(link.dataset.view);
  }));
  $("#history-search").addEventListener("input", renderHistory);
  $("#history-show-all").addEventListener("click", () => {
    historyOrderFilter = "";
    $("#history-search").value = "";
    renderHistory();
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
      if (event.target.value !== row.dataset.autoCalculatedValue) {
        delete row.dataset.autoCalculated;
        delete row.dataset.autoCalculatedValue;
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
  $("#order-search").addEventListener("input", renderAllOrders);
  $("#status-filter").addEventListener("change", renderAllOrders);
  window.addEventListener("resize", () => {
    fitProductDescriptions($("#preview-items"));
    fitProductDescriptions($("#paper-items"));
  });

  function renderLoadedApp() {
    $("#app-shell").hidden = false;
    $("#auth-gate").hidden = true;
    $("#sign-out").hidden = !cloudDeployment;
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
    if (!itemsBody.children.length) createItemRow();
    updateConverterVisibility();
    updateConverter();
    if (needsMoneyDataCleanup && !cloudDeployment) persistOrders();
    renderOverview();
    refreshPreview();
    if (!cloudDeployment) {
      syncSourceData();
      window.setInterval(() => syncSourceData(), 3000);
    }
  }

  if (cloudDeployment) {
    initializeOnlineMode();
  } else {
    orders = loadOrders();
    drivers = loadDrivers();
    renderLoadedApp();
  }
})();
