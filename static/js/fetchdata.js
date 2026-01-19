


// document.addEventListener('DOMContentLoaded', function () {
//   console.log('fetchdata.js loaded');
  
//   /* ================= DOM ================= */
//   const fetchBtn = document.getElementById('fetch-btn');
//   const trackerInput = document.getElementById('tracker-id');
//   const sensorInput = document.getElementById('sensor-id');
//   const statusMessage = document.getElementById('status-message');
//   const lastUpdatedDiv = document.querySelector('.last-updated');
//   const imagesGrid = document.getElementById('images-grid');

//   /* ================= MAP ================= */
//   const map = L.map('map').setView([23.0225, 72.5714], 13);

//   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     maxZoom: 19
//   }).addTo(map);

//   const markersLayer = L.layerGroup().addTo(map);
//   const polylineLayer = L.layerGroup().addTo(map);

//   let lastUpdateTime = null;
//   let activeGroup = null;

//   /* ================= TRACKER STATE ================= */
//   const trackerPolylines = {};
//   const trackerMarkers = {};
//   const trackerColorMap = {};
//   const trackerVisibility = {};
//   const trackerAllData = {};

//   const COLORS = ['#2563eb', '#eab308', '#9333ea', '#ea580c', '#0891b2', '#4f46e5'];
//   let colorIndex = 0;

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

//   function createDotIcon(color, size = 8) {
//     return L.divIcon({
//       className: '',
//       html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;"></div>`,
//       iconSize: [size, size],
//       iconAnchor: [size / 2, size / 2]
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
//         <span style="font-weight:600;">Start</span>
//       </div>
//       <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
//         ${pin('red')}
//         <span style="font-weight:600;">End</span>
//       </div>
//       <hr style="margin:6px 0">
//     `;

//     Object.entries(trackerColorMap).forEach(([id, color]) => {
//       if (isTrackerVisible(id)) {
//         html += `
//           <div style="display:flex;align-items:center;gap:6px;">
//             <span style="color:${color};font-size:14px;">●</span>
//             ${id}
//           </div>
//         `;
//       }
//     });

//     div.innerHTML = html;
//   }

//   /* ================= FETCH SINGLE TRACKER (ALL HISTORICAL DATA) ================= */
//   window.fetchSingleTrackerAllData = async function(trackerId, clearBefore = false) {
//     console.log('fetchSingleTrackerAllData called for:', trackerId);
    
//     if (!trackerId) return;

//     if (clearBefore) {
//       clearMap();
//     }

//     const color = getTrackerColor(trackerId);
//     trackerVisibility[trackerId] = true;
//     showStatus(`Fetching ALL historical data for tracker ${trackerId}...`, 'loading');

//     try {
//       console.log(`Calling /api/trajectory/all for ${trackerId}`);
      
//       const res = await fetch('/api/trajectory/all', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           tracker_id: trackerId
//         })
//       });

//       console.log(`Response status: ${res.status}`);
      
//       if (!res.ok) {
//         const errorText = await res.text();
//         console.error(`API error: ${res.status}`, errorText);
//         throw new Error(`Server error: ${res.status}`);
//       }

//       const data = await res.json();
//       console.log(`API response received for ${trackerId}:`, {
//         tracker_id: data.tracker_id,
//         total_points: data.total_points,
//         points_length: data.points ? data.points.length : 0
//       });
      
//       let points = [];
//       if (data.points && Array.isArray(data.points)) {
//         console.log(`Processing ${data.points.length} points for ${trackerId}`);
//         points = data.points.map(p => ({
//           lat: +p.lat,
//           lon: +p.lon,
//           time: p.timestamp,
//           timestamp: p.timestamp,
//           latitude: +p.lat,
//           longitude: +p.lon,
//           altitude: p.altitude || 0,
//           uin_no: p.uin_no || 'N/A',
//           application: p.application || 'Unknown',
//           category: p.category || 'General',
//           speed: p.speed || 0,
//           heading: p.heading || 0,
//           battery: p.battery || 'N/A',
//           signal_strength: p.signal_strength || 'N/A'
//         }));
//         console.log(`Successfully processed ${points.length} points`);
//       } else {
//         console.warn(`No points array in response for ${trackerId}`, data);
//       }

//       if (points.length === 0) {
//         console.warn(`No data points found for ${trackerId}`);
//         showStatus(`No data found for tracker ${trackerId}`, 'error');
//         return;
//       }

//       plotTrackerPath(trackerId, points, color);
//       displayAllTrackerDataInTable(trackerId, points);

//       lastUpdateTime = new Date();
//       updateLastUpdatedTime();
//       showStatus(`Loaded ${points.length} data points for tracker ${trackerId}`, 'success');
//       console.log(`Successfully loaded ${points.length} points for ${trackerId}`);

//     } catch (err) {
//       console.error(`Error fetching data for ${trackerId}:`, err);
//       showStatus(`${trackerId}: ${err.message}`, 'error');
      
//       try {
//         console.log(`Trying fallback endpoint for ${trackerId}`);
//         const fallbackRes = await fetch('/api/trajectory', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             tracker_id: trackerId,
//             interval_seconds: 0,
//             max_gap_seconds: 86400
//           })
//         });
        
//         if (fallbackRes.ok) {
//           const fallbackData = await fallbackRes.json();
//           console.log(`Fallback response for ${trackerId}:`, {
//             points_length: fallbackData.points ? fallbackData.points.length : 0
//           });
          
//           let points = [];
//           if (fallbackData.points && Array.isArray(fallbackData.points)) {
//             points = fallbackData.points.map(p => ({
//               lat: +p.lat,
//               lon: +p.lon,
//               time: p.timestamp,
//               timestamp: p.timestamp,
//               latitude: +p.lat,
//               longitude: +p.lon,
//               altitude: p.altitude || 0,
//               uin_no: p.uin_no || 'N/A',
//               application: p.application || 'Unknown',
//               category: p.category || 'General'
//             }));
//           }
          
//           if (points.length > 0) {
//             plotTrackerPath(trackerId, points, color);
//             displayAllTrackerDataInTable(trackerId, points);
//             lastUpdateTime = new Date();
//             updateLastUpdatedTime();
//             showStatus(`Loaded ${points.length} data points for tracker ${trackerId} (using fallback)`, 'success');
//           }
//         }
//       } catch (fallbackErr) {
//         console.error(`Fallback failed for ${trackerId}:`, fallbackErr);
//       }
//     }
//   };

//   /* ================= PLOT ALL POINTS ================= */
//   function plotTrackerPath(trackerId, points, color) {
//     if (!points.length) return;

//     if (!isTrackerVisible(trackerId)) {
//       console.log(`${trackerId} is hidden, not plotting`);
//       return;
//     }

//     const latlngs = points.map(p => [p.lat, p.lon]);

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

//     const selectedParams = window.getRealtimeParameters ? window.getRealtimeParameters(trackerId) : {};

//     function createPopupContent(trackerId, point, label) {
//       let content = `<b>${trackerId}</b><br>${label}<br>`;
      
//       if (point.time) {
//         content += `Time: ${formatTimestamp(point.time)}<br>`;
//       }
      
//       if (selectedParams.latitude && point.lat !== undefined) {
//         content += `Latitude: ${point.lat.toFixed(6)}<br>`;
//       }
//       if (selectedParams.longitude && point.lon !== undefined) {
//         content += `Longitude: ${point.lon.toFixed(6)}<br>`;
//       }
      
//       if (selectedParams.altitude && point.altitude !== undefined) {
//         content += `Altitude: ${point.altitude}m<br>`;
//       }
//       if (selectedParams.uin_no && point.uin_no && point.uin_no !== 'N/A') {
//         content += `UIN: ${point.uin_no}<br>`;
//       }
//       if (selectedParams.application && point.application && point.application !== 'Unknown') {
//         content += `Application: ${point.application}<br>`;
//       }
//       if (selectedParams.category && point.category && point.category !== 'General') {
//         content += `Category: ${point.category}<br>`;
//       }
      
//       return content;
//     }

//     trackerMarkers[trackerId] = [];

//     const startMarker = L.marker(latlngs[0], { icon: START_ICON })
//       .addTo(markersLayer)
//       .bindPopup(createPopupContent(trackerId, points[0], 'Start Point'));
//     trackerMarkers[trackerId].push(startMarker);

//     const endMarker = L.marker(latlngs.at(-1), { icon: END_ICON })
//       .addTo(markersLayer)
//       .bindPopup(createPopupContent(trackerId, points.at(-1), 'End Point'));
//     trackerMarkers[trackerId].push(endMarker);

//     const maxMarkers = 20;
//     const interval = Math.max(1, Math.floor(points.length / maxMarkers));
    
//     points.forEach((p, idx) => {
//       if (idx > 0 && idx < points.length - 1 && idx % interval === 0) {
//         const dotMarker = L.marker([p.lat, p.lon], {
//           icon: createDotIcon(color, 8)
//         })
//         .addTo(markersLayer)
//         .bindPopup(createPopupContent(trackerId, p, `Point ${idx+1}/${points.length}`));
        
//         trackerMarkers[trackerId].push(dotMarker);
//       }
//     });

//     updateMapBounds();
//   }

//   /* ================= DISPLAY ALL TRACKER DATA IN TABLE ================= */
//   function displayAllTrackerDataInTable(trackerId, points) {
//     if (!points || points.length === 0) return;
    
//     const selectedParams = window.getRealtimeParameters ? window.getRealtimeParameters(trackerId) : null;
    
//     if (!selectedParams) {
//       const defaultParams = {
//         timestamp: true,
//         latitude: true,
//         longitude: true,
//         altitude: true,
//         uin_no: true,
//         application: true,
//         category: true,
//         speed: true,
//         heading: true,
//         battery: true,
//         signal_strength: true
//       };
//       updateRealtimeTableWithAllData(trackerId, points, defaultParams);
//       return;
//     }
    
//     updateRealtimeTableWithAllData(trackerId, points, selectedParams);
//   }

//   /* ================= UPDATE REALTIME TABLE WITH ALL DATA ================= */
//   function updateRealtimeTableWithAllData(trackerId, points, selectedParams) {
//     const formattedDataArray = points.map(point => {
//       const formattedData = {
//         'Tracker ID': trackerId,
//         'timestamp': point.timestamp || point.time || new Date().toISOString(),
//         'latitude': point.latitude || point.lat,
//         'longitude': point.longitude || point.lon,
//         'altitude': point.altitude || 0,
//         'uin_no': point.uin_no || 'N/A',
//         'application': point.application || 'Unknown',
//         'category': point.category || 'General',
//         'speed': point.speed || 0,
//         'heading': point.heading || 0,
//         'battery': point.battery || 'N/A',
//         'signal_strength': point.signal_strength || 'N/A'
//       };
      
//       const filteredData = {};
//       Object.keys(formattedData).forEach(key => {
//         if (key === 'Tracker ID' || (selectedParams[key] && selectedParams[key] !== false)) {
//           filteredData[key] = formattedData[key];
//         }
//       });
      
//       return filteredData;
//     });
    
//     if (window.updateRealtimeTableWithMultipleEntries) {
//       window.updateRealtimeTableWithMultipleEntries(trackerId, formattedDataArray);
//     }
    
//     if (!window.realtimeTableData) {
//       window.realtimeTableData = {};
//     }
//     window.realtimeTableData[trackerId] = formattedDataArray;
    
//     const realtimePanel = document.getElementById('realtimeTablePanel');
//     if (realtimePanel && realtimePanel.classList.contains('minimized')) {
//       realtimePanel.classList.remove('minimized');
//       const chevron = document.getElementById('realtimeTablePanelChevron');
//       if (chevron) chevron.classList.remove('rotated');
//       const container = document.getElementById('realtimeTableContainer');
//       if (container) container.style.display = 'block';
//     }
//   }

//   /* ================= DIRECT TABLE UPDATE ================= */
//   window.updateRealtimeTableWithMultipleEntries = function(trackerId, dataArray) {
//     console.log('Updating table for tracker:', trackerId, 'with', dataArray.length, 'entries');
    
//     if (!window.realtimeTableData) {
//       window.realtimeTableData = {};
//     }
    
//     window.realtimeTableData[trackerId] = dataArray;
    
//     updateTrackerTableDirectly();
//   };

//   function updateTrackerTableDirectly() {
//     console.log('updateTrackerTableDirectly called');
    
//     // Get table elements - FIXED: Using correct IDs
//     const tbody = document.getElementById('realtimeDataTableBody');
//     const thead = document.getElementById('realtimeDataTableHeader');
    
//     if (!tbody || !thead) {
//       console.error('Table elements not found!');
//       console.log('Available elements:');
//       console.log('tbody:', document.getElementById('realtimeDataTableBody'));
//       console.log('thead:', document.getElementById('realtimeDataTableHeader'));
//       console.log('table:', document.getElementById('realtimeDataTable'));
//       return;
//     }
    
//     const allData = [];
//     Object.keys(window.realtimeTableData || {}).forEach(trackerId => {
//       const trackerData = window.realtimeTableData[trackerId];
//       if (Array.isArray(trackerData)) {
//         trackerData.forEach(entry => {
//           allData.push({...entry, 'Tracker ID': trackerId});
//         });
//       }
//     });
    
//     console.log('Total data entries:', allData.length);
    
//     if (allData.length === 0) {
//       tbody.innerHTML = `
//         <tr class="no-data-row">
//           <td colspan="8">No tracker data available. Fetch a tracker first.</td>
//         </tr>
//       `;
//       return;
//     }
    
//     const allHeaders = new Set(['Tracker ID', 'timestamp', 'latitude', 'longitude', 'altitude', 'uin_no', 'application', 'category']);
//     allData.forEach(entry => {
//       Object.keys(entry).forEach(key => {
//         allHeaders.add(key);
//       });
//     });
    
//     const headers = Array.from(allHeaders);
    
//     const headerRow = thead.querySelector('tr');
//     if (headerRow) {
//       headerRow.innerHTML = '';
      
//       headers.forEach(header => {
//         const th = document.createElement('th');
//         th.textContent = formatHeaderText(header);
//         headerRow.appendChild(th);
//       });
//     }
    
//     tbody.innerHTML = '';
    
//     allData.sort((a, b) => {
//       const timeA = a.timestamp || a.time || '';
//       const timeB = b.timestamp || b.time || '';
//       return new Date(timeB) - new Date(timeA);
//     });
    
//     allData.forEach(entry => {
//       const row = document.createElement('tr');
      
//       headers.forEach(header => {
//         const td = document.createElement('td');
        
//         let value = entry[header];
//         if (value === undefined || value === null) {
//           value = '-';
//           td.style.color = '#9ca3af';
//         } else {
//           if (header === 'timestamp' || header === 'time') {
//             if (value && value !== '-') {
//               try {
//                 value = new Date(value).toLocaleString();
//               } catch (e) {}
//             }
//           } else if ((header === 'latitude' || header === 'longitude') && value && value !== '-') {
//             value = parseFloat(value).toFixed(6);
//           } else if (header === 'altitude' && value && value !== '-') {
//             value = `${parseFloat(value).toFixed(1)} m`;
//           } else if (header === 'speed' && value && value !== '-') {
//             value = `${parseFloat(value).toFixed(1)} km/h`;
//           } else if (header === 'heading' && value && value !== '-') {
//             value = `${parseFloat(value).toFixed(0)}°`;
//           }
//         }
        
//         td.textContent = value;
        
//         if (header === 'Tracker ID') {
//           td.className = 'tracker-id-cell';
//           td.style.fontWeight = '600';
//           td.style.color = '#6366f1';
//         }
        
//         row.appendChild(td);
//       });
      
//       tbody.appendChild(row);
//     });
    
//     const summaryRow = document.createElement('tr');
//     summaryRow.style.backgroundColor = '#f8fafc';
//     const summaryCell = document.createElement('td');
//     summaryCell.colSpan = headers.length;
//     summaryCell.style.textAlign = 'center';
//     summaryCell.style.padding = '10px';
//     summaryCell.style.fontStyle = 'italic';
//     summaryCell.style.color = '#6b7280';
//     summaryCell.textContent = `Showing ${allData.length} total entries`;
//     summaryRow.appendChild(summaryCell);
//     tbody.appendChild(summaryRow);
    
//     const realtimePanel = document.getElementById('realtimeTablePanel');
//     if (realtimePanel && realtimePanel.classList.contains('minimized')) {
//       console.log('Auto-expanding panel');
//       realtimePanel.classList.remove('minimized');
//       const chevron = document.getElementById('realtimeTablePanelChevron');
//       if (chevron) chevron.classList.remove('rotated');
//       const container = document.getElementById('realtimeTableContainer');
//       if (container) container.style.display = 'block';
//     }
    
//     console.log('Table updated successfully with', allData.length, 'entries');
//   }

//   function formatHeaderText(header) {
//     const formatMap = {
//       'timestamp': 'Timestamp',
//       'time': 'Time',
//       'latitude': 'Latitude',
//       'longitude': 'Longitude',
//       'altitude': 'Altitude',
//       'uin_no': 'UIN No',
//       'application': 'Application',
//       'category': 'Category',
//       'speed': 'Speed',
//       'heading': 'Heading',
//       'battery': 'Battery',
//       'signal_strength': 'Signal Strength',
//       'Tracker ID': 'Tracker ID'
//     };
//     return formatMap[header] || header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
//   }

//   window.updateRealtimeTable = function(trackerId, data) {
//     if (trackerId && data) {
//       if (!Array.isArray(data)) {
//         data = [data];
//       }
//       window.updateRealtimeTableWithMultipleEntries(trackerId, data);
//     } else {
//       updateTrackerTableDirectly();
//     }
//   };

//   /* ================= GROUP FETCH ================= */
//   window.fetchGroupTrackers = function (trackerIds) {
//     if (!trackerIds?.length) return alert('Group empty');
    
//     const visibleTrackers = trackerIds.filter(id => isTrackerVisible(id));
    
//     if (visibleTrackers.length === 0) {
//       alert('No visible trackers in this group');
//       return;
//     }
    
//     clearMap();
    
//     if (window.realtimeTableData) {
//       window.realtimeTableData = {};
//     }
//     if (window.updateRealtimeTable) {
//       window.updateRealtimeTable();
//     }
    
//     const promises = visibleTrackers.map((id, i) => {
//       return new Promise(resolve => {
//         setTimeout(async () => {
//           try {
//             await window.fetchSingleTrackerAllData(id, false);
//           } catch (err) {
//             console.error(`Failed to fetch tracker ${id}:`, err);
//           }
//           resolve();
//         }, i * 500);
//       });
//     });
    
//     Promise.all(promises).then(() => {
//       showStatus(`Loaded all trackers for group`, 'success');
//     });
//   };

//   /* ================= FETCH SENSOR DATA ================= */
//   window.fetchSensorData = async function(sensorId) {
//     if (!sensorId) return;
    
//     showStatus(`Fetching sensor data for ${sensorId}...`, 'loading');
    
//     try {
//       const res = await fetch('/api/sensor', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ sensor_id: sensorId })
//       });
      
//       if (!res.ok) throw new Error('Sensor fetch failed');
      
//       const data = await res.json();
      
//       if (data.error) {
//         showStatus(`Sensor ${sensorId}: ${data.error}`, 'error');
//         return;
//       }
      
//       if (window.updateSensorTable) {
//         window.updateSensorTable(sensorId, data);
//       }
      
//       showStatus(`Sensor ${sensorId} data loaded`, 'success');
//     } catch (err) {
//       showStatus(`Sensor error: ${err.message}`, 'error');
//     }
//   };

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

//   /* ================= HELPERS ================= */
//   function clearMap() {
//     markersLayer.clearLayers();
//     polylineLayer.clearLayers();
//     Object.keys(trackerPolylines).forEach(k => delete trackerPolylines[k]);
//     Object.keys(trackerMarkers).forEach(k => delete trackerMarkers[k]);
//     Object.keys(trackerAllData).forEach(k => delete trackerAllData[k]);
//     updateLegend();
    
//     if (imagesGrid) {
//       imagesGrid.innerHTML = '';
//     }
//   }

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

//   window.handleFetch = function(trackerId) {
//     window.fetchSingleTrackerAllData(trackerId, true);
//   };

//   // Initialize global objects
//   window.trajectoryOverlays = {};
//   window.realtimeTableData = {};
//   window.sensorTableData = {};

//   // Fetch data for saved trackers on page load
//   window.addEventListener('load', function() {
//     const savedTrackers = JSON.parse(localStorage.getItem('saved_trackers')) || [];
//     const savedSensors = JSON.parse(localStorage.getItem('saved_sensors')) || [];
    
//     console.log('Page loaded, saved trackers:', savedTrackers);
//     console.log('Page loaded, saved sensors:', savedSensors);
    
//     if (savedTrackers.length > 0) {
//       showStatus(`Loading ${savedTrackers.length} saved trackers...`, 'loading');
      
//       // Load first tracker immediately
//       setTimeout(() => {
//         if (savedTrackers[0]) {
//           window.fetchSingleTrackerAllData(savedTrackers[0], true);
//         }
        
//         // Load remaining trackers with delay
//         savedTrackers.slice(1).forEach((trackerId, index) => {
//           setTimeout(() => {
//             window.fetchSingleTrackerAllData(trackerId, false);
//           }, (index + 1) * 1000);
//         });
//       }, 1000);
//     }
    
//     if (savedSensors.length > 0) {
//       setTimeout(() => {
//         savedSensors.forEach((sensorId, index) => {
//           setTimeout(() => {
//             if (window.fetchSensorData) {
//               window.fetchSensorData(sensorId);
//             }
//           }, index * 1000);
//         });
//       }, 2000);
//     }
    
//     // Initialize table
//     updateTrackerTableDirectly();
//   });
  
//   // Initialize fetch button
//   if (fetchBtn) {
//     fetchBtn.addEventListener('click', () => {
//       const id = trackerInput.value.trim();
//       if (id) window.fetchSingleTrackerAllData(id, true);
//     });
//   }
  
//   console.log('fetchdata.js initialization complete');
// });









// document.addEventListener('DOMContentLoaded', function () {
//   console.log('fetchdata.js loaded');
  
//   /* ================= DOM ================= */
//   const fetchBtn = document.getElementById('fetch-btn');
//   const trackerInput = document.getElementById('tracker-id');
//   const sensorInput = document.getElementById('sensor-id');
//   const statusMessage = document.getElementById('status-message');
//   const lastUpdatedDiv = document.querySelector('.last-updated');
//   const imagesGrid = document.getElementById('images-grid');

//   /* ================= MAP ================= */
//   const map = L.map('map').setView([23.0225, 72.5714], 13);

//   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     maxZoom: 19
//   }).addTo(map);

//   const markersLayer = L.layerGroup().addTo(map);
//   const polylineLayer = L.layerGroup().addTo(map);

//   let lastUpdateTime = null;
//   let activeGroup = null;

//   /* ================= TRACKER STATE ================= */
//   const trackerPolylines = {};
//   const trackerMarkers = {};
//   const trackerColorMap = {};
//   const trackerVisibility = {};
//   const trackerAllData = {};

//   const COLORS = ['#2563eb', '#eab308', '#9333ea', '#ea580c', '#0891b2', '#4f46e5'];
//   let colorIndex = 0;

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

//   function createDotIcon(color, size = 8) {
//     return L.divIcon({
//       className: '',
//       html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;"></div>`,
//       iconSize: [size, size],
//       iconAnchor: [size / 2, size / 2]
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
//         <span style="font-weight:600;">Start</span>
//       </div>
//       <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
//         ${pin('red')}
//         <span style="font-weight:600;">End</span>
//       </div>
//       <hr style="margin:6px 0">
//     `;

//     Object.entries(trackerColorMap).forEach(([id, color]) => {
//       if (isTrackerVisible(id)) {
//         html += `
//           <div style="display:flex;align-items:center;gap:6px;">
//             <span style="color:${color};font-size:14px;">●</span>
//             ${id}
//           </div>
//         `;
//       }
//     });

