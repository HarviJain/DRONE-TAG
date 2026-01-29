// window.clearMap = function () {
//   if (window.markersLayer) markersLayer.clearLayers();
//   if (window.polylineLayer) polylineLayer.clearLayers();
//   if (window.sensorLayer) sensorLayer.clearLayers();

//   if (window.trackerPolylines) Object.keys(trackerPolylines).forEach(k => delete trackerPolylines[k]);
//   if (window.trackerMarkers) Object.keys(trackerMarkers).forEach(k => delete trackerMarkers[k]);
//   if (window.trackerAllData) Object.keys(trackerAllData).forEach(k => delete trackerAllData[k]);
//   if (window.sensorMarkers) Object.keys(sensorMarkers).forEach(k => delete sensorMarkers[k]);
//   if (window.sensorAllData) Object.keys(sensorAllData).forEach(k => delete sensorAllData[k]);

//   const imagesGrid = document.getElementById('images-grid');
//   if (imagesGrid) imagesGrid.innerHTML = '';
// };


// document.getElementById("sensorTableContainer").style.display = "block";

// // --- Updated Sensor History Table Renderer ---
// function updateSensorTable(sensorData) {
//   const tbody = document.getElementById("sensorDataTableBody");
//   const thead = document.getElementById("sensorDataTableHeader");
//   const container = document.getElementById("sensorTableContainer");
//   const panel = document.getElementById("sensorTablePanel");

//   if (!tbody || !container || !thead || !panel) {
//     console.error("Sensor table elements not found");
//     return;
//   }

//   tbody.innerHTML = "";
//   thead.innerHTML = "";

//   let rows = [];

//   if (Array.isArray(sensorData) && sensorData.length > 0) {
//     // History mode
//     rows = sensorData.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
//   } else if (sensorData && typeof sensorData === "object") {
//     // Single object
//     rows = [sensorData];
//   }

//   if (rows.length === 0) {
//     tbody.innerHTML = `
//       <tr class="no-data-row">
//         <td colspan="20" style="text-align:center;">No sensor data available. Fetch a sensor first.</td>
//       </tr>`;
//     return;
//   }

//   // --- Dynamically create table headers from first row ---
//   const headers = Object.keys(rows[0]);
//   const trHead = document.createElement("tr");
//   headers.forEach(h => {
//     const th = document.createElement("th");
//     th.textContent = h;
//     trHead.appendChild(th);
//   });
//   thead.appendChild(trHead);

//   // --- Fill table rows ---
//   rows.forEach(row => {
//     const tr = document.createElement("tr");
//     headers.forEach(h => {
//       const td = document.createElement("td");

//       // Format coordinates nicely
//       if (h.toLowerCase() === "latitude" || h.toLowerCase() === "longitude") {
//         td.textContent = row[h] !== undefined ? Number(row[h]).toFixed(6) : "-";
//       }
//       // Format Timestamp nicely
//       else if (h.toLowerCase() === "timestamp") {
//         td.textContent = row[h] ? formatDate(row[h]) : "-";
//       }
//       // If Maplink, create clickable link
//       else if (h.toLowerCase() === "maplink" && row[h]) {
//         td.innerHTML = `<a href="${row[h]}" target="_blank">View</a>`;
//       }
//       else {
//         td.textContent = row[h] !== undefined && row[h] !== null ? row[h] : "-";
//       }

//       tr.appendChild(td);
//     });
//     tbody.appendChild(tr);
//   });

//   // --- Optional: update panel with latest sensor ---
//   if (typeof updateSensorPanel === "function") updateSensorPanel(rows[0]);
//   if (typeof plotSensorOnMap === "function") plotSensorOnMap(rows[0]);

//   // --- Auto-expand panel if minimized ---
//   if (panel.classList.contains("minimized")) {
//     panel.classList.remove("minimized");
//     document.getElementById("sensorTablePanelChevron")?.classList.remove("rotated");
//     container.style.display = "block";
//   }
// }


// // --- Helper for timestamp formatting ---
// function formatDate(ts) {
//   if (!ts) return "-";
//   if (typeof ts === "string" && ts.includes("-") && ts.includes(":")) {
//     const [dmy, t] = ts.split(" ");
//     const [d, m, y] = dmy.split("-");
//     ts = `${y}-${m}-${d} ${t}`;
//   }
//   const d = new Date(ts);
//   return isNaN(d) ? "-" : d.toLocaleString();
// }

// // --- Helper for safe lat/lon formatting ---
// function formatCoord(v) {
//   if (!v && v !== 0) return "-";
//   const num = Number(v);
//   return isNaN(num) ? "-" : num.toFixed(6);
// }


// document.addEventListener('DOMContentLoaded', function () {
//   /* ================= DOM ================= */
//   const fetchBtn = document.getElementById('fetch-btn');
//   const trackerInput = document.getElementById('tracker-id');
//   const sensorInput = document.getElementById('sensor-id');
//   const statusMessage = document.getElementById('status-message');
//   const lastUpdatedDiv = document.querySelector('.last-updated');
//   const imagesGrid = document.getElementById('images-grid');

//   /* ================= REAL-TIME UPDATE CONFIG ================= */
//   let realtimeUpdateInterval = null;
//   const realtimeUpdateConfig = {
//     enabled: false,
//     interval: 5000,
//     trackers: new Set(),
//     lastFetched: {},
//     maxRetryCount: 3,
//     retryDelay: 1000
//   };

//   /* ================= GROUP AUTO-REFRESH ================= */
//   let groupAutoInterval = null;
//   let groupAutoSeconds = 10000; // 10 sec default

//   function startGroupAutoRefresh() {
//     if (groupAutoInterval) clearInterval(groupAutoInterval);

//     groupAutoInterval = setInterval(() => {
//       if (!activeGroup) {
//         console.log("⚠️ No active group, skipping auto-refresh");
//         return;
//       }
//       console.log("🔄 Auto-refreshing group:", activeGroup);

//       const event = new Event('click');
//       document.getElementById('fetchGroupBtn').dispatchEvent(event);

//     }, groupAutoSeconds);

//     console.log("▶️ Group auto-refresh started");
//   }

//   function stopGroupAutoRefresh() {
//     if (groupAutoInterval) {
//       clearInterval(groupAutoInterval);
//       groupAutoInterval = null;
//       console.log("⏹ Group auto-refresh stopped");
//     }
//   }

//   /* ================= MAP ================= */
//   const map = L.map('map').setView([23.0225, 72.5714], 13);
//   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     maxZoom: 19
//   }).addTo(map);

//   const markersLayer = L.layerGroup().addTo(map);
//   const polylineLayer = L.layerGroup().addTo(map);
//   const sensorLayer = L.layerGroup().addTo(map);

//   let lastUpdateTime = null;
//   let activeGroup = null;

//   /* ================= TRACKER STATE ================= */
//   const trackerPolylines = {};
//   const trackerMarkers = {};
//   const trackerColorMap = {};
//   const trackerVisibility = {};
//   const trackerAllData = {};

//   /* ================= SENSOR STATE ================= */
//   const sensorMarkers = {};
//   const sensorAllData = {};

//   const COLORS = ['#2563eb', '#eab308', '#9333ea', '#ea580c', '#0891b2', '#4f46e5'];
//   let colorIndex = 0;

//   // Group settings from localStorage
//   let groupSettings = JSON.parse(localStorage.getItem('groupSettings')) || {};

//   function getTrackerColor(trackerId) {
//     if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
//       return groupSettings[activeGroup][trackerId].color;
//     }
    
//     if (trackerColorMap[trackerId]) {
//       return trackerColorMap[trackerId];
//     }
    
//     const color = COLORS[colorIndex++ % COLORS.length];
//     trackerColorMap[trackerId] = color;
//     updateLegend();
//     return color;
//   }

//   function isTrackerVisible(trackerId) {
//     if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
//       return groupSettings[activeGroup][trackerId].visible;
//     }
    
//     return trackerVisibility[trackerId] !== false;
//   }

//   /* ================= REAL-TIME AUTO-UPDATE FUNCTIONS ================= */
//   function startRealtimeUpdates() {
//     if (realtimeUpdateInterval) {
//       clearInterval(realtimeUpdateInterval);
//     }
    
//     realtimeUpdateInterval = setInterval(async () => {
//       if (realtimeUpdateConfig.trackers.size === 0) return;
      
//       const now = Date.now();
//       const trackersToUpdate = Array.from(realtimeUpdateConfig.trackers);
      
//       for (const trackerId of trackersToUpdate) {
//         if (realtimeUpdateConfig.lastFetched[trackerId] && 
//             (now - realtimeUpdateConfig.lastFetched[trackerId]) < realtimeUpdateConfig.interval) {
//           continue;
//         }
        
//         await fetchLatestTrackerData(trackerId);
//         realtimeUpdateConfig.lastFetched[trackerId] = now;
//       }
//     }, realtimeUpdateConfig.interval);
//   }

//   function stopRealtimeUpdates() {
//     if (realtimeUpdateInterval) {
//       clearInterval(realtimeUpdateInterval);
//       realtimeUpdateInterval = null;
//     }
//   }

//   function addTrackerToRealtimeUpdates(trackerId) {
//     realtimeUpdateConfig.trackers.add(trackerId);
//     if (!realtimeUpdateInterval) {
//       startRealtimeUpdates();
//     }
//     showStatus(`Tracker ${trackerId} added to real-time updates`, 'success');
//   }

//   function removeTrackerFromRealtimeUpdates(trackerId) {
//     realtimeUpdateConfig.trackers.delete(trackerId);
//     if (realtimeUpdateConfig.trackers.size === 0) {
//       stopRealtimeUpdates();
//     }
//   }

//   function toggleRealtimeUpdates(trackerId, enable) {
//     if (enable) {
//       addTrackerToRealtimeUpdates(trackerId);
//     } else {
//       removeTrackerFromRealtimeUpdates(trackerId);
//     }
//   }

//   async function fetchLatestTrackerData(trackerId) {
//     try {
//       const res = await fetch('/api/trajectory/latest', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           tracker_id: trackerId,
//           last_timestamp: trackerAllData[trackerId] && trackerAllData[trackerId].length > 0 ? 
//                          trackerAllData[trackerId][trackerAllData[trackerId].length - 1].timestamp : null
//         })
//       });

//       if (!res.ok) throw new Error('Server error');

//       const data = await res.json();
      
//       if (data.points && data.points.length > 0) {
//         const newPoints = data.points.map(p => ({
//           lat: +p.lat,
//           lon: +p.lon,
//           time: p.timestamp,
//           timestamp: p.timestamp,
//           latitude: +p.lat,
//           longitude: +p.lon,
//           altitude: p.altitude || 0,
//           uin_no: p.uin_no || 'N/A',
//           application: p.application || 'Unknown',
//           category: p.category || 'General'
//         }));

//         if (!trackerAllData[trackerId]) {
//           trackerAllData[trackerId] = [];
//         }
        
//         newPoints.forEach(newPoint => {
//           const exists = trackerAllData[trackerId].some(p => p.timestamp === newPoint.timestamp);
//           if (!exists) {
//             trackerAllData[trackerId].push(newPoint);
//           }
//         });

//         if (newPoints.length > 0) {
//           updateTrackerLatestPoint(trackerId, newPoints[newPoints.length - 1]);
//         }
        
//         displayAllTrackerData(trackerId);
        
//         lastUpdateTime = new Date();
//         updateLastUpdatedTime();
//       }
      
//     } catch (err) {
//       console.error(`Failed to fetch latest data for ${trackerId}:`, err);
//     }
//   }

//   function updateTrackerLatestPoint(trackerId, point) {
//     const color = getTrackerColor(trackerId);
    
//     if (trackerMarkers[trackerId]) {
//       const markers = trackerMarkers[trackerId];
//       if (markers.length > 0) {
//         const endMarker = markers[markers.length - 1];
//         endMarker.setLatLng([point.lat, point.lon]);
//         const popupContent = createPopupContent(trackerId, point, 'Latest Point');
//         endMarker.setPopupContent(popupContent);
//       }
//     }

//     if (trackerPolylines[trackerId]) {
//       const polyline = trackerPolylines[trackerId];
//       const currentLatLngs = polyline.getLatLngs();
//       currentLatLngs.push([point.lat, point.lon]);
//       polyline.setLatLngs(currentLatLngs);
//     }
//   }

//   /* ================= ICONS ================= */
//   function createPinIcon(color, size = 34) {
//     return L.divIcon({
//       className: '',
//       html: `
//         <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
//           <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
//         </svg>`,
//       iconSize: [size, size],
//       iconAnchor: [size / 2, size],
//       popupAnchor: [0, -size]
//     });
//   }

//   function createSensorIcon(color = '#ff5722') {
//     return L.divIcon({
//       className: 'sensor-marker',
//       html: `
//         <div style="background:${color};width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:10px;">
//           S
//         </div>`,
//       iconSize: [20, 20],
//       iconAnchor: [10, 10],
//       popupAnchor: [0, -10]
//     });
//   }

//   const START_ICON = createPinIcon('green');
//   const END_ICON = createPinIcon('red');

//   /* ================= LEGEND ================= */
//   const legend = L.control({ position: 'bottomright' });

//   legend.onAdd = function () {
//     const div = L.DomUtil.create('div', 'map-legend');
//     div.style.background = 'white';
//     div.style.padding = '10px';
//     div.style.marginBottom = '80px';       // move legend up & inward
//     div.style.marginRight = '20px';

//     div.style.borderRadius = '8px';
//     div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
//     div.style.fontSize = '13px';
//     return div;
//   };

//   legend.addTo(map);

//   function updateLegend() {
//     const div = document.querySelector('.map-legend');
//     if (!div) return;

//     const pin = (color) => `
//       <svg width="14" height="22" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
//         <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
//       </svg>
//     `;

//     let html = `
//       <strong>Legend</strong><br><br>
//       <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
//         ${pin('green')}
//         <span style="font-weight:600;">Tracker Start</span>
//       </div>
//       <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
//         ${pin('red')}
//         <span style="font-weight:600;">Tracker End</span>
//       </div>
//       <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
//         <div style="background:#ff5722;width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>
//         <span style="font-weight:600;">Sensor</span>
//       </div>
//       <hr style="margin:6px 0">
//     `;

//     Object.entries(trackerColorMap).forEach(([id, color]) => {
//       if (isTrackerVisible(id)) {
//         html += `
//           <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
//             <span style="color:${color};font-size:14px;">●</span>
//             ${id} ${realtimeUpdateConfig.trackers.has(id) ? '🔄' : ''}
//           </div>
//         `;
//       }
//     });

//     div.innerHTML = html;
//   }

//   /* ================= EVENTS ================= */
//   fetchBtn?.addEventListener('click', () => {
//     const id = trackerInput.value.trim();
//     if (id) fetchSingleTracker(id, true);
//   });

//   // Sensor fetch button event
//   const fetchSensorBtn = document.getElementById('fetch-sensor-btn');
//   fetchSensorBtn?.addEventListener('click', () => {
//     const id = sensorInput.value.trim();
//     if (id) fetchSensorData(id);
//   });

//   /* ================= FETCH SINGLE TRACKER ================= */
//   async function fetchSingleTracker(trackerId, clearBefore = false, enableRealtime = false) {
//     if (!trackerId) return;

//     if (clearBefore) clearMap();

//     const color = getTrackerColor(trackerId);
//     trackerVisibility[trackerId] = true;
//     showStatus(`Fetching tracker ${trackerId}...`, 'loading');

//     try {
//       const res = await fetch('/api/trajectory', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           tracker_id: trackerId,
//           interval_seconds: 30,
//           max_gap_seconds: 120
//         })
//       });

//       if (!res.ok) throw new Error('Server error');

//       const data = await res.json();
//       console.log('Received data from server:', data);
      
//       const points = (data.points || []).map(p => ({
//         lat: +p.lat,
//         lon: +p.lon,
//         time: p.timestamp,
//         timestamp: p.timestamp,
//         latitude: +p.lat,
//         longitude: +p.lon,
//         altitude: p.altitude || 0,
//         uin_no: p.uin_no || 'N/A',
//         application: p.application || 'Unknown',
//         category: p.category || 'General'
//       }));

//       console.log(`Parsed ${points.length} points for tracker ${trackerId}`);
      
//       // Store ALL points for this tracker
//       trackerAllData[trackerId] = points;

//       plotTrackerPath(trackerId, points, color);
      
//       if (points.length > 0) {
//         // Display ALL points in the table
//         displayAllTrackerData(trackerId);
        
//         // Auto-enable real-time updates if specified
//         if (enableRealtime) {
//           addTrackerToRealtimeUpdates(trackerId);
//         }
//       }

//       lastUpdateTime = new Date();
//       updateLastUpdatedTime();
//       showStatus(`Loaded ${points.length} points for tracker ${trackerId}`, 'success');

//     } catch (err) {
//       console.error('Error fetching tracker:', err);
//       showStatus(`${trackerId}: ${err.message}`, 'error');
//     }
//   }

// //added by harvi jain
// window.fetchSensorData = async function (sensorId) {
//   if (!sensorId) return;

//   showStatus(`Fetching sensor ${sensorId}...`, "loading");

//   try {
//     const res = await fetch(`/api/sensor/data?sensor_id=${sensorId}`);
//     if (!res.ok) throw new Error("Backend API error");

//     const data = await res.json();

//     let rows = [];
//     if (Array.isArray(data.rows)) {
//       rows = data.rows;
//     } else if (data && typeof data === "object") {
//       rows = [data]; // wrap single object
//     }

//     // Latest data first
//     rows.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

//     sensorAllData[sensorId] = rows;

//     // ✅ Pass ALL rows to the table function
//     updateSensorTable(rows);

//     // Plot the most recent sensor point on map
//     if (Array.isArray(rows) && rows.length > 0) {
//       plotSensorOnMap(rows[0]);
//     }

//     saveSensorToLocalStorage(sensorId);
//     showStatus(`Sensor ${sensorId} loaded`, "success");

//   } catch (err) {
//     console.error(err);
//     showStatus(err.message, "error");
//   }
// };

// // Helper: save sensor ID to local storage
// // function saveSensorToLocalStorage(sensorId) {
// //   const STORAGE_KEY = "saved_sensors";
// //   const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
// //   if (!saved.includes(sensorId)) {
// //     saved.push(sensorId);
// //     localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
// //   }
// // }

// function formatDate(ts) {
//   if (!ts) return "-";

//   // Handle "21-01-2026 17:44" format
//   if (typeof ts === "string" && ts.includes("-") && ts.includes(":")) {
//     const parts = ts.split(" ");
//     if (parts.length === 2) {
//       const [d, m, y] = parts[0].split("-");
//       ts = `${y}-${m}-${d} ${parts[1]}`;
//     }
//   }

//   const d = new Date(ts);
//   return isNaN(d) ? "-" : d.toLocaleString();
// }


// function plotSensorOnMap(sensorData) {
//     if (!sensorData?.Latitude || !sensorData?.Longitude) return;

//     const latlng = [sensorData.Latitude, sensorData.Longitude];

//     if (sensorMarkers[sensorData.SensorId]) {
//       sensorLayer.removeLayer(sensorMarkers[sensorData.SensorId]);
//     }

//     const marker = L.marker(latlng, {
//       icon: createSensorIcon()
//     }).bindPopup(createSensorPopupContent(sensorData));

//     sensorLayer.addLayer(marker);
//     sensorMarkers[sensorData.SensorId] = marker;

//     map.setView(latlng, 16); // ✅ SIMPLE & SAFE
//     updateLegend();
//   }

//   function createSensorPopupContent(sensorData) {
//     let content = `<div style="min-width: 250px; max-width: 300px;">`;
//     content += `<h4 style="margin: 0 0 10px 0; color: #333; border-bottom: 2px solid #ff5722; padding-bottom: 5px;">Sensor ${sensorData.SensorId || 'N/A'}</h4>`;
//     content += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">`;
    
//     // Add all sensor parameters
//     const params = [
//       { label: 'Location', value: `${sensorData.Latitude?.toFixed(6) || 'N/A'}, ${sensorData.Longitude?.toFixed(6) || 'N/A'}` },
//       { label: 'Moisture', value: sensorData.Moisture || 'N/A' },
//       { label: 'Temperature', value: sensorData.Temperature || 'N/A' },
//       { label: 'pH Value', value: sensorData.PHValue || 'N/A' },
//       { label: 'EC', value: sensorData.EC || 'N/A' },
//       { label: 'Nitrogen', value: sensorData.Nitrogen || 'N/A' },
//       { label: 'Phosphorous', value: sensorData.Phosphorous || 'N/A' },
//       { label: 'Potassium', value: sensorData.Potassium || 'N/A' },
//       { label: 'SatelliteFix', value: sensorData.SatelliteFix || 'N/A' },
//     ];
    
//     params.forEach(param => {
//       content += `<div><strong>${param.label}:</strong></div><div>${param.value}</div>`;
//     });
    
//     content += `</div>`;
    
//     // Add Google Maps link if we have coordinates
//     if (sensorData.Latitude && sensorData.Longitude) {
//       const mapLink = `https://www.google.com/maps?q=${sensorData.Latitude},${sensorData.Longitude}`;
//       content += `<hr style="margin: 10px 0;"><a href="${mapLink}" target="_blank" style="color: #2563eb; text-decoration: none; display: block; text-align: center; padding: 5px; background: #f0f0f0; border-radius: 4px;">📍 Open in Google Maps</a>`;
//     }
    
//     content += `</div>`;
//     return content;
//   }

//   function updateSensorPanel(sensorData) {
//   if (!sensorData || typeof sensorData !== 'object') {
//     console.warn("updateSensorPanel: invalid sensor data", sensorData);
//     return;
//   }


//     // Clear previous content
//     sensorPanel.innerHTML = '';

//     // Create sensor data table
//     const table = document.createElement('table');
//     table.className = 'sensor-table';
//     table.style.width = '100%';
//     table.style.borderCollapse = 'collapse';
//     table.style.fontSize = '14px';
//     table.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
//     table.style.borderRadius = '8px';
//     table.style.overflow = 'hidden';

