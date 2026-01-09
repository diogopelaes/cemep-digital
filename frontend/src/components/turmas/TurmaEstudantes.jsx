import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { HiUserGroup, HiTrash, HiAcademicCap, HiUser, HiCheck, HiX, HiUserRemove } from 'react-icons/hi'
import { Card, Loading, MultiCombobox, DateInput, Avatar, Badge, Button } from '../ui'
import Table, { TableHead, TableBody, TableRow, TableCell, TableHeader, TableEmpty } from '../ui/Table'
import { FaFilePdf } from 'react-icons/fa'
import { formatDateBR } from '../../utils/date'
import { generateListaTurmaPDF } from '../../utils/pdf'
import toast from 'react-hot-toast'

/**
 * Componente para exibir e gerenciar estudantes da turma
 */
export default function TurmaEstudantes({
    turma,
    estudantesElegiveis,
    estudantesEnturmados,
    loading,
    saving,
    dataEntrada,
    onDataEntradaChange,
    onEnturmar,
    onRemoveEstudante,
}) {
    const location = useLocation()
    const [selecionados, setSelecionados] = useState([])
    const [confirmingRemove, setConfirmingRemove] = useState(null)
    const [generatingPDF, setGeneratingPDF] = useState(false)

    const handleGerarLista = async () => {
        if (!turma || estudantesEnturmados.length === 0) return
        setGeneratingPDF(true)
        try {
            const listaEstudantes = estudantesEnturmados.map(m => {
                const est = m.matricula_cemep?.estudante
                return {
                    nome: est.nome_exibicao || est.usuario?.first_name || est.nome_social,
                    matricula: m.matricula_cemep?.numero_matricula_formatado || m.matricula_cemep?.numero_matricula,
                    data_nascimento: formatDateBR(est.data_nascimento),
                    email: est.usuario?.email,
                    status: m.status_display || m.status,
                    numero_chamada: m.mumero_chamada
                }
            })

            await generateListaTurmaPDF(turma, listaEstudantes)
            toast.success('Lista gerada com sucesso!')
        } catch (error) {
            console.error(error)
            toast.error('Erro ao gerar lista')
        } finally {
            setGeneratingPDF(false)
        }
    }

    const handleEnturmar = async () => {
        if (selecionados.length === 0) return
        await onEnturmar(selecionados)
        setSelecionados([])
    }

    const handleConfirmRemove = async (id) => {
        await onRemoveEstudante(id)
        setConfirmingRemove(null)
    }

    // Mapeamento de status para variantes do Badge
    const getStatusVariant = (status) => {
        switch (status) {
            case 'CURSANDO': return 'success'
            case 'PROMOVIDO': return 'primary'
            case 'TRANSFERIDO': return 'warning'
            case 'RETIDO':
            case 'ABANDONO': return 'danger'
            default: return 'default'
        }
    }

    // Contagem de status
    const statusCounts = estudantesEnturmados.reduce((acc, curr) => {
        const key = curr.status
        const label = curr.status_display || curr.status
        if (!acc[key]) acc[key] = { label, count: 0 }
        acc[key].count += 1
        return acc
    }, {})

    return (
        <Card hover={false}>
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                        Estudantes da Turma
                    </h2>
                    <p className="text-sm text-slate-500">
                        Adicione estudantes matriculados no mesmo curso
                        {saving && <span className="text-primary-600 ml-2">(salvando...)</span>}
                    </p>
                </div>
                <Button
                    variant="secondary"
                    icon={FaFilePdf}
                    onClick={handleGerarLista}
                    disabled={generatingPDF || estudantesEnturmados.length === 0}
                    loading={generatingPDF}
                >
                    Lista PDF
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <Loading size="md" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Formulário de Enturmação */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="w-full sm:w-48">
                                <DateInput
                                    label="Data de Entrada"
                                    value={dataEntrada}
                                    onChange={(e) => onDataEntradaChange(e.target.value)}
                                />
                            </div>
                            <div className="flex-1">
                                <MultiCombobox
                                    label="Selecionar Estudantes"
                                    value={selecionados}
                                    onChange={setSelecionados}
                                    onEnter={handleEnturmar}
                                    options={estudantesElegiveis.map(m => ({
                                        value: m.numero_matricula,
                                        label: m.estudante?.usuario?.first_name || 'Estudante',
                                        subLabel: `Mat. ${m.numero_matricula_formatado || m.numero_matricula}`
                                    }))}
                                    placeholder="Pesquise por nome... (Enter para enturmar)"
                                    disabled={saving}
                                />
                            </div>
                        </div>
                        {selecionados.length > 0 && (
                            <div className="flex justify-end">
                                <button
                                    onClick={handleEnturmar}
                                    disabled={saving || !dataEntrada}
                                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <HiAcademicCap className="h-5 w-5" />
                                    Enturmar {selecionados.length} estudante(s)
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Tabela de estudantes enturmados */}
                    {estudantesEnturmados.length > 0 ? (
                        <div className="mt-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                                <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                    Estudantes Enturmados
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(statusCounts).map(([key, { label, count }]) => (
                                        <Badge key={key} variant={getStatusVariant(key)}>
                                            {label}: {count}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableHeader>Nome</TableHeader>
                                        <TableHeader>Status</TableHeader>
                                        <TableHeader>Email</TableHeader>
                                        <TableHeader>Data Nasc.</TableHeader>
                                        <TableHeader className="w-20 text-right">Remover</TableHeader>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {estudantesEnturmados.map(mt => {
                                        const estudante = mt.matricula_cemep?.estudante
                                        const usuario = estudante?.usuario
                                        const nome = usuario?.first_name || 'Estudante'
                                        const matricula = mt.matricula_cemep?.numero_matricula_formatado || mt.matricula_cemep?.numero_matricula
                                        const status = mt.status
                                        const statusDisplay = mt.status_display || status
                                        const email = usuario?.email || '-'
                                        const dataNasc = estudante?.data_nascimento
                                            ? formatDateBR(estudante.data_nascimento)
                                            : '-'

                                        return (
                                            <TableRow key={mt.id} className="group">
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <Link
                                                                to={`/estudantes/${estudante.id}`}
                                                                state={{ from: location.pathname, tab: 'estudantes' }}
                                                                className="flex items-center gap-3 group/link"
                                                            >
                                                                <Avatar name={nome} size="md" className="shrink-0 group-hover/link:ring-2 ring-primary-500 transition-all" />
                                                                <div>
                                                                    <p className="font-medium text-slate-800 dark:text-white group-hover/link:text-primary-600 dark:group-hover/link:text-primary-400 transition-colors">
                                                                        {nome}
                                                                    </p>
                                                                    <p className="text-xs text-slate-500">
                                                                        Mat. {matricula}
                                                                    </p>
                                                                </div>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getStatusVariant(status)}>
                                                        {statusDisplay}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-slate-600 dark:text-slate-300">
                                                        {email}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-slate-600 dark:text-slate-300">
                                                        {dataNasc}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="relative flex items-center justify-end">
                                                        {/* Trash button - always rendered */}
                                                        <button
                                                            onClick={() => setConfirmingRemove(mt.id)}
                                                            className={`p-2 text-danger-600 hover:bg-danger-50 rounded-lg transition-all duration-200 ${confirmingRemove === mt.id ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                                                            disabled={saving}
                                                        >
                                                            <HiUserRemove className="h-5 w-5" />
                                                        </button>

                                                        {/* Confirmation overlay - slides in from right */}
                                                        <div className={`absolute right-0 flex items-center gap-2 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg shadow-lg border border-slate-200 dark:border-slate-600 transition-all duration-200 ${confirmingRemove === mt.id ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
                                                            <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">Remover?</span>
                                                            <button
                                                                onClick={() => handleConfirmRemove(mt.id)}
                                                                className="p-1.5 rounded-md bg-danger-600 hover:bg-danger-700 text-white transition-colors"
                                                                title="Confirmar"
                                                                disabled={saving}
                                                            >
                                                                <HiCheck className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmingRemove(null)}
                                                                className="p-1.5 rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-slate-600 dark:text-slate-200 transition-colors"
                                                                title="Cancelar"
                                                                disabled={saving}
                                                            >
                                                                <HiX className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500">
                            <HiUserGroup className="h-12 w-12 mx-auto mb-3 opacity-30" />
                            <p>Nenhum estudante enturmado</p>
                            <p className="text-sm mt-1">Use o campo acima para pesquisar e adicionar estudantes</p>
                        </div>
                    )}
                </div>
            )}
        </Card>
    )
}
