function toggleTheme() {
  document.body.classList.toggle("dark-mode");
}

async function searchCity() {
  const city = document.getElementById("cityInput").value.trim();
  if (city) {
    await showWeather(city);
  }
}

async function showWeather(city) {
  const locationRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
  const locationData = await locationRes.json();
  if (!locationData.length) {
    document.getElementById("weatherDisplay").innerHTML = "<p>City not found.</p>";
    return;
  }
  const lat = locationData[0].lat, lon = locationData[0].lon;
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,windspeed_10m`);
  const data = await res.json();

  const now = data.current_weather;
  const hours = data.hourly.time.slice(0, 8).map((t, i) => ({
    time: t.split("T")[1],
    temp: data.hourly.temperature_2m[i],
    wind: data.hourly.windspeed_10m[i]
  }));

  const html = `
    <div class="glass-card">
      <h2>${city}</h2>
      <p><strong>Now:</strong> ${now.temperature}°C, Wind ${now.windspeed} km/h</p>
      <hr>
      <h3>Next Hours</h3>
      <div class="hourly-scroll">
        ${hours.map(h => `
          <div class="hour-card">
            <p><strong>${h.time}</strong></p>
            <p>${h.temp}°C</p>
            <p>💨 ${h.wind} km/h</p>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  document.getElementById("weatherDisplay").innerHTML = html;
}
