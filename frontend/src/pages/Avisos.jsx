import { useState, useEffect } from 'react'
import { 
  Card, Button, Input, Modal, ModalFooter, Loading, Badge
} from '../components/ui'
import { HiPlus, HiBell, HiPaperClip } from 'react-icons/hi'
import { managementAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { formatDateBR } from '../utils/date'
import toast from 'react-hot-toast'

export default function Avisos() {
  const { isFuncionario } = useAuth()
  const [loading, setLoading] = useState(true)
  const [avisos, setAvisos] = useState([])
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    loadAvisos()
  }, [])

  const loadAvisos = async () => {
    try {
      const response = await managementAPI.avisos.meus()
      setAvisos(response.data.results || response.data)
    } catch (error) {
      toast.error('Erro ao carregar avisos')
    }
    setLoading(false)
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
            Avisos
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Comunicados e notificações importantes
          </p>
        </div>
        {isFuncionario && (
          <Button icon={HiPlus} onClick={() => setModalOpen(true)}>
            Novo Aviso
          </Button>
        )}
      </div>

      {/* Lista de Avisos */}
      <div className="space-y-4">
        {avisos.length > 0 ? (
          avisos.map((aviso) => (
            <Card key={aviso.id} hover={false}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center flex-shrink-0">
                  <HiBell className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-lg text-slate-800 dark:text-white">
                        {aviso.titulo}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Por: {aviso.criado_por?.usuario?.first_name || 'Sistema'} • {formatDateBR(aviso.data_aviso, {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <Badge variant="primary">Novo</Badge>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 mt-4 whitespace-pre-wrap">
                    {aviso.texto}
                  </p>
                  {aviso.documento && (
                    <a 
                      href={aviso.documento}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-4 text-primary-600 hover:text-primary-700"
                    >
                      <HiPaperClip className="h-5 w-5" />
                      Ver anexo
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="text-center py-12">
            <HiBell className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Nenhum aviso encontrado</p>
          </Card>
        )}
      </div>

      {/* Modal Novo Aviso */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo Aviso"
        size="lg"
      >
        <div className="space-y-4">
          <Input label="Título" placeholder="Digite o título do aviso" />
          <div>
            <label className="label">Mensagem</label>
            <textarea 
              className="input min-h-[150px] resize-y"
              placeholder="Digite a mensagem do aviso..."
            />
          </div>
          <div>
            <label className="label">Anexo (opcional)</label>
            <input 
              type="file" 
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button>Publicar Aviso</Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}

