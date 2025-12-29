import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { coreAPI } from '../../services/api'
import { HiPlus, HiCalendar, HiCheckCircle, HiRefresh } from 'react-icons/hi'
import { Loading, Badge, Modal, Button } from '../ui'
import IniciarAnoModal from './IniciarAnoModal'
import CalendarioDetalhes from '../../pages/CalendarioDetalhes'

export default function CalendarioTab() {
    const navigate = useNavigate()
    const [anos, setAnos] = useState([])
    const [selectedAno, setSelectedAno] = useState(null)
    const [loading, setLoading] = useState(true)

    // Modals
    const [showIniciarModal, setShowIniciarModal] = useState(false)
    const [showTrocarModal, setShowTrocarModal] = useState(false)

    useEffect(() => {
        loadAnos()
    }, [])

    const loadAnos = async () => {
        try {
            const { data } = await coreAPI.anosLetivos.list()
            const lista = Array.isArray(data) ? data : (data.results || [])
            // Sort descending
            const sorted = lista.sort((a, b) => b.ano - a.ano)
            setAnos(sorted)
            if (sorted.length > 0) {
                // Default to most recent
                setSelectedAno(sorted[0])
            }
        } catch (error) {
            console.error('Erro ao carregar anos letivos:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleAnoCreated = (novoAno) => {
        const novaLista = [novoAno, ...anos].sort((a, b) => b.ano - a.ano)
        setAnos(novaLista)
        setSelectedAno(novoAno)
        // No longer navigating away, just updating view
    }

    if (loading) return <Loading />

    // Estado vazio logic
    if (anos.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Calendário Escolar</h2>
                        <p className="text-slate-500 text-sm">Nenhum ano letivo iniciado.</p>
                    </div>
                    <button
                        onClick={() => setShowIniciarModal(true)}
                        className="flex items-center space-x-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                    >
                        <HiPlus className="w-5 h-5" />
                        <span>Iniciar Ano Letivo</span>
                    </button>
                </div>

                <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <p className="text-slate-500">Comece iniciando um novo ano letivo para gerenciar o calendário.</p>
                    <button
                        onClick={() => setShowIniciarModal(true)}
                        className="mt-4 text-brand-600 hover:text-brand-700 font-medium"
                    >
                        Iniciar Agora
                    </button>
                </div>

                <IniciarAnoModal
                    isOpen={showIniciarModal}
                    onClose={() => setShowIniciarModal(false)}
                    onSuccess={handleAnoCreated}
                />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header com Trocar Calendário */}
            <div className="flex justify-end items-center">
                <Button
                    variant="secondary"
                    size="sm"
                    icon={HiRefresh}
                    onClick={() => setShowTrocarModal(true)}
                >
                    Trocar Calendário
                </Button>
                <Button
                    className="ml-2"
                    size="sm"
                    icon={HiPlus}
                    onClick={() => setShowIniciarModal(true)}
                >
                    Novo Ano
                </Button>
            </div>

            {/* Embedded Details */}
            {selectedAno && (
                <div key={selectedAno.ano} className="animate-fade-in">
                    <CalendarioDetalhes
                        ano={selectedAno.ano}
                        showBackButton={false}
                    />
                </div>
            )}

            {/* Modal de Troca */}
            <Modal
                isOpen={showTrocarModal}
                onClose={() => setShowTrocarModal(false)}
                title="Selecionar Ano Letivo"
                size="md"
            >
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                    {anos.map(ano => (
                        <button
                            key={ano.ano}
                            onClick={() => {
                                setSelectedAno(ano)
                                setShowTrocarModal(false)
                            }}
                            className={`w - full flex items - center justify - between p - 4 rounded - xl border transition - all
                            ${selectedAno?.ano === ano.ano
                                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-brand-300 dark:hover:border-brand-700'
                                }
`}
                        >
                            <div className="flex items-center gap-3">
                                <HiCalendar className={`w - 5 h - 5 ${selectedAno?.ano === ano.ano ? 'text-brand-600' : 'text-slate-400'} `} />
                                <span className={`font - medium ${selectedAno?.ano === ano.ano ? 'text-brand-700 dark:text-brand-300' : 'text-slate-700 dark:text-slate-300'} `}>
                                    {ano.ano}
                                </span>
                            </div>
                            {ano.is_active && <Badge variant="success">Ativo</Badge>}
                        </button>
                    ))}
                </div>
            </Modal>

            <IniciarAnoModal
                isOpen={showIniciarModal}
                onClose={() => setShowIniciarModal(false)}
                onSuccess={handleAnoCreated}
            />
        </div>
    )
}