//     div.innerHTML = html;
//   }

//   /* ================= FETCH SINGLE TRACKER (ALL HISTORICAL DATA) ================= */
//   window.fetchSingleTrackerAllData = async function(trackerId, clearBefore = false) {
//     console.log('fetchSingleTrackerAllData called for:', trackerId);
    
//     if (!trackerId) return;

//     if (clearBefore) {
//       clearMap();
//     }

//     const color = getTrackerColor(trackerId);
//     trackerVisibility[trackerId] = true;
//     showStatus(`Fetching ALL historical data for tracker ${trackerId}...`, 'loading');

//     try {
//       console.log(`Calling /api/trajectory/all for ${trackerId}`);
      
//       const res = await fetch('/api/trajectory/all', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           tracker_id: trackerId
//         })
//       });

//       console.log(`Response status: ${res.status}`);
      
//       if (!res.ok) {
//         const errorText = await res.text();
//         console.error(`API error: ${res.status}`, errorText);
//         throw new Error(`Server error: ${res.status}`);
//       }

//       const data = await res.json();
//       console.log(`API response received for ${trackerId}:`, {
//         tracker_id: data.tracker_id,
//         total_points: data.total_points,
//         points_length: data.points ? data.points.length : 0
//       });
      
//       let points = [];
//       if (data.points && Array.isArray(data.points)) {
//         console.log(`Processing ${data.points.length} points for ${trackerId}`);
//         points = data.points.map(p => ({
//           lat: +p.lat,
//           lon: +p.lon,
//           time: p.timestamp,
//           timestamp: p.timestamp,
//           latitude: +p.lat,
//           longitude: +p.lon,
//           altitude: p.altitude || 0,
//           uin_no: p.uin_no || 'N/A',
//           application: p.application || 'Unknown',
//           category: p.category || 'General',
//           speed: p.speed || 0,
//           heading: p.heading || 0,
//           battery: p.battery || 'N/A',
//           signal_strength: p.signal_strength || 'N/A'
//         }));
//         console.log(`Successfully processed ${points.length} points`);
//       } else {
//         console.warn(`No points array in response for ${trackerId}`, data);
//       }

//       if (points.length === 0) {
//         console.warn(`No data points found for ${trackerId}`);
//         showStatus(`No data found for tracker ${trackerId}`, 'error');
//         return;
//       }

//       plotTrackerPath(trackerId, points, color);
//       displayAllTrackerDataInTable(trackerId, points);

//       lastUpdateTime = new Date();
//       updateLastUpdatedTime();
//       showStatus(`Loaded ${points.length} data points for tracker ${trackerId}`, 'success');
//       console.log(`Successfully loaded ${points.length} points for ${trackerId}`);

//     } catch (err) {
//       console.error(`Error fetching data for ${trackerId}:`, err);
//       showStatus(`${trackerId}: ${err.message}`, 'error');
      
//       try {
//         console.log(`Trying fallback endpoint for ${trackerId}`);
//         const fallbackRes = await fetch('/api/trajectory', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             tracker_id: trackerId,
//             interval_seconds: 0,
//             max_gap_seconds: 86400
//           })
//         });
        
//         if (fallbackRes.ok) {
//           const fallbackData = await fallbackRes.json();
//           console.log(`Fallback response for ${trackerId}:`, {
//             points_length: fallbackData.points ? fallbackData.points.length : 0
//           });
          
//           let points = [];
//           if (fallbackData.points && Array.isArray(fallbackbackData.points)) {
//             points = fallbackData.points.map(p => ({
//               lat: +p.lat,
//               lon: +p.lon,
//               time: p.timestamp,
//               timestamp: p.timestamp,
//               latitude: +p.lat,
//               longitude: +p.lon,
//               altitude: p.altitude || 0,
//               uin_no: p.uin_no || 'N/A',
//               application: p.application || 'Unknown',
//               category: p.category || 'General'
//             }));
//           }
          
//           if (points.length > 0) {
//             plotTrackerPath(trackerId, points, color);
//             displayAllTrackerDataInTable(trackerId, points);
//             lastUpdateTime = new Date();
//             updateLastUpdatedTime();
//             showStatus(`Loaded ${points.length} data points for tracker ${trackerId} (using fallback)`, 'success');
//           }
//         }
//       } catch (fallbackErr) {
//         console.error(`Fallback failed for ${trackerId}:`, fallbackErr);
//       }
//     }
//   };

//   /* ================= FETCH SINGLE SENSOR (ALL HISTORICAL DATA) ================= */
//   window.fetchSingleSensorAllData = async function(sensorId, clearBefore = false) {
//     console.log('fetchSingleSensorAllData called for:', sensorId);
    
//     if (!sensorId) return;

//     showStatus(`Fetching ALL historical data for sensor ${sensorId}...`, 'loading');

//     try {
//       console.log(`Calling /api/sensor/all for ${sensorId}`);
      
//       const res = await fetch('/api/sensor/all', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           sensor_id: sensorId
//         })
//       });

//       console.log(`Response status: ${res.status}`);
      
//       if (!res.ok) {
//         const errorText = await res.text();
//         console.error(`API error: ${res.status}`, errorText);
//         throw new Error(`Server error: ${res.status}`);
//       }

//       const data = await res.json();
//       console.log(`API response received for ${sensorId}:`, {
//         sensor_id: data.sensor_id,
//         total_points: data.total_points,
//         points_length: data.points ? data.points.length : 0
//       });
      
//       let sensorReadings = [];
//       if (data.points && Array.isArray(data.points)) {
//         console.log(`Processing ${data.points.length} readings for ${sensorId}`);
//         sensorReadings = data.points.map(p => ({
//           sensorId: sensorId,
//           timestamp: p.timestamp || p.time || new Date().toISOString(),
//           Timestamp: p.timestamp || p.time || new Date().toISOString(),
//           Latitude: +p.lat || +p.latitude || 0,
//           Longitude: +p.lon || +p.longitude || 0,
//           EC: p.EC !== undefined ? p.EC : p.ec || 0,
//           Moisture: p.Moisture !== undefined ? p.Moisture : p.moisture || 0,
//           Nitrogen: p.Nitrogen !== undefined ? p.Nitrogen : p.nitrogen || 0,
//           Phosphorous: p.Phosphorous !== undefined ? p.Phosphorous : p.phosphorous || 0,
//           PHValue: p.PHValue !== undefined ? p.PHValue : p.ph || 0,
//           Potassium: p.Potassium !== undefined ? p.Potassium : p.potassium || 0,
//           Temperature: p.Temperature !== undefined ? p.Temperature : p.temperature || 0,
//           Id: p.Id || p.id || 'N/A',
//           SatelliteFix: p.SatelliteFix !== undefined ? p.SatelliteFix : p.satellite_fix || 0
//         }));
//         console.log(`Successfully processed ${sensorReadings.length} readings`);
//       } else {
//         console.warn(`No points array in response for ${sensorId}`, data);
//       }

//       if (sensorReadings.length === 0) {
//         console.warn(`No data readings found for ${sensorId}`);
//         showStatus(`No data found for sensor ${sensorId}`, 'error');
//         return;
//       }

//       // Update sensor table with ALL historical data
//       if (window.updateSensorTable) {
//         window.updateSensorTable(sensorId, sensorReadings);
//       }

//       lastUpdateTime = new Date();
//       updateLastUpdatedTime();
//       showStatus(`Loaded ${sensorReadings.length} data readings for sensor ${sensorId}`, 'success');
//       console.log(`Successfully loaded ${sensorReadings.length} readings for ${sensorId}`);

//     } catch (err) {
//       console.error(`Error fetching data for sensor ${sensorId}:`, err);
//       showStatus(`Sensor ${sensorId}: ${err.message}`, 'error');
      
//       try {
//         console.log(`Trying fallback endpoint for sensor ${sensorId}`);
//         const fallbackRes = await fetch('/api/sensor', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             sensor_id: sensorId
//           })
//         });
        
//         if (fallbackRes.ok) {
//           const fallbackData = await fallbackRes.json();
//           console.log(`Fallback response for sensor ${sensorId}:`, fallbackData);
          
//           let sensorReadings = [];
//           if (Array.isArray(fallbackData)) {
//             sensorReadings = fallbackData.map(p => ({
//               sensorId: sensorId,
//               timestamp: p.timestamp || p.time || new Date().toISOString(),
//               Timestamp: p.timestamp || p.time || new Date().toISOString(),
//               Latitude: +p.Latitude || +p.lat || 0,
//               Longitude: +p.Longitude || +p.lon || 0,
//               EC: p.EC !== undefined ? p.EC : p.ec || 0,
//               Moisture: p.Moisture !== undefined ? p.Moisture : p.moisture || 0,
//               Nitrogen: p.Nitrogen !== undefined ? p.Nitrogen : p.nitrogen || 0,
//               Phosphorous: p.Phosphorous !== undefined ? p.Phosphorous : p.phosphorous || 0,
//               PHValue: p.PHValue !== undefined ? p.PHValue : p.ph || 0,
//               Potassium: p.Potassium !== undefined ? p.Potassium : p.potassium || 0,
//               Temperature: p.Temperature !== undefined ? p.Temperature : p.temperature || 0,
//               Id: p.Id || p.id || 'N/A',
//               SatelliteFix: p.SatelliteFix !== undefined ? p.SatelliteFix : p.satellite_fix || 0
//             }));
//           } else if (fallbackData) {
//             sensorReadings = [{
//               sensorId: sensorId,
//               timestamp: fallbackData.timestamp || fallbackData.time || new Date().toISOString(),
//               Timestamp: fallbackData.timestamp || fallbackData.time || new Date().toISOString(),
//               Latitude: +fallbackData.Latitude || +fallbackData.lat || 0,
//               Longitude: +fallbackData.Longitude || +fallbackData.lon || 0,
//               EC: fallbackData.EC !== undefined ? fallbackData.EC : fallbackData.ec || 0,
//               Moisture: fallbackData.Moisture !== undefined ? fallbackData.Moisture : fallbackData.moisture || 0,
//               Nitrogen: fallbackData.Nitrogen !== undefined ? fallbackData.Nitrogen : fallbackData.nitrogen || 0,
//               Phosphorous: fallbackData.Phosphorous !== undefined ? fallbackData.Phosphorous : fallbackData.phosphorous || 0,
//               PHValue: fallbackData.PHValue !== undefined ? fallbackData.PHValue : fallbackData.ph || 0,
//               Potassium: fallbackData.Potassium !== undefined ? fallbackData.Potassium : fallbackData.potassium || 0,
//               Temperature: fallbackData.Temperature !== undefined ? fallbackData.Temperature : fallbackData.temperature || 0,
//               Id: fallbackData.Id || fallbackData.id || 'N/A',
//               SatelliteFix: fallbackData.SatelliteFix !== undefined ? fallbackData.SatelliteFix : fallbackData.satellite_fix || 0
//             }];
//           }
          
//           if (sensorReadings.length > 0) {
//             if (window.updateSensorTable) {
//               window.updateSensorTable(sensorId, sensorReadings);
//             }
//             lastUpdateTime = new Date();
//             updateLastUpdatedTime();
//             showStatus(`Loaded ${sensorReadings.length} data readings for sensor ${sensorId} (using fallback)`, 'success');
//           }
//         }
//       } catch (fallbackErr) {
//         console.error(`Fallback failed for sensor ${sensorId}:`, fallbackErr);
//       }
//     }
//   };

//   /* ================= PLOT ALL POINTS ================= */
//   function plotTrackerPath(trackerId, points, color) {
//     if (!points.length) return;

//     if (!isTrackerVisible(trackerId)) {
//       console.log(`${trackerId} is hidden, not plotting`);
//       return;
//     }

//     const latlngs = points.map(p => [p.lat, p.lon]);

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

//     const selectedParams = window.getRealtimeParameters ? window.getRealtimeParameters(trackerId) : {};

//     function createPopupContent(trackerId, point, label) {
//       let content = `<b>${trackerId}</b><br>${label}<br>`;
      
//       if (point.time) {
//         content += `Time: ${formatTimestamp(point.time)}<br>`;
//       }
      
//       if (selectedParams.latitude && point.lat !== undefined) {
//         content += `Latitude: ${point.lat.toFixed(6)}<br>`;
//       }
//       if (selectedParams.longitude && point.lon !== undefined) {
//         content += `Longitude: ${point.lon.toFixed(6)}<br>`;
//       }
      
//       if (selectedParams.altitude && point.altitude !== undefined) {
//         content += `Altitude: ${point.altitude}m<br>`;
//       }
//       if (selectedParams.uin_no && point.uin_no && point.uin_no !== 'N/A') {
//         content += `UIN: ${point.uin_no}<br>`;
//       }
//       if (selectedParams.application && point.application && point.application !== 'Unknown') {
//         content += `Application: ${point.application}<br>`;
//       }
//       if (selectedParams.category && point.category && point.category !== 'General') {
//         content += `Category: ${point.category}<br>`;
//       }
      
//       return content;
//     }

//     trackerMarkers[trackerId] = [];

//     const startMarker = L.marker(latlngs[0], { icon: START_ICON })
//       .addTo(markersLayer)
//       .bindPopup(createPopupContent(trackerId, points[0], 'Start Point'));
//     trackerMarkers[trackerId].push(startMarker);

//     const endMarker = L.marker(latlngs.at(-1), { icon: END_ICON })
//       .addTo(markersLayer)
//       .bindPopup(createPopupContent(trackerId, points.at(-1), 'End Point'));
//     trackerMarkers[trackerId].push(endMarker);

//     const maxMarkers = 20;
//     const interval = Math.max(1, Math.floor(points.length / maxMarkers));
    
//     points.forEach((p, idx) => {
//       if (idx > 0 && idx < points.length - 1 && idx % interval === 0) {
//         const dotMarker = L.marker([p.lat, p.lon], {
//           icon: createDotIcon(color, 8)
//         })
//         .addTo(markersLayer)
//         .bindPopup(createPopupContent(trackerId, p, `Point ${idx+1}/${points.length}`));
        
//         trackerMarkers[trackerId].push(dotMarker);
//       }
//     });

//     updateMapBounds();
//   }

//   /* ================= DISPLAY ALL TRACKER DATA IN TABLE ================= */
//   function displayAllTrackerDataInTable(trackerId, points) {
//     if (!points || points.length === 0) return;
    
//     const selectedParams = window.getRealtimeParameters ? window.getRealtimeParameters(trackerId) : null;
    
//     if (!selectedParams) {
//       const defaultParams = {
//         timestamp: true,
//         latitude: true,
//         longitude: true,
//         altitude: true,
//         uin_no: true,
//         application: true,
//         category: true,
//         speed: true,
//         heading: true,
//         battery: true,
//         signal_strength: true
//       };
//       updateRealtimeTableWithAllData(trackerId, points, defaultParams);
//       return;
//     }
    
//     updateRealtimeTableWithAllData(trackerId, points, selectedParams);
//   }

//   /* ================= UPDATE REALTIME TABLE WITH ALL DATA ================= */
//   function updateRealtimeTableWithAllData(trackerId, points, selectedParams) {
//     const formattedDataArray = points.map(point => {
//       const formattedData = {
//         'Tracker ID': trackerId,
//         'timestamp': point.timestamp || point.time || new Date().toISOString(),
//         'latitude': point.latitude || point.lat,
//         'longitude': point.longitude || point.lon,
//         'altitude': point.altitude || 0,
//         'uin_no': point.uin_no || 'N/A',
//         'application': point.application || 'Unknown',
//         'category': point.category || 'General',
//         'speed': point.speed || 0,
//         'heading': point.heading || 0,
//         'battery': point.battery || 'N/A',
//         'signal_strength': point.signal_strength || 'N/A'
//       };
      
//       const filteredData = {};
//       Object.keys(formattedData).forEach(key => {
//         if (key === 'Tracker ID' || (selectedParams[key] && selectedParams[key] !== false)) {
//           filteredData[key] = formattedData[key];
//         }
//       });
      
//       return filteredData;
//     });
    
//     if (window.updateRealtimeTableWithMultipleEntries) {
//       window.updateRealtimeTableWithMultipleEntries(trackerId, formattedDataArray);
//     }
    
//     if (!window.realtimeTableData) {
//       window.realtimeTableData = {};
//     }
//     window.realtimeTableData[trackerId] = formattedDataArray;
    
//     const realtimePanel = document.getElementById('realtimeTablePanel');
//     if (realtimePanel && realtimePanel.classList.contains('minimized')) {
//       realtimePanel.classList.remove('minimized');
//       const chevron = document.getElementById('realtimeTablePanelChevron');
//       if (chevron) chevron.classList.remove('rotated');
//       const container = document.getElementById('realtimeTableContainer');
//       if (container) container.style.display = 'block';
//     }
//   }

//   /* ================= DIRECT TABLE UPDATE ================= */
//   window.updateRealtimeTableWithMultipleEntries = function(trackerId, dataArray) {
//     console.log('Updating table for tracker:', trackerId, 'with', dataArray.length, 'entries');
    
//     if (!window.realtimeTableData) {
//       window.realtimeTableData = {};
//     }
    
//     window.realtimeTableData[trackerId] = dataArray;
    
//     updateTrackerTableDirectly();
//   };

//   function updateTrackerTableDirectly() {
//     console.log('updateTrackerTableDirectly called');
    
//     // Get table elements
//     const tbody = document.getElementById('realtimeDataTableBody');
//     const thead = document.getElementById('realtimeDataTableHeader');
    
//     if (!tbody || !thead) {
//       console.error('Table elements not found!');
//       console.log('Available elements:');
//       console.log('tbody:', document.getElementById('realtimeDataTableBody'));
//       console.log('thead:', document.getElementById('realtimeDataTableHeader'));
//       console.log('table:', document.getElementById('realtimeDataTable'));
//       return;
//     }
    
//     const allData = [];
//     Object.keys(window.realtimeTableData || {}).forEach(trackerId => {
//       const trackerData = window.realtimeTableData[trackerId];
//       if (Array.isArray(trackerData)) {
//         trackerData.forEach(entry => {
//           allData.push({...entry, 'Tracker ID': trackerId});
//         });
//       }
//     });
    
//     console.log('Total data entries:', allData.length);
    
//     if (allData.length === 0) {
//       tbody.innerHTML = `
//         <tr class="no-data-row">
//           <td colspan="8">No tracker data available. Fetch a tracker first.</td>
//         </tr>
//       `;
//       return;
//     }
    
//     const allHeaders = new Set(['Tracker ID', 'timestamp', 'latitude', 'longitude', 'altitude', 'uin_no', 'application', 'category']);
//     allData.forEach(entry => {
//       Object.keys(entry).forEach(key => {
//         allHeaders.add(key);
//       });
//     });
    
//     const headers = Array.from(allHeaders);
    
//     const headerRow = thead.querySelector('tr');
//     if (headerRow) {
//       headerRow.innerHTML = '';
      
//       headers.forEach(header => {
//         const th = document.createElement('th');
//         th.textContent = formatHeaderText(header);
//         headerRow.appendChild(th);
//       });
//     }
    
//     tbody.innerHTML = '';
    
//     allData.sort((a, b) => {
//       const timeA = a.timestamp || a.time || '';
//       const timeB = b.timestamp || b.time || '';
//       return new Date(timeB) - new Date(timeA);
//     });
    
//     allData.forEach(entry => {
//       const row = document.createElement('tr');
      
//       headers.forEach(header => {
//         const td = document.createElement('td');
        
//         let value = entry[header];
//         if (value === undefined || value === null) {
//           value = '-';
//           td.style.color = '#9ca3af';
//         } else {
//           if (header === 'timestamp' || header === 'time') {
//             if (value && value !== '-') {
//               try {
//                 value = new Date(value).toLocaleString();
//               } catch (e) {}
//             }
//           } else if ((header === 'latitude' || header === 'longitude') && value && value !== '-') {
//             value = parseFloat(value).toFixed(6);
//           } else if (header === 'altitude' && value && value !== '-') {
//             value = `${parseFloat(value).toFixed(1)} m`;
//           } else if (header === 'speed' && value && value !== '-') {
//             value = `${parseFloat(value).toFixed(1)} km/h`;
//           } else if (header === 'heading' && value && value !== '-') {
//             value = `${parseFloat(value).toFixed(0)}°`;
//           }
//         }
        
//         td.textContent = value;
        
//         if (header === 'Tracker ID') {
//           td.className = 'tracker-id-cell';
//           td.style.fontWeight = '600';
//           td.style.color = '#6366f1';
//         }
        
//         row.appendChild(td);
//       });
      
//       tbody.appendChild(row);
//     });
    
//     const summaryRow = document.createElement('tr');
//     summaryRow.style.backgroundColor = '#f8fafc';
//     const summaryCell = document.createElement('td');
//     summaryCell.colSpan = headers.length;
//     summaryCell.style.textAlign = 'center';
//     summaryCell.style.padding = '10px';
//     summaryCell.style.fontStyle = 'italic';
//     summaryCell.style.color = '#6b7280';
//     summaryCell.textContent = `Showing ${allData.length} total entries`;
//     summaryRow.appendChild(summaryCell);
//     tbody.appendChild(summaryRow);
    
//     const realtimePanel = document.getElementById('realtimeTablePanel');
//     if (realtimePanel && realtimePanel.classList.contains('minimized')) {
//       console.log('Auto-expanding panel');
//       realtimePanel.classList.remove('minimized');
//       const chevron = document.getElementById('realtimeTablePanelChevron');
//       if (chevron) chevron.classList.remove('rotated');
//       const container = document.getElementById('realtimeTableContainer');
//       if (container) container.style.display = 'block';
//     }
    
//     console.log('Table updated successfully with', allData.length, 'entries');
//   }

//   function formatHeaderText(header) {
//     const formatMap = {
//       'timestamp': 'Timestamp',
//       'time': 'Time',
//       'latitude': 'Latitude',
//       'longitude': 'Longitude',
//       'altitude': 'Altitude',
//       'uin_no': 'UIN No',
//       'application': 'Application',
//       'category': 'Category',
//       'speed': 'Speed',
//       'heading': 'Heading',
//       'battery': 'Battery',
//       'signal_strength': 'Signal Strength',
//       'Tracker ID': 'Tracker ID'
//     };
//     return formatMap[header] || header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
//   }

//   window.updateRealtimeTable = function(trackerId, data) {
//     if (trackerId && data) {
//       if (!Array.isArray(data)) {
//         data = [data];
//       }
//       window.updateRealtimeTableWithMultipleEntries(trackerId, data);
//     } else {
//       updateTrackerTableDirectly();
//     }
//   };

//   /* ================= GROUP FETCH ================= */
//   window.fetchGroupTrackers = function (trackerIds) {
//     if (!trackerIds?.length) return alert('Group empty');
    
//     const visibleTrackers = trackerIds.filter(id => isTrackerVisible(id));
    
//     if (visibleTrackers.length === 0) {
//       alert('No visible trackers in this group');
//       return;
//     }
    
//     clearMap();
    
//     if (window.realtimeTableData) {
//       window.realtimeTableData = {};
//     }
//     if (window.updateRealtimeTable) {
//       window.updateRealtimeTable();
//     }
    
//     const promises = visibleTrackers.map((id, i) => {
//       return new Promise(resolve => {
//         setTimeout(async () => {
//           try {
//             await window.fetchSingleTrackerAllData(id, false);
//           } catch (err) {
//             console.error(`Failed to fetch tracker ${id}:`, err);
//           }
//           resolve();
//         }, i * 500);
//       });
//     });
    
//     Promise.all(promises).then(() => {
//       showStatus(`Loaded all trackers for group`, 'success');
//     });
//   };

//   /* ================= UPDATE SENSOR TABLE (FROM HTML) ================= */
//   // This function will be called by the HTML script
//   window.updateSensorTable = function(sensorId, sensorReadings) {
//     console.log('updateSensorTable called for:', sensorId, 'with', sensorReadings.length, 'readings');
    
