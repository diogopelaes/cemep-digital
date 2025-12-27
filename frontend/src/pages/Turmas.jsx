import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Button, Select, Table, TableHead, TableBody, TableRow,
  TableHeader, TableCell, TableEmpty, Loading, Pagination
} from '../components/ui'
import { HiPlus, HiUserGroup, HiTrash, HiCheck, HiX, HiBookOpen, HiPencil, HiCheckCircle, HiXCircle, HiUpload } from 'react-icons/hi'
import BulkUploadModal from '../components/modals/BulkUploadModal'
import { coreAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function Turmas() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [turmas, setTurmas] = useState([])
  const [anosDisponiveis, setAnosDisponiveis] = useState([])
  const [anoLetivo, setAnoLetivo] = useState(null)
  const [filtroAtivo, setFiltroAtivo] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  // Carrega anos disponíveis na primeira montagem
  useEffect(() => {
    loadAnosDisponiveis()
  }, [])

  // Carrega turmas quando o ano muda ou página muda
  useEffect(() => {
    if (anoLetivo) {
      loadTurmas()
    }
  }, [anoLetivo, currentPage, filtroAtivo])

  const loadAnosDisponiveis = async () => {
    try {
      // Busca anos disponíveis diretamente do backend
      const response = await coreAPI.turmas.anosDisponiveis()
      const anos = response.data

      if (anos && anos.length > 0) {
        setAnosDisponiveis(anos)
        setAnoLetivo(anos[0]) // Seleciona o ano mais recente
      } else {
        // Nenhuma turma cadastrada - usa ano atual como padrão
        const anoAtual = new Date().getFullYear()
        setAnosDisponiveis([anoAtual])
        setAnoLetivo(anoAtual)
        setLoading(false)
      }
    } catch (error) {
      console.error(error)
      toast.error('Erro ao carregar anos letivos')
      setLoading(false)
    }
  }

  const loadTurmas = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const params = { ano_letivo: anoLetivo, page: currentPage }
      if (filtroAtivo !== '') {
        params.is_active = filtroAtivo
      }
      const response = await coreAPI.turmas.list(params)
      const data = response.data
      setTurmas(data.results || data)
      setTotalCount(data.count || (data.results || data).length)
      setTotalPages(Math.ceil((data.count || (data.results || data).length) / pageSize))
    } catch (error) {
      toast.error('Erro ao carregar turmas')
    }
    if (!silent) setLoading(false)
  }

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  // Reset página quando muda o ano
  const handleAnoChange = (e) => {
    setAnoLetivo(parseInt(e.target.value))
    setCurrentPage(1)
  }

  const handleFiltroActiveChange = (e) => {
    setFiltroAtivo(e.target.value)
    setCurrentPage(1)
  }

  const handleToggleAtivo = async (turma) => {
    try {
      await coreAPI.turmas.toggleAtivo(turma.id)
      toast.success(turma.is_active ? 'Turma desativada' : 'Turma ativada')
      loadTurmas()
    } catch (error) {
      toast.error('Erro ao alterar status')
    }
  }

  // Formata o nome da turma
  const formatTurmaNome = (turma) => {
    const nomenclatura = turma.nomenclatura === 'SERIE' ? 'Série' : (turma.nomenclatura === 'ANO' ? 'Ano' : 'Módulo')
    return `${turma.numero}º ${nomenclatura} ${turma.letra}`
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
            Turmas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie as turmas do ano letivo
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="secondary" icon={HiUpload} onClick={() => setShowUploadModal(true)}>
            Cadastro em massa
          </Button>
          <Button icon={HiPlus} onClick={() => navigate('/turmas/novo')}>
            Nova Turma
          </Button>
        </div>
      </div>

      {/* Filtro de Ano */}
      {anosDisponiveis.length > 0 && (
        <Card hover={false}>
          <div className="flex items-center gap-4">
            <div className="w-40">
              <Select
                label="Ano Letivo"
                value={anoLetivo}
                onChange={handleAnoChange}
                options={anosDisponiveis.map(ano => ({ value: ano, label: ano.toString() }))}
              />
            </div>
            <div className="w-40">
              <Select
                label="Status"
                value={filtroAtivo}
                onChange={handleFiltroActiveChange}
                options={[
                  { value: 'true', label: 'Ativas' },
                  { value: 'false', label: 'Inativas' },
                ]}
                placeholder="Todas"
                allowClear
              />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-500 mt-6">
                {turmas.length} turma{turmas.length !== 1 ? 's' : ''} encontrada{turmas.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabela de Turmas */}
      <Card hover={false}>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Turma</TableHeader>
              <TableHeader>Curso</TableHeader>
              <TableHeader>Estudantes</TableHeader>
              <TableHeader>Disciplinas</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {turmas.length > 0 ? (
              turmas.map((turma) => (
                <TableRow key={turma.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => navigate(`/turmas/${turma.id}`)}
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center hover:scale-105 hover:shadow-lg transition-all ${turma.is_active
                          ? 'from-primary-500 to-accent-500'
                          : 'from-slate-400 to-slate-500 grayscale'
                          }`}
                      >
                        <span className="text-white font-bold text-sm">
                          {turma.numero}{turma.letra}
                        </span>
                      </button>
                      <div>
                        <button
                          onClick={() => navigate(`/turmas/${turma.id}`)}
                          className={`font-medium text-left ${!turma.is_active ? 'text-slate-400 line-through' : 'text-link-subtle'}`}
                        >
                          {formatTurmaNome(turma)}
                        </button>
                        {!turma.is_active && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Inativa</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {turma.curso?.nome || 'Curso não definido'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <HiUserGroup className="h-4 w-4" />
                      <span>{turma.estudantes_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <HiBookOpen className="h-4 w-4" />
                      <span>{turma.disciplinas_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleAtivo(turma)
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${turma.is_active
                        ? 'bg-success-500/10 text-success-600 hover:bg-success-500/20 dark:text-success-400'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400'
                        }`}
                      title="Alterar Status"
                    >
                      {turma.is_active ? (
                        <>
                          <HiCheckCircle className="w-4 h-4" />
                          Ativa
                        </>
                      ) : (
                        <>
                          <HiXCircle className="w-4 h-4" />
                          Inativa
                        </>
                      )}
                    </button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableEmpty
                colSpan={4}
                message={anosDisponiveis.length > 0
                  ? `Nenhuma turma encontrada para ${anoLetivo}`
                  : 'Nenhuma turma cadastrada'
                }
              />
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
          const response = await coreAPI.turmas.importarArquivo(formData)
          loadTurmas(true)
          loadAnosDisponiveis() // Atualiza anos se houver novos
          return response
        }}
        entityName="Turmas"
        templateHeaders={['NUMERO', 'LETRA', 'ANO_LETIVO', 'NOMENCLATURA', 'SIGLA_CURSO']}
        onDownloadTemplate={async () => {
          try {
            const response = await coreAPI.turmas.downloadModelo()
            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', 'modelo_turmas.xlsx')
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
            <li>Formatos aceitos: <strong>.csv</strong> ou <strong>.xlsx</strong>.</li>
            <li>Todos os campos são obrigatórios.</li>
            <li><strong>SIGLA_CURSO</strong> deve corresponder a um curso existente.</li>
            <li><strong>NOMENCLATURA</strong>: SÉRIE, ANO ou MÓDULO.</li>
          </ul>
        }
      />
    </div>
  )
}
