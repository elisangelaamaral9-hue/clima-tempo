Arquivo `app.js` contém lógica mínima de geocoding e forecast.

- `lookupCity(name)` retorna primeiro resultado da API de geocoding.
- `getForecast(lat, lon)` retorna objeto de previsão (current_weather).
- `mapWeatherCode(code)` faz a tradução do código meteorológico para texto.

Melhorias recentes:
- Estado de carregamento: o botão de busca é desabilitado enquanto as requisições estão em andamento.
- Acessibilidade: mensagens usam `aria-live`; ícones têm `alt` descritivo; elementos `aria-hidden` são atualizados.
- Pequenas correções para evitar múltiplos envios e melhorar experiência em teclado.