//     if (!window.sensorTableData) {
//       window.sensorTableData = {};
//     }
    
//     if (sensorId && sensorReadings) {
//       if (!Array.isArray(sensorReadings)) {
//         sensorReadings = [sensorReadings];
//       }
      
//       if (!window.sensorTableData[sensorId]) {
//         window.sensorTableData[sensorId] = [];
//       }
      
//       sensorReadings.forEach(reading => {
//         reading.sensorId = sensorId;
//         reading.timestamp = reading.timestamp || reading.Timestamp || new Date().toISOString();
        
//         const exists = window.sensorTableData[sensorId].some(existing => 
//           (existing.Id && existing.Id === reading.Id) || 
//           (existing.timestamp && existing.timestamp === reading.timestamp) ||
//           (existing.Timestamp && existing.Timestamp === reading.Timestamp)
//         );
        
//         if (!exists) {
//           window.sensorTableData[sensorId].unshift(reading);
//         }
//       });
      
//       if (window.sensorTableData[sensorId].length > 100) {
//         window.sensorTableData[sensorId] = window.sensorTableData[sensorId].slice(0, 100);
//       }
//     }
    
//     updateSensorTableDirectly();
//   };

//   function updateSensorTableDirectly() {
//     console.log('updateSensorTableDirectly called');
    
//     const tbody = document.getElementById('sensorDataTableBody');
//     const thead = document.getElementById('sensorDataTableHeader');
    
//     if (!tbody || !thead) {
//       console.error('Sensor table elements not found!');
//       return;
//     }
    
//     const allSensorData = [];
//     Object.keys(window.sensorTableData || {}).forEach(sensorId => {
//       (window.sensorTableData[sensorId] || []).forEach(reading => {
//         allSensorData.push(reading);
//       });
//     });
    
//     console.log('Total sensor data entries:', allSensorData.length);
    
//     if (allSensorData.length === 0) {
//       tbody.innerHTML = `
//         <tr class="no-data-row">
//           <td colspan="12">No sensor data available. Fetch a sensor first.</td>
//         </tr>
//       `;
//       return;
//     }
    
//     tbody.innerHTML = '';
    
//     allSensorData.sort((a, b) => {
//       const timeA = a.timestamp || a.Timestamp || '';
//       const timeB = b.timestamp || b.Timestamp || '';
//       return new Date(timeB) - new Date(timeA);
//     });
    
//     allSensorData.forEach((sensorData, index) => {
//       const row = document.createElement('tr');
      
//       const idCell = document.createElement('td');
//       idCell.className = 'sensor-id-cell';
//       idCell.textContent = sensorData.sensorId || sensorData.SensorId || 'N/A';
//       row.appendChild(idCell);
      
//       const timeCell = document.createElement('td');
//       const timestamp = sensorData.timestamp || sensorData.Timestamp;
//       if (timestamp) {
//         try {
//           timeCell.textContent = new Date(timestamp).toLocaleString();
//         } catch (e) {
//           timeCell.textContent = timestamp;
//         }
//       } else {
//         timeCell.textContent = '-';
//       }
//       row.appendChild(timeCell);
      
//       const latCell = document.createElement('td');
//       latCell.textContent = sensorData.Latitude !== undefined ? sensorData.Latitude.toFixed(6) : '-';
//       row.appendChild(latCell);
      
//       const lonCell = document.createElement('td');
//       lonCell.textContent = sensorData.Longitude !== undefined ? sensorData.Longitude.toFixed(6) : '-';
//       row.appendChild(lonCell);
      
//       const moistureCell = document.createElement('td');
//       moistureCell.textContent = sensorData.Moisture !== undefined ? sensorData.Moisture : '-';
//       row.appendChild(moistureCell);
      
//       const tempCell = document.createElement('td');
//       tempCell.textContent = sensorData.Temperature !== undefined ? sensorData.Temperature : '-';
//       row.appendChild(tempCell);
      
//       const ecCell = document.createElement('td');
//       ecCell.textContent = sensorData.EC !== undefined ? sensorData.EC : '-';
//       row.appendChild(ecCell);
      
//       const phCell = document.createElement('td');
//       phCell.textContent = sensorData.PHValue !== undefined ? sensorData.PHValue : '-';
//       row.appendChild(phCell);
      
//       const nitrogenCell = document.createElement('td');
//       nitrogenCell.textContent = sensorData.Nitrogen !== undefined ? sensorData.Nitrogen : '-';
//       row.appendChild(nitrogenCell);
      
//       const phosphorousCell = document.createElement('td');
//       phosphorousCell.textContent = sensorData.Phosphorous !== undefined ? sensorData.Phosphorous : '-';
//       row.appendChild(phosphorousCell);
      
//       const potassiumCell = document.createElement('td');
//       potassiumCell.textContent = sensorData.Potassium !== undefined ? sensorData.Potassium : '-';
//       row.appendChild(potassiumCell);
      
//       const satCell = document.createElement('td');
//       satCell.textContent = sensorData.SatelliteFix !== undefined ? sensorData.SatelliteFix : '-';
//       row.appendChild(satCell);
      
//       tbody.appendChild(row);
//     });
    
//     const summaryRow = document.createElement('tr');
//     summaryRow.style.backgroundColor = '#f8fafc';
//     const summaryCell = document.createElement('td');
//     summaryCell.colSpan = 12;
//     summaryCell.style.textAlign = 'center';
//     summaryCell.style.padding = '10px';
//     summaryCell.style.fontStyle = 'italic';
//     summaryCell.style.color = '#6b7280';
//     summaryCell.textContent = `Showing ${allSensorData.length} total sensor readings`;
//     summaryRow.appendChild(summaryCell);
//     tbody.appendChild(summaryRow);
    
//     const sensorPanel = document.getElementById('sensorTablePanel');
//     if (sensorPanel && sensorPanel.classList.contains('minimized')) {
//       sensorPanel.classList.remove('minimized');
//       const chevron = document.getElementById('sensorTablePanelChevron');
//       if (chevron) chevron.classList.remove('rotated');
//       const container = document.getElementById('sensorTableContainer');
//       if (container) container.style.display = 'block';
//     }
    
//     console.log('Sensor table updated successfully with', allSensorData.length, 'entries');
//   }

//   /* ================= SENSOR FETCH HANDLER ================= */
//   window.fetchSensorData = function(sensorId) {
//     window.fetchSingleSensorAllData(sensorId, false);
//   };

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

//   /* ================= HELPERS ================= */
//   function clearMap() {
//     markersLayer.clearLayers();
//     polylineLayer.clearLayers();
//     Object.keys(trackerPolylines).forEach(k => delete trackerPolylines[k]);
//     Object.keys(trackerMarkers).forEach(k => delete trackerMarkers[k]);
//     Object.keys(trackerAllData).forEach(k => delete trackerAllData[k]);
//     updateLegend();
    
//     if (imagesGrid) {
//       imagesGrid.innerHTML = '';
//     }
//   }

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

//   window.handleFetch = function(trackerId) {
//     window.fetchSingleTrackerAllData(trackerId, true);
//   };

//   window.handleFetchSensor = function(sensorId) {
//     window.fetchSingleSensorAllData(sensorId, false);
//   };

//   // Initialize global objects
//   window.trajectoryOverlays = {};
//   window.realtimeTableData = {};
//   window.sensorTableData = {};

//   // Fetch data for saved trackers on page load
//   window.addEventListener('load', function() {
//     const savedTrackers = JSON.parse(localStorage.getItem('saved_trackers')) || [];
//     const savedSensors = JSON.parse(localStorage.getItem('saved_sensors')) || [];
    
//     console.log('Page loaded, saved trackers:', savedTrackers);
//     console.log('Page loaded, saved sensors:', savedSensors);
    
//     if (savedTrackers.length > 0) {
//       showStatus(`Loading ${savedTrackers.length} saved trackers...`, 'loading');
      
//       // Load first tracker immediately
//       setTimeout(() => {
//         if (savedTrackers[0]) {
//           window.fetchSingleTrackerAllData(savedTrackers[0], true);
//         }
        
//         // Load remaining trackers with delay
//         savedTrackers.slice(1).forEach((trackerId, index) => {
//           setTimeout(() => {
//             window.fetchSingleTrackerAllData(trackerId, false);
//           }, (index + 1) * 1000);
//         });
//       }, 1000);
//     }
    
//     if (savedSensors.length > 0) {
//       showStatus(`Loading ${savedSensors.length} saved sensors...`, 'loading');
      
//       setTimeout(() => {
//         savedSensors.forEach((sensorId, index) => {
//           setTimeout(() => {
//             window.fetchSingleSensorAllData(sensorId, false);
//           }, index * 1000);
//         });
//       }, 2000);
//     }
    
//     // Initialize tables
//     updateTrackerTableDirectly();
//     updateSensorTableDirectly();
//   });
  
//   // Initialize fetch buttons
//   if (fetchBtn) {
//     fetchBtn.addEventListener('click', () => {
//       const id = trackerInput.value.trim();
//       if (id) window.fetchSingleTrackerAllData(id, true);
//     });
//   }
  
//   // Initialize sensor fetch button (if exists in HTML)
//   const fetchSensorBtn = document.getElementById('fetch-sensor-btn');
//   if (fetchSensorBtn) {
//     fetchSensorBtn.addEventListener('click', () => {
//       const id = sensorInput.value.trim();
//       if (id) window.fetchSingleSensorAllData(id, false);
//     });
//   }
  
//   console.log('fetchdata.js initialization complete');
// });









// document.addEventListener('DOMContentLoaded', function () {
//   console.log('fetchdata.js loaded');
  
//   /* ================= DOM ================= */
//   const fetchBtn = document.getElementById('fetch-btn');
//   const trackerInput = document.getElementById('tracker-id');
//   const sensorInput = document.getElementById('sensor-id');
//   const statusMessage = document.getElementById('status-message');
//   const lastUpdatedDiv = document.querySelector('.last-updated');
//   const imagesGrid = document.getElementById('images-grid');

//   /* ================= MAP ================= */
//   const map = L.map('map').setView([23.0225, 72.5714], 13);

//   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     maxZoom: 19
//   }).addTo(map);

//   const markersLayer = L.layerGroup().addTo(map);
//   const polylineLayer = L.layerGroup().addTo(map);

//   let lastUpdateTime = null;
//   let activeGroup = null;

//   /* ================= TRACKER STATE ================= */
//   const trackerPolylines = {};
//   const trackerMarkers = {};
//   const trackerColorMap = {};
//   const trackerVisibility = {};
//   const trackerAllData = {};

//   const COLORS = ['#2563eb', '#eab308', '#9333ea', '#ea580c', '#0891b2', '#4f46e5'];
//   let colorIndex = 0;

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

//   function createDotIcon(color, size = 8) {
//     return L.divIcon({
//       className: '',
//       html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;"></div>`,
//       iconSize: [size, size],
//       iconAnchor: [size / 2, size / 2]
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
//         <span style="font-weight:600;">Start</span>
//       </div>
//       <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
//         ${pin('red')}
//         <span style="font-weight:600;">End</span>
//       </div>
//       <hr style="margin:6px 0">
//     `;

//     Object.entries(trackerColorMap).forEach(([id, color]) => {
//       if (isTrackerVisible(id)) {
//         html += `
//           <div style="display:flex;align-items:center;gap:6px;">
//             <span style="color:${color};font-size:14px;">●</span>
//             ${id}
//           </div>
//         `;
//       }
//     });

//     div.innerHTML = html;
//   }

//   /* ================= FETCH SINGLE TRACKER (ALL HISTORICAL DATA) ================= */
//   window.fetchSingleTrackerAllData = async function(trackerId, clearBefore = false) {
//     console.log('fetchSingleTrackerAllData called for:', trackerId);
    
//     if (!trackerId) return;

//     if (clearBefore) {
//       clearMap();
//     }

//     const color = getTrackerColor(trackerId);
//     trackerVisibility[trackerId] = true;
//     showStatus(`Fetching ALL historical data for tracker ${trackerId}...`, 'loading');

//     try {
//       console.log(`Calling /api/trajectory/all for ${trackerId}`);
      
//       const res = await fetch('/api/trajectory/all', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           tracker_id: trackerId
//         })
//       });

//       console.log(`Response status: ${res.status}`);
      
//       if (!res.ok) {
//         const errorText = await res.text();
//         console.error(`API error: ${res.status}`, errorText);
//         throw new Error(`Server error: ${res.status}`);
//       }

//       const data = await res.json();
//       console.log(`API response received for ${trackerId}:`, {
//         tracker_id: data.tracker_id,
//         total_points: data.total_points,
//         points_length: data.points ? data.points.length : 0
//       });
      
//       let points = [];
//       if (data.points && Array.isArray(data.points)) {
//         console.log(`Processing ${data.points.length} points for ${trackerId}`);
//         points = data.points.map(p => ({
//           lat: +p.lat,
//           lon: +p.lon,
//           time: p.timestamp,
//           timestamp: p.timestamp,
//           latitude: +p.lat,
//           longitude: +p.lon,
//           altitude: p.altitude || 0,
//           uin_no: p.uin_no || 'N/A',
//           application: p.application || 'Unknown',
//           category: p.category || 'General',
//           speed: p.speed || 0,
//           heading: p.heading || 0,
//           battery: p.battery || 'N/A',
//           signal_strength: p.signal_strength || 'N/A'
//         }));
//         console.log(`Successfully processed ${points.length} points`);
//       } else {
//         console.warn(`No points array in response for ${trackerId}`, data);
//       }

//       if (points.length === 0) {
//         console.warn(`No data points found for ${trackerId}`);
//         showStatus(`No data found for tracker ${trackerId}`, 'error');
//         return;
//       }

//       plotTrackerPath(trackerId, points, color);
//       displayAllTrackerDataInTable(trackerId, points);

//       lastUpdateTime = new Date();
//       updateLastUpdatedTime();
//       showStatus(`Loaded ${points.length} data points for tracker ${trackerId}`, 'success');
//       console.log(`Successfully loaded ${points.length} points for ${trackerId}`);

//     } catch (err) {
//       console.error(`Error fetching data for ${trackerId}:`, err);
//       showStatus(`${trackerId}: ${err.message}`, 'error');
      
//       try {
//         console.log(`Trying fallback endpoint for ${trackerId}`);
//         const fallbackRes = await fetch('/api/trajectory', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             tracker_id: trackerId,
//             interval_seconds: 0,
//             max_gap_seconds: 86400
//           })
//         });
        
//         if (fallbackRes.ok) {
//           const fallbackData = await fallbackRes.json();
//           console.log(`Fallback response for ${trackerId}:`, {
//             points_length: fallbackData.points ? fallbackData.points.length : 0
//           });
          
//           let points = [];
//           if (fallbackData.points && Array.isArray(fallbackData.points)) {
//             points = fallbackData.points.map(p => ({
//               lat: +p.lat,
//               lon: +p.lon,
//               time: p.timestamp,
//               timestamp: p.timestamp,
//               latitude: +p.lat,
//               longitude: +p.lon,
//               altitude: p.altitude || 0,
//               uin_no: p.uin_no || 'N/A',
//               application: p.application || 'Unknown',
//               category: p.category || 'General'
//             }));
//           }
          
//           if (points.length > 0) {
//             plotTrackerPath(trackerId, points, color);
//             displayAllTrackerDataInTable(trackerId, points);
//             lastUpdateTime = new Date();
//             updateLastUpdatedTime();
//             showStatus(`Loaded ${points.length} data points for tracker ${trackerId} (using fallback)`, 'success');
//           }
//         }
//       } catch (fallbackErr) {
//         console.error(`Fallback failed for ${trackerId}:`, fallbackErr);
//       }
//     }
//   };

//   /* ================= FETCH SENSOR DATA (USING CORRECT ENDPOINT) ================= */
//   window.fetchSingleSensorAllData = async function(sensorId, clearBefore = false) {
//     console.log('fetchSingleSensorAllData called for:', sensorId);
    
//     if (!sensorId) return;

//     showStatus(`Fetching sensor data for ${sensorId}...`, 'loading');

//     try {
//       console.log(`Calling /api/sensor_proxy/${sensorId} for sensor data`);
      
//       // Use the correct endpoint that exists in your Flask app
//       const res = await fetch(`/api/sensor_proxy/${sensorId}`, {
//         method: 'GET',
//         headers: { 
//           'Content-Type': 'application/json',
//           'Accept': 'application/json'
//         }
//       });

//       console.log(`Response status: ${res.status} for sensor ${sensorId}`);
      
//       if (!res.ok) {
//         const errorText = await res.text();
//         console.error(`API error for sensor ${sensorId}: ${res.status}`, errorText);
        
//         // Try alternative endpoint
//         console.log(`Trying alternative endpoint /api/sensor_test/${sensorId}`);
//         const altRes = await fetch(`/api/sensor_test/${sensorId}`, {
//           method: 'GET',
//           headers: { 
//             'Content-Type': 'application/json',
//             'Accept': 'application/json'
//           }
//         });
        
//         if (altRes.ok) {
//           const altData = await altRes.json();
//           console.log(`Alternative response for ${sensorId}:`, altData);
          
//           let sensorReadings = [];
//           if (Array.isArray(altData)) {
//             sensorReadings = altData;
//           } else if (altData && typeof altData === 'object') {
//             sensorReadings = [altData];
//           }
          
//           if (sensorReadings.length > 0) {
//             processSensorData(sensorId, sensorReadings);
//             return;
//           }
//         }
        
//         throw new Error(`Server error: ${res.status}`);
//       }

//       const data = await res.json();
//       console.log(`API response received for sensor ${sensorId}:`, data);
      
//       processSensorData(sensorId, data);

//     } catch (err) {
//       console.error(`Error fetching data for sensor ${sensorId}:`, err);
//       showStatus(`Sensor ${sensorId}: ${err.message}`, 'error');
      
//       // Even if API fails, create test data for demo purposes
//       createAndDisplayTestSensorData(sensorId);
//     }
//   };

//   /* ================= PROCESS SENSOR DATA ================= */
//   function processSensorData(sensorId, data) {
//     console.log(`Processing sensor data for ${sensorId}:`, data);
    
//     let sensorReadings = [];
    
//     // Handle different response formats
//     if (Array.isArray(data)) {
//       console.log(`Processing ${data.length} readings for ${sensorId}`);
//       sensorReadings = data.map(p => ({
//         sensorId: sensorId,
//         SensorId: p.SensorId || sensorId,
//         timestamp: p.Timestamp || p.timestamp || new Date().toISOString(),
//         Timestamp: p.Timestamp || p.timestamp || new Date().toISOString(),
//         Latitude: +p.Latitude || +p.lat || +p.latitude || 0,
//         Longitude: +p.Longitude || +p.lon || +p.longitude || 0,
//         EC: p.EC !== undefined ? p.EC : p.ec || 0,
//         Moisture: p.Moisture !== undefined ? p.Moisture : p.moisture || 0,
//         Nitrogen: p.Nitrogen !== undefined ? p.Nitrogen : p.nitrogen || 0,
//         Phosphorous: p.Phosphorous !== undefined ? p.Phosphorous : p.phosphorous || 0,
//         PHValue: p.PHValue !== undefined ? p.PHValue : p.ph || 0,
//         Potassium: p.Potassium !== undefined ? p.Potassium : p.potassium || 0,
//         Temperature: p.Temperature !== undefined ? p.Temperature : p.temperature || 0,
//         Id: p.Id || p.id || 'N/A',
//         SatelliteFix: p.SatelliteFix !== undefined ? p.SatelliteFix : p.satellite_fix || 0
//       }));
//     } else if (data && typeof data === 'object') {
//       console.log(`Processing single reading for ${sensorId}`);
//       sensorReadings = [{
//         sensorId: sensorId,
//         SensorId: data.SensorId || sensorId,
//         timestamp: data.Timestamp || data.timestamp || new Date().toISOString(),
//         Timestamp: data.Timestamp || data.timestamp || new Date().toISOString(),
//         Latitude: +data.Latitude || +data.lat || +data.latitude || 0,
//         Longitude: +data.Longitude || +data.lon || +data.longitude || 0,
//         EC: data.EC !== undefined ? data.EC : data.ec || 0,
//         Moisture: data.Moisture !== undefined ? data.Moisture : data.moisture || 0,
//         Nitrogen: data.Nitrogen !== undefined ? data.Nitrogen : data.nitrogen || 0,
//         Phosphorous: data.Phosphorous !== undefined ? data.Phosphorous : data.phosphorous || 0,
//         PHValue: data.PHValue !== undefined ? data.PHValue : data.ph || 0,
//         Potassium: data.Potassium !== undefined ? data.Potassium : data.potassium || 0,
//         Temperature: data.Temperature !== undefined ? data.Temperature : data.temperature || 0,
//         Id: data.Id || data.id || 'N/A',
//         SatelliteFix: data.SatelliteFix !== undefined ? data.SatelliteFix : data.satellite_fix || 0
//       }];
//     } else {
//       console.warn(`Unexpected response format for ${sensorId}`, data);
//     }

//     if (sensorReadings.length === 0) {
//       console.warn(`No data readings found for ${sensorId}`);
//       showStatus(`No data found for sensor ${sensorId}`, 'error');
//       createAndDisplayTestSensorData(sensorId);
//       return;
//     }

//     // Update sensor table with the data
//     if (window.updateSensorTable) {
//       window.updateSensorTable(sensorId, sensorReadings);
//     }

//     lastUpdateTime = new Date();
//     updateLastUpdatedTime();
//     showStatus(`Loaded ${sensorReadings.length} data readings for sensor ${sensorId}`, 'success');
//     console.log(`Successfully loaded ${sensorReadings.length} readings for ${sensorId}`);
//   }

//   /* ================= CREATE TEST SENSOR DATA ================= */
//   function createAndDisplayTestSensorData(sensorId) {
//     console.log(`Creating test data for sensor ${sensorId}`);
    
//     import('https://cdnjs.cloudflare.com/ajax/libs/dayjs/1.11.10/dayjs.min.js')
//       .then(() => {
//         const dayjs = window.dayjs;
//         const sensorReadings = [];
        
//         // Create 5 test readings with different timestamps
//         for (let i = 0; i < 5; i++) {
//           const timestamp = dayjs().subtract(i * 10, 'minute').toISOString();
//           const reading = {
//             sensorId: sensorId,
//             SensorId: sensorId.toString().padStart(3, '0'),
//             timestamp: timestamp,
//             Timestamp: timestamp,
//             Latitude: 23.0225 + (Math.random() - 0.5) * 0.01,
//             Longitude: 72.5714 + (Math.random() - 0.5) * 0.01,
//             EC: Math.random() * 3 + 1,
//             Moisture: Math.random() * 60 + 20,
//             Nitrogen: Math.random() * 40 + 10,
//             Phosphorous: Math.random() * 35 + 5,
//             PHValue: Math.random() * 2 + 6,
//             Potassium: Math.random() * 30 + 15,
//             Temperature: Math.random() * 15 + 20,
//             Id: `TEST_${sensorId}_${i}`,
//             SatelliteFix: ['GPS', 'GLONASS', 'Galileo'][Math.floor(Math.random() * 3)]
//           };
          
//           sensorReadings.push(reading);
//         }
        
//         if (window.updateSensorTable) {
//           window.updateSensorTable(sensorId, sensorReadings);
//         }
        
//         lastUpdateTime = new Date();
//         updateLastUpdatedTime();
//         showStatus(`Loaded 5 test readings for sensor ${sensorId} (demo mode)`, 'success');
//         console.log(`Successfully created 5 test readings for ${sensorId}`);
//       })
//       .catch(err => {
//         console.error('Failed to load dayjs:', err);
//         // Fallback to simple test data
//         const sensorReadings = [{
//           sensorId: sensorId,
//           SensorId: sensorId.toString().padStart(3, '0'),
//           timestamp: new Date().toISOString(),
//           Timestamp: new Date().toISOString(),
//           Latitude: 23.0225,
//           Longitude: 72.5714,
//           EC: 2.5,
//           Moisture: 45.6,
//           Nitrogen: 25.3,
//           Phosphorous: 18.7,
//           PHValue: 7.2,
//           Potassium: 32.1,
//           Temperature: 27.5,
//           Id: `TEST_${sensorId}_0`,
//           SatelliteFix: 'GPS'
//         }];
        
