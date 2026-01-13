const form = document.getElementById('searchForm');
const cityInput = document.getElementById('cityInput');
const resultSection = document.getElementById('result');
const locationEl = document.getElementById('location');
const btnLoc = document.getElementById('btnLoc');
const currentEl = document.getElementById('current');
const forecastEl = document.getElementById('forecast');
const errorEl = document.getElementById('error');

const submitButton = form ? form.querySelector('button[type="submit"]') : null;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return;
  clearUI();

  try {
    if (submitButton) submitButton.disabled = true;
    showMessage('Buscando localização...');
    const place = await lookupCity(city);
    if (!place) throw new Error('Cidade não encontrada');

    showMessage('Buscando previsão...');
    const forecast = await getForecast(place.latitude, place.longitude);
    renderResult(place, forecast);
  } catch (err) {
    console.error('Erro no fluxo principal:', err);
    showError(err.message || 'Erro inesperado');
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});

if (btnLoc) {
  btnLoc.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showError('Geolocalização não é suportada pelo seu navegador.');
      return;
    }
    clearUI();
    showMessage('Detectando sua localização...');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const forecast = await getForecast(latitude, longitude);
        renderResult({ name: 'Sua Localização', country: '', admin1: '' }, forecast);
      } catch (err) {
        console.error('Erro ao obter previsao por geolocalizacao:', err);
        showError('Erro ao obter dados da localização.');
      }
    }, (err) => {
      console.warn('Geolocation permission denied or error:', err);
      showError('Permissão de localização negada.');
    });
  });
}

function clearUI(){
  resultSection.classList.add('hidden');
  resultSection.setAttribute('aria-hidden', 'true');
  errorEl.classList.add('hidden');
  errorEl.setAttribute('aria-hidden', 'true');
  currentEl.innerHTML = '';
  forecastEl.innerHTML = '';
}

function showMessage(msg){
  errorEl.classList.remove('hidden');
  errorEl.classList.remove('msg-error');
  errorEl.classList.add('msg-info');
  errorEl.setAttribute('aria-hidden', 'false');
  errorEl.textContent = msg;
}

function showError(msg){
  errorEl.classList.remove('hidden');
  errorEl.classList.remove('msg-info');
  errorEl.classList.add('msg-error');
  errorEl.setAttribute('aria-hidden', 'false');
  errorEl.textContent = msg;
}

