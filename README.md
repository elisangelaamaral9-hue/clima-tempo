# Clima-Tempo (Web)

Aplicativo simples de clima usando HTML, CSS e JavaScript.

Funcionalidade:
- Entrada: nome da cidade
- Uso das APIs Open-Meteo (geocoding + forecast)
- Exibe temperatura atual, vento e previsão básica

Como usar:
1. Abra `index.html` em um navegador moderno (não requer servidor).
2. Digite o nome da cidade e clique em "Buscar".

Executando localmente (recomendado):

- Pelo script (Unix/WSL/git-bash):

```bash
./scripts/run_local.sh
```

- Ou com Python (cross-platform):

```bash
python -m http.server 8000
```

Abra http://localhost:8000/index.html

Endpoints usados:
- Geocoding: https://geocoding-api.open-meteo.com/v1/search
- Forecast: https://api.open-meteo.com/v1/forecast

Licença: MIT (exemplo)