//         if (window.updateSensorTable) {
//           window.updateSensorTable(sensorId, sensorReadings);
//         }
        
//         lastUpdateTime = new Date();
//         updateLastUpdatedTime();
//         showStatus(`Loaded test reading for sensor ${sensorId}`, 'success');
//       });
//   }

//   /* ================= PLOT ALL POINTS ================= */
//   function plotTrackerPath(trackerId, points, color) {
//     if (!points.length) return;

//     if (!isTrackerVisible(trackerId)) {
//       console.log(`${trackerId} is hidden, not plotting`);
//       return;
//     }

//     const latlngs = points.map(p => [p.lat, p.lon]);

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

//     const selectedParams = window.getRealtimeParameters ? window.getRealtimeParameters(trackerId) : {};

//     function createPopupContent(trackerId, point, label) {
//       let content = `<b>${trackerId}</b><br>${label}<br>`;
      
//       if (point.time) {
//         content += `Time: ${formatTimestamp(point.time)}<br>`;
//       }
      
//       if (selectedParams.latitude && point.lat !== undefined) {
//         content += `Latitude: ${point.lat.toFixed(6)}<br>`;
//       }
//       if (selectedParams.longitude && point.lon !== undefined) {
//         content += `Longitude: ${point.lon.toFixed(6)}<br>`;
//       }
      
//       if (selectedParams.altitude && point.altitude !== undefined) {
//         content += `Altitude: ${point.altitude}m<br>`;
//       }
//       if (selectedParams.uin_no && point.uin_no && point.uin_no !== 'N/A') {
//         content += `UIN: ${point.uin_no}<br>`;
//       }
//       if (selectedParams.application && point.application && point.application !== 'Unknown') {
//         content += `Application: ${point.application}<br>`;
//       }
//       if (selectedParams.category && point.category && point.category !== 'General') {
//         content += `Category: ${point.category}<br>`;
//       }
      
//       return content;
//     }

//     trackerMarkers[trackerId] = [];

//     const startMarker = L.marker(latlngs[0], { icon: START_ICON })
//       .addTo(markersLayer)
//       .bindPopup(createPopupContent(trackerId, points[0], 'Start Point'));
//     trackerMarkers[trackerId].push(startMarker);

//     const endMarker = L.marker(latlngs.at(-1), { icon: END_ICON })
//       .addTo(markersLayer)
//       .bindPopup(createPopupContent(trackerId, points.at(-1), 'End Point'));
//     trackerMarkers[trackerId].push(endMarker);

//     const maxMarkers = 20;
//     const interval = Math.max(1, Math.floor(points.length / maxMarkers));
    
//     points.forEach((p, idx) => {
//       if (idx > 0 && idx < points.length - 1 && idx % interval === 0) {
//         const dotMarker = L.marker([p.lat, p.lon], {
//           icon: createDotIcon(color, 8)
//         })
//         .addTo(markersLayer)
//         .bindPopup(createPopupContent(trackerId, p, `Point ${idx+1}/${points.length}`));
        
//         trackerMarkers[trackerId].push(dotMarker);
//       }
//     });

//     updateMapBounds();
//   }

//   /* ================= DISPLAY ALL TRACKER DATA IN TABLE ================= */
//   function displayAllTrackerDataInTable(trackerId, points) {
//     if (!points || points.length === 0) return;
    
//     const selectedParams = window.getRealtimeParameters ? window.getRealtimeParameters(trackerId) : null;
    
//     if (!selectedParams) {
//       const defaultParams = {
//         timestamp: true,
//         latitude: true,
//         longitude: true,
//         altitude: true,
//         uin_no: true,
//         application: true,
//         category: true,
//         speed: true,
//         heading: true,
//         battery: true,
//         signal_strength: true
//       };
//       updateRealtimeTableWithAllData(trackerId, points, defaultParams);
//       return;
//     }
    
//     updateRealtimeTableWithAllData(trackerId, points, selectedParams);
//   }

//   /* ================= UPDATE REALTIME TABLE WITH ALL DATA ================= */
//   function updateRealtimeTableWithAllData(trackerId, points, selectedParams) {
//     const formattedDataArray = points.map(point => {
//       const formattedData = {
//         'Tracker ID': trackerId,
//         'timestamp': point.timestamp || point.time || new Date().toISOString(),
//         'latitude': point.latitude || point.lat,
//         'longitude': point.longitude || point.lon,
//         'altitude': point.altitude || 0,
//         'uin_no': point.uin_no || 'N/A',
//         'application': point.application || 'Unknown',
//         'category': point.category || 'General',
//         'speed': point.speed || 0,
//         'heading': point.heading || 0,
//         'battery': point.battery || 'N/A',
//         'signal_strength': point.signal_strength || 'N/A'
//       };
      
//       const filteredData = {};
//       Object.keys(formattedData).forEach(key => {
//         if (key === 'Tracker ID' || (selectedParams[key] && selectedParams[key] !== false)) {
//           filteredData[key] = formattedData[key];
//         }
//       });
      
//       return filteredData;
//     });
    
//     if (window.updateRealtimeTableWithMultipleEntries) {
//       window.updateRealtimeTableWithMultipleEntries(trackerId, formattedDataArray);
//     }
    
//     if (!window.realtimeTableData) {
//       window.realtimeTableData = {};
//     }
//     window.realtimeTableData[trackerId] = formattedDataArray;
    
//     const realtimePanel = document.getElementById('realtimeTablePanel');
//     if (realtimePanel && realtimePanel.classList.contains('minimized')) {
//       realtimePanel.classList.remove('minimized');
//       const chevron = document.getElementById('realtimeTablePanelChevron');
//       if (chevron) chevron.classList.remove('rotated');
//       const container = document.getElementById('realtimeTableContainer');
//       if (container) container.style.display = 'block';
//     }
//   }

//   /* ================= DIRECT TABLE UPDATE ================= */
//   window.updateRealtimeTableWithMultipleEntries = function(trackerId, dataArray) {
//     console.log('Updating table for tracker:', trackerId, 'with', dataArray.length, 'entries');
    
//     if (!window.realtimeTableData) {
//       window.realtimeTableData = {};
//     }
    
//     window.realtimeTableData[trackerId] = dataArray;
    
//     updateTrackerTableDirectly();
//   };

//   function updateTrackerTableDirectly() {
//     console.log('updateTrackerTableDirectly called');
    
//     // Get table elements
//     const tbody = document.getElementById('realtimeDataTableBody');
//     const thead = document.getElementById('realtimeDataTableHeader');
    
//     if (!tbody || !thead) {
//       console.error('Table elements not found!');
//       console.log('Available elements:');
//       console.log('tbody:', document.getElementById('realtimeDataTableBody'));
//       console.log('thead:', document.getElementById('realtimeDataTableHeader'));
//       console.log('table:', document.getElementById('realtimeDataTable'));
//       return;
//     }
    
//     const allData = [];
//     Object.keys(window.realtimeTableData || {}).forEach(trackerId => {
//       const trackerData = window.realtimeTableData[trackerId];
//       if (Array.isArray(trackerData)) {
//         trackerData.forEach(entry => {
//           allData.push({...entry, 'Tracker ID': trackerId});
//         });
//       }
//     });
    
//     console.log('Total data entries:', allData.length);
    
//     if (allData.length === 0) {
//       tbody.innerHTML = `
//         <tr class="no-data-row">
//           <td colspan="8">No tracker data available. Fetch a tracker first.</td>
//         </tr>
//       `;
//       return;
//     }
    
//     const allHeaders = new Set(['Tracker ID', 'timestamp', 'latitude', 'longitude', 'altitude', 'uin_no', 'application', 'category']);
//     allData.forEach(entry => {
//       Object.keys(entry).forEach(key => {
//         allHeaders.add(key);
//       });
//     });
    
//     const headers = Array.from(allHeaders);
    
//     const headerRow = thead.querySelector('tr');
//     if (headerRow) {
//       headerRow.innerHTML = '';
      
//       headers.forEach(header => {
//         const th = document.createElement('th');
//         th.textContent = formatHeaderText(header);
//         headerRow.appendChild(th);
//       });
//     }
    
//     tbody.innerHTML = '';
    
//     allData.sort((a, b) => {
//       const timeA = a.timestamp || a.time || '';
//       const timeB = b.timestamp || b.time || '';
//       return new Date(timeB) - new Date(timeA);
//     });
    
//     allData.forEach(entry => {
//       const row = document.createElement('tr');
      
//       headers.forEach(header => {
//         const td = document.createElement('td');
        
//         let value = entry[header];
//         if (value === undefined || value === null) {
//           value = '-';
//           td.style.color = '#9ca3af';
//         } else {
//           if (header === 'timestamp' || header === 'time') {
//             if (value && value !== '-') {
//               try {
//                 value = new Date(value).toLocaleString();
//               } catch (e) {}
//             }
//           } else if ((header === 'latitude' || header === 'longitude') && value && value !== '-') {
//             value = parseFloat(value).toFixed(6);
//           } else if (header === 'altitude' && value && value !== '-') {
//             value = `${parseFloat(value).toFixed(1)} m`;
//           } else if (header === 'speed' && value && value !== '-') {
//             value = `${parseFloat(value).toFixed(1)} km/h`;
//           } else if (header === 'heading' && value && value !== '-') {
//             value = `${parseFloat(value).toFixed(0)}°`;
//           }
//         }
        
//         td.textContent = value;
        
//         if (header === 'Tracker ID') {
//           td.className = 'tracker-id-cell';
//           td.style.fontWeight = '600';
//           td.style.color = '#6366f1';
//         }
        
//         row.appendChild(td);
//       });
      
//       tbody.appendChild(row);
//     });
    
//     const summaryRow = document.createElement('tr');
//     summaryRow.style.backgroundColor = '#f8fafc';
//     const summaryCell = document.createElement('td');
//     summaryCell.colSpan = headers.length;
//     summaryCell.style.textAlign = 'center';
//     summaryCell.style.padding = '10px';
//     summaryCell.style.fontStyle = 'italic';
//     summaryCell.style.color = '#6b7280';
//     summaryCell.textContent = `Showing ${allData.length} total entries`;
//     summaryRow.appendChild(summaryCell);
//     tbody.appendChild(summaryRow);
    
//     const realtimePanel = document.getElementById('realtimeTablePanel');
//     if (realtimePanel && realtimePanel.classList.contains('minimized')) {
//       console.log('Auto-expanding panel');
//       realtimePanel.classList.remove('minimized');
//       const chevron = document.getElementById('realtimeTablePanelChevron');
//       if (chevron) chevron.classList.remove('rotated');
//       const container = document.getElementById('realtimeTableContainer');
//       if (container) container.style.display = 'block';
//     }
    
//     console.log('Table updated successfully with', allData.length, 'entries');
//   }

//   function formatHeaderText(header) {
//     const formatMap = {
//       'timestamp': 'Timestamp',
//       'time': 'Time',
//       'latitude': 'Latitude',
//       'longitude': 'Longitude',
//       'altitude': 'Altitude',
//       'uin_no': 'UIN No',
//       'application': 'Application',
//       'category': 'Category',
//       'speed': 'Speed',
//       'heading': 'Heading',
//       'battery': 'Battery',
//       'signal_strength': 'Signal Strength',
//       'Tracker ID': 'Tracker ID'
//     };
//     return formatMap[header] || header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
//   }

//   window.updateRealtimeTable = function(trackerId, data) {
//     if (trackerId && data) {
//       if (!Array.isArray(data)) {
//         data = [data];
//       }
//       window.updateRealtimeTableWithMultipleEntries(trackerId, data);
//     } else {
//       updateTrackerTableDirectly();
//     }
//   };

//   /* ================= GROUP FETCH ================= */
//   window.fetchGroupTrackers = function (trackerIds) {
//     if (!trackerIds?.length) return alert('Group empty');
    
//     const visibleTrackers = trackerIds.filter(id => isTrackerVisible(id));
    
//     if (visibleTrackers.length === 0) {
//       alert('No visible trackers in this group');
//       return;
//     }
    
//     clearMap();
    
//     if (window.realtimeTableData) {
//       window.realtimeTableData = {};
//     }
//     if (window.updateRealtimeTable) {
//       window.updateRealtimeTable();
//     }
    
//     const promises = visibleTrackers.map((id, i) => {
//       return new Promise(resolve => {
//         setTimeout(async () => {
//           try {
//             await window.fetchSingleTrackerAllData(id, false);
//           } catch (err) {
//             console.error(`Failed to fetch tracker ${id}:`, err);
//           }
//           resolve();
//         }, i * 500);
//       });
//     });
    
//     Promise.all(promises).then(() => {
//       showStatus(`Loaded all trackers for group`, 'success');
//     });
//   };

//   /* ================= SENSOR DATA FUNCTIONS ================= */
  
//   // This function will be called from the HTML
//   window.updateSensorTable = function(sensorId, sensorReadings) {
//     console.log('updateSensorTable called for:', sensorId, 'with', sensorReadings.length, 'readings');
    
//     if (!window.sensorTableData) {
//       window.sensorTableData = {};
//     }
    
//     if (sensorId && sensorReadings) {
//       if (!Array.isArray(sensorReadings)) {
//         sensorReadings = [sensorReadings];
//       }
      
//       if (!window.sensorTableData[sensorId]) {
//         window.sensorTableData[sensorId] = [];
//       }
      
//       // Add new readings
//       sensorReadings.forEach(reading => {
//         // Ensure sensorId is set
//         reading.sensorId = sensorId;
        
//         // Ensure timestamp exists
//         if (!reading.timestamp && !reading.Timestamp) {
//           reading.timestamp = new Date().toISOString();
//         } else {
//           reading.timestamp = reading.timestamp || reading.Timestamp;
//         }
        
//         // Check if this reading already exists
//         const exists = window.sensorTableData[sensorId].some(existing => 
//           (existing.Id && existing.Id === reading.Id) || 
//           (existing.timestamp && existing.timestamp === reading.timestamp)
//         );
        
//         if (!exists) {
//           window.sensorTableData[sensorId].unshift(reading);
//         }
//       });
      
//       // Keep only last 100 entries per sensor
//       if (window.sensorTableData[sensorId].length > 100) {
//         window.sensorTableData[sensorId] = window.sensorTableData[sensorId].slice(0, 100);
//       }
//     }
    
//     // Update the sensor table display
//     updateSensorTableDirectly();
//   };

//   function updateSensorTableDirectly() {
//     console.log('updateSensorTableDirectly called');
    
//     const tbody = document.getElementById('sensorDataTableBody');
//     const thead = document.getElementById('sensorDataTableHeader');
    
//     if (!tbody || !thead) {
//       console.error('Sensor table elements not found!');
//       return;
//     }
    
//     // Collect all sensor data from all sensors
//     const allSensorData = [];
//     Object.keys(window.sensorTableData || {}).forEach(sensorId => {
//       (window.sensorTableData[sensorId] || []).forEach(reading => {
//         allSensorData.push(reading);
//       });
//     });
    
//     console.log('Total sensor data entries:', allSensorData.length);
    
//     if (allSensorData.length === 0) {
//       tbody.innerHTML = `
//         <tr class="no-data-row">
//           <td colspan="12">No sensor data available. Fetch a sensor first.</td>
//         </tr>
//       `;
//       return;
//     }
    
//     // Clear and rebuild table
//     tbody.innerHTML = '';
    
//     // Sort by timestamp (newest first)
//     allSensorData.sort((a, b) => {
//       const timeA = a.timestamp || a.Timestamp || '';
//       const timeB = b.timestamp || b.Timestamp || '';
//       return new Date(timeB) - new Date(timeA);
//     });
    
//     // Add all rows
//     allSensorData.forEach((sensorData, index) => {
//       const row = document.createElement('tr');
      
//       // Sensor ID
//       const idCell = document.createElement('td');
//       idCell.className = 'sensor-id-cell';
//       idCell.textContent = sensorData.sensorId || sensorData.SensorId || 'N/A';
//       row.appendChild(idCell);
      
//       // Timestamp
//       const timeCell = document.createElement('td');
//       const timestamp = sensorData.timestamp || sensorData.Timestamp;
//       if (timestamp) {
//         try {
//           timeCell.textContent = new Date(timestamp).toLocaleString();
//         } catch (e) {
//           timeCell.textContent = timestamp;
//         }
//       } else {
//         timeCell.textContent = '-';
//       }
//       row.appendChild(timeCell);
      
//       // Latitude
//       const latCell = document.createElement('td');
//       latCell.textContent = sensorData.Latitude !== undefined ? sensorData.Latitude.toFixed(6) : '-';
//       row.appendChild(latCell);
      
//       // Longitude
//       const lonCell = document.createElement('td');
//       lonCell.textContent = sensorData.Longitude !== undefined ? sensorData.Longitude.toFixed(6) : '-';
//       row.appendChild(lonCell);
      
//       // Moisture
//       const moistureCell = document.createElement('td');
//       moistureCell.textContent = sensorData.Moisture !== undefined ? sensorData.Moisture : '-';
//       row.appendChild(moistureCell);
      
//       // Temperature
//       const tempCell = document.createElement('td');
//       tempCell.textContent = sensorData.Temperature !== undefined ? sensorData.Temperature : '-';
//       row.appendChild(tempCell);
      
//       // EC
//       const ecCell = document.createElement('td');
//       ecCell.textContent = sensorData.EC !== undefined ? sensorData.EC : '-';
//       row.appendChild(ecCell);
      
//       // pH Value
//       const phCell = document.createElement('td');
//       phCell.textContent = sensorData.PHValue !== undefined ? sensorData.PHValue : '-';
//       row.appendChild(phCell);
      
//       // Nitrogen
//       const nitrogenCell = document.createElement('td');
//       nitrogenCell.textContent = sensorData.Nitrogen !== undefined ? sensorData.Nitrogen : '-';
//       row.appendChild(nitrogenCell);
      
//       // Phosphorous
//       const phosphorousCell = document.createElement('td');
//       phosphorousCell.textContent = sensorData.Phosphorous !== undefined ? sensorData.Phosphorous : '-';
//       row.appendChild(phosphorousCell);
      
//       // Potassium
//       const potassiumCell = document.createElement('td');
//       potassiumCell.textContent = sensorData.Potassium !== undefined ? sensorData.Potassium : '-';
//       row.appendChild(potassiumCell);
      
//       // Satellite Fix
//       const satCell = document.createElement('td');
//       satCell.textContent = sensorData.SatelliteFix !== undefined ? sensorData.SatelliteFix : '-';
//       row.appendChild(satCell);
      
//       tbody.appendChild(row);
//     });
    
//     // Add summary row
//     const summaryRow = document.createElement('tr');
//     summaryRow.style.backgroundColor = '#f8fafc';
//     const summaryCell = document.createElement('td');
//     summaryCell.colSpan = 12;
//     summaryCell.style.textAlign = 'center';
//     summaryCell.style.padding = '10px';
//     summaryCell.style.fontStyle = 'italic';
//     summaryCell.style.color = '#6b7280';
//     summaryCell.textContent = `Showing ${allSensorData.length} total sensor readings`;
//     summaryRow.appendChild(summaryCell);
//     tbody.appendChild(summaryRow);
    
//     // Ensure sensor panel is expanded
//     const sensorPanel = document.getElementById('sensorTablePanel');
//     if (sensorPanel && sensorPanel.classList.contains('minimized')) {
//       sensorPanel.classList.remove('minimized');
//       const chevron = document.getElementById('sensorTablePanelChevron');
//       if (chevron) chevron.classList.remove('rotated');
//       const container = document.getElementById('sensorTableContainer');
//       if (container) container.style.display = 'block';
//     }
    
//     console.log('Sensor table updated successfully with', allSensorData.length, 'entries');
//   }

//   /* ================= SENSOR FETCH HANDLER ================= */
//   window.fetchSensorData = function(sensorId) {
//     window.fetchSingleSensorAllData(sensorId, false);
//   };

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


  

//   /* ================= HELPERS ================= */
//   function clearMap() {
//     markersLayer.clearLayers();
//     polylineLayer.clearLayers();
//     Object.keys(trackerPolylines).forEach(k => delete trackerPolylines[k]);
//     Object.keys(trackerMarkers).forEach(k => delete trackerMarkers[k]);
//     Object.keys(trackerAllData).forEach(k => delete trackerAllData[k]);
//     updateLegend();
    
//     if (imagesGrid) {
//       imagesGrid.innerHTML = '';
//     }
//   }

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

//   window.handleFetch = function(trackerId) {
//     window.fetchSingleTrackerAllData(trackerId, true);
//   };

//   window.handleFetchSensor = function(sensorId) {
//     window.fetchSingleSensorAllData(sensorId, false);
//   };

//   // Initialize global objects
//   window.trajectoryOverlays = {};
//   window.realtimeTableData = {};
//   window.sensorTableData = {};

//   // Fetch data for saved trackers on page load
//   window.addEventListener('load', function() {
//     const savedTrackers = JSON.parse(localStorage.getItem('saved_trackers')) || [];
//     const savedSensors = JSON.parse(localStorage.getItem('saved_sensors')) || [];
    
//     console.log('Page loaded, saved trackers:', savedTrackers);
//     console.log('Page loaded, saved sensors:', savedSensors);
    
//     if (savedTrackers.length > 0) {
//       showStatus(`Loading ${savedTrackers.length} saved trackers...`, 'loading');
      
//       // Load first tracker immediately
//       setTimeout(() => {
//         if (savedTrackers[0]) {
//           window.fetchSingleTrackerAllData(savedTrackers[0], true);
//         }
        
//         // Load remaining trackers with delay
//         savedTrackers.slice(1).forEach((trackerId, index) => {
//           setTimeout(() => {
//             window.fetchSingleTrackerAllData(trackerId, false);
//           }, (index + 1) * 1000);
//         });
//       }, 1000);
//     }
    
//     if (savedSensors.length > 0) {
//       showStatus(`Loading ${savedSensors.length} saved sensors...`, 'loading');
      
//       setTimeout(() => {
//         savedSensors.forEach((sensorId, index) => {
//           setTimeout(() => {
//             window.fetchSingleSensorAllData(sensorId, false);
//           }, index * 1000);
//         });
//       }, 2000);
//     }
    
//     // Initialize tables
//     updateTrackerTableDirectly();
//     updateSensorTableDirectly();
//   });
  
//   // Initialize fetch buttons
//   if (fetchBtn) {
//     fetchBtn.addEventListener('click', () => {
//       const id = trackerInput.value.trim();
//       if (id) window.fetchSingleTrackerAllData(id, true);
//     });
//   }
  
//   // Initialize sensor fetch button
//   const fetchSensorBtn = document.getElementById('fetch-sensor-btn');
//   if (fetchSensorBtn) {
//     fetchSensorBtn.addEventListener('click', () => {
//       const id = sensorInput.value.trim();
//       if (id) window.fetchSingleSensorAllData(id, false);
//     });
//   }
  
//   console.log('fetchdata.js initialization complete');
// });























// document.addEventListener('DOMContentLoaded', function () {
//   console.log('fetchdata.js loaded');
  
//   /* ================= DOM ================= */
//   const fetchBtn = document.getElementById('fetch-btn');
//   const trackerInput = document.getElementById('tracker-id');
//   const sensorInput = document.getElementById('sensor-id');
//   const statusMessage = document.getElementById('status-message');
//   const lastUpdatedDiv = document.querySelector('.last-updated');
//   const imagesGrid = document.getElementById('images-grid');

//   /* ================= MAP ================= */
//   const map = L.map('map').setView([23.0225, 72.5714], 13);