//     // Table header
//     const thead = document.createElement('thead');
//     thead.innerHTML = `
//       <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
//         <th style="padding: 12px 15px; text-align: left; border-bottom: 2px solid #ddd;">Parameter</th>
//         <th style="padding: 12px 15px; text-align: left; border-bottom: 2px solid #ddd;">Value</th>
//       </tr>
//     `;
//     table.appendChild(thead);

//     // Table body
//     const tbody = document.createElement('tbody');
    
//     const sensorParams = [
//       { label: 'Sensor ID', value: sensorData.SensorId || 'N/A' },
//       { label: 'Latitude', value: sensorData.Latitude?.toFixed(6) || 'N/A' },
//       { label: 'Longitude', value: sensorData.Longitude?.toFixed(6) || 'N/A' },
//       { label: 'Moisture', value: sensorData.Moisture || 'N/A' },
//       { label: 'Temperature', value: sensorData.Temperature || 'N/A' },
//       { label: 'pH Value', value: sensorData.PHValue || 'N/A' },
//       { label: 'EC', value: sensorData.EC || 'N/A' },
//       { label: 'Nitrogen', value: sensorData.Nitrogen || 'N/A' },
//       { label: 'Phosphorous', value: sensorData.Phosphorous || 'N/A' },
//       { label: 'Potassium', value: sensorData.Potassium || 'N/A' },
//       { label: 'SatelliteFix', value: sensorData.SatelliteFix || 'N/A' }
//     ];

//     sensorParams.forEach((param, index) => {
//       const row = document.createElement('tr');
//       row.style.borderBottom = '1px solid #eee';
//       row.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : 'white';
      
//       row.innerHTML = `
//         <td style="padding: 10px 15px; font-weight: 600; color: #333;">${param.label}</td>
//         <td style="padding: 10px 15px; color: #555;">${param.value}</td>
//       `;
      
//       tbody.appendChild(row);
//     });

//     table.appendChild(tbody);
//     sensorPanel.appendChild(table);

//     // Add Google Maps link if available
//     if (sensorData.Latitude && sensorData.Longitude) {
//       const mapLink = `https://www.google.com/maps?q=${sensorData.Latitude},${sensorData.Longitude}`;
//       const mapLinkDiv = document.createElement('div');
//       mapLinkDiv.style.marginTop = '20px';
//       mapLinkDiv.style.textAlign = 'center';
//       mapLinkDiv.innerHTML = `
//         <a href="${mapLink}" target="_blank" 
//            style="display: inline-flex; align-items: center; gap: 10px;
//                   background: #4285f4; color: white; padding: 12px 24px;
//                   border-radius: 6px; text-decoration: none; font-weight: 500;
//                   box-shadow: 0 4px 6px rgba(66, 133, 244, 0.3);
//                   transition: all 0.3s ease;">
//           <span style="font-size: 18px;">📍</span>
//           Open in Google Maps
//         </a>
//       `;
//       sensorPanel.appendChild(mapLinkDiv);
//     }

//     // Auto-expand sensor panel if minimized
//     const sensorPanelElement = document.getElementById('sensorTablePanel');
//     if (sensorPanelElement && sensorPanelElement.classList.contains('minimized')) {
//       sensorPanelElement.classList.remove('minimized');
//       const chevron = document.getElementById('sensorTablePanelChevron');
//       if (chevron) chevron.classList.remove('rotated');
//     }
//   }

//   function saveSensorToLocalStorage(sensorId) {
//     const savedSensors = JSON.parse(localStorage.getItem('saved_sensors')) || [];
//     if (!savedSensors.includes(sensorId)) {
//       savedSensors.push(sensorId);
//       localStorage.setItem('saved_sensors', JSON.stringify(savedSensors));
//       console.log(`Sensor ${sensorId} saved to localStorage`);
//     }
//   }

//   /* ================= DISPLAY ALL TRACKER DATA ================= */
//   function displayAllTrackerData(trackerId) {
//     if (!trackerId || !trackerAllData[trackerId] || trackerAllData[trackerId].length === 0) {
//       console.log(`No data to display for tracker ${trackerId}`);
//       return;
//     }
    
//     console.log(`Displaying ${trackerAllData[trackerId].length} points for tracker ${trackerId}`);
    
//     // Get selected parameters for this tracker
//     let selectedParams = null;
//     if (window.getRealtimeParameters) {
//       selectedParams = window.getRealtimeParameters(trackerId);
//     }
    
//     if (!selectedParams) {
//       selectedParams = {
//         timestamp: true,
//         latitude: true,
//         longitude: true,
//         altitude: true,
//         uin_no: true,
//         application: true,
//         category: true
//       };
//     }
    
//     // Create array of all points formatted for the table
//     const allPointsData = trackerAllData[trackerId].map((point, index) => {
//       return {
//         'Tracker ID': trackerId,
//         'Point #': index + 1,
//         'timestamp': point.timestamp || point.time || new Date().toISOString(),
//         'latitude': point.latitude || point.lat,
//         'longitude': point.longitude || point.lon,
//         'altitude': point.altitude || 0,
//         'uin_no': point.uin_no || 'N/A',
//         'application': point.application || 'Unknown',
//         'category': point.category || 'General'
//       };
//     });
    
//     console.log(`Formatted ${allPointsData.length} points for table display`);
    
//     // Update the real-time table with ALL points
//     if (window.updateRealtimeTableAllPoints && allPointsData && allPointsData.length > 0) {
//       console.log('Calling updateRealtimeTableAllPoints');
//       window.updateRealtimeTableAllPoints(trackerId, allPointsData, selectedParams);
//     } else {
//       console.error('updateRealtimeTableAllPoints is not defined or no data to display!');
//     }
    
//     // Auto-expand the real-time panel
//     const realtimePanel = document.getElementById('realtimeTablePanel');
//     if (realtimePanel && realtimePanel.classList.contains('minimized')) {
//       realtimePanel.classList.remove('minimized');
//       const chevron = document.getElementById('realtimeTablePanelChevron');
//       if (chevron) chevron.classList.remove('rotated');
//       const container = document.getElementById('realtimeTableContainer');
//       if (container) container.style.display = 'block';
//     }
//   }

//   /* ================= GROUP FETCH ================= */
//   window.fetchGroupTrackers = function (trackerIds, enableRealtime = false) {
//     if (!trackerIds?.length) {
//       alert('Group empty');
//       return;
//     }
    
//     const visibleTrackers = trackerIds.filter(id => isTrackerVisible(id));
    
//     if (visibleTrackers.length === 0) {
//       alert('No visible trackers in this group');
//       return;
//     }
    
//     clearMap();
//     console.log(`Fetching ${visibleTrackers.length} trackers from group`);
    
//     visibleTrackers.forEach((id, i) => {
//       setTimeout(() => {
//         console.log(`Fetching tracker ${id} (${i + 1}/${visibleTrackers.length})`);
//         fetchSingleTracker(id, false, enableRealtime);
//       }, i * 800);
//     });
//   };

//   /* ================= PLOT ================= */
//   function plotTrackerPath(trackerId, points, color) {
//     if (!points.length) return;

//     if (!isTrackerVisible(trackerId)) {
//       console.log(`${trackerId} is hidden, not plotting`);
//       return;
//     }

//     const latlngs = points.map(p => [p.lat, p.lon]);

//     // Polyline
//     const polyline = L.polyline(latlngs, {
//       color: color,
//       weight: 4,
//       opacity: 0.85
//     }).addTo(polylineLayer);

//     trackerPolylines[trackerId] = polyline;
    
//     if (!window.trajectoryOverlays) {
//       window.trajectoryOverlays = {};
//     }
//     window.trajectoryOverlays[trackerId] = polyline;

//     function createPopupContent(trackerId, point, label) {
//       let content = `<b>${trackerId}</b><br>${label}<br>`;
      
//       if (point.time) {
//         content += `Time: ${formatTimestamp(point.time)}<br>`;
//       }
      
//       if (point.lat !== undefined) {
//         content += `Latitude: ${point.lat.toFixed(6)}<br>`;
//       }
//       if (point.lon !== undefined) {
//         content += `Longitude: ${point.lon.toFixed(6)}<br>`;
//       }
      
//       if (point.altitude !== undefined) {
//         content += `Altitude: ${point.altitude}m<br>`;
//       }
//       if (point.uin_no && point.uin_no !== 'N/A') {
//         content += `UIN: ${point.uin_no}<br>`;
//       }
//       if (point.application && point.application !== 'Unknown') {
//         content += `Application: ${point.application}<br>`;
//       }
//       if (point.category && point.category !== 'General') {
//         content += `Category: ${point.category}<br>`;
//       }
      
//       return content;
//     }

//     // Markers
//     trackerMarkers[trackerId] = [];

//     // START marker
//     const startMarker = L.marker(latlngs[0], { icon: START_ICON })
//       .addTo(markersLayer)
//       .bindPopup(createPopupContent(trackerId, points[0], 'Start Point'));
//     trackerMarkers[trackerId].push(startMarker);

//     // END marker
//     const endMarker = L.marker(latlngs.at(-1), { icon: END_ICON })
//       .addTo(markersLayer)
//       .bindPopup(createPopupContent(trackerId, points.at(-1), 'Latest Point'));
//     trackerMarkers[trackerId].push(endMarker);

//     updateMapBounds();
//   }

//   /* ================= VISIBILITY TOGGLE ================= */
//   window.toggleTrackerVisibility = function (trackerId, visible) {
//     trackerVisibility[trackerId] = visible;
    
//     if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
//       groupSettings[activeGroup][trackerId].visible = visible;
//       localStorage.setItem('groupSettings', JSON.stringify(groupSettings));
//     }
    
//     if (trackerPolylines[trackerId]) {
//       if (visible) {
//         polylineLayer.addLayer(trackerPolylines[trackerId]);
//       } else {
//         polylineLayer.removeLayer(trackerPolylines[trackerId]);
//       }
//     }

//     (trackerMarkers[trackerId] || []).forEach(m => {
//       if (visible) {
//         markersLayer.addLayer(m);
//       } else {
//         markersLayer.removeLayer(m);
//       }
//     });
    
//     if (!visible) {
//       removeTrackerFromRealtimeUpdates(trackerId);
//     }
    
//     updateLegend();
//     updateMapBounds();
//   };

//   /* ================= COLOR CHANGE ================= */
//   window.changeTrackerColor = function (trackerId, color) {
//     trackerColorMap[trackerId] = color;
    
//     if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
//       groupSettings[activeGroup][trackerId].color = color;
//       localStorage.setItem('groupSettings', JSON.stringify(groupSettings));
//     }

//     if (trackerPolylines[trackerId] && isTrackerVisible(trackerId)) {
//       trackerPolylines[trackerId].setStyle({ color: color });
//     }

//     (trackerMarkers[trackerId] || []).forEach(m => {
//       if (m.options.icon && isTrackerVisible(trackerId)) {
//         const iconHtml = m.options.icon.options?.html || '';
//         if (iconHtml.includes('border-radius:50%')) {
//           m.setIcon(createDotIcon(color, 8));
//         }
//       }
//     });

//     updateLegend();
//   };

//       /* ================= SENSOR TABLE ================= */
// // window.updateSensorTable = function (sensorId, rows) {
// //   const tbody = document.getElementById("sensorDataTableBody");
// //   if (!tbody) {
// //     console.error("sensorDataTableBody not found");
// //     return;
// //   }

// //   if (!Array.isArray(rows)) rows = [rows];

// //   // 🔽 SORT: latest data on top
// //   rows.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));

// //   tbody.innerHTML = "";

// //   rows.forEach(row => {
// //     const tr = document.createElement("tr");

// //     tr.innerHTML = `
// //       <td>${row.SensorId ?? "-"}</td>
// //       <td>${row.Timestamp ? new Date(row.Timestamp).toLocaleString() : "-"}</td>
// //       <td>${row.Latitude ?? "-"}</td>
// //       <td>${row.Longitude ?? "-"}</td>
// //       <td>${row.Altitude ?? "-"}</td>
// //       <td>
// //         ${row.Latitude && row.Longitude
// //           ? `<a href="https://www.google.com/maps?q=${row.Latitude},${row.Longitude}" target="_blank">View</a>`
// //           : "-"}
// //       </td>
// //       <td>${row.Moisture ?? "-"}</td>
// //       <td>${row.Nitrogen ?? "-"}</td>
// //       <td>${row.Phosphorous ?? "-"}</td>
// //       <td>${row.PHValue ?? "-"}</td>
// //       <td>${row.Potassium ?? "-"}</td>
// //       <td>${row.SatelliteFix ?? "-"}</td>
// //       <td>${row.Temperature ?? "-"}</td>
// //     `;

// //     tbody.appendChild(tr);
// //   });

//   // /* ================= HELPERS ================= */
//   // function clearMap() {
//   //   markersLayer.clearLayers();
//   //   polylineLayer.clearLayers();
//   //   sensorLayer.clearLayers();
    
//   //   Object.keys(trackerPolylines).forEach(k => delete trackerPolylines[k]);
//   //   Object.keys(trackerMarkers).forEach(k => delete trackerMarkers[k]);
//   //   Object.keys(trackerAllData).forEach(k => delete trackerAllData[k]);
//   //   Object.keys(sensorMarkers).forEach(k => delete sensorMarkers[k]);
//   //   Object.keys(sensorAllData).forEach(k => delete sensorAllData[k]);
    
//   //   updateLegend();
    
//   //   realtimeUpdateConfig.trackers.clear();
//   //   stopRealtimeUpdates();
    
//   //   if (imagesGrid) {
//   //     imagesGrid.innerHTML = '';
//   //   }

//   function updateLastUpdatedTime() {
//     if (lastUpdatedDiv && lastUpdateTime) {
//       lastUpdatedDiv.textContent = `Last updated: ${lastUpdateTime.toLocaleString()}`;
//     }
//   }

//   function showStatus(msg, type) {
//     if (!statusMessage) return;
//     statusMessage.textContent = msg;
//     statusMessage.className = `status-${type}`;
//     if (type !== 'loading') setTimeout(() => statusMessage.textContent = '', 4000);
//   }

//   function formatTimestamp(ts) {
//     return new Date(ts).toLocaleString();
//   }

//   function updateMapBounds() {
//     const allVisiblePoints = [];
    
//     Object.keys(trackerPolylines).forEach(trackerId => {
//       if (isTrackerVisible(trackerId) && trackerPolylines[trackerId]._latlngs) {
//         allVisiblePoints.push(...trackerPolylines[trackerId]._latlngs);
//       }
//     });
    
//     Object.keys(sensorMarkers).forEach(sensorId => {
//       const marker = sensorMarkers[sensorId];
//       if (marker && marker.getLatLng) {
//         allVisiblePoints.push(marker.getLatLng());
//       }
//     });
    
//     if (allVisiblePoints.length > 0) {
//       map.fitBounds(allVisiblePoints, { padding: [40, 40] });
//     }
//   }

//   /* ================= EXPOSE FUNCTIONS TO WINDOW ================= */
//   window.setActiveGroup = function(groupName) {
//     activeGroup = groupName;
//     groupSettings = JSON.parse(localStorage.getItem('groupSettings')) || {};
//   };

//   window.updateTrackerVisibilityFromGroup = function(trackerId, isVisible) {
//     window.toggleTrackerVisibility(trackerId, isVisible);
//   };

//   window.updateTrackerColorFromGroup = function(trackerId, color) {
//     window.changeTrackerColor(trackerId, color);
//   };

//   window.handleFetch = function(trackerId, enableRealtime = false) {
//     fetchSingleTracker(trackerId, true, enableRealtime);
//   };

//   window.startRealtimeUpdatesForTracker = function(trackerId) {
//     addTrackerToRealtimeUpdates(trackerId);
//   };

//   window.stopRealtimeUpdatesForTracker = function(trackerId) {
//     removeTrackerFromRealtimeUpdates(trackerId);
//   };

//   window.toggleRealtimeUpdatesForTracker = function(trackerId, enable) {
//     toggleRealtimeUpdates(trackerId, enable);
//   };

//   // Sensor functions
//   // window.fetchSensorData = fetchSensorData;
//   window.plotSensorOnMap = plotSensorOnMap;
//   window.updateSensorPanel = updateSensorPanel;

//   // Initialize global objects
//   window.trajectoryOverlays = {};
//   window.realtimeTableDataAllPoints = {};
//   window.sensorTableData = {};

//   // Add keyboard shortcuts
//   document.addEventListener('keydown', function(e) {
//     if (e.altKey && e.key === 'r') {
//       e.preventDefault();
//       const realtimeBtn = document.getElementById('openRealtimePopup');
//       if (realtimeBtn) realtimeBtn.click();
//     }
    
//     if (e.altKey && e.key === 'a') {
//       e.preventDefault();
//       const trackerId = trackerInput.value.trim();
//       if (trackerId) {
//         const isEnabled = realtimeUpdateConfig.trackers.has(trackerId);
//         toggleRealtimeUpdates(trackerId, !isEnabled);
//         showStatus(`Real-time updates ${!isEnabled ? 'enabled' : 'disabled'} for ${trackerId}`, 'success');
//       }
//     }
    
//     if (e.altKey && e.key === 's') {
//       e.preventDefault();
//       const sensorId = sensorInput.value.trim();
//       if (sensorId) {
//         fetchSensorData(sensorId);
//       }
//     }
//   });

//   // Fetch data for saved trackers and sensors on page load
//   window.addEventListener('load', function() {
//     const savedTrackers = JSON.parse(localStorage.getItem('saved_trackers')) || [];
//     const savedSensors = JSON.parse(localStorage.getItem('saved_sensors')) || [];
    
//     const autoUpdateEnabled = JSON.parse(localStorage.getItem('auto_update_enabled')) || false;
//     const autoUpdateTrackers = JSON.parse(localStorage.getItem('auto_update_trackers')) || [];
    
//     if (savedTrackers.length > 0) {
//       showStatus(`Loading ${savedTrackers.length} saved trackers...`, 'loading');
      
//       setTimeout(() => {
//         savedTrackers.forEach((trackerId, index) => {
//           setTimeout(() => {
//             const enableRealtime = autoUpdateEnabled && autoUpdateTrackers.includes(trackerId);
//             fetchSingleTracker(trackerId, index === 0, enableRealtime);
//           }, index * 1000);
//         });
//       }, 1500);
//     }
    
//     if (savedSensors.length > 0) {
//       setTimeout(() => {
//         showStatus(`Loading ${savedSensors.length} saved sensors...`, 'loading');
//         savedSensors.forEach((sensorId, index) => {
//           setTimeout(() => {
//             fetchSensorData(sensorId);
//           }, index * 1500);
//         });
//       }, 3000);
//     }
//   });

//   // Save auto-update state before page unload
//   window.addEventListener('beforeunload', function() {
//     localStorage.setItem('auto_update_enabled', JSON.stringify(realtimeUpdateConfig.trackers.size > 0));
//     localStorage.setItem('auto_update_trackers', JSON.stringify(Array.from(realtimeUpdateConfig.trackers)));
//     stopRealtimeUpdates();
//   });
// });























//working code but lat long attribute is missplaced
// window.clearMap = function () {
//   if (window.markersLayer) markersLayer.clearLayers();
//   if (window.polylineLayer) polylineLayer.clearLayers();
//   if (window.sensorLayer) sensorLayer.clearLayers();

//   if (window.trackerPolylines) Object.keys(trackerPolylines).forEach(k => delete trackerPolylines[k]);
//   if (window.trackerMarkers) Object.keys(trackerMarkers).forEach(k => delete trackerMarkers[k]);
//   if (window.trackerAllData) Object.keys(trackerAllData).forEach(k => delete trackerAllData[k]);
//   if (window.sensorMarkers) Object.keys(sensorMarkers).forEach(k => delete sensorMarkers[k]);
//   if (window.sensorAllData) Object.keys(sensorAllData).forEach(k => delete sensorAllData[k]);

//   const imagesGrid = document.getElementById('images-grid');
//   if (imagesGrid) imagesGrid.innerHTML = '';
  
//   // Clear sensor table data
//   if (window.updateSensorTable) window.updateSensorTable();
// };


// document.getElementById("sensorTableContainer").style.display = "block";

// // --- Updated Sensor History Table Renderer ---
// // --- Updated Sensor History Table Renderer ---
// function updateSensorTable(sensorData = null) {
//   const tbody = document.getElementById("sensorDataTableBody");
//   const thead = document.getElementById("sensorDataTableHeader");
//   const container = document.getElementById("sensorTableContainer");
//   const panel = document.getElementById("sensorTablePanel");

//   if (!tbody || !container || !thead || !panel) {
//     console.error("Sensor table elements not found");
//     return;
//   }

//   tbody.innerHTML = "";
//   thead.innerHTML = "";

//   // If no data is provided, use all sensor data
//   let rows = [];
  
//   if (sensorData === null) {
//     // Show all sensors data
//     Object.values(window.sensorTableData || {}).forEach(sensorRows => {
//       rows.push(...sensorRows);
//     });
//   } else if (Array.isArray(sensorData) && sensorData.length > 0) {
//     // History mode - multiple sensor data points
//     rows = sensorData;
//   } else if (sensorData && typeof sensorData === "object") {
//     // Single object
//     rows = [sensorData];
//   }

//   if (rows.length === 0) {
//     tbody.innerHTML = `
//       <tr class="no-data-row">
//         <td colspan="14" style="text-align:center;">No sensor data available. Fetch a sensor first.</td>
//       </tr>`;
//     return;
//   }

//   // Sort by timestamp (newest first)
//   rows.sort((a, b) => {
//     const dateA = a.Timestamp ? normalizeTimestamp(a.Timestamp) : "";
//     const dateB = b.Timestamp ? normalizeTimestamp(b.Timestamp) : "";
//     return new Date(dateB) - new Date(dateA);
//   });