async function lookupCity(name){
  const brUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=pt&country=BR`;
  try {
    const res = await fetch(brUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Falha ao consultar geocoding (BR): ${res.status}`);
    const data = await res.json();
    if (data && data.results && data.results[0]) return data.results[0];
  } catch (err) {
    console.warn('Geocoding BR falhou:', err);
  }

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=pt`;
  try {
    const res2 = await fetch(url, { cache: 'no-store' });
    if (!res2.ok) throw new Error(`Falha ao consultar geocoding: ${res2.status}`);
    const data2 = await res2.json();
    return data2 && data2.results && data2.results[0] ? data2.results[0] : null;
  } catch (err) {
    console.error('Geocoding (global) falhou:', err);
    throw new Error('Não foi possível buscar a localização. Verifique a conexão.');
  }
}

async function getForecast(lat, lon){
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current_weather: 'true',
    timezone: 'auto',
    hourly: 'temperature_2m,weathercode',
    daily: 'temperature_2m_max,temperature_2m_min,weathercode',
    forecast_days: 7
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Falha ao consultar previsão: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('Forecast fetch failed:', err);
    throw new Error('Erro ao obter previsão. Tente novamente mais tarde.');
  }
}

function renderResult(place, data){
  errorEl.classList.add('hidden');
  errorEl.setAttribute('aria-hidden', 'true');
  resultSection.classList.remove('hidden');
  resultSection.setAttribute('aria-hidden', 'false');
  locationEl.textContent = `${place.name}${place.admin1 ? ', ' + place.admin1 : ''} — ${place.country}`;

  const cw = data.current_weather || {};
  const code = cw.weathercode != null ? cw.weathercode : '';
  const iconUri = getWeatherSVG(code);

  currentEl.innerHTML = `
    <div class="weather-icon-wrap">
      <img class="weather-icon" alt="${mapWeatherCode(code)}" src="${iconUri}" />
    </div>
    <strong>Agora</strong>
    <div>Temperatura: <strong>${cw.temperature ?? '—'}°C</strong></div>
    <div>Vento: <strong>${cw.windspeed ?? '—'} km/h</strong></div>
    <div>Condição: <strong>${mapWeatherCode(code)}</strong></div>
    <div>Horário: <small>${cw.time ?? ''}</small></div>
  `;

  // hourly
  const hourly = data.hourly || {};
  if (hourly.time && hourly.temperature_2m) {
    const times = hourly.time;
    const temps = hourly.temperature_2m;
    const codes = hourly.weathercode || [];
    const curIdx = times.indexOf(cw.time);
    const start = curIdx >= 0 ? curIdx : 0;
    const slice = times.slice(start, start + 12);
    const items = slice.map((t, i) => {
      const temp = temps[start + i];
      const wcode = codes[start + i] != null ? codes[start + i] : '';
      const timeLabel = new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const uri = getWeatherSVG(wcode);
      return `<div class="hourly-item">
                <img class="hourly-icon" src="${uri}" alt="${mapWeatherCode(wcode)}" />
                <div class="hourly-time">${timeLabel}</div>
                <div class="hourly-temp">${temp}°C</div>
              </div>`;
    }).join('');

    forecastEl.innerHTML = `<div class="hourly-list">${items}</div>`;
  } else {
    forecastEl.innerHTML = `<strong>Observação</strong><div>Dados fornecidos pela Open-Meteo. Atualize a página para nova busca.</div>`;
  }

  // daily
  const daily = data.daily || {};
  if (daily.time && daily.time.length) {
    const days = daily.time.map((d, i) => {
      const dateLabel = new Date(d).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
      const tMax = daily.temperature_2m_max ? daily.temperature_2m_max[i] : '—';
      const tMin = daily.temperature_2m_min ? daily.temperature_2m_min[i] : '—';
      const wcode = daily.weathercode && daily.weathercode[i] != null ? daily.weathercode[i] : '';
      const uri = getWeatherSVG(wcode);
      return `<div class="weekly-item">
                <img class="weekly-icon" src="${uri}" alt="${mapWeatherCode(wcode)}" />
                <div class="weekly-day">${dateLabel}</div>
                <div class="weekly-temps"><span class="min">${tMin}°</span> <span class="max">${tMax}°</span></div>
              </div>`;
    }).join('');

    const weeklyHtml = `<div class="weekly-list">${days}</div>`;
    if (forecastEl.querySelector('.hourly-list')) {
      forecastEl.insertAdjacentHTML('beforeend', weeklyHtml);
    } else {
      forecastEl.innerHTML = weeklyHtml;
    }
  }
}

function getWeatherSVG(code){
  const sun = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><circle cx='32' cy='32' r='12' fill='%23FFC107'/></svg>`;
  const cloud = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><path d='M20 40h28a10 10 0 0 0 0-20 14 14 0 0 0-27-2A8 8 0 0 0 12 34a6 6 0 0 0 8 6z' fill='%23ECEFF1'/></svg>`;
  const rain = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><path d='M20 30h28a10 10 0 0 0 0-20 14 14 0 0 0-27-2A8 8 0 0 0 12 24a6 6 0 0 0 8 6z' fill='%23CFD8DC'/><g fill='%23007AC1'><path d='M22 44c0 4-4 6-4 10 0 0 6-4 6-8s-2-2-2-2z'/><path d='M34 44c0 4-4 6-4 10 0 0 6-4 6-8s-2-2-2-2z'/><path d='M46 44c0 4-4 6-4 10 0 0 6-4 6-8s-2-2-2-2z'/></g></svg>`;
  const snow = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><path d='M20 30h28a10 10 0 0 0 0-20 14 14 0 0 0-27-2A8 8 0 0 0 12 24a6 6 0 0 0 8 6z' fill='%23E3F2FD'/><g fill='%2390A4AE'><circle cx='22' cy='46' r='2'/><circle cx='32' cy='50' r='2'/><circle cx='42' cy='46' r='2'/></g></svg>`;
  const fog = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect x='8' y='28' width='48' height='6' rx='3' fill='%23B0BEC5'/><rect x='8' y='38' width='48' height='6' rx='3' fill='%23CFD8DC'/></svg>`;
  const storm = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><path d='M20 30h28a10 10 0 0 0 0-20 14 14 0 0 0-27-2A8 8 0 0 0 12 24a6 6 0 0 0 8 6z' fill='%23ECEFF1'/><path d='M34 36l-6 12h8l-2 8 10-14h-8l4-6z' fill='%23FFB74D'/></svg>`;

  const codeMap = {
    0: sun, 1: sun, 2: cloud, 3: cloud,
    45: fog, 48: fog,
    51: rain, 53: rain, 55: rain,
    61: rain, 63: rain, 65: rain,
    71: snow, 73: snow, 75: snow,
    80: rain, 81: rain, 82: rain,
    95: storm, 96: storm, 99: storm
  };
  const svg = codeMap[code] || cloud;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

function mapWeatherCode(code){
  const mapping = {
    0: 'Céu limpo',
    1: 'Principalmente limpo',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Nevoeiro',
    48: 'Depósito de gelo',
    51: 'Chuvisco leve',
    53: 'Chuvisco moderado',
    55: 'Chuvisco forte',
    61: 'Chuva fraca',
    63: 'Chuva moderada',
    65: 'Chuva forte',
    71: 'Neve fraca',
    73: 'Neve moderada',
    75: 'Neve forte',
    80: 'A chuva começa',
    81: 'Chuva contínua',
    82: 'Chuva intensa',
    95: 'Tempestade',
    96: 'Tempestade com granizo leve',
    99: 'Tempestade com granizo forte'
  };
  return mapping[code] ?? 'Não disponível';
}
