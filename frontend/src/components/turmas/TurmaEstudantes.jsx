import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { HiUserGroup, HiX, HiAcademicCap, HiUser } from 'react-icons/hi'
import { Card, Loading, MultiCombobox, DateInput } from '../ui'
import Table, { TableHead, TableBody, TableRow, TableCell, TableEmpty } from '../ui/Table'
import { formatDateBR } from '../../utils/date'

/**
 * Componente para exibir e gerenciar estudantes da turma
 */
export default function TurmaEstudantes({
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

    const handleEnturmar = async () => {
        if (selecionados.length === 0) return
        await onEnturmar(selecionados)
        setSelecionados([])
    }

    // Formata CPF para exibição
    const formatCPF = (cpf) => {
        if (!cpf || cpf.length !== 11) return cpf || '-'
        return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
    }

    return (
        <Card hover={false}>
            <div className="mb-6">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                    Estudantes da Turma
                </h2>
                <p className="text-sm text-slate-500">
                    Adicione estudantes matriculados no mesmo curso
                    {saving && <span className="text-primary-600 ml-2">(salvando...)</span>}
                </p>
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
                            <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
                                Estudantes Enturmados ({estudantesEnturmados.length})
                            </h3>
                            <Table>
                                <TableHead>
                                    <tr>
                                        <th className="text-left py-3 px-4">Nome</th>
                                        <th className="text-left py-3 px-4">CPF</th>
                                        <th className="text-left py-3 px-4">Email</th>
                                        <th className="text-left py-3 px-4">Data Nasc.</th>
                                        <th className="text-right py-3 px-4">Ações</th>
                                    </tr>
                                </TableHead>
                                <TableBody>
                                    {estudantesEnturmados.map(mt => {
                                        const estudante = mt.matricula_cemep?.estudante
                                        const usuario = estudante?.usuario
                                        const nome = usuario?.first_name || 'Estudante'
                                        const matricula = mt.matricula_cemep?.numero_matricula_formatado || mt.matricula_cemep?.numero_matricula
                                        const cpf = estudante?.cpf_formatado || formatCPF(estudante?.cpf)
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
                                                                to={`/estudantes/${estudante.cpf}`}
                                                                state={{ from: location.pathname, tab: 'estudantes' }}
                                                                className="flex items-center gap-3 group/link"
                                                            >
                                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 flex items-center justify-center flex-shrink-0 group-hover/link:ring-2 ring-primary-500 transition-all">
                                                                    {usuario?.foto ? (
                                                                        <img
                                                                            src={usuario.foto}
                                                                            alt={nome}
                                                                            className="w-10 h-10 rounded-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <HiUser className="text-white w-5 h-5" />
                                                                    )}
                                                                </div>
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
                                                    <span className="text-sm text-slate-600 dark:text-slate-300">
                                                        {cpf}
                                                    </span>
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
                                                    <div className="flex items-center justify-end">
                                                        <button
                                                            onClick={() => onRemoveEstudante(mt.id)}
                                                            className="p-2 rounded-lg hover:bg-danger-500/10 text-danger-600 transition-colors"
                                                            title="Remover da turma"
                                                            disabled={saving}
                                                        >
                                                            <HiX className="h-5 w-5" />
                                                        </button>
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