//   // --- Dynamically create table headers from actual data keys ---
//   // First, collect all unique keys from all rows
//   const allKeys = new Set();
//   rows.forEach(row => {
//     Object.keys(row).forEach(key => {
//       allKeys.add(key);
//     });
//   });
  
//   // Define the order we want columns to appear
//  const columnOrder = [
//     'SensorId', 'Timestamp', 
//     'Moisture', 'Temperature', 'EC', 'PHValue',  // Sensor parameters first
//     'Nitrogen', 'Phosphorous', 'Potassium',       // Nutrients
//     'Latitude', 'Longitude', 'Altitude',          // Location
//     'SatelliteFix', 'Maplink'               // Additional info
//   ];
  
//   // Sort keys according to our preferred order
//   const headers = columnOrder.filter(key => allKeys.has(key));
  
//   // Add any remaining keys that weren't in our order
//   allKeys.forEach(key => {
//     if (!headers.includes(key)) {
//       headers.push(key);
//     }
//   });

//   const trHead = document.createElement("tr");
//   headers.forEach(h => {
//     const th = document.createElement("th");
//     th.textContent = formatSensorHeader(h);
//     trHead.appendChild(th);
//   });
//   thead.appendChild(trHead);

//   // --- Fill table rows ---
//   rows.forEach(row => {
//     const tr = document.createElement("tr");
//     headers.forEach(h => {
//       const td = document.createElement("td");
//       const value = row[h];

//       // Format coordinates nicely
//       if (h.toLowerCase() === "latitude" || h.toLowerCase() === "longitude") {
//         td.textContent = value !== undefined && value !== null ? Number(value).toFixed(6) : "-";
//       }
//       // Format Timestamp nicely
//       else if (h.toLowerCase() === "timestamp") {
//         td.textContent = value ? formatDate(value) : "-";
//       }
//       // Sensor ID with color
//       else if (h.toLowerCase() === "sensorid") {
//         td.textContent = value || "-";
//         td.className = "sensor-id-cell";
//         td.style.color = getSensorColor(value);
//         td.style.fontWeight = "600";
//       }
//       // Altitude - check both "Altitude" and "altitude"
//       else if (h.toLowerCase() === "altitude") {
//         if (value !== undefined && value !== null && value !== "") {
//           const num = Number(value);
//           td.textContent = !isNaN(num) ? `${num.toFixed(1)} m` : value;
//         } else {
//           td.textContent = "-";
//         }
//       }
//       // Maplink - create clickable link
//       else if (h.toLowerCase() === "maplink") {
//         if (value && value.startsWith('http')) {
//           td.innerHTML = `<a href="${value}" target="_blank" style="color: #2563eb; text-decoration: none;">📍 View</a>`;
//         } else {
//           td.textContent = "-";
//         }
//       }
//       // Format other numeric values
//       else if (['moisture', 'temperature', 'ec', 'phvalue', 'nitrogen', 'phosphorous', 'potassium'].includes(h.toLowerCase())) {
//         if (value !== undefined && value !== null) {
//           const num = Number(value);
//           td.textContent = !isNaN(num) ? num.toFixed(2) : value;
//         } else {
//           td.textContent = "-";
//         }
//       }
//       // ID column - smaller text
//       else if (h.toLowerCase() === "id") {
//         td.textContent = value || "-";
//         td.style.fontSize = "12px";
//         td.style.color = "#9ca3af";
//       }
//       else {
//         td.textContent = value !== undefined && value !== null ? value : "-";
//       }

//       tr.appendChild(td);
//     });
//     tbody.appendChild(tr);
//   });

//   // --- Auto-expand panel if minimized ---
//   if (panel.classList.contains("minimized")) {
//     panel.classList.remove("minimized");
//     document.getElementById("sensorTablePanelChevron")?.classList.remove("rotated");
//     container.style.display = "block";
//   }
  
//   // Update panel title with sensor count
//   const panelHeader = document.querySelector('#sensorTablePanelHeader h2');
//   if (panelHeader) {
//     const sensorIds = Object.keys(window.sensorTableData || {});
//     const totalReadings = rows.length;
//     panelHeader.textContent = `Sensor Data (${sensorIds.length} sensors, ${totalReadings} readings)`;
//   }
// }

// // Helper function to format sensor headers
// function formatSensorHeader(header) {
//   const map = {
//     'SensorId': 'Sensor ID',
//     'Timestamp': 'Timestamp',
//     'Moisture': 'Moisture',
//     'Temperature': 'Temperature',
//     'EC': 'EC',
//     'PHValue': 'pH',
//     'Nitrogen': 'Nitrogen',
//     'Phosphorous': 'Phosphorous',
//     'Potassium': 'Potassium',
//     'Latitude': 'Latitude',
//     'Longitude': 'Longitude',
//     'Altitude': 'Altitude',
//     'SatelliteFix': 'Sat Fix',
//     'Id': 'ID',
//     'Maplink': 'Map Link'
//   };
//   return map[header] || header;
// }

// // Add this function to ensure getSensorColor is available
// function getSensorColor(sensorId) {
//   if (!window.sensorColorMap) {
//     window.sensorColorMap = {};
//   }
  
//   if (!window.sensorColorMap[sensorId]) {
//     const sensorColors = [
//       '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', 
//       '#EF476F', '#9D4EDD', '#FB5607', '#3A86FF', '#8338EC',
//       '#FF9E6D', '#A0E7E5', '#FFA8B5', '#C5F277', '#72DDF7'
//     ];
    
//     const sensorIds = Object.keys(window.sensorColorMap);
//     const colorIndex = sensorIds.length % sensorColors.length;
//     window.sensorColorMap[sensorId] = sensorColors[colorIndex];
//   }
  
//   return window.sensorColorMap[sensorId];
// }
// // --- Helper for timestamp formatting ---
// function formatDate(ts) {
//   if (!ts) return "-";
//   // Handle "21-01-2026 17:44" format
//   if (typeof ts === "string" && ts.includes("-") && ts.includes(":")) {
//     const [dmy, t] = ts.split(" ");
//     const [d, m, y] = dmy.split("-");
//     ts = `${y}-${m}-${d} ${t}`;
//   }
//   const d = new Date(ts);
//   return isNaN(d) ? "-" : d.toLocaleString();
// }

// // Normalize timestamp for sorting
// function normalizeTimestamp(ts) {
//   if (!ts) return "";
//   if (typeof ts === "string" && ts.includes("-") && ts.includes(":")) {
//     const [dmy, t] = ts.split(" ");
//     const [d, m, y] = dmy.split("-");
//     return `${y}-${m}-${d}T${t}`;
//   }
//   return ts;
// }

// // --- Helper for safe lat/lon formatting ---
// function formatCoord(v) {
//   if (!v && v !== 0) return "-";
//   const num = Number(v);
//   return isNaN(num) ? "-" : num.toFixed(6);
// }


// document.addEventListener('DOMContentLoaded', function () {
//   /* ================= DOM ================= */
//   const fetchBtn = document.getElementById('fetch-btn');
//   const trackerInput = document.getElementById('tracker-id');
//   const sensorInput = document.getElementById('sensor-id');
//   const statusMessage = document.getElementById('status-message');
//   const lastUpdatedDiv = document.querySelector('.last-updated');
//   const imagesGrid = document.getElementById('images-grid');

//   /* ================= REAL-TIME UPDATE CONFIG ================= */
//   let realtimeUpdateInterval = null;
//   const realtimeUpdateConfig = {
//     enabled: false,
//     interval: 5000,
//     trackers: new Set(),
//     lastFetched: {},
//     maxRetryCount: 3,
//     retryDelay: 1000
//   };

//   /* ================= GROUP AUTO-REFRESH ================= */
//   let groupAutoInterval = null;
//   let groupAutoSeconds = 10000; // 10 sec default

//   function startGroupAutoRefresh() {
//     if (groupAutoInterval) clearInterval(groupAutoInterval);

//     groupAutoInterval = setInterval(() => {
//       if (!activeGroup) {
//         console.log("⚠️ No active group, skipping auto-refresh");
//         return;
//       }
//       console.log("🔄 Auto-refreshing group:", activeGroup);

//       const event = new Event('click');
//       document.getElementById('fetchGroupBtn').dispatchEvent(event);

//     }, groupAutoSeconds);

//     console.log("▶️ Group auto-refresh started");
//   }

//   function stopGroupAutoRefresh() {
//     if (groupAutoInterval) {
//       clearInterval(groupAutoInterval);
//       groupAutoInterval = null;
//       console.log("⏹ Group auto-refresh stopped");
//     }
//   }

//   /* ================= MAP ================= */
//   const map = L.map('map').setView([23.0225, 72.5714], 13);
//   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     maxZoom: 19
//   }).addTo(map);

//   const markersLayer = L.layerGroup().addTo(map);
//   const polylineLayer = L.layerGroup().addTo(map);
//   const sensorLayer = L.layerGroup().addTo(map);

//   let lastUpdateTime = null;
//   let activeGroup = null;

//   /* ================= TRACKER STATE ================= */
//   const trackerPolylines = {};
//   const trackerMarkers = {};
//   const trackerColorMap = {};
//   const trackerVisibility = {};
//   const trackerAllData = {};

//   /* ================= SENSOR STATE ================= */
//   const sensorMarkers = {};
//   const sensorAllData = {};
//   const sensorColorMap = {};
//   const sensorVisibility = {};
//   const sensorColors = [
//     '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', 
//     '#EF476F', '#9D4EDD', '#FB5607', '#3A86FF', '#8338EC',
//     '#FF9E6D', '#A0E7E5', '#FFA8B5', '#C5F277', '#72DDF7'
//   ];
//   let sensorColorIndex = 0;

//   const COLORS = ['#2563eb', '#eab308', '#9333ea', '#ea580c', '#0891b2', '#4f46e5'];
//   let colorIndex = 0;

//   // Group settings from localStorage
//   let groupSettings = JSON.parse(localStorage.getItem('groupSettings')) || {};

//   function getTrackerColor(trackerId) {
//     if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
//       return groupSettings[activeGroup][trackerId].color;
//     }
    
//     if (trackerColorMap[trackerId]) {
//       return trackerColorMap[trackerId];
//     }
    
//     const color = COLORS[colorIndex++ % COLORS.length];
//     trackerColorMap[trackerId] = color;
//     updateLegend();
//     return color;
//   }

//   function getSensorColor(sensorId) {
//     if (sensorColorMap[sensorId]) {
//       return sensorColorMap[sensorId];
//     }
    
//     const color = sensorColors[sensorColorIndex++ % sensorColors.length];
//     sensorColorMap[sensorId] = color;
//     updateLegend();
//     return color;
//   }

//   function isTrackerVisible(trackerId) {
//     if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
//       return groupSettings[activeGroup][trackerId].visible;
//     }
    
//     return trackerVisibility[trackerId] !== false;
//   }

//   function isSensorVisible(sensorId) {
//     return sensorVisibility[sensorId] !== false;
//   }

//   /* ================= REAL-TIME AUTO-UPDATE FUNCTIONS ================= */
//   function startRealtimeUpdates() {
//     if (realtimeUpdateInterval) {
//       clearInterval(realtimeUpdateInterval);
//     }
    
//     realtimeUpdateInterval = setInterval(async () => {
//       if (realtimeUpdateConfig.trackers.size === 0) return;
      
//       const now = Date.now();
//       const trackersToUpdate = Array.from(realtimeUpdateConfig.trackers);
      
//       for (const trackerId of trackersToUpdate) {
//         if (realtimeUpdateConfig.lastFetched[trackerId] && 
//             (now - realtimeUpdateConfig.lastFetched[trackerId]) < realtimeUpdateConfig.interval) {
//           continue;
//         }
        
//         await fetchLatestTrackerData(trackerId);
//         realtimeUpdateConfig.lastFetched[trackerId] = now;
//       }
//     }, realtimeUpdateConfig.interval);
//   }

//   function stopRealtimeUpdates() {
//     if (realtimeUpdateInterval) {
//       clearInterval(realtimeUpdateInterval);
//       realtimeUpdateInterval = null;
//     }
//   }

//   function addTrackerToRealtimeUpdates(trackerId) {
//     realtimeUpdateConfig.trackers.add(trackerId);
//     if (!realtimeUpdateInterval) {
//       startRealtimeUpdates();
//     }
//     showStatus(`Tracker ${trackerId} added to real-time updates`, 'success');
//   }

//   function removeTrackerFromRealtimeUpdates(trackerId) {
//     realtimeUpdateConfig.trackers.delete(trackerId);
//     if (realtimeUpdateConfig.trackers.size === 0) {
//       stopRealtimeUpdates();
//     }
//   }

//   function toggleRealtimeUpdates(trackerId, enable) {
//     if (enable) {
//       addTrackerToRealtimeUpdates(trackerId);
//     } else {
//       removeTrackerFromRealtimeUpdates(trackerId);
//     }
//   }

//   async function fetchLatestTrackerData(trackerId) {
//     try {
//       const res = await fetch('/api/trajectory/latest', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           tracker_id: trackerId,
//           last_timestamp: trackerAllData[trackerId] && trackerAllData[trackerId].length > 0 ? 
//                          trackerAllData[trackerId][trackerAllData[trackerId].length - 1].timestamp : null
//         })
//       });

//       if (!res.ok) throw new Error('Server error');

//       const data = await res.json();
      
//       if (data.points && data.points.length > 0) {
//         const newPoints = data.points.map(p => ({
//           lat: +p.lat,
//           lon: +p.lon,
//           time: p.timestamp,
//           timestamp: p.timestamp,
//           latitude: +p.lat,
//           longitude: +p.lon,
//           altitude: p.altitude || 0,
//           uin_no: p.uin_no || 'N/A',
//           application: p.application || 'Unknown',
//           category: p.category || 'General'
//         }));

//         if (!trackerAllData[trackerId]) {
//           trackerAllData[trackerId] = [];
//         }
        
//         newPoints.forEach(newPoint => {
//           const exists = trackerAllData[trackerId].some(p => p.timestamp === newPoint.timestamp);
//           if (!exists) {
//             trackerAllData[trackerId].push(newPoint);
//           }
//         });

//         if (newPoints.length > 0) {
//           updateTrackerLatestPoint(trackerId, newPoints[newPoints.length - 1]);
//         }
        
//         displayAllTrackerData(trackerId);
        
//         lastUpdateTime = new Date();
//         updateLastUpdatedTime();
//       }
      
//     } catch (err) {
//       console.error(`Failed to fetch latest data for ${trackerId}:`, err);
//     }
//   }

//   function updateTrackerLatestPoint(trackerId, point) {
//     const color = getTrackerColor(trackerId);
    
//     if (trackerMarkers[trackerId]) {
//       const markers = trackerMarkers[trackerId];
//       if (markers.length > 0) {
//         const endMarker = markers[markers.length - 1];
//         endMarker.setLatLng([point.lat, point.lon]);
//         const popupContent = createPopupContent(trackerId, point, 'Latest Point');
//         endMarker.setPopupContent(popupContent);
//       }
//     }

//     if (trackerPolylines[trackerId]) {
//       const polyline = trackerPolylines[trackerId];
//       const currentLatLngs = polyline.getLatLngs();
//       currentLatLngs.push([point.lat, point.lon]);
//       polyline.setLatLngs(currentLatLngs);
//     }
//   }

//   /* ================= ICONS ================= */
//   function createPinIcon(color, size = 34) {
//     return L.divIcon({
//       className: '',
//       html: `
//         <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
//           <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
//         </svg>`,
//       iconSize: [size, size],
//       iconAnchor: [size / 2, size],
//       popupAnchor: [0, -size]
//     });
//   }

//   function createSensorIcon(color = '#ff5722') {
//     return L.divIcon({
//       className: 'sensor-marker',
//       html: `
//         <div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">
//           <i data-lucide="cpu" style="width: 14px; height: 14px;"></i>
//         </div>`,
//       iconSize: [24, 24],
//       iconAnchor: [12, 12],
//       popupAnchor: [0, -12]
//     });
//   }

//   const START_ICON = createPinIcon('green');
//   const END_ICON = createPinIcon('red');

//   /* ================= LEGEND ================= */
//   const legend = L.control({ position: 'bottomright' });

//   legend.onAdd = function () {
//     const div = L.DomUtil.create('div', 'map-legend');
//     div.style.background = 'white';
//     div.style.padding = '10px';
//     div.style.marginBottom = '80px';
//     div.style.marginRight = '20px';
//     div.style.borderRadius = '8px';
//     div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
//     div.style.fontSize = '13px';
//     div.style.maxHeight = '400px';
//     div.style.overflowY = 'auto';
//     return div;
//   };

//   legend.addTo(map);

//   function updateLegend() {
//     const div = document.querySelector('.map-legend');
//     if (!div) return;

//     const pin = (color) => `
//       <svg width="14" height="22" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
//         <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
//       </svg>
//     `;

//     let html = `
//       <strong>Legend</strong><br><br>
//       <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
//         ${pin('green')}
//         <span style="font-weight:600;">Tracker Start</span>
//       </div>
//       <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
//         ${pin('red')}
//         <span style="font-weight:600;">Tracker End</span>
//       </div>
//       <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
//         <div style="background:#ff5722;width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>
//         <span style="font-weight:600;">Sensor</span>
//       </div>
//       <hr style="margin:6px 0">
//       <strong>Trackers:</strong><br>
//     `;

//     // Add trackers to legend
//     Object.entries(trackerColorMap).forEach(([id, color]) => {
//       if (isTrackerVisible(id)) {
//         html += `
//           <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
//             <span style="color:${color};font-size:14px;">●</span>
//             ${id} ${realtimeUpdateConfig.trackers.has(id) ? '🔄' : ''}
//           </div>
//         `;
//       }
//     });

//     html += `<br><strong>Sensors:</strong><br>`;

//     // Add sensors to legend
//     Object.entries(sensorColorMap).forEach(([id, color]) => {
//       if (isSensorVisible(id)) {
//         html += `
//           <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
//             <span style="color:${color};font-size:14px;">●</span>
//             ${id}
//           </div>
//         `;
//       }
//     });

//     div.innerHTML = html;
//     lucide.createIcons();
//   }

//   /* ================= EVENTS ================= */
//   fetchBtn?.addEventListener('click', () => {
//     const id = trackerInput.value.trim();
//     if (id) fetchSingleTracker(id, true);
//   });

//   // Sensor fetch button event
//   const fetchSensorBtn = document.getElementById('fetch-sensor-btn');
//   fetchSensorBtn?.addEventListener('click', () => {
//     const id = sensorInput.value.trim();
//     if (id) fetchSensorData(id, true);
//   });

//   /* ================= FETCH SINGLE TRACKER ================= */
//   async function fetchSingleTracker(trackerId, clearBefore = false, enableRealtime = false) {
//     if (!trackerId) return;

//     if (clearBefore) clearMap();

//     const color = getTrackerColor(trackerId);
//     trackerVisibility[trackerId] = true;
//     showStatus(`Fetching tracker ${trackerId}...`, 'loading');

//     try {
//       const res = await fetch('/api/trajectory', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           tracker_id: trackerId,
//           interval_seconds: 30,
//           max_gap_seconds: 120
//         })
//       });

//       if (!res.ok) throw new Error('Server error');

//       const data = await res.json();
//       console.log('Received data from server:', data);
      
//       const points = (data.points || []).map(p => ({
//         lat: +p.lat,
//         lon: +p.lon,
//         time: p.timestamp,
//         timestamp: p.timestamp,
//         latitude: +p.lat,
//         longitude: +p.lon,
//         altitude: p.altitude || 0,
//         uin_no: p.uin_no || 'N/A',
//         application: p.application || 'Unknown',
//         category: p.category || 'General'
//       }));

//       console.log(`Parsed ${points.length} points for tracker ${trackerId}`);
      
//       // Store ALL points for this tracker
//       trackerAllData[trackerId] = points;

//       plotTrackerPath(trackerId, points, color);
      
//       if (points.length > 0) {
//         // Display ALL points in the table
//         displayAllTrackerData(trackerId);
        
//         // Auto-enable real-time updates if specified
//         if (enableRealtime) {
//           addTrackerToRealtimeUpdates(trackerId);
//         }
//       }

//       lastUpdateTime = new Date();
//       updateLastUpdatedTime();
//       showStatus(`Loaded ${points.length} points for tracker ${trackerId}`, 'success');

//     } catch (err) {
//       console.error('Error fetching tracker:', err);
//       showStatus(`${trackerId}: ${err.message}`, 'error');
//     }
//   }

//   /* ================= FETCH SENSOR DATA ================= */
//   window.fetchSensorData = async function (sensorId, clearBefore = false) {
//     if (!sensorId) return;

//     if (clearBefore) {
//       // Clear only sensor data if requested
//       sensorLayer.clearLayers();
//       Object.keys(sensorMarkers).forEach(k => delete sensorMarkers[k]);
//     }

//     sensorVisibility[sensorId] = true;
//     showStatus(`Fetching sensor ${sensorId}...`, "loading");

//     try {
//       const res = await fetch(`/api/sensor/data?sensor_id=${sensorId}`);
//       if (!res.ok) throw new Error("Backend API error");

//       const data = await res.json();
//       let rows = [];
      
//       if (Array.isArray(data.rows)) {
//         rows = data.rows;
//       } else if (data && typeof data === "object") {
//         rows = [data];
//       }

//       // Store sensor data
//       sensorAllData[sensorId] = rows;

//       // Plot all sensor points on map
//       rows.forEach((sensorData, index) => {
//         plotSensorOnMap(sensorData, sensorId);
//       });

//       // Update sensor table with all readings
//       if (rows.length > 0) {
//         // Initialize sensor table data storage
//         if (!window.sensorTableData) {
//           window.sensorTableData = {};
//         }
//         window.sensorTableData[sensorId] = rows;
        
//         // Update the table with all sensor data
//         updateSensorTable();
//       }

