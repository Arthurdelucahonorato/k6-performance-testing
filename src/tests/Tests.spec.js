import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Métrica para duração das chamadas GET
export const getDurationTrend = new Trend('get_duration', true);
// Métrica para taxa de status code 200 (sucesso)
export const statusCode200Rate = new Rate('status_code_200');

export const options = {
  thresholds: {
    // 95% das requisições devem ser concluídas em menos de 5700ms
    get_duration: ['p(95)<5700'],
    // Menos de 12% das requisições devem falhar
    http_req_failed: ['rate<0.12'],
    // 95% ou mais das requisições devem retornar status 200
    status_code_200: ['rate>0.95']
  },
  stages: [
    { duration: '1m', target: 10 },
    { duration: '1m', target: 70 },
    { duration: '1m', target: 150 },
    { duration: '1m', target: 220 },
    { duration: '1m', target: 300 },
  ]
};

export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

export default function () {
  const baseUrl = 'https://api.spacexdata.com/v4/launches';

  const params = {
    timeout: '60s',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const OK = 200;

  const res = http.get(`${baseUrl}`, params);

  // Adicionando a duração da requisição à métrica Trend
  getDurationTrend.add(res.timings.duration);

  // Verificando se o status code é 200 e adicionando à métrica Rate
  statusCode200Rate.add(res.status === OK);

  // Validação do status code 200
  check(res, {
    'GET Launches - Status 200': () => res.status === OK
  });
}
