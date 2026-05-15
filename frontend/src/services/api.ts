import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// Inject JWT on every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('bm_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('bm_token')
      window.location.href = '/login'
    }
    const message = err.response?.data?.error ?? err.response?.data?.detail ?? 'Erro de conexão com o servidor'
    return Promise.reject(new Error(message))
  }
)