//       saveSensorToLocalStorage(sensorId);
//       showStatus(`Loaded ${rows.length} readings for sensor ${sensorId}`, "success");

//     } catch (err) {
//       console.error(err);
//       showStatus(err.message, "error");
//     }
//   };

//   /* ================= PLOT SENSOR ON MAP ================= */
//   function plotSensorOnMap(sensorData, sensorId = null) {
//     if (!sensorData?.Latitude || !sensorData?.Longitude) return;

//     const actualSensorId = sensorId || sensorData.SensorId;
//     const latlng = [Number(sensorData.Latitude), Number(sensorData.Longitude)];
//     const color = getSensorColor(actualSensorId);

//     // Remove existing marker for this sensor if it exists
//     if (sensorMarkers[actualSensorId]) {
//       sensorLayer.removeLayer(sensorMarkers[actualSensorId]);
//     }

//     const marker = L.marker(latlng, {
//       icon: createSensorIcon(color)
//     }).bindPopup(createSensorPopupContent(sensorData));

//     sensorLayer.addLayer(marker);
//     sensorMarkers[actualSensorId] = marker;

//     // Fit bounds to show all sensors
//     updateMapBounds();
//     updateLegend();
//   }

//   function createSensorPopupContent(sensorData) {
//     let content = `<div style="min-width: 280px; max-width: 350px;">`;
//     content += `<h4 style="margin: 0 0 12px 0; color: #333; border-bottom: 2px solid ${getSensorColor(sensorData.SensorId)}; padding-bottom: 6px;">Sensor ${sensorData.SensorId || 'N/A'}</h4>`;
//     content += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">`;
    
//     const params = [
//       { label: 'Timestamp', value: formatDate(sensorData.Timestamp) },
//       { label: 'Location', value: `${Number(sensorData.Latitude).toFixed(6)}, ${Number(sensorData.Longitude).toFixed(6)}` },
//       { label: 'Altitude', value: sensorData.Altitude ? `${Number(sensorData.Altitude).toFixed(1)} m` : 'N/A' },
//       { label: 'Moisture', value: sensorData.Moisture || 'N/A' },
//       { label: 'Temperature', value: sensorData.Temperature || 'N/A' },
//       { label: 'pH Value', value: sensorData.PHValue || 'N/A' },
//       { label: 'EC', value: sensorData.EC || 'N/A' },
//       { label: 'Nitrogen', value: sensorData.Nitrogen || 'N/A' },
//       { label: 'Phosphorous', value: sensorData.Phosphorous || 'N/A' },
//       { label: 'Potassium', value: sensorData.Potassium || 'N/A' },
//       { label: 'Satellite Fix', value: sensorData.SatelliteFix || 'N/A' },
//       { label: 'Data ID', value: sensorData.Id || 'N/A' }
//     ];
    
//     params.forEach(param => {
//       content += `<div><strong>${param.label}:</strong></div><div>${param.value}</div>`;
//     });
    
//     content += `</div>`;
    
//     // Add Google Maps link
//     if (sensorData.Latitude && sensorData.Longitude) {
//       const mapLink = `https://www.google.com/maps?q=${sensorData.Latitude},${sensorData.Longitude}`;
//       content += `<hr style="margin: 12px 0;"><a href="${mapLink}" target="_blank" style="color: #2563eb; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px; background: #f0f0f0; border-radius: 6px; transition: background 0.2s;">
//         <i data-lucide="map-pin" style="width: 16px; height: 16px;"></i>
//         Open in Google Maps
//       </a>`;
//     }
    
//     content += `</div>`;
//     return content;
//   }

//   /* ================= UPDATE SENSOR PANEL ================= */
//   function updateSensorPanel(sensorData) {
//     const sensorPanel = document.getElementById('sensorTablePanel');
//     if (!sensorPanel || !sensorData || typeof sensorData !== 'object') {
//       console.warn("updateSensorPanel: invalid sensor data", sensorData);
//       return;
//     }

//     // Create sensor data display
//     const panelContent = `
//       <div style="padding: 15px;">
//         <h3 style="margin: 0 0 15px 0; color: #333; border-bottom: 2px solid ${getSensorColor(sensorData.SensorId)}; padding-bottom: 8px;">
//           Sensor ${sensorData.SensorId || 'N/A'}
//         </h3>
//         <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
//           <div style="background: #f8f9fa; padding: 10px; border-radius: 6px;">
//             <strong style="color: #666; font-size: 12px;">Location</strong><br>
//             <span style="font-size: 14px;">${Number(sensorData.Latitude).toFixed(6)}, ${Number(sensorData.Longitude).toFixed(6)}</span>
//           </div>
//           <div style="background: #f8f9fa; padding: 10px; border-radius: 6px;">
//             <strong style="color: #666; font-size: 12px;">Timestamp</strong><br>
//             <span style="font-size: 14px;">${formatDate(sensorData.Timestamp)}</span>
//           </div>
//           <div style="background: #f8f9fa; padding: 10px; border-radius: 6px;">
//             <strong style="color: #666; font-size: 12px;">Moisture</strong><br>
//             <span style="font-size: 14px;">${sensorData.Moisture || 'N/A'}</span>
//           </div>
//           <div style="background: #f8f9fa; padding: 10px; border-radius: 6px;">
//             <strong style="color: #666; font-size: 12px;">Temperature</strong><br>
//             <span style="font-size: 14px;">${sensorData.Temperature || 'N/A'}</span>
//           </div>
//         </div>
//       </div>
//     `;

//     sensorPanel.innerHTML = panelContent;
//     lucide.createIcons();
//   }

//   function saveSensorToLocalStorage(sensorId) {
//     const savedSensors = JSON.parse(localStorage.getItem('saved_sensors')) || [];
//     if (!savedSensors.includes(sensorId)) {
//       savedSensors.push(sensorId);
//       localStorage.setItem('saved_sensors', JSON.stringify(savedSensors));
//       console.log(`Sensor ${sensorId} saved to localStorage`);
//     }
//   }

//   /* ================= DISPLAY ALL TRACKER DATA ================= */
//   function displayAllTrackerData(trackerId) {
//     if (!trackerId || !trackerAllData[trackerId] || trackerAllData[trackerId].length === 0) {
//       console.log(`No data to display for tracker ${trackerId}`);
//       return;
//     }
    
//     console.log(`Displaying ${trackerAllData[trackerId].length} points for tracker ${trackerId}`);
    
//     // Get selected parameters for this tracker
//     let selectedParams = null;
//     if (window.getRealtimeParameters) {
//       selectedParams = window.getRealtimeParameters(trackerId);
//     }
    
//     if (!selectedParams) {
//       selectedParams = {
//         timestamp: true,
//         latitude: true,
//         longitude: true,
//         altitude: true,
//         uin_no: true,
//         application: true,
//         category: true
//       };
//     }
    
//     // Create array of all points formatted for the table
//     const allPointsData = trackerAllData[trackerId].map((point, index) => {
//       return {
//         'Tracker ID': trackerId,
//         'Point #': index + 1,
//         'timestamp': point.timestamp || point.time || new Date().toISOString(),
//         'latitude': point.latitude || point.lat,
//         'longitude': point.longitude || point.lon,
//         'altitude': point.altitude || 0,
//         'uin_no': point.uin_no || 'N/A',
//         'application': point.application || 'Unknown',
//         'category': point.category || 'General'
//       };
//     });
    
//     console.log(`Formatted ${allPointsData.length} points for table display`);
    
//     // Update the real-time table with ALL points
//     if (window.updateRealtimeTableAllPoints && allPointsData && allPointsData.length > 0) {
//       console.log('Calling updateRealtimeTableAllPoints');
//       window.updateRealtimeTableAllPoints(trackerId, allPointsData, selectedParams);
//     } else {
//       console.error('updateRealtimeTableAllPoints is not defined or no data to display!');
//     }
    
//     // Auto-expand the real-time panel
//     const realtimePanel = document.getElementById('realtimeTablePanel');
//     if (realtimePanel && realtimePanel.classList.contains('minimized')) {
//       realtimePanel.classList.remove('minimized');
//       const chevron = document.getElementById('realtimeTablePanelChevron');
//       if (chevron) chevron.classList.remove('rotated');
//       const container = document.getElementById('realtimeTableContainer');
//       if (container) container.style.display = 'block';
//     }
//   }

//   /* ================= GROUP FETCH ================= */
//   window.fetchGroupTrackers = function (trackerIds, enableRealtime = false) {
//     if (!trackerIds?.length) {
//       alert('Group empty');
//       return;
//     }
    
//     const visibleTrackers = trackerIds.filter(id => isTrackerVisible(id));
    
//     if (visibleTrackers.length === 0) {
//       alert('No visible trackers in this group');
//       return;
//     }
    
//     clearMap();
//     console.log(`Fetching ${visibleTrackers.length} trackers from group`);
    
//     visibleTrackers.forEach((id, i) => {
//       setTimeout(() => {
//         console.log(`Fetching tracker ${id} (${i + 1}/${visibleTrackers.length})`);
//         fetchSingleTracker(id, false, enableRealtime);
//       }, i * 800);
//     });
//   };

//   /* ================= PLOT TRACKER PATH ================= */
//   function plotTrackerPath(trackerId, points, color) {
//     if (!points.length) return;

//     if (!isTrackerVisible(trackerId)) {
//       console.log(`${trackerId} is hidden, not plotting`);
//       return;
//     }

//     const latlngs = points.map(p => [p.lat, p.lon]);

//     // Polyline
//     const polyline = L.polyline(latlngs, {
//       color: color,
//       weight: 4,
//       opacity: 0.85
//     }).addTo(polylineLayer);

//     trackerPolylines[trackerId] = polyline;
    
//     if (!window.trajectoryOverlays) {
//       window.trajectoryOverlays = {};
//     }
//     window.trajectoryOverlays[trackerId] = polyline;

//     // Markers
//     trackerMarkers[trackerId] = [];

//     // START marker
//     const startMarker = L.marker(latlngs[0], { icon: START_ICON })
//       .addTo(markersLayer)
//       .bindPopup(createTrackerPopupContent(trackerId, points[0], 'Start Point'));
//     trackerMarkers[trackerId].push(startMarker);

//     // END marker
//     const endMarker = L.marker(latlngs.at(-1), { icon: END_ICON })
//       .addTo(markersLayer)
//       .bindPopup(createTrackerPopupContent(trackerId, points.at(-1), 'Latest Point'));
//     trackerMarkers[trackerId].push(endMarker);

//     updateMapBounds();
//   }

//   function createTrackerPopupContent(trackerId, point, label) {
//     let content = `<b>${trackerId}</b><br>${label}<br>`;
    
//     if (point.time) {
//       content += `Time: ${formatTimestamp(point.time)}<br>`;
//     }
    
//     if (point.lat !== undefined) {
//       content += `Latitude: ${point.lat.toFixed(6)}<br>`;
//     }
//     if (point.lon !== undefined) {
//       content += `Longitude: ${point.lon.toFixed(6)}<br>`;
//     }
    
//     if (point.altitude !== undefined) {
//       content += `Altitude: ${point.altitude}m<br>`;
//     }
//     if (point.uin_no && point.uin_no !== 'N/A') {
//       content += `UIN: ${point.uin_no}<br>`;
//     }
//     if (point.application && point.application !== 'Unknown') {
//       content += `Application: ${point.application}<br>`;
//     }
//     if (point.category && point.category !== 'General') {
//       content += `Category: ${point.category}<br>`;
//     }
    
//     return content;
//   }

//   /* ================= VISIBILITY TOGGLE ================= */
//   window.toggleTrackerVisibility = function (trackerId, visible) {
//     trackerVisibility[trackerId] = visible;
    
//     if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
//       groupSettings[activeGroup][trackerId].visible = visible;
//       localStorage.setItem('groupSettings', JSON.stringify(groupSettings));
//     }
    
//     if (trackerPolylines[trackerId]) {
//       if (visible) {
//         polylineLayer.addLayer(trackerPolylines[trackerId]);
//       } else {
//         polylineLayer.removeLayer(trackerPolylines[trackerId]);
//       }
//     }

//     (trackerMarkers[trackerId] || []).forEach(m => {
//       if (visible) {
//         markersLayer.addLayer(m);
//       } else {
//         markersLayer.removeLayer(m);
//       }
//     });
    
//     if (!visible) {
//       removeTrackerFromRealtimeUpdates(trackerId);
//     }
    
//     updateLegend();
//     updateMapBounds();
//   };

//   window.toggleSensorVisibility = function (sensorId, visible) {
//     sensorVisibility[sensorId] = visible;
    
//     if (sensorMarkers[sensorId]) {
//       if (visible) {
//         sensorLayer.addLayer(sensorMarkers[sensorId]);
//       } else {
//         sensorLayer.removeLayer(sensorMarkers[sensorId]);
//       }
//     }
    
//     updateLegend();
//     updateMapBounds();
//   };

//   /* ================= COLOR CHANGE ================= */
//   window.changeTrackerColor = function (trackerId, color) {
//     trackerColorMap[trackerId] = color;
    
//     if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
//       groupSettings[activeGroup][trackerId].color = color;
//       localStorage.setItem('groupSettings', JSON.stringify(groupSettings));
//     }

//     if (trackerPolylines[trackerId] && isTrackerVisible(trackerId)) {
//       trackerPolylines[trackerId].setStyle({ color: color });
//     }

//     (trackerMarkers[trackerId] || []).forEach(m => {
//       if (m.options.icon && isTrackerVisible(trackerId)) {
//         const iconHtml = m.options.icon.options?.html || '';
//         if (iconHtml.includes('border-radius:50%')) {
//           m.setIcon(createPinIcon(color, 8));
//         }
//       }
//     });

//     updateLegend();
//   };

//   window.changeSensorColor = function (sensorId, color) {
//     sensorColorMap[sensorId] = color;
    
//     if (sensorMarkers[sensorId]) {
//       sensorMarkers[sensorId].setIcon(createSensorIcon(color));
//     }
    
//     updateLegend();
//   };

//   /* ================= HELPERS ================= */
//   function updateLastUpdatedTime() {
//     if (lastUpdatedDiv && lastUpdateTime) {
//       lastUpdatedDiv.textContent = `Last updated: ${lastUpdateTime.toLocaleString()}`;
//     }
//   }

//   function showStatus(msg, type) {
//     if (!statusMessage) return;
//     statusMessage.textContent = msg;
//     statusMessage.className = `status-${type}`;
//     if (type !== 'loading') setTimeout(() => statusMessage.textContent = '', 4000);
//   }

//   function formatTimestamp(ts) {
//     return new Date(ts).toLocaleString();
//   }

//   function updateMapBounds() {
//     const allVisiblePoints = [];
    
//     Object.keys(trackerPolylines).forEach(trackerId => {
//       if (isTrackerVisible(trackerId) && trackerPolylines[trackerId]._latlngs) {
//         allVisiblePoints.push(...trackerPolylines[trackerId]._latlngs);
//       }
//     });
    
//     Object.keys(sensorMarkers).forEach(sensorId => {
//       const marker = sensorMarkers[sensorId];
//       if (marker && marker.getLatLng && isSensorVisible(sensorId)) {
//         allVisiblePoints.push(marker.getLatLng());
//       }
//     });
    
//     if (allVisiblePoints.length > 0) {
//       map.fitBounds(allVisiblePoints, { padding: [40, 40] });
//     }
//   }

//   /* ================= EXPOSE FUNCTIONS TO WINDOW ================= */
//   window.setActiveGroup = function(groupName) {
//     activeGroup = groupName;
//     groupSettings = JSON.parse(localStorage.getItem('groupSettings')) || {};
//   };

//   window.updateTrackerVisibilityFromGroup = function(trackerId, isVisible) {
//     window.toggleTrackerVisibility(trackerId, isVisible);
//   };

//   window.updateTrackerColorFromGroup = function(trackerId, color) {
//     window.changeTrackerColor(trackerId, color);
//   };

//   window.handleFetch = function(trackerId, enableRealtime = false) {
//     fetchSingleTracker(trackerId, true, enableRealtime);
//   };

//   window.startRealtimeUpdatesForTracker = function(trackerId) {
//     addTrackerToRealtimeUpdates(trackerId);
//   };

//   window.stopRealtimeUpdatesForTracker = function(trackerId) {
//     removeTrackerFromRealtimeUpdates(trackerId);
//   };

//   window.toggleRealtimeUpdatesForTracker = function(trackerId, enable) {
//     toggleRealtimeUpdates(trackerId, enable);
//   };

//   // Sensor functions
//   window.plotSensorOnMap = plotSensorOnMap;
//   window.updateSensorPanel = updateSensorPanel;
//   window.toggleSensorVisibility = toggleSensorVisibility;
//   window.changeSensorColor = changeSensorColor;

//   // Initialize global objects
//   window.trajectoryOverlays = {};
//   window.realtimeTableDataAllPoints = {};
//   window.sensorTableData = {};

//   // Add keyboard shortcuts
//   document.addEventListener('keydown', function(e) {
//     if (e.altKey && e.key === 'r') {
//       e.preventDefault();
//       const realtimeBtn = document.getElementById('openRealtimePopup');
//       if (realtimeBtn) realtimeBtn.click();
//     }
    
//     if (e.altKey && e.key === 'a') {
//       e.preventDefault();
//       const trackerId = trackerInput.value.trim();
//       if (trackerId) {
//         const isEnabled = realtimeUpdateConfig.trackers.has(trackerId);
//         toggleRealtimeUpdates(trackerId, !isEnabled);
//         showStatus(`Real-time updates ${!isEnabled ? 'enabled' : 'disabled'} for ${trackerId}`, 'success');
//       }
//     }
    
//     if (e.altKey && e.key === 's') {
//       e.preventDefault();
//       const sensorId = sensorInput.value.trim();
//       if (sensorId) {
//         fetchSensorData(sensorId);
//       }
//     }
//   });

//   // Fetch data for saved trackers and sensors on page load
//   window.addEventListener('load', function() {
//     const savedTrackers = JSON.parse(localStorage.getItem('saved_trackers')) || [];
//     const savedSensors = JSON.parse(localStorage.getItem('saved_sensors')) || [];
    
//     const autoUpdateEnabled = JSON.parse(localStorage.getItem('auto_update_enabled')) || false;
//     const autoUpdateTrackers = JSON.parse(localStorage.getItem('auto_update_trackers')) || [];
    
//     if (savedTrackers.length > 0) {
//       showStatus(`Loading ${savedTrackers.length} saved trackers...`, 'loading');
      
//       setTimeout(() => {
//         savedTrackers.forEach((trackerId, index) => {
//           setTimeout(() => {
//             const enableRealtime = autoUpdateEnabled && autoUpdateTrackers.includes(trackerId);
//             fetchSingleTracker(trackerId, index === 0, enableRealtime);
//           }, index * 1000);
//         });
//       }, 1500);
//     }
    
//     if (savedSensors.length > 0) {
//       setTimeout(() => {
//         showStatus(`Loading ${savedSensors.length} saved sensors...`, 'loading');
//         savedSensors.forEach((sensorId, index) => {
//           setTimeout(() => {
//             fetchSensorData(sensorId, index === 0);
//           }, index * 1500);
//         });
//       }, 3000);
//     }
//   });

//   // Save auto-update state before page unload
//   window.addEventListener('beforeunload', function() {
//     localStorage.setItem('auto_update_enabled', JSON.stringify(realtimeUpdateConfig.trackers.size > 0));
//     localStorage.setItem('auto_update_trackers', JSON.stringify(Array.from(realtimeUpdateConfig.trackers)));
//     stopRealtimeUpdates();
//   });
// });



 

































// window.clearMap = function () {
//   if (window.markersLayer) markersLayer.clearLayers();
//   if (window.polylineLayer) polylineLayer.clearLayers();
//   if (window.sensorLayer) sensorLayer.clearLayers();

//   if (window.trackerPolylines) Object.keys(trackerPolylines).forEach(k => delete trackerPolylines[k]);
//   if (window.trackerMarkers) Object.keys(trackerMarkers).forEach(k => delete trackerMarkers[k]);
//   if (window.trackerAllData) Object.keys(trackerAllData).forEach(k => delete trackerAllData[k]);
//   if (window.sensorMarkers) Object.keys(sensorMarkers).forEach(k => delete sensorMarkers[k]);
//   if (window.sensorAllData) Object.keys(sensorAllData).forEach(k => delete sensorAllData[k]);

//   const imagesGrid = document.getElementById('images-grid');
//   if (imagesGrid) imagesGrid.innerHTML = '';
  
//   // Clear sensor table data
//   if (window.updateSensorTable) window.updateSensorTable();
// };


// document.getElementById("sensorTableContainer").style.display = "block";

// // --- Updated Sensor History Table Renderer ---
// function updateSensorTable(sensorData = null) {
//   const tbody = document.getElementById("sensorDataTableBody");
//   const thead = document.getElementById("sensorDataTableHeader");
//   const container = document.getElementById("sensorTableContainer");
//   const panel = document.getElementById("sensorTablePanel");

//   if (!tbody || !container || !thead || !panel) {
//     console.error("Sensor table elements not found");
//     return;
//   }

//   tbody.innerHTML = "";
//   thead.innerHTML = "";

//   // Get NAVIC toggle state
//   const navicToggle = document.getElementById('navicToggle');
//   const navicEnabled = navicToggle ? navicToggle.checked : true;

//   // If no data is provided, use all sensor data
//   let rows = [];
  
//   if (sensorData === null) {
//     // Show all sensors data
//     Object.values(window.sensorTableData || {}).forEach(sensorRows => {
//       rows.push(...sensorRows);
//     });
//   } else if (Array.isArray(sensorData) && sensorData.length > 0) {
//     // History mode - multiple sensor data points
//     rows = sensorData;
//   } else if (sensorData && typeof sensorData === "object") {
//     // Single object
//     rows = [sensorData];
//   }