//   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     maxZoom: 19
//   }).addTo(map);

//   const markersLayer = L.layerGroup().addTo(map);
//   const polylineLayer = L.layerGroup().addTo(map);

//   let lastUpdateTime = null;
//   let activeGroup = null;

//   /* ================= TRACKER STATE ================= */
//   const trackerPolylines = {};
//   const trackerMarkers = {};
//   const trackerColorMap = {};
//   const trackerVisibility = {};
//   const trackerAllData = {};

//   const COLORS = ['#2563eb', '#eab308', '#9333ea', '#ea580c', '#0891b2', '#4f46e5'];
//   let colorIndex = 0;

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

//   function createDotIcon(color, size = 8) {
//     return L.divIcon({
//       className: '',
//       html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;"></div>`,
//       iconSize: [size, size],
//       iconAnchor: [size / 2, size / 2]
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
//         <span style="font-weight:600;">Start</span>
//       </div>
//       <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
//         ${pin('red')}
//         <span style="font-weight:600;">End</span>
//       </div>
//       <hr style="margin:6px 0">
//     `;

//     Object.entries(trackerColorMap).forEach(([id, color]) => {
//       if (isTrackerVisible(id)) {
//         html += `
//           <div style="display:flex;align-items:center;gap:6px;">
//             <span style="color:${color};font-size:14px;">●</span>
//             ${id}
//           </div>
//         `;
//       }
//     });

//     div.innerHTML = html;
//   }

//   /* ================= FETCH SINGLE TRACKER (ALL HISTORICAL DATA) ================= */
//   window.fetchSingleTrackerAllData = async function(trackerId, clearBefore = false) {
//     console.log('fetchSingleTrackerAllData called for:', trackerId);
    
//     if (!trackerId) return;

//     if (clearBefore) {
//       clearMap();
//     }

//     const color = getTrackerColor(trackerId);
//     trackerVisibility[trackerId] = true;
//     showStatus(`Fetching ALL historical data for tracker ${trackerId}...`, 'loading');

//     try {
//       console.log(`Calling /api/trajectory/all for ${trackerId}`);
      
//       const res = await fetch('/api/trajectory/all', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           tracker_id: trackerId
//         })
//       });

//       console.log(`Response status: ${res.status}`);
      
//       if (!res.ok) {
//         const errorText = await res.text();
//         console.error(`API error: ${res.status}`, errorText);
//         throw new Error(`Server error: ${res.status}`);
//       }

//       const data = await res.json();
//       console.log(`API response received for ${trackerId}:`, {
//         tracker_id: data.tracker_id,
//         total_points: data.total_points,
//         points_length: data.points ? data.points.length : 0
//       });
      
//       let points = [];
//       if (data.points && Array.isArray(data.points)) {
//         console.log(`Processing ${data.points.length} points for ${trackerId}`);
//         points = data.points.map(p => ({
//           lat: +p.lat,
//           lon: +p.lon,
//           time: p.timestamp,
//           timestamp: p.timestamp,
//           latitude: +p.lat,
//           longitude: +p.lon,
//           altitude: p.altitude || 0,
//           uin_no: p.uin_no || 'N/A',
//           application: p.application || 'Unknown',
//           category: p.category || 'General',
//           speed: p.speed || 0,
//           heading: p.heading || 0,
//           battery: p.battery || 'N/A',
//           signal_strength: p.signal_strength || 'N/A'
//         }));
//         console.log(`Successfully processed ${points.length} points`);
//       } else {
//         console.warn(`No points array in response for ${trackerId}`, data);
//       }

//       if (points.length === 0) {
//         console.warn(`No data points found for ${trackerId}`);
//         showStatus(`No data found for tracker ${trackerId}`, 'error');
//         return;
//       }

//       plotTrackerPath(trackerId, points, color);
//       displayAllTrackerDataInTable(trackerId, points);

//       lastUpdateTime = new Date();
//       updateLastUpdatedTime();
//       showStatus(`Loaded ${points.length} data points for tracker ${trackerId}`, 'success');
//       console.log(`Successfully loaded ${points.length} points for ${trackerId}`);

//     } catch (err) {
//       console.error(`Error fetching data for ${trackerId}:`, err);
//       showStatus(`${trackerId}: ${err.message}`, 'error');
      
//       try {
//         console.log(`Trying fallback endpoint for ${trackerId}`);
//         const fallbackRes = await fetch('/api/trajectory', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             tracker_id: trackerId,
//             interval_seconds: 0,
//             max_gap_seconds: 86400
//           })
//         });
        
//         if (fallbackRes.ok) {
//           const fallbackData = await fallbackRes.json();
//           console.log(`Fallback response for ${trackerId}:`, {
//             points_length: fallbackData.points ? fallbackData.points.length : 0
//           });
          
//           let points = [];
//           if (fallbackData.points && Array.isArray(fallbackData.points)) {
//             points = fallbackData.points.map(p => ({
//               lat: +p.lat,
//               lon: +p.lon,
//               time: p.timestamp,
//               timestamp: p.timestamp,
//               latitude: +p.lat,
//               longitude: +p.lon,
//               altitude: p.altitude || 0,
//               uin_no: p.uin_no || 'N/A',
//               application: p.application || 'Unknown',
//               category: p.category || 'General'
//             }));
//           }
          
//           if (points.length > 0) {
//             plotTrackerPath(trackerId, points, color);
//             displayAllTrackerDataInTable(trackerId, points);
//             lastUpdateTime = new Date();
//             updateLastUpdatedTime();
//             showStatus(`Loaded ${points.length} data points for tracker ${trackerId} (using fallback)`, 'success');
//           }
//         }
//       } catch (fallbackErr) {
//         console.error(`Fallback failed for ${trackerId}:`, fallbackErr);
//       }
//     }
//   };

//   /* ================= PLOT ALL POINTS ================= */
//   function plotTrackerPath(trackerId, points, color) {
//     if (!points.length) return;

//     if (!isTrackerVisible(trackerId)) {
//       console.log(`${trackerId} is hidden, not plotting`);
//       return;
//     }

//     const latlngs = points.map(p => [p.lat, p.lon]);

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

//     const selectedParams = window.getRealtimeParameters ? window.getRealtimeParameters(trackerId) : {};

//     function createPopupContent(trackerId, point, label) {
//       let content = `<b>${trackerId}</b><br>${label}<br>`;
      
//       if (point.time) {
//         content += `Time: ${formatTimestamp(point.time)}<br>`;
//       }
      
//       if (selectedParams.latitude && point.lat !== undefined) {
//         content += `Latitude: ${point.lat.toFixed(6)}<br>`;
//       }
//       if (selectedParams.longitude && point.lon !== undefined) {
//         content += `Longitude: ${point.lon.toFixed(6)}<br>`;
//       }
      
//       if (selectedParams.altitude && point.altitude !== undefined) {
//         content += `Altitude: ${point.altitude}m<br>`;
//       }
//       if (selectedParams.uin_no && point.uin_no && point.uin_no !== 'N/A') {
//         content += `UIN: ${point.uin_no}<br>`;
//       }
//       if (selectedParams.application && point.application && point.application !== 'Unknown') {
//         content += `Application: ${point.application}<br>`;
//       }
//       if (selectedParams.category && point.category && point.category !== 'General') {
//         content += `Category: ${point.category}<br>`;
//       }
      
//       return content;
//     }

//     trackerMarkers[trackerId] = [];

//     const startMarker = L.marker(latlngs[0], { icon: START_ICON })
//       .addTo(markersLayer)
//       .bindPopup(createPopupContent(trackerId, points[0], 'Start Point'));
//     trackerMarkers[trackerId].push(startMarker);

//     const endMarker = L.marker(latlngs.at(-1), { icon: END_ICON })
//       .addTo(markersLayer)
//       .bindPopup(createPopupContent(trackerId, points.at(-1), 'End Point'));
//     trackerMarkers[trackerId].push(endMarker);

//     const maxMarkers = 20;
//     const interval = Math.max(1, Math.floor(points.length / maxMarkers));
    
//     points.forEach((p, idx) => {
//       if (idx > 0 && idx < points.length - 1 && idx % interval === 0) {
//         const dotMarker = L.marker([p.lat, p.lon], {
//           icon: createDotIcon(color, 8)
//         })
//         .addTo(markersLayer)
//         .bindPopup(createPopupContent(trackerId, p, `Point ${idx+1}/${points.length}`));
        
//         trackerMarkers[trackerId].push(dotMarker);
//       }
//     });

//     updateMapBounds();
//   }

//   /* ================= DISPLAY ALL TRACKER DATA IN TABLE ================= */
//   function displayAllTrackerDataInTable(trackerId, points) {
//     if (!points || points.length === 0) return;
    
//     const selectedParams = window.getRealtimeParameters ? window.getRealtimeParameters(trackerId) : null;
    
//     if (!selectedParams) {
//       const defaultParams = {
//         timestamp: true,
//         latitude: true,
//         longitude: true,
//         altitude: true,
//         uin_no: true,
//         application: true,
//         category: true,
//         speed: true,
//         heading: true,
//         battery: true,
//         signal_strength: true
//       };
//       updateRealtimeTableWithAllData(trackerId, points, defaultParams);
//       return;
//     }
    
//     updateRealtimeTableWithAllData(trackerId, points, selectedParams);
//   }

//   /* ================= UPDATE REALTIME TABLE WITH ALL DATA ================= */
//   function updateRealtimeTableWithAllData(trackerId, points, selectedParams) {
//     const formattedDataArray = points.map(point => {
//       const formattedData = {
//         'Tracker ID': trackerId,
//         'timestamp': point.timestamp || point.time || new Date().toISOString(),
//         'latitude': point.latitude || point.lat,
//         'longitude': point.longitude || point.lon,
//         'altitude': point.altitude || 0,
//         'uin_no': point.uin_no || 'N/A',
//         'application': point.application || 'Unknown',
//         'category': point.category || 'General',
//         'speed': point.speed || 0,
//         'heading': point.heading || 0,
//         'battery': point.battery || 'N/A',
//         'signal_strength': point.signal_strength || 'N/A'
//       };
      
//       const filteredData = {};
//       Object.keys(formattedData).forEach(key => {
//         if (key === 'Tracker ID' || (selectedParams[key] && selectedParams[key] !== false)) {
//           filteredData[key] = formattedData[key];
//         }
//       });
      
//       return filteredData;
//     });
    
//     if (window.updateRealtimeTableWithMultipleEntries) {
//       window.updateRealtimeTableWithMultipleEntries(trackerId, formattedDataArray);
//     }
    
//     if (!window.realtimeTableData) {
//       window.realtimeTableData = {};
//     }
//     window.realtimeTableData[trackerId] = formattedDataArray;
    
//     const realtimePanel = document.getElementById('realtimeTablePanel');
//     if (realtimePanel && realtimePanel.classList.contains('minimized')) {
//       realtimePanel.classList.remove('minimized');
//       const chevron = document.getElementById('realtimeTablePanelChevron');
//       if (chevron) chevron.classList.remove('rotated');
//       const container = document.getElementById('realtimeTableContainer');
//       if (container) container.style.display = 'block';
//     }
//   }

//   /* ================= DIRECT TABLE UPDATE ================= */
//   window.updateRealtimeTableWithMultipleEntries = function(trackerId, dataArray) {
//     console.log('Updating table for tracker:', trackerId, 'with', dataArray.length, 'entries');
    
//     if (!window.realtimeTableData) {
//       window.realtimeTableData = {};
//     }
    
//     window.realtimeTableData[trackerId] = dataArray;
    
//     updateTrackerTableDirectly();
//   };

//   function updateTrackerTableDirectly() {
//     console.log('updateTrackerTableDirectly called');
    
//     // Get table elements - FIXED: Using correct IDs
//     const tbody = document.getElementById('realtimeDataTableBody');
//     const thead = document.getElementById('realtimeDataTableHeader');
    
//     if (!tbody || !thead) {
//       console.error('Table elements not found!');
//       console.log('Available elements:');
//       console.log('tbody:', document.getElementById('realtimeDataTableBody'));
//       console.log('thead:', document.getElementById('realtimeDataTableHeader'));
//       console.log('table:', document.getElementById('realtimeDataTable'));
//       return;
//     }
    
//     const allData = [];
//     Object.keys(window.realtimeTableData || {}).forEach(trackerId => {
//       const trackerData = window.realtimeTableData[trackerId];
//       if (Array.isArray(trackerData)) {
//         trackerData.forEach(entry => {
//           allData.push({...entry, 'Tracker ID': trackerId});
//         });
//       }
//     });
    
//     console.log('Total data entries:', allData.length);
    
//     if (allData.length === 0) {
//       tbody.innerHTML = `
//         <tr class="no-data-row">
//           <td colspan="8">No tracker data available. Fetch a tracker first.</td>
//         </tr>
//       `;
//       return;
//     }
    
//     const allHeaders = new Set(['Tracker ID', 'timestamp', 'latitude', 'longitude', 'altitude', 'uin_no', 'application', 'category']);
//     allData.forEach(entry => {
//       Object.keys(entry).forEach(key => {
//         allHeaders.add(key);
//       });
//     });
    
//     const headers = Array.from(allHeaders);
    
//     const headerRow = thead.querySelector('tr');
//     if (headerRow) {
//       headerRow.innerHTML = '';
      
//       headers.forEach(header => {
//         const th = document.createElement('th');
//         th.textContent = formatHeaderText(header);
//         headerRow.appendChild(th);
//       });
//     }
    
//     tbody.innerHTML = '';
    
//     allData.sort((a, b) => {
//       const timeA = a.timestamp || a.time || '';
//       const timeB = b.timestamp || b.time || '';
//       return new Date(timeB) - new Date(timeA);
//     });
    
//     allData.forEach(entry => {
//       const row = document.createElement('tr');
      
//       headers.forEach(header => {
//         const td = document.createElement('td');
        
//         let value = entry[header];
//         if (value === undefined || value === null) {
//           value = '-';
//           td.style.color = '#9ca3af';
//         } else {
//           if (header === 'timestamp' || header === 'time') {
//             if (value && value !== '-') {
//               try {
//                 value = new Date(value).toLocaleString();
//               } catch (e) {}
//             }
//           } else if ((header === 'latitude' || header === 'longitude') && value && value !== '-') {
//             value = parseFloat(value).toFixed(6);
//           } else if (header === 'altitude' && value && value !== '-') {
//             value = `${parseFloat(value).toFixed(1)} m`;
//           } else if (header === 'speed' && value && value !== '-') {
//             value = `${parseFloat(value).toFixed(1)} km/h`;
//           } else if (header === 'heading' && value && value !== '-') {
//             value = `${parseFloat(value).toFixed(0)}°`;
//           }
//         }
        
//         td.textContent = value;
        
//         if (header === 'Tracker ID') {
//           td.className = 'tracker-id-cell';
//           td.style.fontWeight = '600';
//           td.style.color = '#6366f1';
//         }
        
//         row.appendChild(td);
//       });
      
//       tbody.appendChild(row);
//     });
    
//     const summaryRow = document.createElement('tr');
//     summaryRow.style.backgroundColor = '#f8fafc';
//     const summaryCell = document.createElement('td');
//     summaryCell.colSpan = headers.length;
//     summaryCell.style.textAlign = 'center';
//     summaryCell.style.padding = '10px';
//     summaryCell.style.fontStyle = 'italic';
//     summaryCell.style.color = '#6b7280';
//     summaryCell.textContent = `Showing ${allData.length} total entries`;
//     summaryRow.appendChild(summaryCell);
//     tbody.appendChild(summaryRow);
    
//     const realtimePanel = document.getElementById('realtimeTablePanel');
//     if (realtimePanel && realtimePanel.classList.contains('minimized')) {
//       console.log('Auto-expanding panel');
//       realtimePanel.classList.remove('minimized');
//       const chevron = document.getElementById('realtimeTablePanelChevron');
//       if (chevron) chevron.classList.remove('rotated');
//       const container = document.getElementById('realtimeTableContainer');
//       if (container) container.style.display = 'block';
//     }
    
//     console.log('Table updated successfully with', allData.length, 'entries');
//   }

//   function formatHeaderText(header) {
//     const formatMap = {
//       'timestamp': 'Timestamp',
//       'time': 'Time',
//       'latitude': 'Latitude',
//       'longitude': 'Longitude',
//       'altitude': 'Altitude',
//       'uin_no': 'UIN No',
//       'application': 'Application',
//       'category': 'Category',
//       'speed': 'Speed',
//       'heading': 'Heading',
//       'battery': 'Battery',
//       'signal_strength': 'Signal Strength',
//       'Tracker ID': 'Tracker ID'
//     };
//     return formatMap[header] || header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
//   }

//   window.updateRealtimeTable = function(trackerId, data) {
//     if (trackerId && data) {
//       if (!Array.isArray(data)) {
//         data = [data];
//       }
//       window.updateRealtimeTableWithMultipleEntries(trackerId, data);
//     } else {
//       updateTrackerTableDirectly();
//     }
//   };

//   /* ================= GROUP FETCH ================= */
//   window.fetchGroupTrackers = function (trackerIds) {
//     if (!trackerIds?.length) return alert('Group empty');
    
//     const visibleTrackers = trackerIds.filter(id => isTrackerVisible(id));
    
//     if (visibleTrackers.length === 0) {
//       alert('No visible trackers in this group');
//       return;
//     }
    
//     clearMap();
    
//     if (window.realtimeTableData) {
//       window.realtimeTableData = {};
//     }
//     if (window.updateRealtimeTable) {
//       window.updateRealtimeTable();
//     }
    
//     const promises = visibleTrackers.map((id, i) => {
//       return new Promise(resolve => {
//         setTimeout(async () => {
//           try {
//             await window.fetchSingleTrackerAllData(id, false);
//           } catch (err) {
//             console.error(`Failed to fetch tracker ${id}:`, err);
//           }
//           resolve();
//         }, i * 500);
//       });
//     });
    
//     Promise.all(promises).then(() => {
//       showStatus(`Loaded all trackers for group`, 'success');
//     });
//   };

//   /* ================= FETCH SENSOR DATA ================= */
//   window.fetchSensorData = async function(sensorId) {
//     if (!sensorId) return;
    
//     showStatus(`Fetching sensor data for ${sensorId}...`, 'loading');
    
//     try {
//       const res = await fetch('/api/sensor', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ sensor_id: sensorId })
//       });
      
//       if (!res.ok) throw new Error('Sensor fetch failed');
      
//       const data = await res.json();
      
//       if (data.error) {
//         showStatus(`Sensor ${sensorId}: ${data.error}`, 'error');
//         return;
//       }
      
//       if (window.updateSensorTable) {
//         window.updateSensorTable(sensorId, data);
//       }
      
//       showStatus(`Sensor ${sensorId} data loaded`, 'success');
//     } catch (err) {
//       showStatus(`Sensor error: ${err.message}`, 'error');
//     }
//   };

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

//   /* ================= HELPERS ================= */
//   function clearMap() {
//     markersLayer.clearLayers();
//     polylineLayer.clearLayers();
//     Object.keys(trackerPolylines).forEach(k => delete trackerPolylines[k]);
//     Object.keys(trackerMarkers).forEach(k => delete trackerMarkers[k]);
//     Object.keys(trackerAllData).forEach(k => delete trackerAllData[k]);
//     updateLegend();
    
//     if (imagesGrid) {
//       imagesGrid.innerHTML = '';
//     }
//   }

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

//   window.handleFetch = function(trackerId) {
//     window.fetchSingleTrackerAllData(trackerId, true);
//   };

//   // Initialize global objects
//   window.trajectoryOverlays = {};
//   window.realtimeTableData = {};
//   window.sensorTableData = {};

//   // Fetch data for saved trackers on page load
//   window.addEventListener('load', function() {
//     const savedTrackers = JSON.parse(localStorage.getItem('saved_trackers')) || [];
//     const savedSensors = JSON.parse(localStorage.getItem('saved_sensors')) || [];
    
//     console.log('Page loaded, saved trackers:', savedTrackers);
//     console.log('Page loaded, saved sensors:', savedSensors);
    
//     if (savedTrackers.length > 0) {
//       showStatus(`Loading ${savedTrackers.length} saved trackers...`, 'loading');
      
//       // Load first tracker immediately
//       setTimeout(() => {
//         if (savedTrackers[0]) {
//           window.fetchSingleTrackerAllData(savedTrackers[0], true);
//         }
        
//         // Load remaining trackers with delay
//         savedTrackers.slice(1).forEach((trackerId, index) => {
//           setTimeout(() => {
//             window.fetchSingleTrackerAllData(trackerId, false);
//           }, (index + 1) * 1000);
//         });
//       }, 1000);
//     }
    
//     if (savedSensors.length > 0) {
//       setTimeout(() => {
//         savedSensors.forEach((sensorId, index) => {
//           setTimeout(() => {
//             if (window.fetchSensorData) {
//               window.fetchSensorData(sensorId);
//             }
//           }, index * 1000);
//         });
//       }, 2000);
//     }
    
//     // Initialize table
//     updateTrackerTableDirectly();
//   });
  
//   // Initialize fetch button
//   if (fetchBtn) {
//     fetchBtn.addEventListener('click', () => {
//       const id = trackerInput.value.trim();
//       if (id) window.fetchSingleTrackerAllData(id, true);
//     });
//   }
  
//   console.log('fetchdata.js initialization complete');
// });

















// document.addEventListener('DOMContentLoaded', function () {
//   console.log('fetchdata.js loaded');
  
//   /* ================= DOM ================= */
//   const fetchBtn = document.getElementById('fetch-btn');
//   const trackerInput = document.getElementById('tracker-id');
//   const sensorInput = document.getElementById('sensor-id');
//   const statusMessage = document.getElementById('status-message');
//   const lastUpdatedDiv = document.querySelector('.last-updated');
//   const imagesGrid = document.getElementById('images-grid');

//   /* ================= MAP ================= */
//   const map = L.map('map').setView([23.0225, 72.5714], 13);

//   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     maxZoom: 19
//   }).addTo(map);

//   const markersLayer = L.layerGroup().addTo(map);
//   const polylineLayer = L.layerGroup().addTo(map);

//   let lastUpdateTime = null;
//   let activeGroup = null;

//   /* ================= TRACKER STATE ================= */
//   const trackerPolylines = {};
//   const trackerMarkers = {};
//   const trackerColorMap = {};
//   const trackerVisibility = {};
//   const trackerAllData = {};

//   const COLORS = ['#2563eb', '#eab308', '#9333ea', '#ea580c', '#0891b2', '#4f46e5'];
//   let colorIndex = 0;

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

//   function createDotIcon(color, size = 8) {
//     return L.divIcon({
//       className: '',
//       html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;"></div>`,
//       iconSize: [size, size],
//       iconAnchor: [size / 2, size / 2]
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
//         <span style="font-weight:600;">Start</span>
//       </div>
//       <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
//         ${pin('red')}
//         <span style="font-weight:600;">End</span>
//       </div>
//       <hr style="margin:6px 0">
//     `;

//     Object.entries(trackerColorMap).forEach(([id, color]) => {
//       if (isTrackerVisible(id)) {
//         html += `
//           <div style="display:flex;align-items:center;gap:6px;">
//             <span style="color:${color};font-size:14px;">●</span>
//             ${id}
//           </div>
//         `;
//       }
//     });

//     div.innerHTML = html;
//   }

//   /* ================= FETCH SINGLE TRACKER (ALL HISTORICAL DATA) ================= */
//   window.fetchSingleTrackerAllData = async function(trackerId, clearBefore = false) {
//     console.log('fetchSingleTrackerAllData called for:', trackerId);
    
//     if (!trackerId) return;

//     if (clearBefore) {
//       clearMap();
//     }

//     const color = getTrackerColor(trackerId);
//     trackerVisibility[trackerId] = true;
//     showStatus(`Fetching ALL historical data for tracker ${trackerId}...`, 'loading');

//     try {
//       console.log(`Calling /api/trajectory/all for ${trackerId}`);
      
