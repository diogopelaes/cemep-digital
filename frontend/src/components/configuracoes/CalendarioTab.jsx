import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
            {/* Header com Novo Ano */}
            <div className="flex justify-end items-center gap-2">
                <Button
                    size="sm"
                    icon={HiPlus}
                    onClick={() => setShowIniciarModal(true)}
                >
                    Novo Ano Letivo
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

            {createPortal(
                <IniciarAnoModal
                    isOpen={showIniciarModal}
                    onClose={() => setShowIniciarModal(false)}
                    onSuccess={handleAnoCreated}
                />,
                document.body
            )}
        </div>
    )
}

