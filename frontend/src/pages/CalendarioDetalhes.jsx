import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    Card, Button, Badge, Loading, Table, TableHead,
    TableBody, TableRow, TableHeader, TableCell
} from '../components/ui'
import { InfoItem } from '../components/common'
import { HiArrowLeft, HiPencil, HiCalendar, HiTrash } from 'react-icons/hi'
import { coreAPI } from '../services/api'
import { formatDateBR } from '../utils/date'
import toast from 'react-hot-toast'

const TIPOS_DIA_NAO_LETIVO = {
    'FERIADO': 'Feriado',
    'PONTO_FACULTATIVO': 'Ponto facultativo',
    'RECESSO': 'Recesso escolar',
    'FERIAS': 'Férias escolares',
    'SUSPENSO': 'Dia letivo suspenso',
    'PLANEJAMENTO': 'Planejamento',
    'OUTROS': 'Outros',
}

export default function CalendarioDetalhes({ className, ano: anoProp, showBackButton = true }) {
    const navigate = useNavigate()
    const params = useParams()
    const ano = anoProp || params.ano

    const [loading, setLoading] = useState(true)
    const [anoLetivo, setAnoLetivo] = useState(null)
    const [eventos, setEventos] = useState({ dias_nao_letivos: [], dias_letivos_extras: [] })

    useEffect(() => {
        loadData()
    }, [ano])

    const loadData = async () => {
        try {
            const [anoRes, calRes] = await Promise.all([
                coreAPI.anosLetivos.get(ano),
                coreAPI.anosLetivos.getCalendario(ano)
            ])
            setAnoLetivo(anoRes.data)
            setEventos(calRes.data)
        } catch (error) {
            console.error('Erro ao carregar dados:', error)
            toast.error('Erro ao carregar calendário.')
            navigate('/configuracoes')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loading size="lg" />
            </div>
        )
    }

    if (!anoLetivo) return null

    // Determina o bimestre de uma data
    const getBimestre = (data) => {
        if (!data) return '-'
        if (anoLetivo.data_inicio_1bim && anoLetivo.data_fim_1bim &&
            data >= anoLetivo.data_inicio_1bim && data <= anoLetivo.data_fim_1bim) return '1º'
        if (anoLetivo.data_inicio_2bim && anoLetivo.data_fim_2bim &&
            data >= anoLetivo.data_inicio_2bim && data <= anoLetivo.data_fim_2bim) return '2º'
        if (anoLetivo.data_inicio_3bim && anoLetivo.data_fim_3bim &&
            data >= anoLetivo.data_inicio_3bim && data <= anoLetivo.data_fim_3bim) return '3º'
        if (anoLetivo.data_inicio_4bim && anoLetivo.data_fim_4bim &&
            data >= anoLetivo.data_inicio_4bim && data <= anoLetivo.data_fim_4bim) return '4º'
        return '-'
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    {showBackButton && (
                        <button
                            onClick={() => navigate('/configuracoes')}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <HiArrowLeft className="h-6 w-6" />
                        </button>
                    )}
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                                Ano Letivo {anoLetivo.ano}
                            </h1>
                            {anoLetivo.is_active && (
                                <Badge variant="success">Ativo</Badge>
                            )}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Detalhes do calendário escolar
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        icon={HiPencil}
                        onClick={() => navigate(`/configuracoes/calendario/${ano}/editar`)}
                    >
                        Editar Datas
                    </Button>
                </div>
            </div>

            {/* Bimestres */}
            <Card hover={false}>
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 rounded-lg bg-primary-500/10 text-primary-500">
                        <HiCalendar className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                        Datas dos Bimestres
                    </h3>
                </div>

                {(() => {
                    // Função para calcular dias letivos de um bimestre
                    const calcDiasLetivosBim = (inicio, fim) => {
                        if (!inicio || !fim) return null
                        let weekdays = 0
                        const current = new Date(inicio + 'T00:00:00')
                        const endDate = new Date(fim + 'T00:00:00')
                        while (current <= endDate) {
                            const day = current.getDay()
                            if (day !== 0 && day !== 6) weekdays++
                            current.setDate(current.getDate() + 1)
                        }
                        const extras = eventos.dias_letivos_extras.filter(d => d.data >= inicio && d.data <= fim).length
                        const naoLetivos = eventos.dias_nao_letivos.filter(d => d.data >= inicio && d.data <= fim).length
                        return weekdays + extras - naoLetivos
                    }

                    const bim1 = calcDiasLetivosBim(anoLetivo.data_inicio_1bim, anoLetivo.data_fim_1bim)
                    const bim2 = calcDiasLetivosBim(anoLetivo.data_inicio_2bim, anoLetivo.data_fim_2bim)
                    const bim3 = calcDiasLetivosBim(anoLetivo.data_inicio_3bim, anoLetivo.data_fim_3bim)
                    const bim4 = calcDiasLetivosBim(anoLetivo.data_inicio_4bim, anoLetivo.data_fim_4bim)

                    return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <p className="font-semibold text-primary-600">1º Bimestre</p>
                                <p className="text-sm">Início: <span className="font-medium text-slate-700 dark:text-slate-300">{formatDateBR(anoLetivo.data_inicio_1bim)}</span></p>
                                <p className="text-sm">Fim: <span className="font-medium text-slate-700 dark:text-slate-300">{formatDateBR(anoLetivo.data_fim_1bim)}</span></p>
                                {bim1 !== null && (
                                    <p className="text-sm font-bold text-primary-600 pt-1">{bim1} dias letivos</p>
                                )}
                            </div>
                            <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <p className="font-semibold text-primary-600">2º Bimestre</p>
                                <p className="text-sm">Início: <span className="font-medium text-slate-700 dark:text-slate-300">{formatDateBR(anoLetivo.data_inicio_2bim)}</span></p>
                                <p className="text-sm">Fim: <span className="font-medium text-slate-700 dark:text-slate-300">{formatDateBR(anoLetivo.data_fim_2bim)}</span></p>
                                {bim2 !== null && (
                                    <p className="text-sm font-bold text-primary-600 pt-1">{bim2} dias letivos</p>
                                )}
                            </div>
                            <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <p className="font-semibold text-primary-600">3º Bimestre</p>
                                <p className="text-sm">Início: <span className="font-medium text-slate-700 dark:text-slate-300">{formatDateBR(anoLetivo.data_inicio_3bim)}</span></p>
                                <p className="text-sm">Fim: <span className="font-medium text-slate-700 dark:text-slate-300">{formatDateBR(anoLetivo.data_fim_3bim)}</span></p>
                                {bim3 !== null && (
                                    <p className="text-sm font-bold text-primary-600 pt-1">{bim3} dias letivos</p>
                                )}
                            </div>
                            <div className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                <p className="font-semibold text-primary-600">4º Bimestre</p>
                                <p className="text-sm">Início: <span className="font-medium text-slate-700 dark:text-slate-300">{formatDateBR(anoLetivo.data_inicio_4bim)}</span></p>
                                <p className="text-sm">Fim: <span className="font-medium text-slate-700 dark:text-slate-300">{formatDateBR(anoLetivo.data_fim_4bim)}</span></p>
                                {bim4 !== null && (
                                    <p className="text-sm font-bold text-primary-600 pt-1">{bim4} dias letivos</p>
                                )}
                            </div>
                        </div>
                    )
                })()}

                {/* Estatísticas - só mostra se todas as datas estiverem preenchidas */}
                {anoLetivo.data_inicio_1bim && anoLetivo.data_fim_1bim &&
                    anoLetivo.data_inicio_2bim && anoLetivo.data_fim_2bim &&
                    anoLetivo.data_inicio_3bim && anoLetivo.data_fim_3bim &&
                    anoLetivo.data_inicio_4bim && anoLetivo.data_fim_4bim && (() => {
                        // Conta dias úteis (seg-sex) em um range
                        const countWeekdays = (start, end) => {
                            let count = 0
                            const current = new Date(start + 'T00:00:00')
                            const endDate = new Date(end + 'T00:00:00')
                            while (current <= endDate) {
                                const day = current.getDay()
                                if (day !== 0 && day !== 6) count++
                                current.setDate(current.getDate() + 1)
                            }
                            return count
                        }

                        // Total de dias úteis nos bimestres
                        const diasUteis =
                            countWeekdays(anoLetivo.data_inicio_1bim, anoLetivo.data_fim_1bim) +
                            countWeekdays(anoLetivo.data_inicio_2bim, anoLetivo.data_fim_2bim) +
                            countWeekdays(anoLetivo.data_inicio_3bim, anoLetivo.data_fim_3bim) +
                            countWeekdays(anoLetivo.data_inicio_4bim, anoLetivo.data_fim_4bim)

                        // Dias extras (sábados/domingos letivos)
                        const diasExtrasCount = eventos.dias_letivos_extras.length

                        // Dias não letivos (descontando - apenas dias que cairiam em dias úteis)
                        const diasNaoLetivosCount = eventos.dias_nao_letivos.length

                        // Total letivos = dias úteis + extras - não letivos
                        const totalLetivos = diasUteis + diasExtrasCount - diasNaoLetivosCount

                        return (
                            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Estatísticas do Calendário</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 text-center">
                                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">{totalLetivos}</p>
                                        <p className="text-sm text-green-700 dark:text-green-300">Dias Letivos</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-center">
                                        <p className="text-3xl font-bold text-red-600 dark:text-red-400">{diasNaoLetivosCount}</p>
                                        <p className="text-sm text-red-700 dark:text-red-300">Feriados/Recessos</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-center">
                                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{diasExtrasCount}</p>
                                        <p className="text-sm text-blue-700 dark:text-blue-300">Dias Extras</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })()}
            </Card>

            {/* Dias Não Letivos */}
            <Card hover={false}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                            <HiCalendar className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            Feriados e Dias Não Letivos
                        </h3>
                    </div>
                    {/* Add button here later */}
                </div>

                {eventos.dias_nao_letivos.length > 0 ? (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Bim.</TableHeader>
                                <TableHeader>Data</TableHeader>
                                <TableHeader>Tipo</TableHeader>
                                <TableHeader>Descrição</TableHeader>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {eventos.dias_nao_letivos.map(dia => (
                                <TableRow key={dia.id}>
                                    <TableCell className="font-medium text-primary-600">{getBimestre(dia.data)}</TableCell>
                                    <TableCell>{formatDateBR(dia.data)}</TableCell>
                                    <TableCell>
                                        <Badge variant="warning">{TIPOS_DIA_NAO_LETIVO[dia.tipo] || dia.tipo}</Badge>
                                    </TableCell>
                                    <TableCell>{dia.descricao}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-center text-slate-500 py-4">Nenhum dia não letivo cadastrado.</p>
                )}
            </Card>

            {/* Dias Letivos Extras */}
            <Card hover={false}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                            <HiCalendar className="w-5 h-5" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            Sábados Letivos e Extras
                        </h3>
                    </div>
                    {/* Add button here later */}
                </div>

                {eventos.dias_letivos_extras.length > 0 ? (
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableHeader>Bim.</TableHeader>
                                <TableHeader>Data</TableHeader>
                                <TableHeader>Dia da Semana</TableHeader>
                                <TableHeader>Descrição</TableHeader>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {eventos.dias_letivos_extras.map(dia => (
                                <TableRow key={dia.id}>
                                    <TableCell className="font-medium text-primary-600">{getBimestre(dia.data)}</TableCell>
                                    <TableCell>{formatDateBR(dia.data)}</TableCell>
                                    <TableCell className="capitalize">
                                        {new Date(dia.data).toLocaleDateString('pt-BR', { weekday: 'long' })}
                                    </TableCell>
                                    <TableCell>{dia.descricao}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-center text-slate-500 py-4">Nenhum dia extra cadastrado.</p>
                )}
            </Card>
        </div>
    )
}