//       const res = await fetch('/api/trajectory/all', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           tracker_id: trackerId
//         })
//       });

//       console.log(`Response status: ${res.status}`);
      
//       if (!res.ok) {
//         const errorText = await res.text();
//         console.error(`API error: ${res.status}`, errorText);
//         throw new Error(`Server error: ${res.status}`);
//       }

//       const data = await res.json();
//       console.log(`API response received for ${trackerId}:`, {
//         tracker_id: data.tracker_id,
//         total_points: data.total_points,
//         points_length: data.points ? data.points.length : 0
//       });
      
//       let points = [];
//       if (data.points && Array.isArray(data.points)) {
//         console.log(`Processing ${data.points.length} points for ${trackerId}`);
//         points = data.points.map(p => ({
//           lat: +p.lat,
//           lon: +p.lon,
//           time: p.timestamp,
//           timestamp: p.timestamp,
//           latitude: +p.lat,
//           longitude: +p.lon,
//           altitude: p.altitude || 0,
//           uin_no: p.uin_no || 'N/A',
//           application: p.application || 'Unknown',
//           category: p.category || 'General',
//           speed: p.speed || 0,
//           heading: p.heading || 0,
//           battery: p.battery || 'N/A',
//           signal_strength: p.signal_strength || 'N/A'
//         }));
//         console.log(`Successfully processed ${points.length} points`);
//       } else {
//         console.warn(`No points array in response for ${trackerId}`, data);
//       }

//       if (points.length === 0) {
//         console.warn(`No data points found for ${trackerId}`);
//         showStatus(`No data found for tracker ${trackerId}`, 'error');
//         return;
//       }

//       plotTrackerPath(trackerId, points, color);
//       displayAllTrackerDataInTable(trackerId, points);

//       lastUpdateTime = new Date();
//       updateLastUpdatedTime();
//       showStatus(`Loaded ${points.length} data points for tracker ${trackerId}`, 'success');
//       console.log(`Successfully loaded ${points.length} points for ${trackerId}`);

//     } catch (err) {
//       console.error(`Error fetching data for ${trackerId}:`, err);
//       showStatus(`${trackerId}: ${err.message}`, 'error');
      
//       try {
//         console.log(`Trying fallback endpoint for ${trackerId}`);
//         const fallbackRes = await fetch('/api/trajectory', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             tracker_id: trackerId,
//             interval_seconds: 0,
//             max_gap_seconds: 86400
//           })
//         });
        
//         if (fallbackRes.ok) {
//           const fallbackData = await fallbackRes.json();
//           console.log(`Fallback response for ${trackerId}:`, {
//             points_length: fallbackData.points ? fallbackData.points.length : 0
//           });
          
//           let points = [];
//           if (fallbackData.points && Array.isArray(fallbackbackData.points)) {
//             points = fallbackData.points.map(p => ({
//               lat: +p.lat,
//               lon: +p.lon,
//               time: p.timestamp,
//               timestamp: p.timestamp,
//               latitude: +p.lat,
//               longitude: +p.lon,
//               altitude: p.altitude || 0,
//               uin_no: p.uin_no || 'N/A',
//               application: p.application || 'Unknown',
//               category: p.category || 'General'
//             }));
//           }
          
//           if (points.length > 0) {
//             plotTrackerPath(trackerId, points, color);
//             displayAllTrackerDataInTable(trackerId, points);
//             lastUpdateTime = new Date();
//             updateLastUpdatedTime();
//             showStatus(`Loaded ${points.length} data points for tracker ${trackerId} (using fallback)`, 'success');
//           }
//         }
//       } catch (fallbackErr) {
//         console.error(`Fallback failed for ${trackerId}:`, fallbackErr);
//       }
//     }
//   };

//   /* ================= FETCH SINGLE SENSOR (ALL HISTORICAL DATA) ================= */
//   window.fetchSingleSensorAllData = async function(sensorId, clearBefore = false) {
//     console.log('fetchSingleSensorAllData called for:', sensorId);
    
//     if (!sensorId) return;

//     showStatus(`Fetching ALL historical data for sensor ${sensorId}...`, 'loading');

//     try {
//       console.log(`Calling /api/sensor/all for ${sensorId}`);
      
//       const res = await fetch('/api/sensor/all', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           sensor_id: sensorId
//         })
//       });

//       console.log(`Response status: ${res.status}`);
      
//       if (!res.ok) {
//         const errorText = await res.text();
//         console.error(`API error: ${res.status}`, errorText);
//         throw new Error(`Server error: ${res.status}`);
//       }

//       const data = await res.json();
//       console.log(`API response received for ${sensorId}:`, {
//         sensor_id: data.sensor_id,
//         total_points: data.total_points,
//         points_length: data.points ? data.points.length : 0
//       });
      
//       let sensorReadings = [];
//       if (data.points && Array.isArray(data.points)) {
//         console.log(`Processing ${data.points.length} readings for ${sensorId}`);
//         sensorReadings = data.points.map(p => ({
//           sensorId: sensorId,
//           timestamp: p.timestamp || p.time || new Date().toISOString(),
//           Timestamp: p.timestamp || p.time || new Date().toISOString(),
//           Latitude: +p.lat || +p.latitude || 0,
//           Longitude: +p.lon || +p.longitude || 0,
//           EC: p.EC !== undefined ? p.EC : p.ec || 0,
//           Moisture: p.Moisture !== undefined ? p.Moisture : p.moisture || 0,
//           Nitrogen: p.Nitrogen !== undefined ? p.Nitrogen : p.nitrogen || 0,
//           Phosphorous: p.Phosphorous !== undefined ? p.Phosphorous : p.phosphorous || 0,
//           PHValue: p.PHValue !== undefined ? p.PHValue : p.ph || 0,
//           Potassium: p.Potassium !== undefined ? p.Potassium : p.potassium || 0,
//           Temperature: p.Temperature !== undefined ? p.Temperature : p.temperature || 0,
//           Id: p.Id || p.id || 'N/A',
//           SatelliteFix: p.SatelliteFix !== undefined ? p.SatelliteFix : p.satellite_fix || 0
//         }));
//         console.log(`Successfully processed ${sensorReadings.length} readings`);
//       } else {
//         console.warn(`No points array in response for ${sensorId}`, data);
//       }

//       if (sensorReadings.length === 0) {
//         console.warn(`No data readings found for ${sensorId}`);
//         showStatus(`No data found for sensor ${sensorId}`, 'error');
//         return;
//       }

//       // Update sensor table with ALL historical data
//       if (window.updateSensorTable) {
//         window.updateSensorTable(sensorId, sensorReadings);
//       }

//       lastUpdateTime = new Date();
//       updateLastUpdatedTime();
//       showStatus(`Loaded ${sensorReadings.length} data readings for sensor ${sensorId}`, 'success');
//       console.log(`Successfully loaded ${sensorReadings.length} readings for ${sensorId}`);

//     } catch (err) {
//       console.error(`Error fetching data for sensor ${sensorId}:`, err);
//       showStatus(`Sensor ${sensorId}: ${err.message}`, 'error');
      
//       try {
//         console.log(`Trying fallback endpoint for sensor ${sensorId}`);
//         const fallbackRes = await fetch('/api/sensor', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             sensor_id: sensorId
//           })
//         });
        
//         if (fallbackRes.ok) {
//           const fallbackData = await fallbackRes.json();
//           console.log(`Fallback response for sensor ${sensorId}:`, fallbackData);
          
//           let sensorReadings = [];
//           if (Array.isArray(fallbackData)) {
//             sensorReadings = fallbackData.map(p => ({
//               sensorId: sensorId,
//               timestamp: p.timestamp || p.time || new Date().toISOString(),
//               Timestamp: p.timestamp || p.time || new Date().toISOString(),
//               Latitude: +p.Latitude || +p.lat || 0,
//               Longitude: +p.Longitude || +p.lon || 0,
//               EC: p.EC !== undefined ? p.EC : p.ec || 0,
//               Moisture: p.Moisture !== undefined ? p.Moisture : p.moisture || 0,
//               Nitrogen: p.Nitrogen !== undefined ? p.Nitrogen : p.nitrogen || 0,
//               Phosphorous: p.Phosphorous !== undefined ? p.Phosphorous : p.phosphorous || 0,
//               PHValue: p.PHValue !== undefined ? p.PHValue : p.ph || 0,
//               Potassium: p.Potassium !== undefined ? p.Potassium : p.potassium || 0,
//               Temperature: p.Temperature !== undefined ? p.Temperature : p.temperature || 0,
//               Id: p.Id || p.id || 'N/A',
//               SatelliteFix: p.SatelliteFix !== undefined ? p.SatelliteFix : p.satellite_fix || 0
//             }));
//           } else if (fallbackData) {
//             sensorReadings = [{
//               sensorId: sensorId,
//               timestamp: fallbackData.timestamp || fallbackData.time || new Date().toISOString(),
//               Timestamp: fallbackData.timestamp || fallbackData.time || new Date().toISOString(),
//               Latitude: +fallbackData.Latitude || +fallbackData.lat || 0,
//               Longitude: +fallbackData.Longitude || +fallbackData.lon || 0,
//               EC: fallbackData.EC !== undefined ? fallbackData.EC : fallbackData.ec || 0,
//               Moisture: fallbackData.Moisture !== undefined ? fallbackData.Moisture : fallbackData.moisture || 0,
//               Nitrogen: fallbackData.Nitrogen !== undefined ? fallbackData.Nitrogen : fallbackData.nitrogen || 0,
//               Phosphorous: fallbackData.Phosphorous !== undefined ? fallbackData.Phosphorous : fallbackData.phosphorous || 0,
//               PHValue: fallbackData.PHValue !== undefined ? fallbackData.PHValue : fallbackData.ph || 0,
//               Potassium: fallbackData.Potassium !== undefined ? fallbackData.Potassium : fallbackData.potassium || 0,
//               Temperature: fallbackData.Temperature !== undefined ? fallbackData.Temperature : fallbackData.temperature || 0,
//               Id: fallbackData.Id || fallbackData.id || 'N/A',
//               SatelliteFix: fallbackData.SatelliteFix !== undefined ? fallbackData.SatelliteFix : fallbackData.satellite_fix || 0
//             }];
//           }
          
//           if (sensorReadings.length > 0) {
//             if (window.updateSensorTable) {
//               window.updateSensorTable(sensorId, sensorReadings);
//             }
//             lastUpdateTime = new Date();
//             updateLastUpdatedTime();
//             showStatus(`Loaded ${sensorReadings.length} data readings for sensor ${sensorId} (using fallback)`, 'success');
//           }
//         }
//       } catch (fallbackErr) {
//         console.error(`Fallback failed for sensor ${sensorId}:`, fallbackErr);
//       }
//     }
//   };

//   /* ================= PLOT ALL POINTS ================= */
//   function plotTrackerPath(trackerId, points, color) {
//     if (!points.length) return;

//     if (!isTrackerVisible(trackerId)) {
//       console.log(`${trackerId} is hidden, not plotting`);
//       return;
//     }

//     const latlngs = points.map(p => [p.lat, p.lon]);

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

//     const selectedParams = window.getRealtimeParameters ? window.getRealtimeParameters(trackerId) : {};

//     function createPopupContent(trackerId, point, label) {
//       let content = `<b>${trackerId}</b><br>${label}<br>`;
      
//       if (point.time) {
//         content += `Time: ${formatTimestamp(point.time)}<br>`;
//       }
      
//       if (selectedParams.latitude && point.lat !== undefined) {
//         content += `Latitude: ${point.lat.toFixed(6)}<br>`;
//       }
//       if (selectedParams.longitude && point.lon !== undefined) {
//         content += `Longitude: ${point.lon.toFixed(6)}<br>`;
//       }
      
//       if (selectedParams.altitude && point.altitude !== undefined) {
//         content += `Altitude: ${point.altitude}m<br>`;
//       }
//       if (selectedParams.uin_no && point.uin_no && point.uin_no !== 'N/A') {
//         content += `UIN: ${point.uin_no}<br>`;
//       }
//       if (selectedParams.application && point.application && point.application !== 'Unknown') {
//         content += `Application: ${point.application}<br>`;
//       }
//       if (selectedParams.category && point.category && point.category !== 'General') {
//         content += `Category: ${point.category}<br>`;
//       }
      
//       return content;
//     }

//     trackerMarkers[trackerId] = [];

//     const startMarker = L.marker(latlngs[0], { icon: START_ICON })
//       .addTo(markersLayer)
//       .bindPopup(createPopupContent(trackerId, points[0], 'Start Point'));
//     trackerMarkers[trackerId].push(startMarker);

//     const endMarker = L.marker(latlngs.at(-1), { icon: END_ICON })
//       .addTo(markersLayer)
//       .bindPopup(createPopupContent(trackerId, points.at(-1), 'End Point'));
//     trackerMarkers[trackerId].push(endMarker);

//     const maxMarkers = 20;
//     const interval = Math.max(1, Math.floor(points.length / maxMarkers));
    
//     points.forEach((p, idx) => {
//       if (idx > 0 && idx < points.length - 1 && idx % interval === 0) {
//         const dotMarker = L.marker([p.lat, p.lon], {
//           icon: createDotIcon(color, 8)
//         })
//         .addTo(markersLayer)
//         .bindPopup(createPopupContent(trackerId, p, `Point ${idx+1}/${points.length}`));
        
//         trackerMarkers[trackerId].push(dotMarker);
//       }
//     });

//     updateMapBounds();
//   }

//   /* ================= DISPLAY ALL TRACKER DATA IN TABLE ================= */
//   function displayAllTrackerDataInTable(trackerId, points) {
//     if (!points || points.length === 0) return;
    
//     const selectedParams = window.getRealtimeParameters ? window.getRealtimeParameters(trackerId) : null;
    
//     if (!selectedParams) {
//       const defaultParams = {
//         timestamp: true,
//         latitude: true,
//         longitude: true,
//         altitude: true,
//         uin_no: true,
//         application: true,
//         category: true,
//         speed: true,
//         heading: true,
//         battery: true,
//         signal_strength: true
//       };
//       updateRealtimeTableWithAllData(trackerId, points, defaultParams);
//       return;
//     }
    
//     updateRealtimeTableWithAllData(trackerId, points, selectedParams);
//   }

//   /* ================= UPDATE REALTIME TABLE WITH ALL DATA ================= */
//   function updateRealtimeTableWithAllData(trackerId, points, selectedParams) {
//     const formattedDataArray = points.map(point => {
//       const formattedData = {
//         'Tracker ID': trackerId,
//         'timestamp': point.timestamp || point.time || new Date().toISOString(),
//         'latitude': point.latitude || point.lat,
//         'longitude': point.longitude || point.lon,
//         'altitude': point.altitude || 0,
//         'uin_no': point.uin_no || 'N/A',
//         'application': point.application || 'Unknown',
//         'category': point.category || 'General',
//         'speed': point.speed || 0,
//         'heading': point.heading || 0,
//         'battery': point.battery || 'N/A',
//         'signal_strength': point.signal_strength || 'N/A'
//       };
      
//       const filteredData = {};
//       Object.keys(formattedData).forEach(key => {
//         if (key === 'Tracker ID' || (selectedParams[key] && selectedParams[key] !== false)) {
//           filteredData[key] = formattedData[key];
//         }
//       });
      
//       return filteredData;
//     });
    
//     if (window.updateRealtimeTableWithMultipleEntries) {
//       window.updateRealtimeTableWithMultipleEntries(trackerId, formattedDataArray);
//     }
    
//     if (!window.realtimeTableData) {
//       window.realtimeTableData = {};
//     }
//     window.realtimeTableData[trackerId] = formattedDataArray;
    
//     const realtimePanel = document.getElementById('realtimeTablePanel');
//     if (realtimePanel && realtimePanel.classList.contains('minimized')) {
//       realtimePanel.classList.remove('minimized');
//       const chevron = document.getElementById('realtimeTablePanelChevron');
//       if (chevron) chevron.classList.remove('rotated');
//       const container = document.getElementById('realtimeTableContainer');
//       if (container) container.style.display = 'block';
//     }
//   }

//   /* ================= DIRECT TABLE UPDATE ================= */
//   window.updateRealtimeTableWithMultipleEntries = function(trackerId, dataArray) {
//     console.log('Updating table for tracker:', trackerId, 'with', dataArray.length, 'entries');
    
//     if (!window.realtimeTableData) {
//       window.realtimeTableData = {};
//     }
    
//     window.realtimeTableData[trackerId] = dataArray;
    
//     updateTrackerTableDirectly();
//   };

//   function updateTrackerTableDirectly() {
//     console.log('updateTrackerTableDirectly called');
    
//     // Get table elements
//     const tbody = document.getElementById('realtimeDataTableBody');
//     const thead = document.getElementById('realtimeDataTableHeader');
    
//     if (!tbody || !thead) {
//       console.error('Table elements not found!');
//       console.log('Available elements:');
//       console.log('tbody:', document.getElementById('realtimeDataTableBody'));
//       console.log('thead:', document.getElementById('realtimeDataTableHeader'));
//       console.log('table:', document.getElementById('realtimeDataTable'));
//       return;
//     }
    
//     const allData = [];
//     Object.keys(window.realtimeTableData || {}).forEach(trackerId => {
//       const trackerData = window.realtimeTableData[trackerId];
//       if (Array.isArray(trackerData)) {
//         trackerData.forEach(entry => {
//           allData.push({...entry, 'Tracker ID': trackerId});
//         });
//       }
//     });
    
//     console.log('Total data entries:', allData.length);
    
//     if (allData.length === 0) {
//       tbody.innerHTML = `
//         <tr class="no-data-row">
//           <td colspan="8">No tracker data available. Fetch a tracker first.</td>
//         </tr>
//       `;
//       return;
//     }
    
//     const allHeaders = new Set(['Tracker ID', 'timestamp', 'latitude', 'longitude', 'altitude', 'uin_no', 'application', 'category']);
//     allData.forEach(entry => {
//       Object.keys(entry).forEach(key => {
//         allHeaders.add(key);
//       });
//     });
    
//     const headers = Array.from(allHeaders);
    
//     const headerRow = thead.querySelector('tr');
//     if (headerRow) {
//       headerRow.innerHTML = '';
      
//       headers.forEach(header => {
//         const th = document.createElement('th');
//         th.textContent = formatHeaderText(header);
//         headerRow.appendChild(th);
//       });
//     }
    
//     tbody.innerHTML = '';
    
//     allData.sort((a, b) => {
//       const timeA = a.timestamp || a.time || '';
//       const timeB = b.timestamp || b.time || '';
//       return new Date(timeB) - new Date(timeA);
//     });
    
//     allData.forEach(entry => {
//       const row = document.createElement('tr');
      
//       headers.forEach(header => {
//         const td = document.createElement('td');
        
//         let value = entry[header];
//         if (value === undefined || value === null) {
//           value = '-';
//           td.style.color = '#9ca3af';
//         } else {
//           if (header === 'timestamp' || header === 'time') {
//             if (value && value !== '-') {
//               try {
//                 value = new Date(value).toLocaleString();
//               } catch (e) {}
//             }
//           } else if ((header === 'latitude' || header === 'longitude') && value && value !== '-') {
//             value = parseFloat(value).toFixed(6);
//           } else if (header === 'altitude' && value && value !== '-') {
//             value = `${parseFloat(value).toFixed(1)} m`;
//           } else if (header === 'speed' && value && value !== '-') {
//             value = `${parseFloat(value).toFixed(1)} km/h`;
//           } else if (header === 'heading' && value && value !== '-') {
//             value = `${parseFloat(value).toFixed(0)}°`;
//           }
//         }
        
//         td.textContent = value;
        
//         if (header === 'Tracker ID') {
//           td.className = 'tracker-id-cell';
//           td.style.fontWeight = '600';
//           td.style.color = '#6366f1';
//         }
        
//         row.appendChild(td);
//       });
      
//       tbody.appendChild(row);
//     });
    
//     const summaryRow = document.createElement('tr');
//     summaryRow.style.backgroundColor = '#f8fafc';
//     const summaryCell = document.createElement('td');
//     summaryCell.colSpan = headers.length;
//     summaryCell.style.textAlign = 'center';
//     summaryCell.style.padding = '10px';
//     summaryCell.style.fontStyle = 'italic';
//     summaryCell.style.color = '#6b7280';
//     summaryCell.textContent = `Showing ${allData.length} total entries`;
//     summaryRow.appendChild(summaryCell);
//     tbody.appendChild(summaryRow);
    
//     const realtimePanel = document.getElementById('realtimeTablePanel');
//     if (realtimePanel && realtimePanel.classList.contains('minimized')) {
//       console.log('Auto-expanding panel');
//       realtimePanel.classList.remove('minimized');
//       const chevron = document.getElementById('realtimeTablePanelChevron');
//       if (chevron) chevron.classList.remove('rotated');
//       const container = document.getElementById('realtimeTableContainer');
//       if (container) container.style.display = 'block';
//     }
    
//     console.log('Table updated successfully with', allData.length, 'entries');
//   }

//   function formatHeaderText(header) {
//     const formatMap = {
//       'timestamp': 'Timestamp',
//       'time': 'Time',
//       'latitude': 'Latitude',
//       'longitude': 'Longitude',
//       'altitude': 'Altitude',
//       'uin_no': 'UIN No',
//       'application': 'Application',
//       'category': 'Category',
//       'speed': 'Speed',
//       'heading': 'Heading',
//       'battery': 'Battery',
//       'signal_strength': 'Signal Strength',
//       'Tracker ID': 'Tracker ID'
//     };
//     return formatMap[header] || header.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
//   }

//   window.updateRealtimeTable = function(trackerId, data) {
//     if (trackerId && data) {
//       if (!Array.isArray(data)) {
//         data = [data];
//       }
//       window.updateRealtimeTableWithMultipleEntries(trackerId, data);
//     } else {
//       updateTrackerTableDirectly();
//     }
//   };

//   /* ================= GROUP FETCH ================= */
//   window.fetchGroupTrackers = function (trackerIds) {
//     if (!trackerIds?.length) return alert('Group empty');
    
//     const visibleTrackers = trackerIds.filter(id => isTrackerVisible(id));
    
//     if (visibleTrackers.length === 0) {
//       alert('No visible trackers in this group');
//       return;
//     }
    
//     clearMap();
    
//     if (window.realtimeTableData) {
//       window.realtimeTableData = {};
//     }
//     if (window.updateRealtimeTable) {
//       window.updateRealtimeTable();
//     }
    
//     const promises = visibleTrackers.map((id, i) => {
//       return new Promise(resolve => {
//         setTimeout(async () => {
//           try {
//             await window.fetchSingleTrackerAllData(id, false);
//           } catch (err) {
//             console.error(`Failed to fetch tracker ${id}:`, err);
//           }
//           resolve();
//         }, i * 500);
//       });
//     });
    
//     Promise.all(promises).then(() => {
//       showStatus(`Loaded all trackers for group`, 'success');
//     });
//   };

//   /* ================= UPDATE SENSOR TABLE (FROM HTML) ================= */
//   // This function will be called by the HTML script
//   window.updateSensorTable = function(sensorId, sensorReadings) {
//     console.log('updateSensorTable called for:', sensorId, 'with', sensorReadings.length, 'readings');
    
//     if (!window.sensorTableData) {
//       window.sensorTableData = {};
//     }
    
//     if (sensorId && sensorReadings) {
//       if (!Array.isArray(sensorReadings)) {
//         sensorReadings = [sensorReadings];
//       }
      
//       if (!window.sensorTableData[sensorId]) {
//         window.sensorTableData[sensorId] = [];
//       }
      
//       sensorReadings.forEach(reading => {
//         reading.sensorId = sensorId;
//         reading.timestamp = reading.timestamp || reading.Timestamp || new Date().toISOString();
        