//   if (rows.length === 0) {
//     const colspan = navicEnabled ? 12 : 9; // Adjust colspan based on NAVIC toggle
//     tbody.innerHTML = `
//       <tr class="no-data-row">
//         <td colspan="${colspan}" style="text-align:center;">No sensor data available. Fetch a sensor first.</td>
//       </tr>`;
//     return;
//   }

//   // Sort by timestamp (newest first)
//   rows.sort((a, b) => {
//     const dateA = a.Timestamp ? normalizeTimestamp(a.Timestamp) : "";
//     const dateB = b.Timestamp ? normalizeTimestamp(b.Timestamp) : "";
//     return new Date(dateB) - new Date(dateA);
//   });

//   // Define column order based on NAVIC toggle
//   const allColumns = [
//     'SensorId', 'Timestamp', 
//     'Moisture', 'Temperature', 'EC', 'PHValue',
//     'Nitrogen', 'Phosphorous', 'Potassium',
//     'Latitude', 'Longitude', 'Altitude',
//     'SatelliteFix', 'Maplink'
//   ];
  
//   // Filter columns based on NAVIC toggle
//   const columnOrder = navicEnabled ? allColumns : allColumns.filter(col => 
//     !['Latitude', 'Longitude', 'SatelliteFix'].includes(col)
//   );
  
//   // Create a mapping of possible key variations to standard column names
//   const keyVariations = {
//     'latitude': 'Latitude',
//     'lat': 'Latitude',
//     'Lat': 'Latitude',
//     'longitude': 'Longitude',
//     'lon': 'Longitude',
//     'Lon': 'Longitude',
//     'long': 'Longitude',
//     'sensorid': 'SensorId',
//     'sensor_id': 'SensorId',
//     'timestamp': 'Timestamp',
//     'time': 'Timestamp',
//     'moisture': 'Moisture',
//     'temperature': 'Temperature',
//     'temp': 'Temperature',
//     'ec': 'EC',
//     'phvalue': 'PHValue',
//     'ph': 'PHValue',
//     'nitrogen': 'Nitrogen',
//     'phosphorous': 'Phosphorous',
//     'phosphorus': 'Phosphorous',
//     'potassium': 'Potassium',
//     'altitude': 'Altitude',
//     'alt': 'Altitude',
//     'satellitefix': 'SatelliteFix',
//     'sat_fix': 'SatelliteFix',
//     'satfix': 'SatelliteFix',
//     'maplink': 'Maplink',
//     'map_link': 'Maplink'
//   };
  
//   // First, normalize all row keys to standard format
//   const normalizedRows = rows.map(row => {
//     const normalizedRow = {};
//     Object.keys(row).forEach(key => {
//       const lowerKey = key.toLowerCase();
//       const standardKey = keyVariations[lowerKey] || key;
//       normalizedRow[standardKey] = row[key];
//     });
//     return normalizedRow;
//   });
  
//   rows = normalizedRows;
  
//   // Filter to only include keys that are in our filtered column order AND exist in the data
//   const headers = columnOrder.filter(key => {
//     return rows.some(row => key in row);
//   });

//   console.log("Headers to display (NAVIC:", navicEnabled, "):", headers);

//   const trHead = document.createElement("tr");
//   headers.forEach(h => {
//     const th = document.createElement("th");
//     th.textContent = formatSensorHeader(h);
//     // Add coordinate column class for styling if needed
//     if (['Latitude', 'Longitude', 'SatelliteFix'].includes(h)) {
//       th.className = 'navic-column';
//     }
//     trHead.appendChild(th);
//   });
//   thead.appendChild(trHead);

//   // --- Fill table rows ---
//   rows.forEach(row => {
//     const tr = document.createElement("tr");
//     headers.forEach(h => {
//       const td = document.createElement("td");
//       const value = row[h];

//       // Format coordinates nicely
//       if (h.toLowerCase() === "latitude" || h.toLowerCase() === "longitude") {
//         td.textContent = value !== undefined && value !== null ? Number(value).toFixed(6) : "-";
//       }
//       // Format Timestamp nicely
//       else if (h.toLowerCase() === "timestamp") {
//         td.textContent = value ? formatDate(value) : "-";
//       }
//       // Sensor ID with color
//       else if (h.toLowerCase() === "sensorid") {
//         td.textContent = value || "-";
//         td.className = "sensor-id-cell";
//         td.style.color = getSensorColor(value);
//         td.style.fontWeight = "600";
//       }
//       // Altitude - check both "Altitude" and "altitude"
//       else if (h.toLowerCase() === "altitude") {
//         if (value !== undefined && value !== null && value !== "") {
//           const num = Number(value);
//           td.textContent = !isNaN(num) ? `${num.toFixed(1)} m` : value;
//         } else {
//           td.textContent = "-";
//         }
//       }
//       // Maplink - create clickable link
//       else if (h.toLowerCase() === "maplink") {
//         if (value && value.startsWith('http')) {
//           td.innerHTML = `<a href="${value}" target="_blank" style="color: #2563eb; text-decoration: none;">📍 View</a>`;
//         } else {
//           td.textContent = "-";
//         }
//       }
//       // Format sensor parameters
//       else if (h.toLowerCase() === "moisture") {
//         td.textContent = value !== undefined && value !== null ? Number(value).toFixed(2) : "-";
//       }
//       else if (h.toLowerCase() === "temperature") {
//         td.textContent = value !== undefined && value !== null ? Number(value).toFixed(2) : "-";
//       }
//       else if (h.toLowerCase() === "ec") {
//         td.textContent = value !== undefined && value !== null ? Number(value).toFixed(2) : "-";
//       }
//       else if (h.toLowerCase() === "phvalue") {
//         td.textContent = value !== undefined && value !== null ? Number(value).toFixed(2) : "-";
//       }
//       else if (h.toLowerCase() === "nitrogen") {
//         td.textContent = value !== undefined && value !== null ? Number(value).toFixed(2) : "-";
//       }
//       else if (h.toLowerCase() === "phosphorous") {
//         td.textContent = value !== undefined && value !== null ? Number(value).toFixed(2) : "-";
//       }
//       else if (h.toLowerCase() === "potassium") {
//         td.textContent = value !== undefined && value !== null ? Number(value).toFixed(2) : "-";
//       }
//       // Satellite Fix
//       else if (h.toLowerCase() === "satellitefix") {
//         td.textContent = value || "-";
//       }
//       else {
//         td.textContent = value !== undefined && value !== null ? value : "-";
//       }

//       tr.appendChild(td);
//     });
//     tbody.appendChild(tr);
//   });

//   // --- Auto-expand panel if minimized ---
//   if (panel.classList.contains("minimized")) {
//     panel.classList.remove("minimized");
//     document.getElementById("sensorTablePanelChevron")?.classList.remove("rotated");
//     container.style.display = "block";
//   }
  
//   // Update panel title with sensor count
//   const panelHeader = document.querySelector('#sensorTablePanelHeader h2');
//   if (panelHeader) {
//     const sensorIds = Object.keys(window.sensorTableData || {});
//     const totalReadings = rows.length;
//     panelHeader.textContent = `Sensor Data (${sensorIds.length} sensors, ${totalReadings} readings)`;
//   }
// }

// // Helper function to format sensor headers
// function formatSensorHeader(header) {
//   const map = {
//     'SensorId': 'Sensor ID',
//     'Timestamp': 'Timestamp',
//     'Moisture': 'Moisture',
//     'Temperature': 'Temperature',
//     'EC': 'EC',
//     'PHValue': 'pH',
//     'Nitrogen': 'Nitrogen',
//     'Phosphorous': 'Phosphorous',
//     'Potassium': 'Potassium',
//     'Latitude': 'Latitude',
//     'Longitude': 'Longitude',
//     'Altitude': 'Altitude',
//     'SatelliteFix': 'Sat Fix',
//     'Maplink': 'Map Link'
//   };
//   return map[header] || header;
// }

// // Add this function to ensure getSensorColor is available
// function getSensorColor(sensorId) {
//   if (!window.sensorColorMap) {
//     window.sensorColorMap = {};
//   }
  
//   if (!window.sensorColorMap[sensorId]) {
//     const sensorColors = [
//       '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', 
//       '#EF476F', '#9D4EDD', '#FB5607', '#3A86FF', '#8338EC',
//       '#FF9E6D', '#A0E7E5', '#FFA8B5', '#C5F277', '#72DDF7'
//     ];
    
//     const sensorIds = Object.keys(window.sensorColorMap);
//     const colorIndex = sensorIds.length % sensorColors.length;
//     window.sensorColorMap[sensorId] = sensorColors[colorIndex];
//   }
  
//   return window.sensorColorMap[sensorId];
// }

// // --- Helper for timestamp formatting ---
// function formatDate(ts) {
//   if (!ts) return "-";
//   // Handle "21-01-2026 17:44" format
//   if (typeof ts === "string" && ts.includes("-") && ts.includes(":")) {
//     const [dmy, t] = ts.split(" ");
//     const [d, m, y] = dmy.split("-");
//     ts = `${y}-${m}-${d} ${t}`;
//   }
//   const d = new Date(ts);
//   return isNaN(d) ? "-" : d.toLocaleString();
// }

// // Normalize timestamp for sorting
// function normalizeTimestamp(ts) {
//   if (!ts) return "";
//   if (typeof ts === "string" && ts.includes("-") && ts.includes(":")) {
//     const [dmy, t] = ts.split(" ");
//     const [d, m, y] = dmy.split("-");
//     return `${y}-${m}-${d}T${t}`;
//   }
//   return ts;
// }

// // --- Helper for safe lat/lon formatting ---
// function formatCoord(v) {
//   if (!v && v !== 0) return "-";
//   const num = Number(v);
//   return isNaN(num) ? "-" : num.toFixed(6);
// }


// document.addEventListener('DOMContentLoaded', function () {
//   /* ================= DOM ================= */
//   const fetchBtn = document.getElementById('fetch-btn');
//   const trackerInput = document.getElementById('tracker-id');
//   const sensorInput = document.getElementById('sensor-id');
//   const statusMessage = document.getElementById('status-message');
//   const lastUpdatedDiv = document.querySelector('.last-updated');
//   const imagesGrid = document.getElementById('images-grid');

//   /* ================= REAL-TIME UPDATE CONFIG ================= */
//   let realtimeUpdateInterval = null;
//   const realtimeUpdateConfig = {
//     enabled: false,
//     interval: 5000,
//     trackers: new Set(),
//     lastFetched: {},
//     maxRetryCount: 3,
//     retryDelay: 1000
//   };

//   /* ================= GROUP AUTO-REFRESH ================= */
//   let groupAutoInterval = null;
//   let groupAutoSeconds = 10000; // 10 sec default

//   function startGroupAutoRefresh() {
//     if (groupAutoInterval) clearInterval(groupAutoInterval);

//     groupAutoInterval = setInterval(() => {
//       if (!activeGroup) {
//         console.log("⚠️ No active group, skipping auto-refresh");
//         return;
//       }
//       console.log("🔄 Auto-refreshing group:", activeGroup);

//       const event = new Event('click');
//       document.getElementById('fetchGroupBtn').dispatchEvent(event);

//     }, groupAutoSeconds);

//     console.log("▶️ Group auto-refresh started");
//   }

//   function stopGroupAutoRefresh() {
//     if (groupAutoInterval) {
//       clearInterval(groupAutoInterval);
//       groupAutoInterval = null;
//       console.log("⏹ Group auto-refresh stopped");
//     }
//   }

//   /* ================= MAP ================= */
//   const map = L.map('map').setView([23.0225, 72.5714], 13);
//   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     maxZoom: 19
//   }).addTo(map);

//   const markersLayer = L.layerGroup().addTo(map);
//   const polylineLayer = L.layerGroup().addTo(map);
//   const sensorLayer = L.layerGroup().addTo(map);

//   let lastUpdateTime = null;
//   let activeGroup = null;

//   /* ================= TRACKER STATE ================= */
//   const trackerPolylines = {};
//   const trackerMarkers = {};
//   const trackerColorMap = {};
//   const trackerVisibility = {};
//   const trackerAllData = {};

//   /* ================= SENSOR STATE ================= */
//   const sensorMarkers = {};
//   const sensorAllData = {};
//   const sensorColorMap = {};
//   const sensorVisibility = {};
//   const sensorColors = [
//     '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', 
//     '#EF476F', '#9D4EDD', '#FB5607', '#3A86FF', '#8338EC',
//     '#FF9E6D', '#A0E7E5', '#FFA8B5', '#C5F277', '#72DDF7'
//   ];
//   let sensorColorIndex = 0;

//   const COLORS = ['#2563eb', '#eab308', '#9333ea', '#ea580c', '#0891b2', '#4f46e5'];
//   let colorIndex = 0;

//   // Group settings from localStorage
//   let groupSettings = JSON.parse(localStorage.getItem('groupSettings')) || {};

//   function getTrackerColor(trackerId) {
//     if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
//       return groupSettings[activeGroup][trackerId].color;
//     }
    
//     if (trackerColorMap[trackerId]) {
//       return trackerColorMap[trackerId];
//     }
    
//     const color = COLORS[colorIndex++ % COLORS.length];
//     trackerColorMap[trackerId] = color;
//     updateLegend();
//     return color;
//   }

//   function getSensorColor(sensorId) {
//     if (sensorColorMap[sensorId]) {
//       return sensorColorMap[sensorId];
//     }
    
//     const color = sensorColors[sensorColorIndex++ % sensorColors.length];
//     sensorColorMap[sensorId] = color;
//     updateLegend();
//     return color;
//   }

//   function isTrackerVisible(trackerId) {
//     if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
//       return groupSettings[activeGroup][trackerId].visible;
//     }
    
//     return trackerVisibility[trackerId] !== false;
//   }

//   function isSensorVisible(sensorId) {
//     return sensorVisibility[sensorId] !== false;
//   }

//   /* ================= REAL-TIME AUTO-UPDATE FUNCTIONS ================= */
//   function startRealtimeUpdates() {
//     if (realtimeUpdateInterval) {
//       clearInterval(realtimeUpdateInterval);
//     }
    
//     realtimeUpdateInterval = setInterval(async () => {
//       if (realtimeUpdateConfig.trackers.size === 0) return;
      
//       const now = Date.now();
//       const trackersToUpdate = Array.from(realtimeUpdateConfig.trackers);
      
//       for (const trackerId of trackersToUpdate) {
//         if (realtimeUpdateConfig.lastFetched[trackerId] && 
//             (now - realtimeUpdateConfig.lastFetched[trackerId]) < realtimeUpdateConfig.interval) {
//           continue;
//         }
        
//         await fetchLatestTrackerData(trackerId);
//         realtimeUpdateConfig.lastFetched[trackerId] = now;
//       }
//     }, realtimeUpdateConfig.interval);
//   }

//   function stopRealtimeUpdates() {
//     if (realtimeUpdateInterval) {
//       clearInterval(realtimeUpdateInterval);
//       realtimeUpdateInterval = null;
//     }
//   }

//   function addTrackerToRealtimeUpdates(trackerId) {
//     realtimeUpdateConfig.trackers.add(trackerId);
//     if (!realtimeUpdateInterval) {
//       startRealtimeUpdates();
//     }
//     showStatus(`Tracker ${trackerId} added to real-time updates`, 'success');
//   }

//   function removeTrackerFromRealtimeUpdates(trackerId) {
//     realtimeUpdateConfig.trackers.delete(trackerId);
//     if (realtimeUpdateConfig.trackers.size === 0) {
//       stopRealtimeUpdates();
//     }
//   }

//   function toggleRealtimeUpdates(trackerId, enable) {
//     if (enable) {
//       addTrackerToRealtimeUpdates(trackerId);
//     } else {
//       removeTrackerFromRealtimeUpdates(trackerId);
//     }
//   }

//   async function fetchLatestTrackerData(trackerId) {
//     try {
//       const res = await fetch('/api/trajectory/latest', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           tracker_id: trackerId,
//           last_timestamp: trackerAllData[trackerId] && trackerAllData[trackerId].length > 0 ? 
//                          trackerAllData[trackerId][trackerAllData[trackerId].length - 1].timestamp : null
//         })
//       });

//       if (!res.ok) throw new Error('Server error');

//       const data = await res.json();
      
//       if (data.points && data.points.length > 0) {
//         const newPoints = data.points.map(p => ({
//           lat: +p.lat,
//           lon: +p.lon,
//           time: p.timestamp,
//           timestamp: p.timestamp,
//           latitude: +p.lat,
//           longitude: +p.lon,
//           altitude: p.altitude || 0,
//           uin_no: p.uin_no || 'N/A',
//           application: p.application || 'Unknown',
//           category: p.category || 'General'
//         }));

//         if (!trackerAllData[trackerId]) {
//           trackerAllData[trackerId] = [];
//         }
        
//         newPoints.forEach(newPoint => {
//           const exists = trackerAllData[trackerId].some(p => p.timestamp === newPoint.timestamp);
//           if (!exists) {
//             trackerAllData[trackerId].push(newPoint);
//           }
//         });

//         if (newPoints.length > 0) {
//           updateTrackerLatestPoint(trackerId, newPoints[newPoints.length - 1]);
//         }
        
//         displayAllTrackerData(trackerId);
        
//         lastUpdateTime = new Date();
//         updateLastUpdatedTime();
//       }
      
//     } catch (err) {
//       console.error(`Failed to fetch latest data for ${trackerId}:`, err);
//     }
//   }

//   function updateTrackerLatestPoint(trackerId, point) {
//     const color = getTrackerColor(trackerId);
    
//     if (trackerMarkers[trackerId]) {
//       const markers = trackerMarkers[trackerId];
//       if (markers.length > 0) {
//         const endMarker = markers[markers.length - 1];
//         endMarker.setLatLng([point.lat, point.lon]);
//         const popupContent = createPopupContent(trackerId, point, 'Latest Point');
//         endMarker.setPopupContent(popupContent);
//       }
//     }

//     if (trackerPolylines[trackerId]) {
//       const polyline = trackerPolylines[trackerId];
//       const currentLatLngs = polyline.getLatLngs();
//       currentLatLngs.push([point.lat, point.lon]);
//       polyline.setLatLngs(currentLatLngs);
//     }
//   }

//   /* ================= ICONS ================= */
//   function createPinIcon(color, size = 34) {
//     return L.divIcon({
//       className: '',
//       html: `
//         <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
//           <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
//         </svg>`,
//       iconSize: [size, size],
//       iconAnchor: [size / 2, size],
//       popupAnchor: [0, -size]
//     });
//   }

//   function createSensorIcon(color = '#ff5722') {
//     return L.divIcon({
//       className: 'sensor-marker',
//       html: `
//         <div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">
//           <i data-lucide="cpu" style="width: 14px; height: 14px;"></i>
//         </div>`,
//       iconSize: [24, 24],
//       iconAnchor: [12, 12],
//       popupAnchor: [0, -12]
//     });
//   }

//   const START_ICON = createPinIcon('green');
//   const END_ICON = createPinIcon('red');

//   /* ================= LEGEND ================= */
//   const legend = L.control({ position: 'bottomright' });

//   legend.onAdd = function () {
//     const div = L.DomUtil.create('div', 'map-legend');
//     div.style.background = 'white';
//     div.style.padding = '10px';
//     div.style.marginBottom = '80px';
//     div.style.marginRight = '20px';
//     div.style.borderRadius = '8px';
//     div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
//     div.style.fontSize = '13px';
//     div.style.maxHeight = '400px';
//     div.style.overflowY = 'auto';
//     return div;
//   };

//   legend.addTo(map);

//   function updateLegend() {
//     const div = document.querySelector('.map-legend');
//     if (!div) return;

//     const pin = (color) => `
//       <svg width="14" height="22" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
//         <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
//       </svg>
//     `;

//     let html = `
//       <strong>Legend</strong><br><br>
//       <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
//         ${pin('green')}
//         <span style="font-weight:600;">Tracker Start</span>
//       </div>
//       <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
//         ${pin('red')}
//         <span style="font-weight:600;">Tracker End</span>
//       </div>
//       <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
//         <div style="background:#ff5722;width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>
//         <span style="font-weight:600;">Sensor</span>
//       </div>
//       <hr style="margin:6px 0">
//       <strong>Trackers:</strong><br>
//     `;

//     // Add trackers to legend
//     Object.entries(trackerColorMap).forEach(([id, color]) => {
//       if (isTrackerVisible(id)) {
//         html += `
//           <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
//             <span style="color:${color};font-size:14px;">●</span>
//             ${id} ${realtimeUpdateConfig.trackers.has(id) ? '🔄' : ''}
//           </div>
//         `;
//       }
//     });

//     html += `<br><strong>Sensors:</strong><br>`;

//     // Add sensors to legend
//     Object.entries(sensorColorMap).forEach(([id, color]) => {
//       if (isSensorVisible(id)) {
//         html += `
//           <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
//             <span style="color:${color};font-size:14px;">●</span>
//             ${id}
//           </div>
//         `;
//       }
//     });

//     div.innerHTML = html;
//     lucide.createIcons();
//   }

//   /* ================= EVENTS ================= */
//   fetchBtn?.addEventListener('click', () => {
//     const id = trackerInput.value.trim();
//     if (id) fetchSingleTracker(id, true);
//   });

//   // Sensor fetch button event
//   const fetchSensorBtn = document.getElementById('fetch-sensor-btn');
//   fetchSensorBtn?.addEventListener('click', () => {
//     const id = sensorInput.value.trim();
//     if (id) fetchSensorData(id, true);
//   });

//   /* ================= FETCH SINGLE TRACKER ================= */
//   async function fetchSingleTracker(trackerId, clearBefore = false, enableRealtime = false) {
//     if (!trackerId) return;

//     if (clearBefore) clearMap();

//     const color = getTrackerColor(trackerId);
//     trackerVisibility[trackerId] = true;
//     showStatus(`Fetching tracker ${trackerId}...`, 'loading');

//     try {
//       const res = await fetch('/api/trajectory', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           tracker_id: trackerId,
//           interval_seconds: 30,
//           max_gap_seconds: 120
//         })
//       });

