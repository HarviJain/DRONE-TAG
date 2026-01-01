
document.addEventListener('DOMContentLoaded', function () {

  /* ================= DOM ================= */
  const fetchBtn = document.getElementById('fetch-btn');
  const trackerInput = document.getElementById('tracker-id');
  const statusMessage = document.getElementById('status-message');
  const lastUpdatedDiv = document.querySelector('.last-updated');

  /* ================= MAP ================= */
  const map = L.map('map').setView([23.0225, 72.5714], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  const markersLayer = L.layerGroup().addTo(map);
  const polylineLayer = L.layerGroup().addTo(map);

  let lastUpdateTime = null;
  let activeGroup = null;

  /* ================= TRACKER STATE ================= */
  const trackerPolylines = {};
  const trackerMarkers = {};
  const trackerColorMap = {};
  const trackerVisibility = {};

  const COLORS = ['#2563eb', '#eab308', '#9333ea', '#ea580c', '#0891b2', '#4f46e5'];
  let colorIndex = 0;

  // Group settings from localStorage
  let groupSettings = JSON.parse(localStorage.getItem('groupSettings')) || {};

  function getTrackerColor(trackerId) {
    // First check group settings
    if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
      return groupSettings[activeGroup][trackerId].color;
    }
    
    // Then check existing color map
    if (trackerColorMap[trackerId]) {
      return trackerColorMap[trackerId];
    }
    
    // Otherwise assign new color
    const color = COLORS[colorIndex++ % COLORS.length];
    trackerColorMap[trackerId] = color;
    updateLegend();
    return color;
  }

  function isTrackerVisible(trackerId) {
    // Check group settings first
    if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
      return groupSettings[activeGroup][trackerId].visible;
    }
    
    // Default to visible
    return trackerVisibility[trackerId] !== false;
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

  function createDotIcon(color, size = 8) {
    return L.divIcon({
      className: '',
      html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
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
      <span style="font-weight:600;">Start</span>
    </div>

    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
      ${pin('red')}
      <span style="font-weight:600;">End</span>
    </div>

    <hr style="margin:6px 0">
  `;

  Object.entries(trackerColorMap).forEach(([id, color]) => {
    if (isTrackerVisible(id)) {
      html += `
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="color:${color};font-size:14px;">●</span>
          ${id}
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

  /* ================= FETCH SINGLE ================= */
  async function fetchSingleTracker(trackerId, clearBefore = false) {
    if (!trackerId) return;

    if (clearBefore) clearMap();

    const color = getTrackerColor(trackerId);
    trackerVisibility[trackerId] = true;
    showStatus(`Fetching ${trackerId}...`, 'loading');

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
      const points = (data.points || []).map(p => ({
        lat: +p.lat,
        lon: +p.lon,
        time: p.timestamp
      }));

      plotTrackerPath(trackerId, points, color);

      lastUpdateTime = new Date();
      updateLastUpdatedTime();
      showStatus(`Loaded ${trackerId}`, 'success');

    } catch (err) {
      showStatus(`${trackerId}: ${err.message}`, 'error');
    }
  }

  /* ================= GROUP FETCH ================= */
  window.fetchGroupTrackers = function (trackerIds) {
    if (!trackerIds?.length) return alert('Group empty');
    
    // Filter by visibility
    const visibleTrackers = trackerIds.filter(id => isTrackerVisible(id));
    
    if (visibleTrackers.length === 0) {
      alert('No visible trackers in this group');
      return;
    }
    
    clearMap();
    visibleTrackers.forEach((id, i) => {
      setTimeout(() => fetchSingleTracker(id, false), i * 400);
    });
  };

  /* ================= PLOT ================= */
  function plotTrackerPath(trackerId, points, color) {
    if (!points.length) return;

    // Skip if tracker is hidden
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
    
    // Store in global window object for access from group detail popup
    if (!window.trajectoryOverlays) {
      window.trajectoryOverlays = {};
    }
    window.trajectoryOverlays[trackerId] = polyline;

    // Markers
    trackerMarkers[trackerId] = [];

    // START marker
    const startMarker = L.marker(latlngs[0], { icon: START_ICON })
      .addTo(markersLayer)
      .bindPopup(`<b>${trackerId}</b><br>Start<br>${formatTimestamp(points[0].time)}`);
    trackerMarkers[trackerId].push(startMarker);

    // END marker
    const endMarker = L.marker(latlngs.at(-1), { icon: END_ICON })
      .addTo(markersLayer)
      .bindPopup(`<b>${trackerId}</b><br>End<br>${formatTimestamp(points.at(-1).time)}`);
    trackerMarkers[trackerId].push(endMarker);

    // MIDDLE POINTS
    points.slice(1, -1).forEach(p => {
      const dotMarker = L.marker([p.lat, p.lon], {
        icon: createDotIcon(color, 8)
      }).addTo(markersLayer);
      trackerMarkers[trackerId].push(dotMarker);
    });

    // Fit bounds to all visible trackers
    updateMapBounds();
  }

  /* ================= VISIBILITY TOGGLE ================= */
  window.toggleTrackerVisibility = function (trackerId, visible) {
    // Update local visibility state
    trackerVisibility[trackerId] = visible;
    
    // Update group settings
    if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
      groupSettings[activeGroup][trackerId].visible = visible;
      localStorage.setItem('groupSettings', JSON.stringify(groupSettings));
    }
    
    // Update polyline visibility
    if (trackerPolylines[trackerId]) {
      if (visible) {
        polylineLayer.addLayer(trackerPolylines[trackerId]);
      } else {
        polylineLayer.removeLayer(trackerPolylines[trackerId]);
      }
    }

    // Update markers visibility
    (trackerMarkers[trackerId] || []).forEach(m => {
      if (visible) {
        markersLayer.addLayer(m);
      } else {
        markersLayer.removeLayer(m);
      }
    });
    
    updateLegend();
    updateMapBounds();
  };

  /* ================= COLOR CHANGE ================= */
  window.changeTrackerColor = function (trackerId, color) {
    // Update color in map
    trackerColorMap[trackerId] = color;
    
    // Update group settings
    if (activeGroup && groupSettings[activeGroup] && groupSettings[activeGroup][trackerId]) {
      groupSettings[activeGroup][trackerId].color = color;
      localStorage.setItem('groupSettings', JSON.stringify(groupSettings));
    }

    // Update polyline color if visible
    if (trackerPolylines[trackerId] && isTrackerVisible(trackerId)) {
      trackerPolylines[trackerId].setStyle({ color: color });
    }

    // Update marker colors if visible (excluding start/end markers)
    (trackerMarkers[trackerId] || []).forEach(m => {
      if (m.options.icon && isTrackerVisible(trackerId)) {
        // Check if it's a dot marker (not start/end)
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
    Object.keys(trackerPolylines).forEach(k => delete trackerPolylines[k]);
    Object.keys(trackerMarkers).forEach(k => delete trackerMarkers[k]);
    updateLegend();
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
    
    if (allVisiblePoints.length > 0) {
      map.fitBounds(allVisiblePoints, { padding: [40, 40] });
    }
  }

  /* ================= EXPOSE FUNCTIONS TO WINDOW ================= */
  // These functions will be called from group detail popup
  window.setActiveGroup = function(groupName) {
    activeGroup = groupName;
  };

  window.updateTrackerVisibilityFromGroup = function(trackerId, isVisible) {
    window.toggleTrackerVisibility(trackerId, isVisible);
  };

  window.updateTrackerColorFromGroup = function(trackerId, color) {
    window.changeTrackerColor(trackerId, color);
  };

  window.handleFetch = function(trackerId) {
    fetchSingleTracker(trackerId, true);
  };

  // Initialize global trajectoryOverlays object
  window.trajectoryOverlays = {};

});