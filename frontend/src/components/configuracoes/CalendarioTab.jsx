import { useState, useEffect } from 'react'
import { coreAPI } from '../../services/api'
import { HiPlus, HiCalendar, HiRefresh, HiCheckCircle } from 'react-icons/hi'
import { Loading, Badge, Modal, Button, Card } from '../ui'
import IniciarAnoModal from './IniciarAnoModal'
import CalendarioDetalhes from '../../pages/CalendarioDetalhes'

import { useReferences } from '../../contexts/ReferenceContext'

export default function CalendarioTab() {
    const [anos, setAnos] = useState([])
    const [selectedAno, setSelectedAno] = useState(null)
    const [loading, setLoading] = useState(true)

    // Context synchronization
    const { reloadReferences } = useReferences()

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

    const handleAnoCreated = async (novoAno) => {
        // Sync global context
        await reloadReferences()

        const novaLista = [novoAno, ...anos].sort((a, b) => b.ano - a.ano)
        setAnos(novaLista)
        setSelectedAno(novoAno)
    }

    if (loading) return <Loading />

    // Estado vazio logic
    if (anos.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Calendário Escolar</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhum ano letivo iniciado.</p>
                    </div>
                    <Button
                        onClick={() => setShowIniciarModal(true)}
                        icon={HiPlus}
                    >
                        Iniciar Ano Letivo
                    </Button>
                </div>

                <Card className="text-center py-12 bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-slate-500 dark:text-slate-400">Comece iniciando um novo ano letivo para gerenciar o calendário.</p>
                    <Button
                        variant="ghost"
                        onClick={() => setShowIniciarModal(true)}
                        className="mt-4"
                    >
                        Iniciar Agora
                    </Button>
                </Card>

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
            <div className="flex justify-end items-center gap-2">
                <Button
                    variant="secondary"
                    size="sm"
                    icon={HiRefresh}
                    onClick={() => setShowTrocarModal(true)}
                >
                    Trocar Calendário
                </Button>
                <Button
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
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {anos.map(ano => (
                        <button
                            key={ano.ano}
                            onClick={() => {
                                setSelectedAno(ano)
                                setShowTrocarModal(false)
                            }}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left
                            ${selectedAno?.ano === ano.ano
                                    ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-700 bg-white dark:bg-slate-800'
                                }
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${selectedAno?.ano === ano.ano ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
                                    <HiCalendar className="w-5 h-5" />
                                </div>
                                <div>
                                    <span className={`font-bold text-lg ${selectedAno?.ano === ano.ano ? 'text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {ano.ano}
                                    </span>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {ano.is_active ? 'Ano Letivo Corrente' : 'Ano Letivo'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {ano.is_active && (
                                    <Badge variant="success">
                                        <div className="flex items-center gap-1">
                                            <HiCheckCircle className="w-3 h-3" />
                                            Ativo
                                        </div>
                                    </Badge>
                                )}
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${selectedAno?.ano === ano.ano ? 'border-primary-500 bg-primary-500' : 'border-slate-300 dark:border-slate-600'}`}>
                                    {selectedAno?.ano === ano.ano && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                            </div>
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