//         const exists = window.sensorTableData[sensorId].some(existing => 
//           (existing.Id && existing.Id === reading.Id) || 
//           (existing.timestamp && existing.timestamp === reading.timestamp) ||
//           (existing.Timestamp && existing.Timestamp === reading.Timestamp)
//         );
        
//         if (!exists) {
//           window.sensorTableData[sensorId].unshift(reading);
//         }
//       });
      
//       if (window.sensorTableData[sensorId].length > 100) {
//         window.sensorTableData[sensorId] = window.sensorTableData[sensorId].slice(0, 100);
//       }
//     }
    
//     updateSensorTableDirectly();
//   };

//   function updateSensorTableDirectly() {
//     console.log('updateSensorTableDirectly called');
    
//     const tbody = document.getElementById('sensorDataTableBody');
//     const thead = document.getElementById('sensorDataTableHeader');
    
//     if (!tbody || !thead) {
//       console.error('Sensor table elements not found!');
//       return;
//     }
    
//     const allSensorData = [];
//     Object.keys(window.sensorTableData || {}).forEach(sensorId => {
//       (window.sensorTableData[sensorId] || []).forEach(reading => {
//         allSensorData.push(reading);
//       });
//     });
    
//     console.log('Total sensor data entries:', allSensorData.length);
    
//     if (allSensorData.length === 0) {
//       tbody.innerHTML = `
//         <tr class="no-data-row">
//           <td colspan="12">No sensor data available. Fetch a sensor first.</td>
//         </tr>
//       `;
//       return;
//     }
    
//     tbody.innerHTML = '';
    
//     allSensorData.sort((a, b) => {
//       const timeA = a.timestamp || a.Timestamp || '';
//       const timeB = b.timestamp || b.Timestamp || '';
//       return new Date(timeB) - new Date(timeA);
//     });
    
//     allSensorData.forEach((sensorData, index) => {
//       const row = document.createElement('tr');
      
//       const idCell = document.createElement('td');
//       idCell.className = 'sensor-id-cell';
//       idCell.textContent = sensorData.sensorId || sensorData.SensorId || 'N/A';
//       row.appendChild(idCell);
      
//       const timeCell = document.createElement('td');
//       const timestamp = sensorData.timestamp || sensorData.Timestamp;
//       if (timestamp) {
//         try {
//           timeCell.textContent = new Date(timestamp).toLocaleString();
//         } catch (e) {
//           timeCell.textContent = timestamp;
//         }
//       } else {
//         timeCell.textContent = '-';
//       }
//       row.appendChild(timeCell);
      
//       const latCell = document.createElement('td');
//       latCell.textContent = sensorData.Latitude !== undefined ? sensorData.Latitude.toFixed(6) : '-';
//       row.appendChild(latCell);
      
//       const lonCell = document.createElement('td');
//       lonCell.textContent = sensorData.Longitude !== undefined ? sensorData.Longitude.toFixed(6) : '-';
//       row.appendChild(lonCell);
      
//       const moistureCell = document.createElement('td');
//       moistureCell.textContent = sensorData.Moisture !== undefined ? sensorData.Moisture : '-';
//       row.appendChild(moistureCell);
      
//       const tempCell = document.createElement('td');
//       tempCell.textContent = sensorData.Temperature !== undefined ? sensorData.Temperature : '-';
//       row.appendChild(tempCell);
      
//       const ecCell = document.createElement('td');
//       ecCell.textContent = sensorData.EC !== undefined ? sensorData.EC : '-';
//       row.appendChild(ecCell);
      
//       const phCell = document.createElement('td');
//       phCell.textContent = sensorData.PHValue !== undefined ? sensorData.PHValue : '-';
//       row.appendChild(phCell);
      
//       const nitrogenCell = document.createElement('td');
//       nitrogenCell.textContent = sensorData.Nitrogen !== undefined ? sensorData.Nitrogen : '-';
//       row.appendChild(nitrogenCell);
      
//       const phosphorousCell = document.createElement('td');
//       phosphorousCell.textContent = sensorData.Phosphorous !== undefined ? sensorData.Phosphorous : '-';
//       row.appendChild(phosphorousCell);
      
//       const potassiumCell = document.createElement('td');
//       potassiumCell.textContent = sensorData.Potassium !== undefined ? sensorData.Potassium : '-';
//       row.appendChild(potassiumCell);
      
//       const satCell = document.createElement('td');
//       satCell.textContent = sensorData.SatelliteFix !== undefined ? sensorData.SatelliteFix : '-';
//       row.appendChild(satCell);
      
//       tbody.appendChild(row);
//     });
    
//     const summaryRow = document.createElement('tr');
//     summaryRow.style.backgroundColor = '#f8fafc';
//     const summaryCell = document.createElement('td');
//     summaryCell.colSpan = 12;
//     summaryCell.style.textAlign = 'center';
//     summaryCell.style.padding = '10px';
//     summaryCell.style.fontStyle = 'italic';
//     summaryCell.style.color = '#6b7280';
//     summaryCell.textContent = `Showing ${allSensorData.length} total sensor readings`;
//     summaryRow.appendChild(summaryCell);
//     tbody.appendChild(summaryRow);
    
//     const sensorPanel = document.getElementById('sensorTablePanel');
//     if (sensorPanel && sensorPanel.classList.contains('minimized')) {
//       sensorPanel.classList.remove('minimized');
//       const chevron = document.getElementById('sensorTablePanelChevron');
//       if (chevron) chevron.classList.remove('rotated');
//       const container = document.getElementById('sensorTableContainer');
//       if (container) container.style.display = 'block';
//     }
    
//     console.log('Sensor table updated successfully with', allSensorData.length, 'entries');
//   }

//   /* ================= SENSOR FETCH HANDLER ================= */
//   window.fetchSensorData = function(sensorId) {
//     window.fetchSingleSensorAllData(sensorId, false);
//   };

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

//   /* ================= HELPERS ================= */
//   function clearMap() {
//     markersLayer.clearLayers();
//     polylineLayer.clearLayers();
//     Object.keys(trackerPolylines).forEach(k => delete trackerPolylines[k]);
//     Object.keys(trackerMarkers).forEach(k => delete trackerMarkers[k]);
//     Object.keys(trackerAllData).forEach(k => delete trackerAllData[k]);
//     updateLegend();
    
//     if (imagesGrid) {
//       imagesGrid.innerHTML = '';
//     }
//   }

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

//   window.handleFetch = function(trackerId) {
//     window.fetchSingleTrackerAllData(trackerId, true);
//   };

//   window.handleFetchSensor = function(sensorId) {
//     window.fetchSingleSensorAllData(sensorId, false);
//   };

//   // Initialize global objects
//   window.trajectoryOverlays = {};
//   window.realtimeTableData = {};
//   window.sensorTableData = {};

//   // Fetch data for saved trackers on page load
//   window.addEventListener('load', function() {
//     const savedTrackers = JSON.parse(localStorage.getItem('saved_trackers')) || [];
//     const savedSensors = JSON.parse(localStorage.getItem('saved_sensors')) || [];
    
//     console.log('Page loaded, saved trackers:', savedTrackers);
//     console.log('Page loaded, saved sensors:', savedSensors);
    
//     if (savedTrackers.length > 0) {
//       showStatus(`Loading ${savedTrackers.length} saved trackers...`, 'loading');
      
//       // Load first tracker immediately
//       setTimeout(() => {
//         if (savedTrackers[0]) {
//           window.fetchSingleTrackerAllData(savedTrackers[0], true);
//         }
        
//         // Load remaining trackers with delay
//         savedTrackers.slice(1).forEach((trackerId, index) => {
//           setTimeout(() => {
//             window.fetchSingleTrackerAllData(trackerId, false);
//           }, (index + 1) * 1000);
//         });
//       }, 1000);
//     }
    
//     if (savedSensors.length > 0) {
//       showStatus(`Loading ${savedSensors.length} saved sensors...`, 'loading');
      
//       setTimeout(() => {
//         savedSensors.forEach((sensorId, index) => {
//           setTimeout(() => {
//             window.fetchSingleSensorAllData(sensorId, false);
//           }, index * 1000);
//         });
//       }, 2000);
//     }
    
//     // Initialize tables
//     updateTrackerTableDirectly();
//     updateSensorTableDirectly();
//   });
  
//   // Initialize fetch buttons
//   if (fetchBtn) {
//     fetchBtn.addEventListener('click', () => {
//       const id = trackerInput.value.trim();
//       if (id) window.fetchSingleTrackerAllData(id, true);
//     });
//   }
  
//   // Initialize sensor fetch button (if exists in HTML)
//   const fetchSensorBtn = document.getElementById('fetch-sensor-btn');
//   if (fetchSensorBtn) {
//     fetchSensorBtn.addEventListener('click', () => {
//       const id = sensorInput.value.trim();
//       if (id) window.fetchSingleSensorAllData(id, false);
//     });
//   }
  
//   console.log('fetchdata.js initialization complete');
// });


















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
//     interval: 5000, // 5 seconds
//     trackers: new Set(), // Trackers to auto-update
//     lastFetched: {}, // Last fetch time per tracker
//     maxRetryCount: 3,
//     retryDelay: 1000
//   };

//   /* ================= MAP ================= */
//   const map = L.map('map').setView([23.0225, 72.5714], 13);

//   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     maxZoom: 19
//   }).addTo(map);

//   const markersLayer = L.layerGroup().addTo(map);
//   const polylineLayer = L.layerGroup().addTo(map);

//   let lastUpdateTime = null;
//   let activeGroup = null;

//   /* ================= TRACKER STATE ================= */
//   const trackerPolylines = {};
//   const trackerMarkers = {};
//   const trackerColorMap = {};
//   const trackerVisibility = {};
//   const trackerLastData = {}; // Store last fetched data per tracker

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
//         // Skip if recently fetched
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
//           last_timestamp: trackerLastData[trackerId]?.timestamp || null
//         })
//       });

//       if (!res.ok) throw new Error('Server error');

//       const data = await res.json();
      
//       if (data.points && data.points.length > 0) {
//         const newPoint = data.points[0]; // Get the latest point
        
//         // Update tracker's last data
//         trackerLastData[trackerId] = {
//           lat: newPoint.lat,
//           lon: newPoint.lon,
//           timestamp: newPoint.timestamp,
//           altitude: newPoint.altitude || 0,
//           uin_no: newPoint.uin_no || 'N/A',
//           application: newPoint.application || 'Unknown',
//           category: newPoint.category || 'General'
//         };

//         // Update map with latest point
//         updateTrackerLatestPoint(trackerId, trackerLastData[trackerId]);
        
//         // Update real-time table with latest data
//         displayRealtimeData(trackerId, trackerLastData[trackerId]);
        
//         lastUpdateTime = new Date();
//         updateLastUpdatedTime();
        
//         // Optional: Show brief notification
//         // console.log(`Updated tracker ${trackerId} at ${new Date().toLocaleTimeString()}`);
//       }
      
//     } catch (err) {
//       console.error(`Failed to fetch latest data for ${trackerId}:`, err);
//       // Optional: Implement retry logic
//     }
//   }

//   function updateTrackerLatestPoint(trackerId, point) {
//     const color = getTrackerColor(trackerId);
    
//     // Update or create marker for latest point
//     if (trackerMarkers[trackerId]) {
//       // Update existing end marker position
//       const markers = trackerMarkers[trackerId];
//       if (markers.length > 0) {
//         const endMarker = markers[markers.length - 1];
//         endMarker.setLatLng([point.lat, point.lon]);
        
//         // Update popup with latest data
//         const popupContent = createPopupContent(trackerId, point, 'Latest Point');
//         endMarker.setPopupContent(popupContent);
//       }
//     }

//     // Update polyline if it exists
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

//   function createDotIcon(color, size = 8) {
//     return L.divIcon({
//       className: '',
//       html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;"></div>`,
//       iconSize: [size, size],
//       iconAnchor: [size / 2, size / 2]
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
//         <span style="font-weight:600;">Start</span>
//       </div>

//       <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
//         ${pin('red')}
//         <span style="font-weight:600;">End</span>
//       </div>

//       <hr style="margin:6px 0">
//     `;

//     Object.entries(trackerColorMap).forEach(([id, color]) => {
//       if (isTrackerVisible(id)) {
//         html += `
//           <div style="display:flex;align-items:center;gap:6px;">
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

//       // Store the last point
//       if (points.length > 0) {
//         trackerLastData[trackerId] = points[points.length - 1];
//       }

//       plotTrackerPath(trackerId, points, color);
      
//       if (points.length > 0) {
//         const latestPoint = points[points.length - 1];
//         displayRealtimeData(trackerId, latestPoint);
        
//         // Auto-enable real-time updates if specified
//         if (enableRealtime) {
//           addTrackerToRealtimeUpdates(trackerId);
//         }
//       }

//       lastUpdateTime = new Date();
//       updateLastUpdatedTime();
//       showStatus(`Loaded tracker ${trackerId}`, 'success');

//     } catch (err) {
//       showStatus(`${trackerId}: ${err.message}`, 'error');
//     }
//   }

//   /* ================= FETCH SENSOR DATA ================= */
//   window.fetchSensorData = async function(sensorId) {
//     // ... (keep existing sensor code)
//   };

//   /* ================= DISPLAY REALTIME DATA ================= */
//   function displayRealtimeData(trackerId, pointData) {
//     const selectedParams = window.getRealtimeParameters ? window.getRealtimeParameters(trackerId) : null;
    
//     if (!selectedParams) {
//       const defaultParams = {
//         timestamp: true,
//         latitude: true,
//         longitude: true,
//         altitude: true,
//         uin_no: true,
//         application: true,
//         category: true
//       };
//       updateRealtimeTable(trackerId, pointData, defaultParams);
//       return;
//     }
    
//     updateRealtimeTable(trackerId, pointData, selectedParams);
    
//     // Show brief status update for auto-refresh
//     if (realtimeUpdateConfig.trackers.has(trackerId)) {
//       const timeStr = pointData.timestamp ? 
//         new Date(pointData.timestamp).toLocaleTimeString() : 
//         new Date().toLocaleTimeString();
//       console.log(`Auto-updated ${trackerId} at ${timeStr}`);
//     }
//   }

//   /* ================= UPDATE REALTIME TABLE ================= */
//   function updateRealtimeTable(trackerId, pointData, selectedParams) {
//     const formattedData = {
//       'Tracker ID': trackerId,
//       'timestamp': pointData.timestamp || new Date().toISOString(),
//       'latitude': pointData.latitude || pointData.lat,
//       'longitude': pointData.longitude || pointData.lon,
//       'altitude': pointData.altitude || 0,
//       'uin_no': pointData.uin_no || 'N/A',
//       'application': pointData.application || 'Unknown',
//       'category': pointData.category || 'General',
//       'update_time': new Date().toLocaleTimeString()
//     };
    
//     // Filter based on selected parameters
//     const filteredData = {};
//     Object.keys(formattedData).forEach(key => {
//       if (key === 'Tracker ID' || (selectedParams[key] && selectedParams[key] !== false)) {
//         filteredData[key] = formattedData[key];
//       }
//     });
    
//     if (window.updateRealtimeTable) {
//       window.updateRealtimeTable(trackerId, filteredData);
//     }
    
//     if (!window.realtimeTableData) {
//       window.realtimeTableData = {};
//     }
//     window.realtimeTableData[trackerId] = filteredData;
    
//     // Auto-expand the real-time panel if minimized
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
//     if (!trackerIds?.length) return alert('Group empty');
    
//     const visibleTrackers = trackerIds.filter(id => isTrackerVisible(id));
    
//     if (visibleTrackers.length === 0) {
//       alert('No visible trackers in this group');
//       return;
//     }
    
//     clearMap();
//     visibleTrackers.forEach((id, i) => {
//       setTimeout(() => fetchSingleTracker(id, false, enableRealtime), i * 400);
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

//     const selectedParams = window.getRealtimeParameters ? window.getRealtimeParameters(trackerId) : {};

//     function createPopupContent(trackerId, point, label) {
//       let content = `<b>${trackerId}</b><br>${label}<br>`;
      
//       if (point.time) {
//         content += `Time: ${formatTimestamp(point.time)}<br>`;
//       }
      
//       if (selectedParams.latitude && point.lat !== undefined) {
//         content += `Latitude: ${point.lat.toFixed(6)}<br>`;
//       }
//       if (selectedParams.longitude && point.lon !== undefined) {
//         content += `Longitude: ${point.lon.toFixed(6)}<br>`;
//       }
      
//       if (selectedParams.altitude && point.altitude !== undefined) {
//         content += `Altitude: ${point.altitude}m<br>`;
//       }
//       if (selectedParams.uin_no && point.uin_no && point.uin_no !== 'N/A') {
//         content += `UIN: ${point.uin_no}<br>`;
//       }
//       if (selectedParams.application && point.application && point.application !== 'Unknown') {
//         content += `Application: ${point.application}<br>`;
//       }
//       if (selectedParams.category && point.category && point.category !== 'General') {
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

//     // END marker (also used as latest point)
//     const endMarker = L.marker(latlngs.at(-1), { icon: END_ICON })
//       .addTo(markersLayer)
//       .bindPopup(createPopupContent(trackerId, points.at(-1), 'Latest Point'));
//     trackerMarkers[trackerId].push(endMarker);

//     // MIDDLE POINTS
//     points.forEach((p, idx) => {
//       if (idx > 0 && idx < points.length - 1 && idx % 3 === 0) {
//         const dotMarker = L.marker([p.lat, p.lon], {
//           icon: createDotIcon(color, 8)
//         })
//         .addTo(markersLayer)
//         .bindPopup(createPopupContent(trackerId, p, `Point ${idx}`));
        
//         trackerMarkers[trackerId].push(dotMarker);
//       }
//     });

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
    
//     // Also update real-time updates
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

//   /* ================= HELPERS ================= */
//   function clearMap() {
//     markersLayer.clearLayers();
//     polylineLayer.clearLayers();
//     Object.keys(trackerPolylines).forEach(k => delete trackerPolylines[k]);
//     Object.keys(trackerMarkers).forEach(k => delete trackerMarkers[k]);
//     Object.keys(trackerLastData).forEach(k => delete trackerLastData[k]);
//     updateLegend();
    
//     // Clear real-time updates
//     realtimeUpdateConfig.trackers.clear();
//     stopRealtimeUpdates();
    
//     if (imagesGrid) {
//       imagesGrid.innerHTML = '';
//     }
    
//     if (window.realtimeTableData) {
//       window.realtimeTableData = {};
//     }
//     if (window.updateRealtimeTable) {
//       window.updateRealtimeTable();
//     }
//   }

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

//   // Initialize global objects
//   window.trajectoryOverlays = {};
//   window.realtimeTableData = {};
//   window.sensorTableData = {};

//   // Add keyboard shortcuts
//   document.addEventListener('keydown', function(e) {
//     if (e.altKey && e.key === 'r') {
//       e.preventDefault();
//       const realtimeBtn = document.getElementById('openRealtimePopup');
//       if (realtimeBtn) realtimeBtn.click();
//     }
    
//     // Alt+A to toggle auto-update for selected tracker
//     if (e.altKey && e.key === 'a') {
//       e.preventDefault();
//       const trackerId = trackerInput.value.trim();
//       if (trackerId) {
//         const isEnabled = realtimeUpdateConfig.trackers.has(trackerId);
//         toggleRealtimeUpdates(trackerId, !isEnabled);
//         showStatus(`Real-time updates ${!isEnabled ? 'enabled' : 'disabled'} for ${trackerId}`, 'success');
//       }
//     }
//   });

//   // Fetch data for saved trackers and sensors on page load
//   window.addEventListener('load', function() {
//     const savedTrackers = JSON.parse(localStorage.getItem('saved_trackers')) || [];
//     const savedSensors = JSON.parse(localStorage.getItem('saved_sensors')) || [];
    
//     // Check if auto-update was enabled before
//     const autoUpdateEnabled = JSON.parse(localStorage.getItem('auto_update_enabled')) || false;
//     const autoUpdateTrackers = JSON.parse(localStorage.getItem('auto_update_trackers')) || [];
    
//     if (savedTrackers.length > 0) {
//       showStatus(`Loading ${savedTrackers.length} saved trackers...`, 'loading');
      
//       setTimeout(() => {
//         savedTrackers.forEach((trackerId, index) => {
//           setTimeout(() => {
//             const enableRealtime = autoUpdateEnabled && autoUpdateTrackers.includes(trackerId);
//             fetchSingleTracker(trackerId, index === 0, enableRealtime);
//           }, index * 500);
//         });
//       }, 1000);
//     }
    
//     if (savedSensors.length > 0) {
//       setTimeout(() => {
//         savedSensors.forEach((sensorId, index) => {
//           setTimeout(() => {
//             if (window.fetchSensorData) {
//               window.fetchSensorData(sensorId);
//             }
//           }, index * 1000);
//         });
//       }, 2000);
//     }
//   });

//   // Save auto-update state before page unload
//   window.addEventListener('beforeunload', function() {
//     localStorage.setItem('auto_update_enabled', JSON.stringify(realtimeUpdateConfig.trackers.size > 0));
//     localStorage.setItem('auto_update_trackers', JSON.stringify(Array.from(realtimeUpdateConfig.trackers)));
//   });

//   // Clean up on page unload
//   window.addEventListener('unload', function() {
//     stopRealtimeUpdates();
//   });
// });




//working to fetch single row data fo tracker not all historic data
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
//     interval: 5000, // 5 seconds
//     trackers: new Set(), // Trackers to auto-update
//     lastFetched: {}, // Last fetch time per tracker
//     maxRetryCount: 3,
//     retryDelay: 1000
//   };

//   /* ================= MAP ================= */
//   const map = L.map('map').setView([23.0225, 72.5714], 13);

//   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     maxZoom: 19
//   }).addTo(map);

//   const markersLayer = L.layerGroup().addTo(map);
//   const polylineLayer = L.layerGroup().addTo(map);

//   let lastUpdateTime = null;
//   let activeGroup = null;

//   /* ================= TRACKER STATE ================= */
//   const trackerPolylines = {};
//   const trackerMarkers = {};
//   const trackerColorMap = {};
//   const trackerVisibility = {};
//   const trackerLastData = {}; // Store last fetched data per tracker

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
//         // Skip if recently fetched
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
//           last_timestamp: trackerLastData[trackerId]?.timestamp || null
//         })
//       });

//       if (!res.ok) throw new Error('Server error');

//       const data = await res.json();
      
//       if (data.points && data.points.length > 0) {
//         const newPoint = data.points[0]; // Get the latest point
        
//         // Update tracker's last data
//         trackerLastData[trackerId] = {
//           lat: newPoint.lat,
//           lon: newPoint.lon,
//           timestamp: newPoint.timestamp,
//           altitude: newPoint.altitude || 0,
//           uin_no: newPoint.uin_no || 'N/A',
//           application: newPoint.application || 'Unknown',
//           category: newPoint.category || 'General'
//         };

//         // Update map with latest point
//         updateTrackerLatestPoint(trackerId, trackerLastData[trackerId]);
        
//         // Update real-time table with latest data
//         displayRealtimeData(trackerId, trackerLastData[trackerId]);
        
//         lastUpdateTime = new Date();
//         updateLastUpdatedTime();
//       }
      
//     } catch (err) {
//       console.error(`Failed to fetch latest data for ${trackerId}:`, err);
//     }
//   }

//   function updateTrackerLatestPoint(trackerId, point) {
//     const color = getTrackerColor(trackerId);
    
//     // Update or create marker for latest point
//     if (trackerMarkers[trackerId]) {
//       // Update existing end marker position
//       const markers = trackerMarkers[trackerId];
//       if (markers.length > 0) {
//         const endMarker = markers[markers.length - 1];
//         endMarker.setLatLng([point.lat, point.lon]);
        
//         // Update popup with latest data
//         const popupContent = createPopupContent(trackerId, point, 'Latest Point');
//         endMarker.setPopupContent(popupContent);
//       }
//     }

//     // Update polyline if it exists
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

