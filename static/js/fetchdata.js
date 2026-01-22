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

  function isTrackerVisible(trackerId) {
    if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
      return groupSettings[activeGroup][trackerId].visible;
    }
    
    return trackerVisibility[trackerId] !== false;
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
        <div style="background:${color};width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:10px;">
          S
        </div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
      popupAnchor: [0, -10]
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
    div.style.borderRadius = '8px';
    div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    div.style.fontSize = '13px';
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
    `;

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

    div.innerHTML = html;
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
    if (id) fetchSensorData(id);
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

// Added By Henil Patel
window.fetchSensorData = async function (sensorId) {
  if (!sensorId) return;

  showStatus(`Fetching sensor ${sensorId}...`, "loading");

  try {
    const res = await fetch(
      "https://7jipuwa6t9.execute-api.ap-south-1.amazonaws.com/json/data",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ SensorId: sensorId })
      }
    );

    if (!res.ok) throw new Error("AWS API error");

    const data = await res.json();

    const rows = Array.isArray(data) ? data : [data];

    sensorAllData[sensorId] = rows;

    updateSensorTable(sensorId, rows);
    updateSensorPanel(rows[rows.length - 1]);

    showStatus(`Sensor ${sensorId} loaded`, "success");

  } catch (err) {
    console.error(err);
    showStatus(err.message, "error");
  }
};

// Helper: save sensor ID to local storage
function saveSensorToLocalStorage(sensorId) {
  const STORAGE_KEY = "saved_sensors";
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  if (!saved.includes(sensorId)) {
    saved.push(sensorId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  }
}

  function plotSensorOnMap(sensorData) {
    if (!sensorData || !sensorData.Latitude || !sensorData.Longitude) {
      console.error("Invalid sensor data for plotting:", sensorData);
      return;
    }

    // Remove existing marker if it exists
    if (sensorMarkers[sensorData.SensorId]) {
      sensorLayer.removeLayer(sensorMarkers[sensorData.SensorId]);
    }

    const marker = L.marker([sensorData.Latitude, sensorData.Longitude], {
      icon: createSensorIcon()
    }).bindPopup(createSensorPopupContent(sensorData));

    sensorLayer.addLayer(marker);
    sensorMarkers[sensorData.SensorId] = marker;

    // Fit map to include this sensor
    const bounds = map.getBounds();
    bounds.extend([sensorData.Latitude, sensorData.Longitude]);
    map.fitBounds(bounds, { padding: [50, 50] });

    updateLegend();
  }

  function createSensorPopupContent(sensorData) {
    let content = `<div style="min-width: 250px; max-width: 300px;">`;
    content += `<h4 style="margin: 0 0 10px 0; color: #333; border-bottom: 2px solid #ff5722; padding-bottom: 5px;">Sensor ${sensorData.SensorId || 'N/A'}</h4>`;
    content += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px;">`;
    
    // Add all sensor parameters
    const params = [
      { label: 'Location', value: `${sensorData.Latitude?.toFixed(6) || 'N/A'}, ${sensorData.Longitude?.toFixed(6) || 'N/A'}` },
      { label: 'Moisture', value: sensorData.Moisture || 'N/A' },
      { label: 'Temperature', value: sensorData.Temperature || 'N/A' },
      { label: 'pH Value', value: sensorData.PHValue || 'N/A' },
      { label: 'EC', value: sensorData.EC || 'N/A' },
      { label: 'Nitrogen', value: sensorData.Nitrogen || 'N/A' },
      { label: 'Phosphorous', value: sensorData.Phosphorous || 'N/A' },
      { label: 'Potassium', value: sensorData.Potassium || 'N/A' },
      { label: 'Satellite Fix', value: sensorData.SatelliteFix || 'N/A' },
    ];
    
    params.forEach(param => {
      content += `<div><strong>${param.label}:</strong></div><div>${param.value}</div>`;
    });
    
    content += `</div>`;
    
    // Add Google Maps link if we have coordinates
    if (sensorData.Latitude && sensorData.Longitude) {
      const mapLink = `https://www.google.com/maps?q=${sensorData.Latitude},${sensorData.Longitude}`;
      content += `<hr style="margin: 10px 0;"><a href="${mapLink}" target="_blank" style="color: #2563eb; text-decoration: none; display: block; text-align: center; padding: 5px; background: #f0f0f0; border-radius: 4px;">📍 Open in Google Maps</a>`;
    }
    
    content += `</div>`;
    return content;
  }

  function updateSensorPanel(sensorData) {
    const sensorPanel = document.getElementById('sensorPanelContainer');
    if (!sensorPanel) {
      console.error("Sensor panel container not found!");
      return;
    }

    // Clear previous content
    sensorPanel.innerHTML = '';

    // Create sensor data table
    const table = document.createElement('table');
    table.className = 'sensor-table';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '14px';
    table.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
    table.style.borderRadius = '8px';
    table.style.overflow = 'hidden';

    // Table header
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
        <th style="padding: 12px 15px; text-align: left; border-bottom: 2px solid #ddd;">Parameter</th>
        <th style="padding: 12px 15px; text-align: left; border-bottom: 2px solid #ddd;">Value</th>
      </tr>
    `;
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement('tbody');
    
    const sensorParams = [
      { label: 'Sensor ID', value: sensorData.SensorId || 'N/A' },
      { label: 'Latitude', value: sensorData.Latitude?.toFixed(6) || 'N/A' },
      { label: 'Longitude', value: sensorData.Longitude?.toFixed(6) || 'N/A' },
      { label: 'Moisture', value: sensorData.Moisture || 'N/A' },
      { label: 'Temperature', value: sensorData.Temperature || 'N/A' },
      { label: 'pH Value', value: sensorData.PHValue || 'N/A' },
      { label: 'EC', value: sensorData.EC || 'N/A' },
      { label: 'Nitrogen', value: sensorData.Nitrogen || 'N/A' },
      { label: 'Phosphorous', value: sensorData.Phosphorous || 'N/A' },
      { label: 'Potassium', value: sensorData.Potassium || 'N/A' },
      { label: 'Satellite Fix', value: sensorData.SatelliteFix || 'N/A' }
    ];

    sensorParams.forEach((param, index) => {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid #eee';
      row.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : 'white';
      
      row.innerHTML = `
        <td style="padding: 10px 15px; font-weight: 600; color: #333;">${param.label}</td>
        <td style="padding: 10px 15px; color: #555;">${param.value}</td>
      `;
      
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    sensorPanel.appendChild(table);

    // Add Google Maps link if available
    if (sensorData.Latitude && sensorData.Longitude) {
      const mapLink = `https://www.google.com/maps?q=${sensorData.Latitude},${sensorData.Longitude}`;
      const mapLinkDiv = document.createElement('div');
      mapLinkDiv.style.marginTop = '20px';
      mapLinkDiv.style.textAlign = 'center';
      mapLinkDiv.innerHTML = `
        <a href="${mapLink}" target="_blank" 
           style="display: inline-flex; align-items: center; gap: 10px;
                  background: #4285f4; color: white; padding: 12px 24px;
                  border-radius: 6px; text-decoration: none; font-weight: 500;
                  box-shadow: 0 4px 6px rgba(66, 133, 244, 0.3);
                  transition: all 0.3s ease;">
          <span style="font-size: 18px;">📍</span>
          Open in Google Maps
        </a>
      `;
      sensorPanel.appendChild(mapLinkDiv);
    }

    // Auto-expand sensor panel if minimized
    const sensorPanelElement = document.getElementById('sensorTablePanel');
    if (sensorPanelElement && sensorPanelElement.classList.contains('minimized')) {
      sensorPanelElement.classList.remove('minimized');
      const chevron = document.getElementById('sensorTablePanelChevron');
      if (chevron) chevron.classList.remove('rotated');
    }
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

  /* ================= PLOT ================= */
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

    function createPopupContent(trackerId, point, label) {
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

    // Markers
    trackerMarkers[trackerId] = [];

    // START marker
    const startMarker = L.marker(latlngs[0], { icon: START_ICON })
      .addTo(markersLayer)
      .bindPopup(createPopupContent(trackerId, points[0], 'Start Point'));
    trackerMarkers[trackerId].push(startMarker);

    // END marker
    const endMarker = L.marker(latlngs.at(-1), { icon: END_ICON })
      .addTo(markersLayer)
      .bindPopup(createPopupContent(trackerId, points.at(-1), 'Latest Point'));
    trackerMarkers[trackerId].push(endMarker);

    updateMapBounds();
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
          m.setIcon(createDotIcon(color, 8));
        }
      }
    });

    updateLegend();
  };

  /* ================= HELPERS ================= */
  function clearMap() {
    markersLayer.clearLayers();
    polylineLayer.clearLayers();
    sensorLayer.clearLayers();
    
    Object.keys(trackerPolylines).forEach(k => delete trackerPolylines[k]);
    Object.keys(trackerMarkers).forEach(k => delete trackerMarkers[k]);
    Object.keys(trackerAllData).forEach(k => delete trackerAllData[k]);
    Object.keys(sensorMarkers).forEach(k => delete sensorMarkers[k]);
    Object.keys(sensorAllData).forEach(k => delete sensorAllData[k]);
    
    updateLegend();
    
    realtimeUpdateConfig.trackers.clear();
    stopRealtimeUpdates();
    
    if (imagesGrid) {
      imagesGrid.innerHTML = '';
    }

    // Added BY Henil

    /* ================= SENSOR TABLE ================= */
window.updateSensorTable = function (sensorId, rows) {
  const tbody = document.getElementById("sensorDataTableBody");
  if (!tbody) {
    console.error("❌ sensorDataTableBody not found");
    return;
  }

  tbody.innerHTML = "";

  rows.forEach(row => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${row.SensorId || "-"}</td>
      <td>${row.Timestamp || "-"}</td>
      <td>${row.Latitude ?? "-"}</td>
      <td>${row.Longitude ?? "-"}</td>
      <td>${row.Moisture ?? "-"}</td>
      <td>${row.Temperature ?? "-"}</td>
      <td>${row.EC ?? "-"}</td>
      <td>${row.PHValue ?? "-"}</td>
      <td>${row.Nitrogen ?? "-"}</td>
      <td>${row.Phosphorous ?? "-"}</td>
      <td>${row.Potassium ?? "-"}</td>
      <td>${row.SatelliteFix ?? "-"}</td>
    `;

    tbody.appendChild(tr);
  });
};

    
    // Clear real-time table data
    if (window.realtimeTableDataAllPoints) {
      window.realtimeTableDataAllPoints = {};
    }
    
    // Clear sensor panel
    const sensorPanel = document.getElementById('sensorPanelContainer');
    if (sensorPanel) {
      sensorPanel.innerHTML = '';
    }
    
    // Only call updateRealtimeTableWithAllPoints if it exists
    if (typeof updateRealtimeTableWithAllPoints === 'function') {
      updateRealtimeTableWithAllPoints();
    }
  }

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
      if (marker && marker.getLatLng) {
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
  // window.fetchSensorData = fetchSensorData;
  window.plotSensorOnMap = plotSensorOnMap;
  window.updateSensorPanel = updateSensorPanel;

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
            fetchSensorData(sensorId);
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