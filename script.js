const $ = sel => document.querySelector(sel);

// ===== Trip Calculator =====
function computeTrip(distance, fuel, mode) {
  distance = parseFloat(distance) || 0;
  fuel = parseFloat(fuel) || 0;
  let cost = 0;
  if (mode === 'car') cost = (distance / 15) * fuel;
  if (mode === 'bike') cost = (distance / 40) * fuel;
  if (mode === 'bus') cost = distance * 2;
  return { cost };
}
function calculateCost() {
  const distance = $('#distance').value;
  const fuel = $('#fuel').value;
  const mode = $('#mode').value;
  const { cost } = computeTrip(distance, fuel, mode);
  $('#costResult').textContent = `Estimated Cost: ₹${cost.toFixed(2)}`;
}
$('#calcBtn')?.addEventListener('click', calculateCost);

// ===== Smooth scroll nav =====
document.querySelectorAll('header nav a').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// ===== Map =====
let userCoords = null;
function initMap() {
  const fallback = [18.5204, 73.8567];
  if (!$('#map')) return;
  const map = L.map('map').setView(fallback, 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(pos => {
      userCoords = [pos.coords.latitude, pos.coords.longitude];
      map.setView(userCoords, 13);
      L.marker(userCoords).addTo(map).bindPopup('You are here').openPopup();
    }, () => L.marker(fallback).addTo(map).bindPopup('Default location').openPopup());
  }
}
window.addEventListener('load', initMap);

// ===== Tourist Places for Hero Search =====
$('#aiSuggestBtn')?.addEventListener('click', () => fetchTouristPlaces($('#destination').value, $('#destinationResults')));

async function fetchTouristPlaces(dest, resultsDiv) {
  resultsDiv.innerHTML = "";
  if (!dest) {
    resultsDiv.innerHTML = "<p>Please enter a destination.</p>";
    return;
  }
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dest)}`);
    const data = await res.json();
    if (!data.length) {
      resultsDiv.innerHTML = `<p>No location found for "${dest}".</p>`;
      return;
    }
    const lat = data[0].lat, lon = data[0].lon;
    resultsDiv.innerHTML = `<p>Loading attractions for ${dest}...</p>`;
    const wikiRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=10000&gslimit=10&format=json&origin=*`);
    const wikiData = await wikiRes.json();
    if (!wikiData.query.geosearch.length) {
      resultsDiv.innerHTML = `<p>No major attractions found near ${dest}.</p>`;
      return;
    }
    // Only show names
    resultsDiv.innerHTML = `<h3>Top attractions near ${dest}:</h3><ul>` +
      wikiData.query.geosearch.map(p => `<li><strong>${p.title}</strong></li>`).join('') +
      `</ul>`;
  } catch {
    resultsDiv.innerHTML = "<p>Error loading tourist places.</p>";
  }
}

// ===== Weather fetch for chatbot intent =====
async function fetchWeatherForChat(city, resultsDiv) {
  try {
    const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
    const geo = await geoRes.json();
    if (!geo.length) {
      resultsDiv.innerHTML = `<p>No weather data found for "${city}".</p>`;
      return;
    }
    const lat = geo[0].lat, lon = geo[0].lon;
    const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    const wData = await wRes.json();
    const now = wData.current_weather;
    resultsDiv.innerHTML = `<p>Weather in <b>${city}</b>: ${now.temperature}°C, wind ${now.windspeed} km/h</p>`;
  } catch {
    resultsDiv.innerHTML = `<p>Error loading weather for "${city}".</p>`;
  }
}

// ===== Hybrid AI Chatbot Widget =====
(function initAIWidget() {
  const launcher = $('#ai-launcher'),
    panel = $('#ai-panel'),
    closeBtn = $('#ai-close'),
    body = $('#ai-body'),
    input = $('#ai-input'),
    send = $('#ai-send');

  if (!launcher || !panel || !body || !input || !send) return;

  const pushMsg = (text, who = 'user') => {
    const div = document.createElement('div');
    div.className = `msg ${who}`;
    div.innerHTML = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  };

  const openPanel = () => {
    panel.classList.add('open');
    setTimeout(() => input.focus(), 50);
  };
  const closePanelFn = () => panel.classList.remove('open');

  launcher.addEventListener('click', openPanel);
  closeBtn.addEventListener('click', closePanelFn);

  async function callFreeAI(prompt) {
    try {
      const r = await fetch("https://api-inference.huggingface.co/models/gpt2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: prompt })
      });
      const data = await r.json();
      if (Array.isArray(data) && data[0].generated_text) {
        return data[0].generated_text.trim();
      }
      return "Let me think about that… Could you give me more details?";
    } catch {
      return "I had trouble connecting to my brain (server). Please try again.";
    }
  }

  async function handleSend() {
    const text = input.value.trim();
    if (!text) return;
    pushMsg(text, 'user');
    input.value = '';
    pushMsg("...", 'bot');

    // Expanded intent detection
    const placesPattern = /(what(?:'s| is)? (?:there )?(?:to )?(?:see|visit|do)[^?]*in ([\w\s]+)|(?:tourist|attraction|places|sightseeing|things to do) (?:in|at) ([\w\s]+))/i;
    const placesMatch = text.match(placesPattern);
    const placeCity = placesMatch ? (placesMatch[2] || placesMatch[3])?.trim() : null;
    if (placeCity) {
      const tempDiv = document.createElement('div');
      body.lastChild.replaceWith(tempDiv);
      await fetchTouristPlaces(placeCity, tempDiv);
      return;
    }

    const weatherPattern = /(?:weather|temperature|climate).*in ([\w\s]+)/i;
    const weatherMatch = text.match(weatherPattern);
    if (weatherMatch && weatherMatch[1]) {
      const city = weatherMatch[1].trim();
      const tempDiv = document.createElement('div');
      body.lastChild.replaceWith(tempDiv);
      await fetchWeatherForChat(city, tempDiv);
      return;
    }

    // Fallback to GPT-2
    const reply = await callFreeAI(text);
    body.lastChild.textContent = reply;
  }

  send.addEventListener('click', handleSend);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSend();
  });
})();

document.addEventListener('DOMContentLoaded', () => {
  const launcher = document.getElementById('ai-launcher');
  const panel = document.getElementById('ai-panel');
  const closeBtn = document.getElementById('ai-close');
  const sendBtn = document.getElementById('ai-send');
  const input = document.getElementById('ai-input');
  const body = document.getElementById('ai-body');

  launcher.addEventListener('click', () => panel.classList.add('open'));
  closeBtn.addEventListener('click', () => panel.classList.remove('open'));

  sendBtn.addEventListener('click', async () => {
    const userMsg = input.value.trim();
    if (!userMsg) return;

    body.innerHTML += `<div class="msg user">${userMsg}</div>`;
    input.value = '';

    const res = await fetch('http://localhost:3000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg }),
    });

    const data = await res.json();
    body.innerHTML += `<div class="msg bot">${data.reply}</div>`;
    body.scrollTop = body.scrollHeight;
  });
});

