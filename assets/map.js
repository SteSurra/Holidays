(function () {
  "use strict";
  let map;
  let routeLayer;
  let userMarker;

  function escapeHTML(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char];
    });
  }

  function mapsUrl(place, city) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(place.name + " " + city.name + " Japan");
  }

  function popupHTML(city) {
    const places = window.JAPAN_DATA.places.filter(function (place) { return place.city === city.id; });
    return '<div class="map-popup"><h3>' + escapeHTML(city.name) + ' ' + escapeHTML(city.jp) + '</h3><p>' + escapeHTML(city.summary) + '</p>'
      + '<div class="map-place-list">' + places.map(function (place) {
        return '<a href="' + mapsUrl(place, city) + '" target="_blank" rel="noopener"><span>' + escapeHTML(place.name) + '</span><span>Maps ↗</span></a>';
      }).join("") + '</div></div>';
  }

  function initMap() {
    const container = document.getElementById("tripMap");
    if (!container || map) return;
    if (!window.L) {
      container.innerHTML = '<div class="empty-state"><div><strong>Mappa non disponibile.</strong><span>Le schede e i collegamenti Google Maps restano utilizzabili.</span></div></div>';
      return;
    }
    map = L.map(container, { zoomControl: true, scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
    const coordinates = window.JAPAN_DATA.cities.map(function (city) {
      const icon = L.divIcon({ className: "route-marker", html: String(city.order), iconSize: [34, 34] });
      L.marker([city.lat, city.lng], { icon: icon }).addTo(map).bindPopup(popupHTML(city), { maxHeight: 380 });
      return [city.lat, city.lng];
    });
    routeLayer = L.polyline(coordinates, { color: "#b6422e", weight: 3, opacity: .72, dashArray: "8 9" }).addTo(map);
    fitRoute();
  }

  function fitRoute() {
    if (map && routeLayer) map.fitBounds(routeLayer.getBounds(), { padding: [30, 30] });
  }

  function locateUser() {
    const button = document.getElementById("locateButton");
    if (!navigator.geolocation) {
      button.textContent = "Posizione non supportata";
      return;
    }
    button.disabled = true;
    button.textContent = "Ricerca posizione…";
    navigator.geolocation.getCurrentPosition(function (position) {
      const latlng = [position.coords.latitude, position.coords.longitude];
      if (userMarker) userMarker.remove();
      userMarker = L.circleMarker(latlng, { radius: 9, color: "#fff", weight: 3, fillColor: "#1b76d1", fillOpacity: 1 }).addTo(map).bindPopup("Sei qui");
      map.setView(latlng, 13);
      userMarker.openPopup();
      button.disabled = false;
      button.textContent = "◎ La mia posizione";
    }, function () {
      button.disabled = false;
      button.textContent = "Posizione non disponibile";
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
  }

  document.getElementById("locateButton").addEventListener("click", locateUser);
  document.getElementById("fitRouteButton").addEventListener("click", fitRoute);
  window.addEventListener("tabi:viewchange", function (event) {
    if (event.detail.view !== "places") return;
    initMap();
    setTimeout(function () { if (map) map.invalidateSize(); }, 80);
  });
})();
