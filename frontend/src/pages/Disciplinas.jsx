import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  Card, Button, Select, Table, TableHead, TableBody, TableRow,
  TableHeader, TableCell, TableEmpty, Loading, Pagination
} from '../components/ui'
import { HiPlus, HiTrash, HiBookOpen, HiX, HiCheck, HiAcademicCap, HiUpload, HiCheckCircle, HiXCircle } from 'react-icons/hi'
import { coreAPI } from '../services/api'
import toast from 'react-hot-toast'
import BulkUploadModal from '../components/modals/BulkUploadModal'

export default function Disciplinas() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [disciplinas, setDisciplinas] = useState([])
  const [filtroStatus, setFiltroStatus] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)


  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  useEffect(() => {
    loadDisciplinas()
  }, [filtroStatus, currentPage])

  const loadDisciplinas = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = { page: currentPage }
      if (filtroStatus !== '') {
        params.is_active = filtroStatus
      }

      const response = await coreAPI.disciplinas.list(params)
      const data = response.data
      setDisciplinas(data.results || data)
      setTotalCount(data.count || (data.results || data).length)
      setTotalPages(Math.ceil((data.count || (data.results || data).length) / pageSize))
    } catch (error) {
      toast.error('Erro ao carregar disciplinas')
    }
    if (!silent) setLoading(false)
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleFiltroStatusChange = (e) => {
    setFiltroStatus(e.target.value)
    setCurrentPage(1)
  }

  const handleToggleActive = async (disciplina) => {
    // Optimistic update
    const previousDisciplinas = [...disciplinas]
    setDisciplinas(prev => prev.map(d =>
      d.id === disciplina.id ? { ...d, is_active: !d.is_active } : d
    ))

    try {
      await coreAPI.disciplinas.toggleAtivo(disciplina.id)
      toast.success(disciplina.is_active ? 'Disciplina desativada' : 'Disciplina ativada')
      // No need to reload, we already updated locally. 
      // Optionally reload silently to ensure sync: loadDisciplinas(true)
    } catch (error) {
      // Revert on error
      setDisciplinas(previousDisciplinas)
      toast.error('Erro ao alterar status')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
            Disciplinas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie as disciplinas e suas habilidades (BNCC)
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="secondary" icon={HiUpload} onClick={() => setShowUploadModal(true)}>
            Cadastro em massa
          </Button>
          <Button icon={HiPlus} onClick={() => navigate('/disciplinas/novo')}>
            Nova Disciplina
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card hover={false}>
        <div className="w-48">
          <Select
            label="Status"
            value={filtroStatus}
            onChange={handleFiltroStatusChange}
            options={[
              { value: 'true', label: 'Ativas' },
              { value: 'false', label: 'Inativas' },
            ]}
            placeholder="Todas"
            allowClear
          />
        </div>
      </Card>


      {/* Tabela */}
      <Card hover={false}>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Nome</TableHeader>
              <TableHeader>Sigla</TableHeader>
              <TableHeader>Área de Conhecimento</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {disciplinas.length > 0 ? (
              disciplinas.map((disciplina) => (
                <TableRow key={disciplina.id}>
                  <TableCell>
                    <div
                      className="flex items-center gap-3 cursor-pointer group"
                      onClick={() => navigate(`/disciplinas/${disciplina.id}/editar`)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <HiBookOpen className="h-5 w-5 text-white" />
                      </div>
                      <span className={`font-medium group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors ${!disciplina.is_active
                        ? 'text-slate-400 dark:text-slate-500 line-through'
                        : 'text-slate-800 dark:text-white'
                        }`}>
                        {disciplina.nome}
                      </span>
                      {!disciplina.is_active && (
                        <span className="px-1.5 py-0.5 text-xs rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          Inativa
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                      {disciplina.sigla}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {disciplina.area_conhecimento_display || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleActive(disciplina)
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${disciplina.is_active
                        ? 'bg-success-500/10 text-success-600 hover:bg-success-500/20 dark:text-success-400'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      title="Alterar Status"
                    >
                      {disciplina.is_active ? (
                        <>
                          <HiCheckCircle className="w-4 h-4" />
                          Ativo
                        </>
                      ) : (
                        <>
                          <HiXCircle className="w-4 h-4" />
                          Inativo
                        </>
                      )}
                    </button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableEmpty colSpan={4} message="Nenhuma disciplina cadastrada" />
            )}
          </TableBody>
        </Table>

        {/* Paginação */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCount}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      </Card>

      <BulkUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={async (formData) => {
          const response = await coreAPI.disciplinas.uploadFile(formData)
          // Se sucesso, recarrega a lista
          loadDisciplinas(true)
          return response
        }}
        entityName="Disciplinas"
        templateHeaders={['NOME', 'SIGLA', 'AREA_CONHECIMENTO']}
        onDownloadTemplate={async () => {
          try {
            const response = await coreAPI.disciplinas.downloadModel()
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', 'modelo_disciplinas.xlsx')
            document.body.appendChild(link)
            link.click()
            link.remove()
          } catch (error) {
            console.error(error)
            toast.error('Erro ao baixar o modelo.')
          }
        }}
        instructions={
          <ul className="list-disc list-inside space-y-1 ml-1 text-slate-600 dark:text-slate-300">
            <li>Você pode usar arquivo <strong>.csv</strong> ou <strong>.xlsx</strong> (Excel).</li>
            <li>As colunas obrigatórias são: <strong>NOME, SIGLA</strong>.</li>
            <li>A coluna <strong>AREA_CONHECIMENTO</strong> deve conter um dos seguintes códigos:
              <ul className="pl-6 mt-1 space-y-1 text-xs text-slate-500">
                <li>LINGUAGENS</li>
                <li>MATEMATICA</li>
                <li>CIENCIAS_NATUREZA</li>
                <li>CIENCIAS_HUMANAS</li>
                <li>TEC_INFORMATICA</li>
              </ul>
            </li>
          </ul>
        }
      />
    </div >
  )
}