//       if (!res.ok) throw new Error('Server error');

//       const data = await res.json();
//       console.log('Received data from server:', data);
      
//       const points = (data.points || []).map(p => ({
//         lat: +p.lat,
//         lon: +p.lon,
//         time: p.timestamp,
//         timestamp: p.timestamp,
//         latitude: +p.lat,
//         longitude: +p.lon,
//         altitude: p.altitude || 0,
//         uin_no: p.uin_no || 'N/A',
//         application: p.application || 'Unknown',
//         category: p.category || 'General'
//       }));

//       console.log(`Parsed ${points.length} points for tracker ${trackerId}`);
      
//       // Store ALL points for this tracker
//       trackerAllData[trackerId] = points;

//       plotTrackerPath(trackerId, points, color);
      
//       if (points.length > 0) {
//         // Display ALL points in the table
//         displayAllTrackerData(trackerId);
        
//         // Auto-enable real-time updates if specified
//         if (enableRealtime) {
//           addTrackerToRealtimeUpdates(trackerId);
//         }
//       }

//       lastUpdateTime = new Date();
//       updateLastUpdatedTime();
//       showStatus(`Loaded ${points.length} points for tracker ${trackerId}`, 'success');

//     } catch (err) {
//       console.error('Error fetching tracker:', err);
//       showStatus(`${trackerId}: ${err.message}`, 'error');
//     }
//   }

//   /* ================= FETCH SENSOR DATA ================= */
//   window.fetchSensorData = async function (sensorId, clearBefore = false) {
//     if (!sensorId) return;

//     if (clearBefore) {
//       // Clear only sensor data if requested
//       sensorLayer.clearLayers();
//       Object.keys(sensorMarkers).forEach(k => delete sensorMarkers[k]);
//     }

//     sensorVisibility[sensorId] = true;
//     showStatus(`Fetching sensor ${sensorId}...`, "loading");

//     try {
//       const res = await fetch(`/api/sensor/data?sensor_id=${sensorId}`);
//       if (!res.ok) throw new Error("Backend API error");

//       const data = await res.json();
//       let rows = [];
      
//       if (Array.isArray(data.rows)) {
//         rows = data.rows;
//       } else if (data && typeof data === "object") {
//         rows = [data];
//       }

//       // Store sensor data
//       sensorAllData[sensorId] = rows;

//       // Plot all sensor points on map
//       rows.forEach((sensorData, index) => {
//         plotSensorOnMap(sensorData, sensorId);
//       });

//       // Update sensor table with all readings
//       if (rows.length > 0) {
//         // Initialize sensor table data storage
//         if (!window.sensorTableData) {
//           window.sensorTableData = {};
//         }
//         window.sensorTableData[sensorId] = rows;
        
//         // Update the table with all sensor data
//         updateSensorTable();
//       }

//       saveSensorToLocalStorage(sensorId);
//       showStatus(`Loaded ${rows.length} readings for sensor ${sensorId}`, "success");

//     } catch (err) {
//       console.error(err);
//       showStatus(err.message, "error");
//     }
//   };

//   /* ================= PLOT SENSOR ON MAP ================= */
//   function plotSensorOnMap(sensorData, sensorId = null) {
//     if (!sensorData?.Latitude || !sensorData?.Longitude) return;

//     const actualSensorId = sensorId || sensorData.SensorId;
//     const latlng = [Number(sensorData.Latitude), Number(sensorData.Longitude)];
//     const color = getSensorColor(actualSensorId);

//     // Remove existing marker for this sensor if it exists
//     if (sensorMarkers[actualSensorId]) {
//       sensorLayer.removeLayer(sensorMarkers[actualSensorId]);
//     }

//     const marker = L.marker(latlng, {
//       icon: createSensorIcon(color)
//     }).bindPopup(createSensorPopupContent(sensorData));

//     sensorLayer.addLayer(marker);
//     sensorMarkers[actualSensorId] = marker;

//     // Fit bounds to show all sensors
//     updateMapBounds();
//     updateLegend();
//   }

//   function createSensorPopupContent(sensorData) {
//     let content = `<div style="min-width: 280px; max-width: 350px;">`;
//     content += `<h4 style="margin: 0 0 12px 0; color: #333; border-bottom: 2px solid ${getSensorColor(sensorData.SensorId)}; padding-bottom: 6px;">Sensor ${sensorData.SensorId || 'N/A'}</h4>`;
//     content += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">`;
    
//     const params = [
//       { label: 'Timestamp', value: formatDate(sensorData.Timestamp) },
//       { label: 'Location', value: `${Number(sensorData.Latitude).toFixed(6)}, ${Number(sensorData.Longitude).toFixed(6)}` },
//       { label: 'Altitude', value: sensorData.Altitude ? `${Number(sensorData.Altitude).toFixed(1)} m` : 'N/A' },
//       { label: 'Moisture', value: sensorData.Moisture || 'N/A' },
//       { label: 'Temperature', value: sensorData.Temperature || 'N/A' },
//       { label: 'pH Value', value: sensorData.PHValue || 'N/A' },
//       { label: 'EC', value: sensorData.EC || 'N/A' },
//       { label: 'Nitrogen', value: sensorData.Nitrogen || 'N/A' },
//       { label: 'Phosphorous', value: sensorData.Phosphorous || 'N/A' },
//       { label: 'Potassium', value: sensorData.Potassium || 'N/A' },
//       { label: 'Satellite Fix', value: sensorData.SatelliteFix || 'N/A' },
//       { label: 'Data ID', value: sensorData.Id || 'N/A' }
//     ];
    
//     params.forEach(param => {
//       content += `<div><strong>${param.label}:</strong></div><div>${param.value}</div>`;
//     });
    
//     content += `</div>`;
    
//     // Add Google Maps link
//     if (sensorData.Latitude && sensorData.Longitude) {
//       const mapLink = `https://www.google.com/maps?q=${sensorData.Latitude},${sensorData.Longitude}`;
//       content += `<hr style="margin: 12px 0;"><a href="${mapLink}" target="_blank" style="color: #2563eb; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px; background: #f0f0f0; border-radius: 6px; transition: background 0.2s;">
//         <i data-lucide="map-pin" style="width: 16px; height: 16px;"></i>
//         Open in Google Maps
//       </a>`;
//     }
    
//     content += `</div>`;
//     return content;
//   }

//   /* ================= UPDATE SENSOR PANEL ================= */
//   function updateSensorPanel(sensorData) {
//     const sensorPanel = document.getElementById('sensorTablePanel');
//     if (!sensorPanel || !sensorData || typeof sensorData !== 'object') {
//       console.warn("updateSensorPanel: invalid sensor data", sensorData);
//       return;
//     }

//     // Create sensor data display
//     const panelContent = `
//       <div style="padding: 15px;">
//         <h3 style="margin: 0 0 15px 0; color: #333; border-bottom: 2px solid ${getSensorColor(sensorData.SensorId)}; padding-bottom: 8px;">
//           Sensor ${sensorData.SensorId || 'N/A'}
//         </h3>
//         <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
//           <div style="background: #f8f9fa; padding: 10px; border-radius: 6px;">
//             <strong style="color: #666; font-size: 12px;">Location</strong><br>
//             <span style="font-size: 14px;">${Number(sensorData.Latitude).toFixed(6)}, ${Number(sensorData.Longitude).toFixed(6)}</span>
//           </div>
//           <div style="background: #f8f9fa; padding: 10px; border-radius: 6px;">
//             <strong style="color: #666; font-size: 12px;">Timestamp</strong><br>
//             <span style="font-size: 14px;">${formatDate(sensorData.Timestamp)}</span>
//           </div>
//           <div style="background: #f8f9fa; padding: 10px; border-radius: 6px;">
//             <strong style="color: #666; font-size: 12px;">Moisture</strong><br>
//             <span style="font-size: 14px;">${sensorData.Moisture || 'N/A'}</span>
//           </div>
//           <div style="background: #f8f9fa; padding: 10px; border-radius: 6px;">
//             <strong style="color: #666; font-size: 12px;">Temperature</strong><br>
//             <span style="font-size: 14px;">${sensorData.Temperature || 'N/A'}</span>
//           </div>
//         </div>
//       </div>
//     `;

//     sensorPanel.innerHTML = panelContent;
//     lucide.createIcons();
//   }

//   function saveSensorToLocalStorage(sensorId) {
//     const savedSensors = JSON.parse(localStorage.getItem('saved_sensors')) || [];
//     if (!savedSensors.includes(sensorId)) {
//       savedSensors.push(sensorId);
//       localStorage.setItem('saved_sensors', JSON.stringify(savedSensors));
//       console.log(`Sensor ${sensorId} saved to localStorage`);
//     }
//   }

//   /* ================= DISPLAY ALL TRACKER DATA ================= */
//   function displayAllTrackerData(trackerId) {
//     if (!trackerId || !trackerAllData[trackerId] || trackerAllData[trackerId].length === 0) {
//       console.log(`No data to display for tracker ${trackerId}`);
//       return;
//     }
    
//     console.log(`Displaying ${trackerAllData[trackerId].length} points for tracker ${trackerId}`);
    
//     // Get selected parameters for this tracker
//     let selectedParams = null;
//     if (window.getRealtimeParameters) {
//       selectedParams = window.getRealtimeParameters(trackerId);
//     }
    
//     if (!selectedParams) {
//       selectedParams = {
//         timestamp: true,
//         latitude: true,
//         longitude: true,
//         altitude: true,
//         uin_no: true,
//         application: true,
//         category: true
//       };
//     }
    
//     // Create array of all points formatted for the table
//     const allPointsData = trackerAllData[trackerId].map((point, index) => {
//       return {
//         'Tracker ID': trackerId,
//         'Point #': index + 1,
//         'timestamp': point.timestamp || point.time || new Date().toISOString(),
//         'latitude': point.latitude || point.lat,
//         'longitude': point.longitude || point.lon,
//         'altitude': point.altitude || 0,
//         'uin_no': point.uin_no || 'N/A',
//         'application': point.application || 'Unknown',
//         'category': point.category || 'General'
//       };
//     });
    
//     console.log(`Formatted ${allPointsData.length} points for table display`);
    
//     // Update the real-time table with ALL points
//     if (window.updateRealtimeTableAllPoints && allPointsData && allPointsData.length > 0) {
//       console.log('Calling updateRealtimeTableAllPoints');
//       window.updateRealtimeTableAllPoints(trackerId, allPointsData, selectedParams);
//     } else {
//       console.error('updateRealtimeTableAllPoints is not defined or no data to display!');
//     }
    
//     // Auto-expand the real-time panel
//     const realtimePanel = document.getElementById('realtimeTablePanel');
//     if (realtimePanel && realtimePanel.classList.contains('minimized')) {
//       realtimePanel.classList.remove('minimized');
//       const chevron = document.getElementById('realtimeTablePanelChevron');
//       if (chevron) chevron.classList.remove('rotated');
//       const container = document.getElementById('realtimeTableContainer');
//       if (container) container.style.display = 'block';
//     }
//   }

//   /* ================= GROUP FETCH ================= */
//   window.fetchGroupTrackers = function (trackerIds, enableRealtime = false) {
//     if (!trackerIds?.length) {
//       alert('Group empty');
//       return;
//     }
    
//     const visibleTrackers = trackerIds.filter(id => isTrackerVisible(id));
    
//     if (visibleTrackers.length === 0) {
//       alert('No visible trackers in this group');
//       return;
//     }
    
//     clearMap();
//     console.log(`Fetching ${visibleTrackers.length} trackers from group`);
    
//     visibleTrackers.forEach((id, i) => {
//       setTimeout(() => {
//         console.log(`Fetching tracker ${id} (${i + 1}/${visibleTrackers.length})`);
//         fetchSingleTracker(id, false, enableRealtime);
//       }, i * 800);
//     });
//   };

//   /* ================= PLOT TRACKER PATH ================= */
//   function plotTrackerPath(trackerId, points, color) {
//     if (!points.length) return;

//     if (!isTrackerVisible(trackerId)) {
//       console.log(`${trackerId} is hidden, not plotting`);
//       return;
//     }

//     const latlngs = points.map(p => [p.lat, p.lon]);

//     // Polyline
//     const polyline = L.polyline(latlngs, {
//       color: color,
//       weight: 4,
//       opacity: 0.85
//     }).addTo(polylineLayer);

//     trackerPolylines[trackerId] = polyline;
    
//     if (!window.trajectoryOverlays) {
//       window.trajectoryOverlays = {};
//     }
//     window.trajectoryOverlays[trackerId] = polyline;

//     // Markers
//     trackerMarkers[trackerId] = [];

//     // START marker
//     const startMarker = L.marker(latlngs[0], { icon: START_ICON })
//       .addTo(markersLayer)
//       .bindPopup(createTrackerPopupContent(trackerId, points[0], 'Start Point'));
//     trackerMarkers[trackerId].push(startMarker);

//     // END marker
//     const endMarker = L.marker(latlngs.at(-1), { icon: END_ICON })
//       .addTo(markersLayer)
//       .bindPopup(createTrackerPopupContent(trackerId, points.at(-1), 'Latest Point'));
//     trackerMarkers[trackerId].push(endMarker);

//     updateMapBounds();
//   }

//   function createTrackerPopupContent(trackerId, point, label) {
//     let content = `<b>${trackerId}</b><br>${label}<br>`;
    
//     if (point.time) {
//       content += `Time: ${formatTimestamp(point.time)}<br>`;
//     }
    
//     if (point.lat !== undefined) {
//       content += `Latitude: ${point.lat.toFixed(6)}<br>`;
//     }
//     if (point.lon !== undefined) {
//       content += `Longitude: ${point.lon.toFixed(6)}<br>`;
//     }
    
//     if (point.altitude !== undefined) {
//       content += `Altitude: ${point.altitude}m<br>`;
//     }
//     if (point.uin_no && point.uin_no !== 'N/A') {
//       content += `UIN: ${point.uin_no}<br>`;
//     }
//     if (point.application && point.application !== 'Unknown') {
//       content += `Application: ${point.application}<br>`;
//     }
//     if (point.category && point.category !== 'General') {
//       content += `Category: ${point.category}<br>`;
//     }
    
//     return content;
//   }

//   /* ================= VISIBILITY TOGGLE ================= */
//   window.toggleTrackerVisibility = function (trackerId, visible) {
//     trackerVisibility[trackerId] = visible;
    
//     if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
//       groupSettings[activeGroup][trackerId].visible = visible;
//       localStorage.setItem('groupSettings', JSON.stringify(groupSettings));
//     }
    
//     if (trackerPolylines[trackerId]) {
//       if (visible) {
//         polylineLayer.addLayer(trackerPolylines[trackerId]);
//       } else {
//         polylineLayer.removeLayer(trackerPolylines[trackerId]);
//       }
//     }

//     (trackerMarkers[trackerId] || []).forEach(m => {
//       if (visible) {
//         markersLayer.addLayer(m);
//       } else {
//         markersLayer.removeLayer(m);
//       }
//     });
    
//     if (!visible) {
//       removeTrackerFromRealtimeUpdates(trackerId);
//     }
    
//     updateLegend();
//     updateMapBounds();
//   };

//   window.toggleSensorVisibility = function (sensorId, visible) {
//     sensorVisibility[sensorId] = visible;
    
//     if (sensorMarkers[sensorId]) {
//       if (visible) {
//         sensorLayer.addLayer(sensorMarkers[sensorId]);
//       } else {
//         sensorLayer.removeLayer(sensorMarkers[sensorId]);
//       }
//     }
    
//     updateLegend();
//     updateMapBounds();
//   };

//   /* ================= COLOR CHANGE ================= */
//   window.changeTrackerColor = function (trackerId, color) {
//     trackerColorMap[trackerId] = color;
    
//     if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
//       groupSettings[activeGroup][trackerId].color = color;
//       localStorage.setItem('groupSettings', JSON.stringify(groupSettings));
//     }

//     if (trackerPolylines[trackerId] && isTrackerVisible(trackerId)) {
//       trackerPolylines[trackerId].setStyle({ color: color });
//     }

//     (trackerMarkers[trackerId] || []).forEach(m => {
//       if (m.options.icon && isTrackerVisible(trackerId)) {
//         const iconHtml = m.options.icon.options?.html || '';
//         if (iconHtml.includes('border-radius:50%')) {
//           m.setIcon(createPinIcon(color, 8));
//         }
//       }
//     });

//     updateLegend();
//   };

//   window.changeSensorColor = function (sensorId, color) {
//     sensorColorMap[sensorId] = color;
    
//     if (sensorMarkers[sensorId]) {
//       sensorMarkers[sensorId].setIcon(createSensorIcon(color));
//     }
    
//     updateLegend();
//   };

//   /* ================= HELPERS ================= */
//   function updateLastUpdatedTime() {
//     if (lastUpdatedDiv && lastUpdateTime) {
//       lastUpdatedDiv.textContent = `Last updated: ${lastUpdateTime.toLocaleString()}`;
//     }
//   }

//   function showStatus(msg, type) {
//     if (!statusMessage) return;
//     statusMessage.textContent = msg;
//     statusMessage.className = `status-${type}`;
//     if (type !== 'loading') setTimeout(() => statusMessage.textContent = '', 4000);
//   }

//   function formatTimestamp(ts) {
//     return new Date(ts).toLocaleString();
//   }

//   function updateMapBounds() {
//     const allVisiblePoints = [];
    
//     Object.keys(trackerPolylines).forEach(trackerId => {
//       if (isTrackerVisible(trackerId) && trackerPolylines[trackerId]._latlngs) {
//         allVisiblePoints.push(...trackerPolylines[trackerId]._latlngs);
//       }
//     });
    
//     Object.keys(sensorMarkers).forEach(sensorId => {
//       const marker = sensorMarkers[sensorId];
//       if (marker && marker.getLatLng && isSensorVisible(sensorId)) {
//         allVisiblePoints.push(marker.getLatLng());
//       }
//     });
    
//     if (allVisiblePoints.length > 0) {
//       map.fitBounds(allVisiblePoints, { padding: [40, 40] });
//     }
//   }

//   /* ================= EXPOSE FUNCTIONS TO WINDOW ================= */
//   window.setActiveGroup = function(groupName) {
//     activeGroup = groupName;
//     groupSettings = JSON.parse(localStorage.getItem('groupSettings')) || {};
//   };

//   window.updateTrackerVisibilityFromGroup = function(trackerId, isVisible) {
//     window.toggleTrackerVisibility(trackerId, isVisible);
//   };

//   window.updateTrackerColorFromGroup = function(trackerId, color) {
//     window.changeTrackerColor(trackerId, color);
//   };

//   window.handleFetch = function(trackerId, enableRealtime = false) {
//     fetchSingleTracker(trackerId, true, enableRealtime);
//   };

//   window.startRealtimeUpdatesForTracker = function(trackerId) {
//     addTrackerToRealtimeUpdates(trackerId);
//   };

//   window.stopRealtimeUpdatesForTracker = function(trackerId) {
//     removeTrackerFromRealtimeUpdates(trackerId);
//   };

//   window.toggleRealtimeUpdatesForTracker = function(trackerId, enable) {
//     toggleRealtimeUpdates(trackerId, enable);
//   };

//   // Sensor functions
//   window.plotSensorOnMap = plotSensorOnMap;
//   window.updateSensorPanel = updateSensorPanel;
//   window.toggleSensorVisibility = toggleSensorVisibility;
//   window.changeSensorColor = changeSensorColor;

//   // Initialize global objects
//   window.trajectoryOverlays = {};
//   window.realtimeTableDataAllPoints = {};
//   window.sensorTableData = {};

//   // Add keyboard shortcuts
//   document.addEventListener('keydown', function(e) {
//     if (e.altKey && e.key === 'r') {
//       e.preventDefault();
//       const realtimeBtn = document.getElementById('openRealtimePopup');
//       if (realtimeBtn) realtimeBtn.click();
//     }
    
//     if (e.altKey && e.key === 'a') {
//       e.preventDefault();
//       const trackerId = trackerInput.value.trim();
//       if (trackerId) {
//         const isEnabled = realtimeUpdateConfig.trackers.has(trackerId);
//         toggleRealtimeUpdates(trackerId, !isEnabled);
//         showStatus(`Real-time updates ${!isEnabled ? 'enabled' : 'disabled'} for ${trackerId}`, 'success');
//       }
//     }
    
//     if (e.altKey && e.key === 's') {
//       e.preventDefault();
//       const sensorId = sensorInput.value.trim();
//       if (sensorId) {
//         fetchSensorData(sensorId);
//       }
//     }
//   });

//   // Fetch data for saved trackers and sensors on page load
//   window.addEventListener('load', function() {
//     const savedTrackers = JSON.parse(localStorage.getItem('saved_trackers')) || [];
//     const savedSensors = JSON.parse(localStorage.getItem('saved_sensors')) || [];
    
//     const autoUpdateEnabled = JSON.parse(localStorage.getItem('auto_update_enabled')) || false;
//     const autoUpdateTrackers = JSON.parse(localStorage.getItem('auto_update_trackers')) || [];
    
//     if (savedTrackers.length > 0) {
//       showStatus(`Loading ${savedTrackers.length} saved trackers...`, 'loading');
      
//       setTimeout(() => {
//         savedTrackers.forEach((trackerId, index) => {
//           setTimeout(() => {
//             const enableRealtime = autoUpdateEnabled && autoUpdateTrackers.includes(trackerId);
//             fetchSingleTracker(trackerId, index === 0, enableRealtime);
//           }, index * 1000);
//         });
//       }, 1500);
//     }
    
//     if (savedSensors.length > 0) {
//       setTimeout(() => {
//         showStatus(`Loading ${savedSensors.length} saved sensors...`, 'loading');
//         savedSensors.forEach((sensorId, index) => {
//           setTimeout(() => {
//             fetchSensorData(sensorId, index === 0);
//           }, index * 1500);
//         });
//       }, 3000);
//     }
//   });