//   function createDotIcon(color, size = 8) {
//     return L.divIcon({
//       className: '',
//       html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;"></div>`,
//       iconSize: [size, size],
//       iconAnchor: [size / 2, size / 2]
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
//         <span style="font-weight:600;">Start</span>
//       </div>

//       <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
//         ${pin('red')}
//         <span style="font-weight:600;">End</span>
//       </div>

//       <hr style="margin:6px 0">
//     `;

//     Object.entries(trackerColorMap).forEach(([id, color]) => {
//       if (isTrackerVisible(id)) {
//         html += `
//           <div style="display:flex;align-items:center;gap:6px;">
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

//       // Store the last point
//       if (points.length > 0) {
//         trackerLastData[trackerId] = points[points.length - 1];
//       }

//       plotTrackerPath(trackerId, points, color);
      
//       if (points.length > 0) {
//         const latestPoint = points[points.length - 1];
//         displayRealtimeData(trackerId, latestPoint);
        
//         // Auto-enable real-time updates if specified
//         if (enableRealtime) {
//           addTrackerToRealtimeUpdates(trackerId);
//         }
//       }

//       lastUpdateTime = new Date();
//       updateLastUpdatedTime();
//       showStatus(`Loaded tracker ${trackerId}`, 'success');

//     } catch (err) {
//       showStatus(`${trackerId}: ${err.message}`, 'error');
//     }
//   }

//   /* ================= FETCH SENSOR DATA ================= */
//   window.fetchSensorData = async function(sensorId) {
//     // ... (keep existing sensor code)
//   };

//   /* ================= DISPLAY REALTIME DATA ================= */
//   function displayRealtimeData(trackerId, pointData) {
//     if (!pointData) return;
    
//     // Get selected parameters for this tracker
//     let selectedParams = null;
//     if (window.getRealtimeParameters) {
//       selectedParams = window.getRealtimeParameters(trackerId);
//     }
    
//     if (!selectedParams) {
//       // Default parameters if none selected
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
    
//     // Format the data for display
//     const formattedData = {
//       'Tracker ID': trackerId,
//       'timestamp': pointData.timestamp || pointData.time || new Date().toISOString(),
//       'latitude': pointData.latitude || pointData.lat,
//       'longitude': pointData.longitude || pointData.lon,
//       'altitude': pointData.altitude || 0,
//       'uin_no': pointData.uin_no || 'N/A',
//       'application': pointData.application || 'Unknown',
//       'category': pointData.category || 'General',
//       'update_time': new Date().toLocaleTimeString()
//     };
    
//     // Update the real-time table
//     if (window.updateRealtimeTable) {
//       window.updateRealtimeTable(trackerId, formattedData, selectedParams);
//     }
    
//     // Auto-expand the real-time panel if minimized
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
//     if (!trackerIds?.length) return alert('Group empty');
    
//     const visibleTrackers = trackerIds.filter(id => isTrackerVisible(id));
    
//     if (visibleTrackers.length === 0) {
//       alert('No visible trackers in this group');
//       return;
//     }
    
//     clearMap();
//     visibleTrackers.forEach((id, i) => {
//       setTimeout(() => fetchSingleTracker(id, false, enableRealtime), i * 400);
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

//     // END marker (also used as latest point)
//     const endMarker = L.marker(latlngs.at(-1), { icon: END_ICON })
//       .addTo(markersLayer)
//       .bindPopup(createPopupContent(trackerId, points.at(-1), 'Latest Point'));
//     trackerMarkers[trackerId].push(endMarker);

//     // MIDDLE POINTS
//     points.forEach((p, idx) => {
//       if (idx > 0 && idx < points.length - 1 && idx % 3 === 0) {
//         const dotMarker = L.marker([p.lat, p.lon], {
//           icon: createDotIcon(color, 8)
//         })
//         .addTo(markersLayer)
//         .bindPopup(createPopupContent(trackerId, p, `Point ${idx}`));
        
//         trackerMarkers[trackerId].push(dotMarker);
//       }
//     });

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
    
//     // Also update real-time updates
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

//   /* ================= HELPERS ================= */
//   function clearMap() {
//     markersLayer.clearLayers();
//     polylineLayer.clearLayers();
//     Object.keys(trackerPolylines).forEach(k => delete trackerPolylines[k]);
//     Object.keys(trackerMarkers).forEach(k => delete trackerMarkers[k]);
//     Object.keys(trackerLastData).forEach(k => delete trackerLastData[k]);
//     updateLegend();
    
//     // Clear real-time updates
//     realtimeUpdateConfig.trackers.clear();
//     stopRealtimeUpdates();
    
//     if (imagesGrid) {
//       imagesGrid.innerHTML = '';
//     }
    
//     // Clear real-time table data
//     if (window.realtimeTableData) {
//       window.realtimeTableData = {};
//     }
//     if (window.updateRealtimeTable) {
//       window.updateRealtimeTable();
//     }
//   }

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

//   // Initialize global objects
//   window.trajectoryOverlays = {};
//   window.realtimeTableData = {};
//   window.sensorTableData = {};

//   // Add keyboard shortcuts
//   document.addEventListener('keydown', function(e) {
//     if (e.altKey && e.key === 'r') {
//       e.preventDefault();
//       const realtimeBtn = document.getElementById('openRealtimePopup');
//       if (realtimeBtn) realtimeBtn.click();
//     }
    
//     // Alt+A to toggle auto-update for selected tracker
//     if (e.altKey && e.key === 'a') {
//       e.preventDefault();
//       const trackerId = trackerInput.value.trim();
//       if (trackerId) {
//         const isEnabled = realtimeUpdateConfig.trackers.has(trackerId);
//         toggleRealtimeUpdates(trackerId, !isEnabled);
//         showStatus(`Real-time updates ${!isEnabled ? 'enabled' : 'disabled'} for ${trackerId}`, 'success');
//       }
//     }
//   });

//   // Fetch data for saved trackers and sensors on page load
//   window.addEventListener('load', function() {
//     const savedTrackers = JSON.parse(localStorage.getItem('saved_trackers')) || [];
//     const savedSensors = JSON.parse(localStorage.getItem('saved_sensors')) || [];
    
//     // Check if auto-update was enabled before
//     const autoUpdateEnabled = JSON.parse(localStorage.getItem('auto_update_enabled')) || false;
//     const autoUpdateTrackers = JSON.parse(localStorage.getItem('auto_update_trackers')) || [];
    
//     if (savedTrackers.length > 0) {
//       showStatus(`Loading ${savedTrackers.length} saved trackers...`, 'loading');
      
//       setTimeout(() => {
//         savedTrackers.forEach((trackerId, index) => {
//           setTimeout(() => {
//             const enableRealtime = autoUpdateEnabled && autoUpdateTrackers.includes(trackerId);
//             fetchSingleTracker(trackerId, index === 0, enableRealtime);
//           }, index * 500);
//         });
//       }, 1000);
//     }
    
//     if (savedSensors.length > 0) {
//       setTimeout(() => {
//         savedSensors.forEach((sensorId, index) => {
//           setTimeout(() => {
//             if (window.fetchSensorData) {
//               window.fetchSensorData(sensorId);
//             }
//           }, index * 1000);
//         });
//       }, 2000);
//     }
//   });

//   // Save auto-update state before page unload
//   window.addEventListener('beforeunload', function() {
//     localStorage.setItem('auto_update_enabled', JSON.stringify(realtimeUpdateConfig.trackers.size > 0));
//     localStorage.setItem('auto_update_trackers', JSON.stringify(Array.from(realtimeUpdateConfig.trackers)));
//   });

//   // Clean up on page unload
//   window.addEventListener('unload', function() {
//     stopRealtimeUpdates();
//   });
// });














































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

// let groupAutoInterval = null;
// let groupAutoSeconds = 10000; // 10 sec default

// function startGroupAutoRefresh() {
//   if (groupAutoInterval) clearInterval(groupAutoInterval);

//   groupAutoInterval = setInterval(() => {
//     if (!activeGroup) {
//       console.log("⚠️ No active group, skipping auto-refresh");
//       return;
//     }
//     console.log("🔄 Auto-refreshing group:", activeGroup);

//     const event = new Event('click');
//     document.getElementById('fetchGroupBtn').dispatchEvent(event);

//   }, groupAutoSeconds);

//   console.log("▶️ Group auto-refresh started");
// }

// function stopGroupAutoRefresh() {
//   if (groupAutoInterval) {
//     clearInterval(groupAutoInterval);
//     groupAutoInterval = null;
//     console.log("⏹ Group auto-refresh stopped");
//   }
// }


//   /* ================= MAP ================= */
//   const map = L.map('map').setView([23.0225, 72.5714], 13);
//   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//     maxZoom: 19
//   }).addTo(map);

//   const markersLayer = L.layerGroup().addTo(map);
//   const polylineLayer = L.layerGroup().addTo(map);

//   let lastUpdateTime = null;
//   let activeGroup = null;

//   /* ================= TRACKER STATE ================= */
//   const trackerPolylines = {};
//   const trackerMarkers = {};
//   const trackerColorMap = {};
//   const trackerVisibility = {};
//   const trackerAllData = {};

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

//   function createDotIcon(color, size = 8) {
//     return L.divIcon({
//       className: '',
//       html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2px solid white;"></div>`,
//       iconSize: [size, size],
//       iconAnchor: [size / 2, size / 2]
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
//         <span style="font-weight:600;">Start</span>
//       </div>
//       <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
//         ${pin('red')}
//         <span style="font-weight:600;">End</span>
//       </div>
//       <hr style="margin:6px 0">
//     `;

//     Object.entries(trackerColorMap).forEach(([id, color]) => {
//       if (isTrackerVisible(id)) {
//         html += `
//           <div style="display:flex;align-items:center;gap:6px;">
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
//       console.log('Received data from server:', data); // Debug log
      
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

//       console.log(`Parsed ${points.length} points for tracker ${trackerId}`); // Debug log
      
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

//   /* ================= DISPLAY ALL TRACKER DATA ================= */
//   /* ================= DISPLAY ALL TRACKER DATA ================= */
// function displayAllTrackerData(trackerId) {
//   if (!trackerId || !trackerAllData[trackerId] || trackerAllData[trackerId].length === 0) {
//     console.log(`No data to display for tracker ${trackerId}`);
//     return;
//   }
  
//   console.log(`Displaying ${trackerAllData[trackerId].length} points for tracker ${trackerId}`);
  
//   // Get selected parameters for this tracker
//   let selectedParams = null;
//   if (window.getRealtimeParameters) {
//     selectedParams = window.getRealtimeParameters(trackerId);
//   }
  
//   if (!selectedParams) {
//     selectedParams = {
//       timestamp: true,
//       latitude: true,
//       longitude: true,
//       altitude: true,
//       uin_no: true,
//       application: true,
//       category: true
//     };
//   }
  
//   // Create array of all points formatted for the table
//   const allPointsData = trackerAllData[trackerId].map((point, index) => {
//     return {
//       'Tracker ID': trackerId,
//       'Point #': index + 1,
//       'timestamp': point.timestamp || point.time || new Date().toISOString(),
//       'latitude': point.latitude || point.lat,
//       'longitude': point.longitude || point.lon,
//       'altitude': point.altitude || 0,
//       'uin_no': point.uin_no || 'N/A',
//       'application': point.application || 'Unknown',
//       'category': point.category || 'General'
//     };
//   });
  
//   console.log(`Formatted ${allPointsData.length} points for table display`);
  
//   // Update the real-time table with ALL points
//   if (window.updateRealtimeTableAllPoints && allPointsData && allPointsData.length > 0) {
//     console.log('Calling updateRealtimeTableAllPoints');
//     window.updateRealtimeTableAllPoints(trackerId, allPointsData, selectedParams);
//   } else {
//     console.error('updateRealtimeTableAllPoints is not defined or no data to display!');
//   }
  
//   // Auto-expand the real-time panel
//   const realtimePanel = document.getElementById('realtimeTablePanel');
//   if (realtimePanel && realtimePanel.classList.contains('minimized')) {
//     realtimePanel.classList.remove('minimized');
//     const chevron = document.getElementById('realtimeTablePanelChevron');
//     if (chevron) chevron.classList.remove('rotated');
//     const container = document.getElementById('realtimeTableContainer');
//     if (container) container.style.display = 'block';
//   }
// }


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

//   /* ================= HELPERS ================= */
//   /* ================= HELPERS ================= */
// function clearMap() {
//   markersLayer.clearLayers();
//   polylineLayer.clearLayers();
//   Object.keys(trackerPolylines).forEach(k => delete trackerPolylines[k]);
//   Object.keys(trackerMarkers).forEach(k => delete trackerMarkers[k]);
//   Object.keys(trackerAllData).forEach(k => delete trackerAllData[k]);
//   updateLegend();
  
//   realtimeUpdateConfig.trackers.clear();
//   stopRealtimeUpdates();
  
//   if (imagesGrid) {
//     imagesGrid.innerHTML = '';
//   }
  
//   // Clear real-time table data - FIXED: Don't call the function without parameters
//   if (window.realtimeTableDataAllPoints) {
//     window.realtimeTableDataAllPoints = {};
//   }
  
//   // Only call updateRealtimeTableWithAllPoints if it exists
//   if (typeof updateRealtimeTableWithAllPoints === 'function') {
//     updateRealtimeTableWithAllPoints();
//   }
// }

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
//   });

//   // Fetch data for saved trackers on page load
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
//         savedSensors.forEach((sensorId, index) => {
//           setTimeout(() => {
//             if (window.fetchSensorData) {
//               window.fetchSensorData(sensorId);
//             }
//           }, index * 1500);
//         });
//       }, 3000);
//     }
//   });

//   // Save auto-update state before page unload - FIXED: Use beforeunload instead of unload
//   window.addEventListener('beforeunload', function() {
//     localStorage.setItem('auto_update_enabled', JSON.stringify(realtimeUpdateConfig.trackers.size > 0));
//     localStorage.setItem('auto_update_trackers', JSON.stringify(Array.from(realtimeUpdateConfig.trackers)));
//     stopRealtimeUpdates();
//   });
// });

// /* ================= SENSOR DATA FETCH ================= */
//   async function fetchSensorData(sensorId) {
//     try {
//         const res = await fetch('/api/sensor/all', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ sensor_id: sensorId })
//         });

//         if (!res.ok) throw new Error(`Failed to fetch sensor ${sensorId}`);

//         const data = await res.json();
//         const points = data.points || [];

//         // Ensure sensorLayer exists
//         if (!window.sensorLayer) {
//             window.sensorLayer = L.layerGroup().addTo(map);
//         } else {
//             window.sensorLayer.clearLayers();
//         }

//         points.forEach(p => {
//             const lat = parseFloat(p.Latitude);
//             const lon = parseFloat(p.Longitude);
//             if (!isNaN(lat) && !isNaN(lon)) {
//                 const marker = L.marker([lat, lon], {
//                     icon: L.divIcon({
//                         className: 'sensor-marker',
//                         html: `<div style="background:#ff5722;width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>`,
//                         iconSize: [12, 12],
//                         iconAnchor: [6, 6]
//                     })
//                 }).bindPopup(`
//                     <b>Sensor ID:</b> ${p.SensorId}<br>
//                     <b>Timestamp:</b> ${p.Timestamp}<br>
//                     <b>Moisture:</b> ${p.Moisture}<br>
//                     <b>Temperature:</b> ${p.Temperature}<br>
//                     <b>EC:</b> ${p.EC}<br>
//                     <b>PHValue:</b> ${p.PHValue}<br>
//                     <b>Nitrogen:</b> ${p.Nitrogen}<br>
//                     <b>Phosphorous:</b> ${p.Phosphorous}<br>
//                     <b>Potassium:</b> ${p.Potassium}<br>
//                     ${p.Altitude ? `<b>Altitude:</b> ${p.Altitude}<br>` : ''}
//                     ${p.Maplink ? `<a href="${p.Maplink}" target="_blank">View on Map</a>` : ''}
//                 `);
//                 window.sensorLayer.addLayer(marker);
//             }
//         });

//         // Populate sensor table
//         const tableBody = document.getElementById('sensorTableBody');
//         if (tableBody) {
//             tableBody.innerHTML = '';
//             points.forEach(p => {
//                 const row = document.createElement('tr');
//                 row.innerHTML = `
//                     <td>${p.SensorId}</td>
//                     <td>${p.Timestamp}</td>
//                     <td>${p.Moisture}</td>
//                     <td>${p.Temperature}</td>
//                     <td>${p.EC}</td>
//                     <td>${p.PHValue}</td>
//                     <td>${p.Nitrogen}</td>
//                     <td>${p.Phosphorous}</td>
//                     <td>${p.Potassium}</td>
//                 `;
//                 tableBody.appendChild(row);
//             });
//         }

//         // Fit map to markers
//         if (points.length > 0) {
//             const latlngs = points
//                 .map(p => [parseFloat(p.Latitude), parseFloat(p.Longitude)])
//                 .filter(p => !isNaN(p[0]) && !isNaN(p[1]));
//             if (latlngs.length > 0) {
//                 map.fitBounds(L.latLngBounds(latlngs), { padding: [50, 50] });
//             }
//         }

//         console.log(`Loaded ${points.length} points for Sensor ${sensorId}`);
//     } catch (err) {
//         console.error("Error fetching sensor data:", err);
//     }
// }

// window.fetchSensorData = fetchSensorData;

// // Expose globally
// window.fetchSensorData = fetchSensorData;



// // Save auto-update state before unload
// window.addEventListener('beforeunload', () => {
//     localStorage.setItem('auto_update_enabled', JSON.stringify(realtimeUpdateConfig.trackers.size > 0));
//     localStorage.setItem('auto_update_trackers', JSON.stringify(Array.from(realtimeUpdateConfig.trackers)));
//     stopRealtimeUpdates();
// });



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

  let lastUpdateTime = null;
  let activeGroup = null;

  /* ================= TRACKER STATE ================= */
  const trackerPolylines = {};
  const trackerMarkers = {};
  const trackerColorMap = {};
  const trackerVisibility = {};
  const trackerAllData = {};

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
      console.log('Received data from server:', data); // Debug log
      
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

      console.log(`Parsed ${points.length} points for tracker ${trackerId}`); // Debug log
      
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

  /* ================= DISPLAY ALL TRACKER DATA ================= */
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
  /* ================= HELPERS ================= */
function clearMap() {
  markersLayer.clearLayers();
  polylineLayer.clearLayers();
  Object.keys(trackerPolylines).forEach(k => delete trackerPolylines[k]);
  Object.keys(trackerMarkers).forEach(k => delete trackerMarkers[k]);
  Object.keys(trackerAllData).forEach(k => delete trackerAllData[k]);
  updateLegend();
  
  realtimeUpdateConfig.trackers.clear();
  stopRealtimeUpdates();
  
  if (imagesGrid) {
    imagesGrid.innerHTML = '';
  }
  
  // Clear real-time table data - FIXED: Don't call the function without parameters
  if (window.realtimeTableDataAllPoints) {
    window.realtimeTableDataAllPoints = {};
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
  });

  // Fetch data for saved trackers on page load
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
        savedSensors.forEach((sensorId, index) => {
          setTimeout(() => {
            if (window.fetchSensorData) {
              window.fetchSensorData(sensorId);
            }
          }, index * 1500);
        });
      }, 3000);
    }
  });

  // Save auto-update state before page unload - FIXED: Use beforeunload instead of unload
  window.addEventListener('beforeunload', function() {
    localStorage.setItem('auto_update_enabled', JSON.stringify(realtimeUpdateConfig.trackers.size > 0));
    localStorage.setItem('auto_update_trackers', JSON.stringify(Array.from(realtimeUpdateConfig.trackers)));
    stopRealtimeUpdates();
  });
});

/* ================= SENSOR DATA FETCH ================= */
 // ================= SENSOR PANEL =================
async function fetchSensorDashboard(sensorId) {
    try {
        const res = await fetch('/api/sensor/dashboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sensor_id: sensorId })
        });

        if (!res.ok) throw new Error(`Failed to fetch sensor ${sensorId}`);
        const data = await res.json();

        const points = data.points || [];
        console.log(`Loaded ${points.length} points for sensor ${sensorId}`);

        // Get sensor panel container
        const sensorPanel = document.getElementById('sensorPanelContainer');
        if (!sensorPanel) return;

        // Clear previous content
        sensorPanel.innerHTML = '';

        // Create table
        const table = document.createElement('table');
        table.className = 'sensor-table';
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';

        // Table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr style="background:#333;color:white;">
                <th>ID</th>
                <th>Time</th>
                <th>Lat</th>
                <th>Lon</th>
                <th>Moisture</th>
                <th>Temp</th>
                <th>pH</th>
            </tr>
        `;
        table.appendChild(thead);

        // Table body
        const tbody = document.createElement('tbody');

        points.forEach(p => {
            const row = document.createElement('tr');
            row.className = 'sensor-row';
            row.style.cursor = 'pointer';
            row.innerHTML = `
                <td>${p.SensorId}</td>
                <td>${p.Timestamp}</td>
                <td>${p.Latitude}</td>
                <td>${p.Longitude}</td>
                <td>${p.Moisture}</td>
                <td>${p.Temperature}</td>
                <td>${p.PHValue}</td>
            `;

            // Click event to highlight row or show popup
            row.onclick = () => {
                // Highlight row
                tbody.querySelectorAll('tr').forEach(r => r.style.background = '');
                row.style.background = '#f0f8ff';

                // Optional: show marker popup on map
                if (window.sensorLayer) {
                    window.sensorLayer.eachLayer(m => {
                        if (m.getLatLng().lat === p.Latitude && m.getLatLng().lng === p.Longitude) {
                            m.openPopup();
                        }
                    });
                }
            };

            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        sensorPanel.appendChild(table);

        // Map markers
        if (!window.sensorLayer) window.sensorLayer = L.layerGroup().addTo(map);
        else window.sensorLayer.clearLayers();

        points.forEach(p => {
            const marker = L.marker([p.Latitude, p.Longitude], {
                icon: L.divIcon({
                    className: 'sensor-marker',
                    html: `<div style="background:#ff5722;width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>`,
                    iconSize: [12,12],
                    iconAnchor: [6,6]
                })
            }).bindPopup(`
                <b>Sensor ID:</b> ${p.SensorId}<br>
                <b>Time:</b> ${p.Timestamp}<br>
                <b>Moisture:</b> ${p.Moisture}<br>
                <b>Temp:</b> ${p.Temperature}<br>
                <b>pH:</b> ${p.PHValue}
            `);
            window.sensorLayer.addLayer(marker);
        });

    } catch (err) {
        console.error('Sensor dashboard fetch error:', err);
    }
}

// ================= AUTO REFRESH =================
let sensorAutoRefreshInterval = null;

function startSensorAutoRefresh(sensorId, interval = 10000) {
    if (sensorAutoRefreshInterval) clearInterval(sensorAutoRefreshInterval);

    // initial fetch
    fetchSensorDashboard(sensorId);

    // auto refresh
    sensorAutoRefreshInterval = setInterval(() => {
        console.log(`🔄 Auto-refreshing sensor ${sensorId}`);
        fetchSensorDashboard(sensorId);
    }, interval);
}

function stopSensorAutoRefresh() {
    if (sensorAutoRefreshInterval) {
        clearInterval(sensorAutoRefreshInterval);
        sensorAutoRefreshInterval = null;
    }
}

// Expose globally
window.fetchSensorDashboard = fetchSensorDashboard;
window.startSensorAutoRefresh = startSensorAutoRefresh;
window.stopSensorAutoRefresh = stopSensorAutoRefresh;

// Save auto-update state before unload
window.addEventListener('beforeunload', () => {
    localStorage.setItem('auto_update_enabled', JSON.stringify(realtimeUpdateConfig.trackers.size > 0));
    localStorage.setItem('auto_update_trackers', JSON.stringify(Array.from(realtimeUpdateConfig.trackers)));
    stopRealtimeUpdates();
});