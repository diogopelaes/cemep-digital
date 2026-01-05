import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Card, Button, Loading, Badge
} from '../../components/ui'
import { HiPlus, HiPencil, HiTrash, HiCalendar, HiBookOpen } from 'react-icons/hi'
import { pedagogicalAPI, coreAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateBR } from '../../utils/date'

const BIMESTRES = [
    { value: 1, label: '1º Bimestre' },
    { value: 2, label: '2º Bimestre' },
    { value: 3, label: '3º Bimestre' },
    { value: 4, label: '4º Bimestre' },
]

export default function PlanoAula() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [planos, setPlanos] = useState([])
    const [anoLetivo, setAnoLetivo] = useState(null)
    const [bimestreSelecionado, setBimestreSelecionado] = useState(1)

    useEffect(() => {
        loadInitialData()
    }, [])

    useEffect(() => {
        if (anoLetivo) {
            setBimestreSelecionado(anoLetivo.bimestre_atual || 1)
        }
    }, [anoLetivo])

    const loadInitialData = async () => {
        setLoading(true)
        try {
            const [planosRes, selecRes] = await Promise.all([
                pedagogicalAPI.planosAula.list({ page_size: 1000 }),
                coreAPI.anoLetivoSelecionado.get()
            ])

            setPlanos(planosRes.data.results || [])
            if (selecRes.data.ano_letivo_details) {
                setAnoLetivo(selecRes.data.ano_letivo_details)
            }

        } catch (error) {
            console.error(error)
            toast.error('Erro ao carregar dados.')
        }
        setLoading(false)
    }

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir este plano?')) return
        try {
            await pedagogicalAPI.planosAula.delete(id)
            setPlanos(planos.filter(p => p.id !== id))
            toast.success('Plano excluído')
        } catch (error) {
            toast.error('Erro ao excluir')
        }
    }

    const planosFiltrados = planos.filter(p =>
        !bimestreSelecionado || p.bimestre === parseInt(bimestreSelecionado)
    )

    if (loading) return <Loading />

    return (
        <div className="space-y-6 animate-fade-in p-4 lg:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                        Planos de Aula
                    </h1>
                    <p className="text-slate-500 text-sm">Gerencie o planejamento pedagógico</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <Button onClick={() => navigate('/plano-aula/novo')} variant="primary">
                        <HiPlus className="mr-1" /> Novo Plano
                    </Button>
                </div>
            </div>

            {/* Filtros */}
            <Card hover={false}>
                <div className="w-full sm:w-48">
                    <div className="w-full">
                        <label className="label">Bimestre</label>
                        <select
                            className="input"
                            value={bimestreSelecionado}
                            onChange={(e) => setBimestreSelecionado(e.target.value ? parseInt(e.target.value) : '')}
                        >
                            <option value="">Todos os Bimestres</option>
                            {BIMESTRES.map(b => (
                                <option key={b.value} value={b.value}>{b.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Card>

            {/* LISTAGEM DE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {planosFiltrados.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                        <HiBookOpen className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                        <p>Nenhum plano cadastrado neste bimestre.</p>
                    </div>
                ) : planosFiltrados.map(plano => (
                    <Card key={plano.id} className="group relative flex flex-col h-full hover:border-primary-200 dark:hover:border-primary-800 transition-colors">
                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={() => navigate(`/plano-aula/${plano.id}/editar`)}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-primary-600 dark:bg-slate-700 dark:text-slate-400"
                            >
                                <HiPencil className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => handleDelete(plano.id)}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-danger-600 dark:bg-slate-700 dark:text-slate-400"
                            >
                                <HiTrash className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs font-bold">
                                    {plano.disciplina?.sigla || 'DISC'}
                                </Badge>
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                    <HiCalendar className="w-3 h-3" />
                                    {formatDateBR(plano.data_inicio)} - {formatDateBR(plano.data_fim)}
                                </span>
                            </div>
                            <h3 className="font-semibold text-slate-800 dark:text-white line-clamp-2" dangerouslySetInnerHTML={{ __html: plano.conteudo }} />
                        </div>

                        <div className="mt-auto space-y-3">
                            <div className="flex flex-wrap gap-1">
                                {plano.turmas?.map(t => (
                                    <Badge key={t.id} className="bg-slate-100 text-slate-600 border-none">
                                        {t.numero}{t.letra}
                                    </Badge>
                                ))}
                            </div>
                            {plano.habilidades?.length > 0 && (
                                <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                                    <p className="text-xs text-slate-400 mb-1">Habilidades:</p>
                                    <div className="flex flex-wrap gap-1">
                                        {plano.habilidades.slice(0, 3).map(h => (
                                            <span key={h.id} className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                                                {h.codigo}
                                            </span>
                                        ))}
                                        {plano.habilidades.length > 3 && (
                                            <span className="text-[10px] text-slate-400">+{plano.habilidades.length - 3}</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    )
}