//   // Save auto-update state before page unload
//   window.addEventListener('beforeunload', function() {
//     localStorage.setItem('auto_update_enabled', JSON.stringify(realtimeUpdateConfig.trackers.size > 0));
//     localStorage.setItem('auto_update_trackers', JSON.stringify(Array.from(realtimeUpdateConfig.trackers)));
//     stopRealtimeUpdates();
//   });
// });


window.clearMap = function () {
  if (window.markersLayer) markersLayer.clearLayers();
  if (window.polylineLayer) polylineLayer.clearLayers();
  if (window.sensorLayer) sensorLayer.clearLayers();

  if (window.trackerPolylines) Object.keys(trackerPolylines).forEach(k => delete trackerPolylines[k]);
  if (window.trackerMarkers) Object.keys(trackerMarkers).forEach(k => delete trackerMarkers[k]);
  if (window.trackerAllData) Object.keys(trackerAllData).forEach(k => delete trackerAllData[k]);
  if (window.sensorMarkers) Object.keys(sensorMarkers).forEach(k => delete sensorMarkers[k]);
  if (window.sensorAllData) Object.keys(sensorAllData).forEach(k => delete sensorAllData[k]);

  const imagesGrid = document.getElementById('images-grid');
  if (imagesGrid) imagesGrid.innerHTML = '';
  
  // Clear sensor table data
  if (window.updateSensorTable) window.updateSensorTable();
};


document.getElementById("sensorTableContainer").style.display = "block";

