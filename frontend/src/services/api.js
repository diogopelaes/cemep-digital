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

// Interceptor para refresh token e tratamento de erros de permissão
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Erro 401: Token expirado - tenta refresh
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

    // Erro 403: Sem permissão - redireciona para página inicial
    if (error.response?.status === 403) {
      // Importação dinâmica para evitar dependência circular
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error('Você não tem permissão para acessar este recurso.')
      })

      // Redireciona para dashboard após pequeno delay para mostrar o toast
      setTimeout(() => {
        if (window.location.pathname !== '/dashboard') {
          window.location.href = '/dashboard'
        }
      }, 500)
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
  // Djoser Password Reset
  resetPassword: (data) => axios.post('/api/v1/auth/users/reset_password/', data),
  resetPasswordConfirm: (data) => axios.post('/api/v1/auth/users/reset_password_confirm/', data),
}

export const usersAPI = {
  list: (params) => api.get('/users/', { params }),
  get: (id) => api.get(`/users/${id}/`),
  create: (data) => api.post('/users/', data),
  update: (id, data) => api.patch(`/users/${id}/`, data),
  delete: (id) => api.delete(`/users/${id}/`),
  sendCredentials: (data) => api.post('/users/send-credentials/', data),
}

export const coreAPI = {
  // Funcionários
  funcionarios: {
    list: (params) => api.get('/core/funcionarios/', { params }),
    get: (id) => api.get(`/core/funcionarios/${id}/`),
    create: (data) => api.post('/core/funcionarios/', data),
    criarCompleto: (data) => api.post('/core/funcionarios/criar-completo/', data),
    atualizarCompleto: (id, data) => api.put(`/core/funcionarios/${id}/atualizar-completo/`, data),
    update: (id, data) => api.patch(`/core/funcionarios/${id}/`, data),
    delete: (id) => api.delete(`/core/funcionarios/${id}/`),
    delete: (id) => api.delete(`/core/funcionarios/${id}/`),
    toggleAtivo: (id) => api.post(`/core/funcionarios/${id}/toggle-ativo/`),
    uploadFile: (formData) => api.post('/core/funcionarios/importar-arquivo/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    downloadModel: () => api.get('/core/funcionarios/download-modelo/', { responseType: 'blob' }),
  },
  // Disciplinas
  disciplinas: {
    list: (params) => api.get('/core/disciplinas/', { params }),
    get: (id) => api.get(`/core/disciplinas/${id}/`),
    create: (data) => api.post('/core/disciplinas/', data),
    update: (id, data) => api.patch(`/core/disciplinas/${id}/`, data),
    delete: (id) => api.delete(`/core/disciplinas/${id}/`),
    toggleAtivo: (id) => api.post(`/core/disciplinas/${id}/toggle-ativo/`),
    uploadFile: (formData) => api.post('/core/disciplinas/importar-arquivo/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    downloadModel: () => api.get('/core/disciplinas/download-modelo/', { responseType: 'blob' }),
  },
  // Cursos
  cursos: {
    list: (params) => api.get('/core/cursos/', { params }),
    get: (id) => api.get(`/core/cursos/${id}/`),
    create: (data) => api.post('/core/cursos/', data),
    update: (id, data) => api.patch(`/core/cursos/${id}/`, data),
    delete: (id) => api.delete(`/core/cursos/${id}/`),
    toggleAtivo: (id) => api.post(`/core/cursos/${id}/toggle-ativo/`),
    importarArquivo: (formData) => api.post('/core/cursos/importar-arquivo/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    downloadModelo: () => api.get('/core/cursos/download-modelo/', { responseType: 'blob' }),
  },
  // Turmas
  turmas: {
    list: (params) => api.get('/core/turmas/', { params }),
    get: (id) => api.get(`/core/turmas/${id}/`),
    create: (data) => api.post('/core/turmas/', data),
    update: (id, data) => api.patch(`/core/turmas/${id}/`, data),
    delete: (id) => api.delete(`/core/turmas/${id}/`),
    toggleAtivo: (id) => api.post(`/core/turmas/${id}/toggle-ativo/`),
    anosDisponiveis: () => api.get('/core/turmas/anos-disponiveis/'),
    importarArquivo: (formData) => api.post('/core/turmas/importar-arquivo/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    downloadModelo: () => api.get('/core/turmas/download-modelo/', { responseType: 'blob' }),
  },
  // Calendário
  // Calendário (Anos Letivos e Eventos)
  anosLetivos: {
    list: (params) => api.get('/core/anos-letivos/', { params }),
    get: (id) => api.get(`/core/anos-letivos/${id}/`),
    create: (data) => api.post('/core/anos-letivos/', data),
    update: (id, data) => api.patch(`/core/anos-letivos/${id}/`, data),
    delete: (id) => api.delete(`/core/anos-letivos/${id}/`),

    // Actions Customizadas para dias
    getCalendario: (id) => api.get(`/core/anos-letivos/${id}/calendario/`),
    addDiaNaoLetivo: (id, data) => api.post(`/core/anos-letivos/${id}/dia-nao-letivo/`, data),
    addDiaLetivoExtra: (id, data) => api.post(`/core/anos-letivos/${id}/dia-letivo-extra/`, data),
    removeDia: (anoId, diaId, tipo) => api.delete(`/core/anos-letivos/${anoId}/remover-dia/?id=${diaId}&tipo=${tipo}`),
  },
  // Habilidades
  habilidades: {
    list: (params) => api.get('/core/habilidades/', { params }),
    get: (id) => api.get(`/core/habilidades/${id}/`),
    create: (data) => api.post('/core/habilidades/', data),
    update: (id, data) => api.patch(`/core/habilidades/${id}/`, data),
    delete: (id) => api.delete(`/core/habilidades/${id}/`),
  },
  // Períodos de Trabalho
  periodosTrabalho: {
    list: (params) => api.get('/core/periodos-trabalho/', { params }),
    get: (id) => api.get(`/core/periodos-trabalho/${id}/`),
    create: (data) => api.post('/core/periodos-trabalho/', data),
    update: (id, data) => api.patch(`/core/periodos-trabalho/${id}/`, data),
    delete: (id) => api.delete(`/core/periodos-trabalho/${id}/`),
  },
  // Disciplinas da Turma (vínculo)
  disciplinasTurma: {
    list: (params) => api.get('/core/disciplinas-turma/', { params }),
    get: (id) => api.get(`/core/disciplinas-turma/${id}/`),
    create: (data) => api.post('/core/disciplinas-turma/', data),
    update: (id, data) => api.patch(`/core/disciplinas-turma/${id}/`, data),
    delete: (id) => api.delete(`/core/disciplinas-turma/${id}/`),
    importarArquivo: (formData) => api.post('/core/disciplinas-turma/importar-arquivo/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    importarEmMassa: (formData) => api.post('/core/disciplinas-turma/importar-em-massa/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    downloadModelo: () => api.get('/core/disciplinas-turma/download-modelo/', { responseType: 'blob' }),
  },
  // Atribuição de Aulas (Professor -> Disciplina/Turma)
  atribuicoes: {
    list: (params) => api.get('/core/atribuicoes/', { params }),
    get: (id) => api.get(`/core/atribuicoes/${id}/`),
    create: (data) => api.post('/core/atribuicoes/', data),
    update: (id, data) => api.patch(`/core/atribuicoes/${id}/`, data),
    delete: (id) => api.delete(`/core/atribuicoes/${id}/`),
  },
  // Horários de Aula
  horariosAula: {
    list: (params) => api.get('/core/horarios-aula/', { params }),
    get: (id) => api.get(`/core/horarios-aula/${id}/`),
    create: (data) => api.post('/core/horarios-aula/', data),
    update: (id, data) => api.patch(`/core/horarios-aula/${id}/`, data),
    delete: (id) => api.delete(`/core/horarios-aula/${id}/`),
  },
  // Grades Horárias (Turma <-> Horário <-> Disciplina)
  gradesHorarias: {
    list: (params) => api.get('/core/grades-horarias/', { params }),
    get: (id) => api.get(`/core/grades-horarias/${id}/`),
    create: (data) => api.post('/core/grades-horarias/', data),
    update: (id, data) => api.patch(`/core/grades-horarias/${id}/`, data),
    delete: (id) => api.delete(`/core/grades-horarias/${id}/`),
  },
  // Ano Letivo Selecionado (preferência do usuário)
  anoLetivoSelecionado: {
    get: () => api.get('/core/ano-letivo-selecionado/'),
    update: (anoLetivoId) => api.post('/core/ano-letivo-selecionado/', { ano_letivo_id: anoLetivoId }),
  },
}

export const academicAPI = {
  // Estudantes (usa ID/UUID como identificador, não CPF)
  estudantes: {
    list: (params) => api.get('/academic/estudantes/', { params }),
    get: (id) => api.get(`/academic/estudantes/${id}/`),
    create: (data) => api.post('/academic/estudantes/', data),
    criarCompleto: (data) => api.post('/academic/estudantes/criar-completo/', data),
    atualizarCompleto: (id, data) => api.put(`/academic/estudantes/${id}/atualizar-completo/`, data),
    update: (id, data) => api.patch(`/academic/estudantes/${id}/`, data),
    prontuario: (id) => api.get(`/academic/estudantes/${id}/prontuario/`),
    uploadFoto: (id, formData) => api.post(`/academic/estudantes/${id}/upload-foto/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    removerFoto: (id) => api.delete(`/academic/estudantes/${id}/remover-foto/`),
    uploadFile: (formData) => api.post('/academic/estudantes/importar-arquivo/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    downloadModel: () => api.get('/academic/estudantes/download-modelo/', { responseType: 'blob' }),
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
    delete: (id) => api.delete(`/academic/matriculas-turma/${id}/`),
    estudantesElegiveis: (turmaId) => api.get('/academic/matriculas-turma/estudantes-elegiveis/', { params: { turma_id: turmaId } }),
    enturmarLote: (data) => api.post('/academic/matriculas-turma/enturmar-lote/', data),
    importarArquivo: (formData) => api.post('/academic/matriculas-turma/importar-arquivo/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    downloadModelo: () => api.get('/academic/matriculas-turma/download-modelo/', { responseType: 'blob' }),
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
  // Dashboard
  dashboard: {
    estatisticas: () => api.get('/management/dashboard/estatisticas/'),
  },
}

