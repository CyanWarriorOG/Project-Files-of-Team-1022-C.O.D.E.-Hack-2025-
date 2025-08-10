const apiKey = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImIxMTNkMGFjNzA3MjRlNDliODVmZGUyNjRjOTJhODcwIiwiaCI6Im11cm11cjY0In0=";
let map = L.map("map").setView([0, 0], 13);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

let currentMarker;
let destinationMarker;
let routeLayer;

navigator.geolocation.getCurrentPosition(
  (pos) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    currentMarker = L.marker([lat, lng]).addTo(map).bindPopup("You are here").openPopup();
    map.setView([lat, lng], 13);
  },
  () => alert("Could not get your location")
);

function getRoute() {
  const destination = document.getElementById("destination").value;

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}`)
    .then((res) => res.json())
    .then((data) => {
      if (data.length === 0) return alert("Destination not found");

      const destLat = parseFloat(data[0].lat);
      const destLon = parseFloat(data[0].lon);

      if (destinationMarker) map.removeLayer(destinationMarker);
      destinationMarker = L.marker([destLat, destLon]).addTo(map).bindPopup("Destination").openPopup();

      navigator.geolocation.getCurrentPosition((pos) => {
        const startLat = pos.coords.latitude;
        const startLon = pos.coords.longitude;

        fetch(`https://api.openrouteservice.org/v2/directions/foot-walking?api_key=${apiKey}&start=${startLon},${startLat}&end=${destLon},${destLat}`)
          .then((res) => res.json())
          .then((routeData) => {
            const coords = routeData.features[0].geometry.coordinates.map((c) => [c[1], c[0]]);

            if (routeLayer) map.removeLayer(routeLayer);
            routeLayer = L.polyline(coords, { color: "blue" }).addTo(map);

            map.fitBounds(routeLayer.getBounds());
          });
      });
    });
}