// --- Updated Sensor History Table Renderer ---
function updateSensorTable(sensorData = null) {
  const tbody = document.getElementById("sensorDataTableBody");
  const thead = document.getElementById("sensorDataTableHeader");
  const container = document.getElementById("sensorTableContainer");
  const panel = document.getElementById("sensorTablePanel");

  if (!tbody || !container || !thead || !panel) {
    console.error("Sensor table elements not found");
    return;
  }

  tbody.innerHTML = "";
  thead.innerHTML = "";

  // Get NAVIC toggle state
  const navicToggle = document.getElementById('navicToggle');
  const navicEnabled = navicToggle ? navicToggle.checked : true;

  // If no data is provided, use all sensor data
  let rows = [];
  
  if (sensorData === null) {
    // Show all sensors data
    Object.values(window.sensorTableData || {}).forEach(sensorRows => {
      rows.push(...sensorRows);
    });
  } else if (Array.isArray(sensorData) && sensorData.length > 0) {
    // History mode - multiple sensor data points
    rows = sensorData;
  } else if (sensorData && typeof sensorData === "object") {
    // Single object
    rows = [sensorData];
  }

  if (rows.length === 0) {
    const colspan = navicEnabled ? 12 : 9; // Adjust colspan based on NAVIC toggle
    tbody.innerHTML = `
      <tr class="no-data-row">
        <td colspan="${colspan}" style="text-align:center;">No sensor data available. Fetch a sensor first.</td>
      </tr>`;
    return;
  }

  // Sort by timestamp (newest first)
  rows.sort((a, b) => {
    const dateA = a.Timestamp ? normalizeTimestamp(a.Timestamp) : "";
    const dateB = b.Timestamp ? normalizeTimestamp(b.Timestamp) : "";
    return new Date(dateB) - new Date(dateA);
  });

  // Define column order based on NAVIC toggle
  const allColumns = [
    'SensorId', 'Timestamp', 
    'Moisture', 'Temperature', 'EC', 'PHValue',
    'Nitrogen', 'Phosphorous', 'Potassium',
    'Latitude', 'Longitude', 'Altitude',
    'SatelliteFix', 'Maplink'
  ];
  
  // Filter columns based on NAVIC toggle
  const columnOrder = navicEnabled ? allColumns : allColumns.filter(col => 
    !['Latitude', 'Longitude', 'SatelliteFix'].includes(col)
  );
  
  // Create a mapping of possible key variations to standard column names
  const keyVariations = {
    'latitude': 'Latitude',
    'lat': 'Latitude',
    'Lat': 'Latitude',
    'longitude': 'Longitude',
    'lon': 'Longitude',
    'Lon': 'Longitude',
    'long': 'Longitude',
    'sensorid': 'SensorId',
    'sensor_id': 'SensorId',
    'timestamp': 'Timestamp',
    'time': 'Timestamp',
    'moisture': 'Moisture',
    'temperature': 'Temperature',
    'temp': 'Temperature',
    'ec': 'EC',
    'phvalue': 'PHValue',
    'ph': 'PHValue',
    'nitrogen': 'Nitrogen',
    'phosphorous': 'Phosphorous',
    'phosphorus': 'Phosphorous',
    'potassium': 'Potassium',
    'altitude': 'Altitude',
    'alt': 'Altitude',
    'satellitefix': 'SatelliteFix',
    'sat_fix': 'SatelliteFix',
    'satfix': 'SatelliteFix',
    'maplink': 'Maplink',
    'map_link': 'Maplink'
  };
  
  // First, normalize all row keys to standard format
  const normalizedRows = rows.map(row => {
    const normalizedRow = {};
    Object.keys(row).forEach(key => {
      const lowerKey = key.toLowerCase();
      const standardKey = keyVariations[lowerKey] || key;
      normalizedRow[standardKey] = row[key];
    });
    return normalizedRow;
  });
  
  rows = normalizedRows;
  
  // Filter to only include keys that are in our filtered column order AND exist in the data
  const headers = columnOrder.filter(key => {
    return rows.some(row => key in row);
  });

  console.log("Headers to display (NAVIC:", navicEnabled, "):", headers);

  const trHead = document.createElement("tr");
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = formatSensorHeader(h);
    // Add coordinate column class for styling if needed
    if (['Latitude', 'Longitude', 'SatelliteFix'].includes(h)) {
      th.className = 'navic-column';
    }
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);

  // --- Fill table rows ---
  rows.forEach(row => {
    const tr = document.createElement("tr");
    headers.forEach(h => {
      const td = document.createElement("td");
      const value = row[h];

      // Format coordinates nicely
      if (h.toLowerCase() === "latitude" || h.toLowerCase() === "longitude") {
        td.textContent = value !== undefined && value !== null ? Number(value).toFixed(6) : "-";
      }
      // Format Timestamp nicely
      else if (h.toLowerCase() === "timestamp") {
        td.textContent = value ? formatDate(value) : "-";
      }
      // Sensor ID with color
      else if (h.toLowerCase() === "sensorid") {
        td.textContent = value || "-";
        td.className = "sensor-id-cell";
        td.style.color = getSensorColor(value);
        td.style.fontWeight = "600";
      }
      // Altitude - check both "Altitude" and "altitude"
      else if (h.toLowerCase() === "altitude") {
        if (value !== undefined && value !== null && value !== "") {
          const num = Number(value);
          td.textContent = !isNaN(num) ? `${num.toFixed(1)} m` : value;
        } else {
          td.textContent = "-";
        }
      }
      // Maplink - create clickable link
      else if (h.toLowerCase() === "maplink") {
        if (value && value.startsWith('http')) {
          td.innerHTML = `<a href="${value}" target="_blank" style="color: #2563eb; text-decoration: none;">📍 View</a>`;
        } else {
          td.textContent = "-";
        }
      }
      // Format sensor parameters
      else if (h.toLowerCase() === "moisture") {
        td.textContent = value !== undefined && value !== null ? Number(value).toFixed(2) : "-";
      }
      else if (h.toLowerCase() === "temperature") {
        td.textContent = value !== undefined && value !== null ? Number(value).toFixed(2) : "-";
      }
      else if (h.toLowerCase() === "ec") {
        td.textContent = value !== undefined && value !== null ? Number(value).toFixed(2) : "-";
      }
      else if (h.toLowerCase() === "phvalue") {
        td.textContent = value !== undefined && value !== null ? Number(value).toFixed(2) : "-";
      }
      else if (h.toLowerCase() === "nitrogen") {
        td.textContent = value !== undefined && value !== null ? Number(value).toFixed(2) : "-";
      }
      else if (h.toLowerCase() === "phosphorous") {
        td.textContent = value !== undefined && value !== null ? Number(value).toFixed(2) : "-";
      }
      else if (h.toLowerCase() === "potassium") {
        td.textContent = value !== undefined && value !== null ? Number(value).toFixed(2) : "-";
      }
      // Satellite Fix
      else if (h.toLowerCase() === "satellitefix") {
        td.textContent = value || "-";
      }
      else {
        td.textContent = value !== undefined && value !== null ? value : "-";
      }

      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  // --- Auto-expand panel if minimized ---
  if (panel.classList.contains("minimized")) {
    panel.classList.remove("minimized");
    document.getElementById("sensorTablePanelChevron")?.classList.remove("rotated");
    container.style.display = "block";
  }
  
  // Update panel title with sensor count
  const panelHeader = document.querySelector('#sensorTablePanelHeader h2');
  if (panelHeader) {
    const sensorIds = Object.keys(window.sensorTableData || {});
    const totalReadings = rows.length;
    panelHeader.textContent = `Sensor Data (${sensorIds.length} sensors, ${totalReadings} readings)`;
  }
}

// Helper function to format sensor headers
function formatSensorHeader(header) {
  const map = {
    'SensorId': 'Sensor ID',
    'Timestamp': 'Timestamp',
    'Moisture': 'Moisture',
    'Temperature': 'Temperature',
    'EC': 'EC',
    'PHValue': 'pH',
    'Nitrogen': 'Nitrogen',
    'Phosphorous': 'Phosphorous',
    'Potassium': 'Potassium',
    'Latitude': 'Latitude',
    'Longitude': 'Longitude',
    'Altitude': 'Altitude',
    'SatelliteFix': 'Sat Fix',
    'Maplink': 'Map Link'
  };
  return map[header] || header;
}

// Add this function to ensure getSensorColor is available
function getSensorColor(sensorId) {
  if (!window.sensorColorMap) {
    window.sensorColorMap = {};
  }
  
  if (!window.sensorColorMap[sensorId]) {
    const sensorColors = [
      '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', 
      '#EF476F', '#9D4EDD', '#FB5607', '#3A86FF', '#8338EC',
      '#FF9E6D', '#A0E7E5', '#FFA8B5', '#C5F277', '#72DDF7'
    ];
    
    const sensorIds = Object.keys(window.sensorColorMap);
    const colorIndex = sensorIds.length % sensorColors.length;
    window.sensorColorMap[sensorId] = sensorColors[colorIndex];
  }
  
  return window.sensorColorMap[sensorId];
}

// --- Helper for timestamp formatting ---
function formatDate(ts) {
  if (!ts) return "-";
  // Handle "21-01-2026 17:44" format
  if (typeof ts === "string" && ts.includes("-") && ts.includes(":")) {
    const [dmy, t] = ts.split(" ");
    const [d, m, y] = dmy.split("-");
    ts = `${y}-${m}-${d} ${t}`;
  }
  const d = new Date(ts);
  return isNaN(d) ? "-" : d.toLocaleString();
}

// Normalize timestamp for sorting
function normalizeTimestamp(ts) {
  if (!ts) return "";
  if (typeof ts === "string" && ts.includes("-") && ts.includes(":")) {
    const [dmy, t] = ts.split(" ");
    const [d, m, y] = dmy.split("-");
    return `${y}-${m}-${d}T${t}`;
  }
  return ts;
}

// --- Helper for safe lat/lon formatting ---
function formatCoord(v) {
  if (!v && v !== 0) return "-";
  const num = Number(v);
  return isNaN(num) ? "-" : num.toFixed(6);
}


document.addEventListener('DOMContentLoaded', function () {
  /* ================= DOM ================= */
  const fetchBtn = document.getElementById('fetch-btn');
  const trackerInput = document.getElementById('tracker-id');
  const sensorInput = document.getElementById('sensor-id');
  const statusMessage = document.getElementById('status-message');
  const lastUpdatedDiv = document.querySelector('.last-updated');
  const imagesGrid = document.getElementById('images-grid');

  /* ================= REAL-TIME UPDATE CONFIG ================= */
  let realtimeUpdateInterval = null;
  const realtimeUpdateConfig = {
    enabled: false,
    interval: 5000,
    trackers: new Set(),
    lastFetched: {},
    maxRetryCount: 3,
    retryDelay: 1000
  };

  /* ================= GROUP AUTO-REFRESH ================= */
  let groupAutoInterval = null;
  let groupAutoSeconds = 10000; // 10 sec default

  function startGroupAutoRefresh() {
    if (groupAutoInterval) clearInterval(groupAutoInterval);

    groupAutoInterval = setInterval(() => {
      if (!activeGroup) {
        console.log("⚠️ No active group, skipping auto-refresh");
        return;
      }
      console.log("🔄 Auto-refreshing group:", activeGroup);

      const event = new Event('click');
      document.getElementById('fetchGroupBtn').dispatchEvent(event);

    }, groupAutoSeconds);

    console.log("▶️ Group auto-refresh started");
  }

  function stopGroupAutoRefresh() {
    if (groupAutoInterval) {
      clearInterval(groupAutoInterval);
      groupAutoInterval = null;
      console.log("⏹ Group auto-refresh stopped");
    }
  }

  /* ================= MAP ================= */
  const map = L.map('map').setView([23.0225, 72.5714], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  const markersLayer = L.layerGroup().addTo(map);
  const polylineLayer = L.layerGroup().addTo(map);
  const sensorLayer = L.layerGroup().addTo(map);

  let lastUpdateTime = null;
  let activeGroup = null;

  /* ================= TRACKER STATE ================= */
  const trackerPolylines = {};
  const trackerMarkers = {};
  const trackerColorMap = {};
  const trackerVisibility = {};
  const trackerAllData = {};

  /* ================= SENSOR STATE ================= */
  const sensorMarkers = {};
  const sensorAllData = {};
  const sensorColorMap = {};
  const sensorVisibility = {};
  const sensorColors = [
    '#FF6B6B', '#4ECDC4', '#FFD166', '#06D6A0', '#118AB2', 
    '#EF476F', '#9D4EDD', '#FB5607', '#3A86FF', '#8338EC',
    '#FF9E6D', '#A0E7E5', '#FFA8B5', '#C5F277', '#72DDF7'
  ];
  let sensorColorIndex = 0;

  const COLORS = ['#2563eb', '#eab308', '#9333ea', '#ea580c', '#0891b2', '#4f46e5'];
  let colorIndex = 0;

  // Group settings from localStorage
  let groupSettings = JSON.parse(localStorage.getItem('groupSettings')) || {};

  function getTrackerColor(trackerId) {
    if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
      return groupSettings[activeGroup][trackerId].color;
    }
    
    if (trackerColorMap[trackerId]) {
      return trackerColorMap[trackerId];
    }
    
    const color = COLORS[colorIndex++ % COLORS.length];
    trackerColorMap[trackerId] = color;
    updateLegend();
    return color;
  }

  function getSensorColor(sensorId) {
    if (sensorColorMap[sensorId]) {
      return sensorColorMap[sensorId];
    }
    
    const color = sensorColors[sensorColorIndex++ % sensorColors.length];
    sensorColorMap[sensorId] = color;
    updateLegend();
    return color;
  }

  function isTrackerVisible(trackerId) {
    if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
      return groupSettings[activeGroup][trackerId].visible;
    }
    
    return trackerVisibility[trackerId] !== false;
  }

  function isSensorVisible(sensorId) {
    return sensorVisibility[sensorId] !== false;
  }

  /* ================= REAL-TIME AUTO-UPDATE FUNCTIONS ================= */
  function startRealtimeUpdates() {
    if (realtimeUpdateInterval) {
      clearInterval(realtimeUpdateInterval);
    }
    
    realtimeUpdateInterval = setInterval(async () => {
      if (realtimeUpdateConfig.trackers.size === 0) return;
      
      const now = Date.now();
      const trackersToUpdate = Array.from(realtimeUpdateConfig.trackers);
      
      for (const trackerId of trackersToUpdate) {
        if (realtimeUpdateConfig.lastFetched[trackerId] && 
            (now - realtimeUpdateConfig.lastFetched[trackerId]) < realtimeUpdateConfig.interval) {
          continue;
        }
        
        await fetchLatestTrackerData(trackerId);
        realtimeUpdateConfig.lastFetched[trackerId] = now;
      }
    }, realtimeUpdateConfig.interval);
  }

  function stopRealtimeUpdates() {
    if (realtimeUpdateInterval) {
      clearInterval(realtimeUpdateInterval);
      realtimeUpdateInterval = null;
    }
  }

  function addTrackerToRealtimeUpdates(trackerId) {
    realtimeUpdateConfig.trackers.add(trackerId);
    if (!realtimeUpdateInterval) {
      startRealtimeUpdates();
    }
    showStatus(`Tracker ${trackerId} added to real-time updates`, 'success');
  }

  function removeTrackerFromRealtimeUpdates(trackerId) {
    realtimeUpdateConfig.trackers.delete(trackerId);
    if (realtimeUpdateConfig.trackers.size === 0) {
      stopRealtimeUpdates();
    }
  }

  function toggleRealtimeUpdates(trackerId, enable) {
    if (enable) {
      addTrackerToRealtimeUpdates(trackerId);
    } else {
      removeTrackerFromRealtimeUpdates(trackerId);
    }
  }

  async function fetchLatestTrackerData(trackerId) {
    try {
      const res = await fetch('/api/trajectory/latest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracker_id: trackerId,
          last_timestamp: trackerAllData[trackerId] && trackerAllData[trackerId].length > 0 ? 
                         trackerAllData[trackerId][trackerAllData[trackerId].length - 1].timestamp : null
        })
      });

      if (!res.ok) throw new Error('Server error');

      const data = await res.json();
      
      if (data.points && data.points.length > 0) {
        const newPoints = data.points.map(p => ({
          lat: +p.lat,
          lon: +p.lon,
          time: p.timestamp,
          timestamp: p.timestamp,
          latitude: +p.lat,
          longitude: +p.lon,
          altitude: p.altitude || 0,
          uin_no: p.uin_no || 'N/A',
          application: p.application || 'Unknown',
          category: p.category || 'General'
        }));

        if (!trackerAllData[trackerId]) {
          trackerAllData[trackerId] = [];
        }
        
        newPoints.forEach(newPoint => {
          const exists = trackerAllData[trackerId].some(p => p.timestamp === newPoint.timestamp);
          if (!exists) {
            trackerAllData[trackerId].push(newPoint);
          }
        });

        if (newPoints.length > 0) {
          updateTrackerLatestPoint(trackerId, newPoints[newPoints.length - 1]);
        }
        
        displayAllTrackerData(trackerId);
        
        lastUpdateTime = new Date();
        updateLastUpdatedTime();
      }
      
    } catch (err) {
      console.error(`Failed to fetch latest data for ${trackerId}:`, err);
    }
  }

  function updateTrackerLatestPoint(trackerId, point) {
    const color = getTrackerColor(trackerId);
    
    if (trackerMarkers[trackerId]) {
      const markers = trackerMarkers[trackerId];
      if (markers.length > 0) {
        const endMarker = markers[markers.length - 1];
        endMarker.setLatLng([point.lat, point.lon]);
        const popupContent = createPopupContent(trackerId, point, 'Latest Point');
        endMarker.setPopupContent(popupContent);
      }
    }

    if (trackerPolylines[trackerId]) {
      const polyline = trackerPolylines[trackerId];
      const currentLatLngs = polyline.getLatLngs();
      currentLatLngs.push([point.lat, point.lon]);
      polyline.setLatLngs(currentLatLngs);
    }
  }

  /* ================= ICONS ================= */
  function createPinIcon(color, size = 34) {
    return L.divIcon({
      className: '',
      html: `
        <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
        </svg>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
      popupAnchor: [0, -size]
    });
  }

  function createSensorIcon(color = '#ff5722') {
    return L.divIcon({
      className: 'sensor-marker',
      html: `
        <div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:12px;">
          <i data-lucide="cpu" style="width: 14px; height: 14px;"></i>
        </div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  }

  const START_ICON = createPinIcon('green');
  const END_ICON = createPinIcon('red');

  /* ================= LEGEND ================= */
  const legend = L.control({ position: 'bottomright' });

  legend.onAdd = function () {
    const div = L.DomUtil.create('div', 'map-legend');
    div.style.background = 'white';
    div.style.padding = '10px';
    div.style.marginBottom = '80px';
    div.style.marginRight = '20px';
    div.style.borderRadius = '8px';
    div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    div.style.fontSize = '13px';
    div.style.maxHeight = '400px';
    div.style.overflowY = 'auto';
    return div;
  };

  legend.addTo(map);

  function updateLegend() {
    const div = document.querySelector('.map-legend');
    if (!div) return;

    const pin = (color) => `
      <svg width="14" height="22" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
      </svg>
    `;

    let html = `
      <strong>Legend</strong><br><br>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
        ${pin('green')}
        <span style="font-weight:600;">Tracker Start</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        ${pin('red')}
        <span style="font-weight:600;">Tracker End</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
        <div style="background:#ff5722;width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>
        <span style="font-weight:600;">Sensor</span>
      </div>
      <hr style="margin:6px 0">
      <strong>Trackers:</strong><br>
    `;

    // Add trackers to legend
    Object.entries(trackerColorMap).forEach(([id, color]) => {
      if (isTrackerVisible(id)) {
        html += `
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <span style="color:${color};font-size:14px;">●</span>
            ${id} ${realtimeUpdateConfig.trackers.has(id) ? '🔄' : ''}
          </div>
        `;
      }
    });

    html += `<br><strong>Sensors:</strong><br>`;

    // Add sensors to legend
    Object.entries(sensorColorMap).forEach(([id, color]) => {
      if (isSensorVisible(id)) {
        html += `
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:2px;">
            <span style="color:${color};font-size:14px;">●</span>
            ${id}
          </div>
        `;
      }
    });

    div.innerHTML = html;
    lucide.createIcons();
  }

  /* ================= EVENTS ================= */
  fetchBtn?.addEventListener('click', () => {
    const id = trackerInput.value.trim();
    if (id) fetchSingleTracker(id, true);
  });

  // Sensor fetch button event
  const fetchSensorBtn = document.getElementById('fetch-sensor-btn');
  fetchSensorBtn?.addEventListener('click', () => {
    const id = sensorInput.value.trim();
    if (id) fetchSensorData(id, true);
  });

  /* ================= FETCH SINGLE TRACKER ================= */
  async function fetchSingleTracker(trackerId, clearBefore = false, enableRealtime = false) {
    if (!trackerId) return;

    if (clearBefore) clearMap();

    const color = getTrackerColor(trackerId);
    trackerVisibility[trackerId] = true;
    showStatus(`Fetching tracker ${trackerId}...`, 'loading');

    try {
      const res = await fetch('/api/trajectory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tracker_id: trackerId,
          interval_seconds: 30,
          max_gap_seconds: 120
        })
      });

      if (!res.ok) throw new Error('Server error');

      const data = await res.json();
      console.log('Received data from server:', data);
      
      const points = (data.points || []).map(p => ({
        lat: +p.lat,
        lon: +p.lon,
        time: p.timestamp,
        timestamp: p.timestamp,
        latitude: +p.lat,
        longitude: +p.lon,
        altitude: p.altitude || 0,
        uin_no: p.uin_no || 'N/A',
        application: p.application || 'Unknown',
        category: p.category || 'General'
      }));

      console.log(`Parsed ${points.length} points for tracker ${trackerId}`);
      
      // Store ALL points for this tracker
      trackerAllData[trackerId] = points;

      plotTrackerPath(trackerId, points, color);
      
      if (points.length > 0) {
        // Display ALL points in the table
        displayAllTrackerData(trackerId);
        
        // Auto-enable real-time updates if specified
        if (enableRealtime) {
          addTrackerToRealtimeUpdates(trackerId);
        }
      }

      lastUpdateTime = new Date();
      updateLastUpdatedTime();
      showStatus(`Loaded ${points.length} points for tracker ${trackerId}`, 'success');

    } catch (err) {
      console.error('Error fetching tracker:', err);
      showStatus(`${trackerId}: ${err.message}`, 'error');
    }
  }

  /* ================= FETCH SENSOR DATA ================= */
  window.fetchSensorData = async function (sensorId, clearBefore = false) {
    if (!sensorId) return;

    if (clearBefore) {
      // Clear only sensor data if requested
      sensorLayer.clearLayers();
      Object.keys(sensorMarkers).forEach(k => delete sensorMarkers[k]);
    }

    sensorVisibility[sensorId] = true;
    showStatus(`Fetching sensor ${sensorId}...`, "loading");

    try {
      const res = await fetch(`/api/sensor/data?sensor_id=${sensorId}`);
      if (!res.ok) throw new Error("Backend API error");

      const data = await res.json();
      let rows = [];
      
      if (Array.isArray(data.rows)) {
        rows = data.rows;
      } else if (data && typeof data === "object") {
        rows = [data];
      }

      // Store sensor data
      sensorAllData[sensorId] = rows;

      // Plot all sensor points on map
      rows.forEach((sensorData, index) => {
        plotSensorOnMap(sensorData, sensorId);
      });

      // Update sensor table with all readings
      if (rows.length > 0) {
        // Initialize sensor table data storage
        if (!window.sensorTableData) {
          window.sensorTableData = {};
        }
        window.sensorTableData[sensorId] = rows;
        
        // Update the table with all sensor data
        updateSensorTable();
      }

      saveSensorToLocalStorage(sensorId);
      showStatus(`Loaded ${rows.length} readings for sensor ${sensorId}`, "success");

    } catch (err) {
      console.error(err);
      showStatus(err.message, "error");
    }
  };

  /* ================= PLOT SENSOR ON MAP ================= */
  function plotSensorOnMap(sensorData, sensorId = null) {
    if (!sensorData?.Latitude || !sensorData?.Longitude) return;

    const actualSensorId = sensorId || sensorData.SensorId;
    const latlng = [Number(sensorData.Latitude), Number(sensorData.Longitude)];
    const color = getSensorColor(actualSensorId);

    // Remove existing marker for this sensor if it exists
    if (sensorMarkers[actualSensorId]) {
      sensorLayer.removeLayer(sensorMarkers[actualSensorId]);
    }

    const marker = L.marker(latlng, {
      icon: createSensorIcon(color)
    }).bindPopup(createSensorPopupContent(sensorData));

    sensorLayer.addLayer(marker);
    sensorMarkers[actualSensorId] = marker;

    // Fit bounds to show all sensors
    updateMapBounds();
    updateLegend();
  }

  function createSensorPopupContent(sensorData) {
    let content = `<div style="min-width: 280px; max-width: 350px;">`;
    content += `<h4 style="margin: 0 0 12px 0; color: #333; border-bottom: 2px solid ${getSensorColor(sensorData.SensorId)}; padding-bottom: 6px;">Sensor ${sensorData.SensorId || 'N/A'}</h4>`;
    content += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">`;
    
    const params = [
      { label: 'Timestamp', value: formatDate(sensorData.Timestamp) },
      { label: 'Location', value: `${Number(sensorData.Latitude).toFixed(6)}, ${Number(sensorData.Longitude).toFixed(6)}` },
      { label: 'Altitude', value: sensorData.Altitude ? `${Number(sensorData.Altitude).toFixed(1)} m` : 'N/A' },
      { label: 'Moisture', value: sensorData.Moisture || 'N/A' },
      { label: 'Temperature', value: sensorData.Temperature || 'N/A' },
      { label: 'pH Value', value: sensorData.PHValue || 'N/A' },
      { label: 'EC', value: sensorData.EC || 'N/A' },
      { label: 'Nitrogen', value: sensorData.Nitrogen || 'N/A' },
      { label: 'Phosphorous', value: sensorData.Phosphorous || 'N/A' },
      { label: 'Potassium', value: sensorData.Potassium || 'N/A' },
      { label: 'Satellite Fix', value: sensorData.SatelliteFix || 'N/A' },
      { label: 'Data ID', value: sensorData.Id || 'N/A' }
    ];
    
    params.forEach(param => {
      content += `<div><strong>${param.label}:</strong></div><div>${param.value}</div>`;
    });
    
    content += `</div>`;
    
    // Add Google Maps link
    if (sensorData.Latitude && sensorData.Longitude) {
      const mapLink = `https://www.google.com/maps?q=${sensorData.Latitude},${sensorData.Longitude}`;
      content += `<hr style="margin: 12px 0;"><a href="${mapLink}" target="_blank" style="color: #2563eb; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px; background: #f0f0f0; border-radius: 6px; transition: background 0.2s;">
        <i data-lucide="map-pin" style="width: 16px; height: 16px;"></i>
        Open in Google Maps
      </a>`;
    }
    
    content += `</div>`;
    return content;
  }

  /* ================= UPDATE SENSOR PANEL ================= */
  function updateSensorPanel(sensorData) {
    const sensorPanel = document.getElementById('sensorTablePanel');
    if (!sensorPanel || !sensorData || typeof sensorData !== 'object') {
      console.warn("updateSensorPanel: invalid sensor data", sensorData);
      return;
    }

    // Create sensor data display
    const panelContent = `
      <div style="padding: 15px;">
        <h3 style="margin: 0 0 15px 0; color: #333; border-bottom: 2px solid ${getSensorColor(sensorData.SensorId)}; padding-bottom: 8px;">
          Sensor ${sensorData.SensorId || 'N/A'}
        </h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
          <div style="background: #f8f9fa; padding: 10px; border-radius: 6px;">
            <strong style="color: #666; font-size: 12px;">Location</strong><br>
            <span style="font-size: 14px;">${Number(sensorData.Latitude).toFixed(6)}, ${Number(sensorData.Longitude).toFixed(6)}</span>
          </div>
          <div style="background: #f8f9fa; padding: 10px; border-radius: 6px;">
            <strong style="color: #666; font-size: 12px;">Timestamp</strong><br>
            <span style="font-size: 14px;">${formatDate(sensorData.Timestamp)}</span>
          </div>
          <div style="background: #f8f9fa; padding: 10px; border-radius: 6px;">
            <strong style="color: #666; font-size: 12px;">Moisture</strong><br>
            <span style="font-size: 14px;">${sensorData.Moisture || 'N/A'}</span>
          </div>
          <div style="background: #f8f9fa; padding: 10px; border-radius: 6px;">
            <strong style="color: #666; font-size: 12px;">Temperature</strong><br>
            <span style="font-size: 14px;">${sensorData.Temperature || 'N/A'}</span>
          </div>
        </div>
      </div>
    `;

    sensorPanel.innerHTML = panelContent;
    lucide.createIcons();
  }

  function saveSensorToLocalStorage(sensorId) {
    const savedSensors = JSON.parse(localStorage.getItem('saved_sensors')) || [];
    if (!savedSensors.includes(sensorId)) {
      savedSensors.push(sensorId);
      localStorage.setItem('saved_sensors', JSON.stringify(savedSensors));
      console.log(`Sensor ${sensorId} saved to localStorage`);
    }
  }

  /* ================= DISPLAY ALL TRACKER DATA ================= */
  function displayAllTrackerData(trackerId) {
    if (!trackerId || !trackerAllData[trackerId] || trackerAllData[trackerId].length === 0) {
      console.log(`No data to display for tracker ${trackerId}`);
      return;
    }
    
    console.log(`Displaying ${trackerAllData[trackerId].length} points for tracker ${trackerId}`);
    
    // Get selected parameters for this tracker
    let selectedParams = null;
    if (window.getRealtimeParameters) {
      selectedParams = window.getRealtimeParameters(trackerId);
    }
    
    if (!selectedParams) {
      selectedParams = {
        timestamp: true,
        latitude: true,
        longitude: true,
        altitude: true,
        uin_no: true,
        application: true,
        category: true
      };
    }
    
    // Create array of all points formatted for the table
    const allPointsData = trackerAllData[trackerId].map((point, index) => {
      return {
        'Tracker ID': trackerId,
        'Point #': index + 1,
        'timestamp': point.timestamp || point.time || new Date().toISOString(),
        'latitude': point.latitude || point.lat,
        'longitude': point.longitude || point.lon,
        'altitude': point.altitude || 0,
        'uin_no': point.uin_no || 'N/A',
        'application': point.application || 'Unknown',
        'category': point.category || 'General'
      };
    });
    
    console.log(`Formatted ${allPointsData.length} points for table display`);
    
    // Update the real-time table with ALL points
    if (window.updateRealtimeTableAllPoints && allPointsData && allPointsData.length > 0) {
      console.log('Calling updateRealtimeTableAllPoints');
      window.updateRealtimeTableAllPoints(trackerId, allPointsData, selectedParams);
    } else {
      console.error('updateRealtimeTableAllPoints is not defined or no data to display!');
    }
    
    // Auto-expand the real-time panel
    const realtimePanel = document.getElementById('realtimeTablePanel');
    if (realtimePanel && realtimePanel.classList.contains('minimized')) {
      realtimePanel.classList.remove('minimized');
      const chevron = document.getElementById('realtimeTablePanelChevron');
      if (chevron) chevron.classList.remove('rotated');
      const container = document.getElementById('realtimeTableContainer');
      if (container) container.style.display = 'block';
    }
  }

  /* ================= GROUP FETCH ================= */
  window.fetchGroupTrackers = function (trackerIds, enableRealtime = false) {
    if (!trackerIds?.length) {
      alert('Group empty');
      return;
    }
    
    const visibleTrackers = trackerIds.filter(id => isTrackerVisible(id));
    
    if (visibleTrackers.length === 0) {
      alert('No visible trackers in this group');
      return;
    }
    
    clearMap();
    console.log(`Fetching ${visibleTrackers.length} trackers from group`);
    
    visibleTrackers.forEach((id, i) => {
      setTimeout(() => {
        console.log(`Fetching tracker ${id} (${i + 1}/${visibleTrackers.length})`);
        fetchSingleTracker(id, false, enableRealtime);
      }, i * 800);
    });
  };

  /* ================= PLOT TRACKER PATH ================= */
  function plotTrackerPath(trackerId, points, color) {
    if (!points.length) return;

    if (!isTrackerVisible(trackerId)) {
      console.log(`${trackerId} is hidden, not plotting`);
      return;
    }

    const latlngs = points.map(p => [p.lat, p.lon]);

    // Polyline
    const polyline = L.polyline(latlngs, {
      color: color,
      weight: 4,
      opacity: 0.85
    }).addTo(polylineLayer);

    trackerPolylines[trackerId] = polyline;
    
    if (!window.trajectoryOverlays) {
      window.trajectoryOverlays = {};
    }
    window.trajectoryOverlays[trackerId] = polyline;

    // Markers
    trackerMarkers[trackerId] = [];

    // START marker
    const startMarker = L.marker(latlngs[0], { icon: START_ICON })
      .addTo(markersLayer)
      .bindPopup(createTrackerPopupContent(trackerId, points[0], 'Start Point'));
    trackerMarkers[trackerId].push(startMarker);

    // END marker
    const endMarker = L.marker(latlngs.at(-1), { icon: END_ICON })
      .addTo(markersLayer)
      .bindPopup(createTrackerPopupContent(trackerId, points.at(-1), 'Latest Point'));
    trackerMarkers[trackerId].push(endMarker);

    updateMapBounds();
  }

  function createTrackerPopupContent(trackerId, point, label) {
    let content = `<b>${trackerId}</b><br>${label}<br>`;
    
    if (point.time) {
      content += `Time: ${formatTimestamp(point.time)}<br>`;
    }
    
    if (point.lat !== undefined) {
      content += `Latitude: ${point.lat.toFixed(6)}<br>`;
    }
    if (point.lon !== undefined) {
      content += `Longitude: ${point.lon.toFixed(6)}<br>`;
    }
    
    if (point.altitude !== undefined) {
      content += `Altitude: ${point.altitude}m<br>`;
    }
    if (point.uin_no && point.uin_no !== 'N/A') {
      content += `UIN: ${point.uin_no}<br>`;
    }
    if (point.application && point.application !== 'Unknown') {
      content += `Application: ${point.application}<br>`;
    }
    if (point.category && point.category !== 'General') {
      content += `Category: ${point.category}<br>`;
    }
    
    return content;
  }

  /* ================= VISIBILITY TOGGLE ================= */
  window.toggleTrackerVisibility = function (trackerId, visible) {
    trackerVisibility[trackerId] = visible;
    
    if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
      groupSettings[activeGroup][trackerId].visible = visible;
      localStorage.setItem('groupSettings', JSON.stringify(groupSettings));
    }
    
    if (trackerPolylines[trackerId]) {
      if (visible) {
        polylineLayer.addLayer(trackerPolylines[trackerId]);
      } else {
        polylineLayer.removeLayer(trackerPolylines[trackerId]);
      }
    }

    (trackerMarkers[trackerId] || []).forEach(m => {
      if (visible) {
        markersLayer.addLayer(m);
      } else {
        markersLayer.removeLayer(m);
      }
    });
    
    if (!visible) {
      removeTrackerFromRealtimeUpdates(trackerId);
    }
    
    updateLegend();
    updateMapBounds();
  };

  window.toggleSensorVisibility = function (sensorId, visible) {
    sensorVisibility[sensorId] = visible;
    
    if (sensorMarkers[sensorId]) {
      if (visible) {
        sensorLayer.addLayer(sensorMarkers[sensorId]);
      } else {
        sensorLayer.removeLayer(sensorMarkers[sensorId]);
      }
    }
    
    updateLegend();
    updateMapBounds();
  };

  /* ================= COLOR CHANGE ================= */
  window.changeTrackerColor = function (trackerId, color) {
    trackerColorMap[trackerId] = color;
    
    if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
      groupSettings[activeGroup][trackerId].color = color;
      localStorage.setItem('groupSettings', JSON.stringify(groupSettings));
    }

    if (trackerPolylines[trackerId] && isTrackerVisible(trackerId)) {
      trackerPolylines[trackerId].setStyle({ color: color });
    }

    (trackerMarkers[trackerId] || []).forEach(m => {
      if (m.options.icon && isTrackerVisible(trackerId)) {
        const iconHtml = m.options.icon.options?.html || '';
        if (iconHtml.includes('border-radius:50%')) {
          m.setIcon(createPinIcon(color, 8));
        }
      }
    });

    updateLegend();
  };

  window.changeSensorColor = function (sensorId, color) {
    sensorColorMap[sensorId] = color;
    
    if (sensorMarkers[sensorId]) {
      sensorMarkers[sensorId].setIcon(createSensorIcon(color));
    }
    
    updateLegend();
  };

  /* ================= HELPERS ================= */
  function updateLastUpdatedTime() {
    if (lastUpdatedDiv && lastUpdateTime) {
      lastUpdatedDiv.textContent = `Last updated: ${lastUpdateTime.toLocaleString()}`;
    }
  }

  function showStatus(msg, type) {
    if (!statusMessage) return;
    statusMessage.textContent = msg;
    statusMessage.className = `status-${type}`;
    if (type !== 'loading') setTimeout(() => statusMessage.textContent = '', 4000);
  }

  function formatTimestamp(ts) {
    return new Date(ts).toLocaleString();
  }

  function updateMapBounds() {
    const allVisiblePoints = [];
    
    Object.keys(trackerPolylines).forEach(trackerId => {
      if (isTrackerVisible(trackerId) && trackerPolylines[trackerId]._latlngs) {
        allVisiblePoints.push(...trackerPolylines[trackerId]._latlngs);
      }
    });
    
    Object.keys(sensorMarkers).forEach(sensorId => {
      const marker = sensorMarkers[sensorId];
      if (marker && marker.getLatLng && isSensorVisible(sensorId)) {
        allVisiblePoints.push(marker.getLatLng());
      }
    });
    
    if (allVisiblePoints.length > 0) {
      map.fitBounds(allVisiblePoints, { padding: [40, 40] });
    }
  }

  /* ================= EXPOSE FUNCTIONS TO WINDOW ================= */
  window.setActiveGroup = function(groupName) {
    activeGroup = groupName;
    groupSettings = JSON.parse(localStorage.getItem('groupSettings')) || {};
  };

  window.updateTrackerVisibilityFromGroup = function(trackerId, isVisible) {
    window.toggleTrackerVisibility(trackerId, isVisible);
  };

  window.updateTrackerColorFromGroup = function(trackerId, color) {
    window.changeTrackerColor(trackerId, color);
  };

  window.handleFetch = function(trackerId, enableRealtime = false) {
    fetchSingleTracker(trackerId, true, enableRealtime);
  };

  window.startRealtimeUpdatesForTracker = function(trackerId) {
    addTrackerToRealtimeUpdates(trackerId);
  };

  window.stopRealtimeUpdatesForTracker = function(trackerId) {
    removeTrackerFromRealtimeUpdates(trackerId);
  };

  window.toggleRealtimeUpdatesForTracker = function(trackerId, enable) {
    toggleRealtimeUpdates(trackerId, enable);
  };

  // Sensor functions
  window.plotSensorOnMap = plotSensorOnMap;
  window.updateSensorPanel = updateSensorPanel;
  window.toggleSensorVisibility = toggleSensorVisibility;
  window.changeSensorColor = changeSensorColor;

  // Initialize global objects
  window.trajectoryOverlays = {};
  window.realtimeTableDataAllPoints = {};
  window.sensorTableData = {};

  // Add keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (e.altKey && e.key === 'r') {
      e.preventDefault();
      const realtimeBtn = document.getElementById('openRealtimePopup');
      if (realtimeBtn) realtimeBtn.click();
    }
    
    if (e.altKey && e.key === 'a') {
      e.preventDefault();
      const trackerId = trackerInput.value.trim();
      if (trackerId) {
        const isEnabled = realtimeUpdateConfig.trackers.has(trackerId);
        toggleRealtimeUpdates(trackerId, !isEnabled);
        showStatus(`Real-time updates ${!isEnabled ? 'enabled' : 'disabled'} for ${trackerId}`, 'success');
      }
    }
    
    if (e.altKey && e.key === 's') {
      e.preventDefault();
      const sensorId = sensorInput.value.trim();
      if (sensorId) {
        fetchSensorData(sensorId);
      }
    }
  });

  // Fetch data for saved trackers and sensors on page load
  window.addEventListener('load', function() {
    const savedTrackers = JSON.parse(localStorage.getItem('saved_trackers')) || [];
    const savedSensors = JSON.parse(localStorage.getItem('saved_sensors')) || [];
    
    const autoUpdateEnabled = JSON.parse(localStorage.getItem('auto_update_enabled')) || false;
    const autoUpdateTrackers = JSON.parse(localStorage.getItem('auto_update_trackers')) || [];
    
    if (savedTrackers.length > 0) {
      showStatus(`Loading ${savedTrackers.length} saved trackers...`, 'loading');
      
      setTimeout(() => {
        savedTrackers.forEach((trackerId, index) => {
          setTimeout(() => {
            const enableRealtime = autoUpdateEnabled && autoUpdateTrackers.includes(trackerId);
            fetchSingleTracker(trackerId, index === 0, enableRealtime);
          }, index * 1000);
        });
      }, 1500);
    }
    
    if (savedSensors.length > 0) {
      setTimeout(() => {
        showStatus(`Loading ${savedSensors.length} saved sensors...`, 'loading');
        savedSensors.forEach((sensorId, index) => {
          setTimeout(() => {
            fetchSensorData(sensorId, index === 0);
          }, index * 1500);
        });
      }, 3000);
    }
  });

  // Save auto-update state before page unload
  window.addEventListener('beforeunload', function() {
    localStorage.setItem('auto_update_enabled', JSON.stringify(realtimeUpdateConfig.trackers.size > 0));
    localStorage.setItem('auto_update_trackers', JSON.stringify(Array.from(realtimeUpdateConfig.trackers)));
    stopRealtimeUpdates();
  });
});