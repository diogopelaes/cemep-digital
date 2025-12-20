import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para adicionar token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor para refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const response = await axios.post('/api/token/refresh/', {
            refresh: refreshToken,
          })

          const { access } = response.data
          localStorage.setItem('access_token', access)

          originalRequest.headers.Authorization = `Bearer ${access}`
          return api(originalRequest)
        } catch (refreshError) {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(error)
  }
)

export default api

// Funções utilitárias para endpoints
export const authAPI = {
  login: (data) => axios.post('/api/token/', data),
  refresh: (refresh) => axios.post('/api/token/refresh/', { refresh }),
  me: () => api.get('/users/me/'),
  updateMe: (data) => api.put('/users/update_me/', data),
  changePassword: (data) => api.post('/users/change_password/', data),
  resetPassword: (data) => axios.post('/api/v1/users/password-reset/', data),
}

export const usersAPI = {
  list: (params) => api.get('/users/', { params }),
  get: (id) => api.get(`/users/${id}/`),
  create: (data) => api.post('/users/', data),
  update: (id, data) => api.patch(`/users/${id}/`, data),
  delete: (id) => api.delete(`/users/${id}/`),
}

export const coreAPI = {
  // Funcionários
  funcionarios: {
    list: (params) => api.get('/core/funcionarios/', { params }),
    get: (id) => api.get(`/core/funcionarios/${id}/`),
    create: (data) => api.post('/core/funcionarios/', data),
    update: (id, data) => api.patch(`/core/funcionarios/${id}/`, data),
    delete: (id) => api.delete(`/core/funcionarios/${id}/`),
  },
  // Disciplinas
  disciplinas: {
    list: (params) => api.get('/core/disciplinas/', { params }),
    get: (id) => api.get(`/core/disciplinas/${id}/`),
    create: (data) => api.post('/core/disciplinas/', data),
    update: (id, data) => api.patch(`/core/disciplinas/${id}/`, data),
    delete: (id) => api.delete(`/core/disciplinas/${id}/`),
  },
  // Cursos
  cursos: {
    list: (params) => api.get('/core/cursos/', { params }),
    get: (id) => api.get(`/core/cursos/${id}/`),
    create: (data) => api.post('/core/cursos/', data),
    update: (id, data) => api.patch(`/core/cursos/${id}/`, data),
    delete: (id) => api.delete(`/core/cursos/${id}/`),
  },
  // Turmas
  turmas: {
    list: (params) => api.get('/core/turmas/', { params }),
    get: (id) => api.get(`/core/turmas/${id}/`),
    create: (data) => api.post('/core/turmas/', data),
    update: (id, data) => api.patch(`/core/turmas/${id}/`, data),
    delete: (id) => api.delete(`/core/turmas/${id}/`),
  },
  // Calendário
  calendario: {
    list: (params) => api.get('/core/calendario/', { params }),
    get: (id) => api.get(`/core/calendario/${id}/`),
    create: (data) => api.post('/core/calendario/', data),
    update: (id, data) => api.patch(`/core/calendario/${id}/`, data),
    delete: (id) => api.delete(`/core/calendario/${id}/`),
  },
}

export const academicAPI = {
  // Estudantes
  estudantes: {
    list: (params) => api.get('/academic/estudantes/', { params }),
    get: (id) => api.get(`/academic/estudantes/${id}/`),
    create: (data) => api.post('/academic/estudantes/', data),
    update: (id, data) => api.patch(`/academic/estudantes/${id}/`, data),
    delete: (id) => api.delete(`/academic/estudantes/${id}/`),
    prontuario: (id) => api.get(`/academic/estudantes/${id}/prontuario/`),
  },
  // Matrículas
  matriculasCemep: {
    list: (params) => api.get('/academic/matriculas-cemep/', { params }),
    create: (data) => api.post('/academic/matriculas-cemep/', data),
    update: (id, data) => api.patch(`/academic/matriculas-cemep/${id}/`, data),
  },
  matriculasTurma: {
    list: (params) => api.get('/academic/matriculas-turma/', { params }),
    create: (data) => api.post('/academic/matriculas-turma/', data),
    update: (id, data) => api.patch(`/academic/matriculas-turma/${id}/`, data),
  },
}

export const pedagogicalAPI = {
  // Aulas
  aulas: {
    list: (params) => api.get('/pedagogical/aulas/', { params }),
    get: (id) => api.get(`/pedagogical/aulas/${id}/`),
    create: (data) => api.post('/pedagogical/aulas/', data),
    listaChamada: (id) => api.get(`/pedagogical/aulas/${id}/lista_chamada/`),
  },
  // Faltas
  faltas: {
    list: (params) => api.get('/pedagogical/faltas/', { params }),
    registrarLote: (data) => api.post('/pedagogical/faltas/registrar_lote/', data),
  },
  // Notas
  notas: {
    list: (params) => api.get('/pedagogical/notas/', { params }),
    create: (data) => api.post('/pedagogical/notas/', data),
    update: (id, data) => api.patch(`/pedagogical/notas/${id}/`, data),
    boletim: (params) => api.get('/pedagogical/notas/boletim/', { params }),
  },
  // Ocorrências
  ocorrencias: {
    list: (params) => api.get('/pedagogical/ocorrencias/', { params }),
    create: (data) => api.post('/pedagogical/ocorrencias/', data),
  },
}

export const managementAPI = {
  // Tarefas
  tarefas: {
    list: (params) => api.get('/management/tarefas/', { params }),
    create: (data) => api.post('/management/tarefas/', data),
    concluir: (id) => api.post(`/management/tarefas/${id}/concluir/`),
    minhas: () => api.get('/management/tarefas/minhas_tarefas/'),
    relatorio: () => api.get('/management/tarefas/relatorio/'),
  },
  // HTPC
  htpc: {
    list: (params) => api.get('/management/htpc/', { params }),
    create: (data) => api.post('/management/htpc/', data),
    registrarPresenca: (id, data) => api.post(`/management/htpc/${id}/registrar_presenca/`, data),
  },
  // Avisos
  avisos: {
    list: (params) => api.get('/management/avisos/', { params }),
    create: (data) => api.post('/management/avisos/', data),
    meus: () => api.get('/management/avisos/meus_avisos/'),
  },
}

