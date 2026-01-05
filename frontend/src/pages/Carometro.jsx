import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { academicAPI } from '../services/api'
import { Button, Card } from '../components/ui'
import { HiUser, HiZoomIn, HiDownload } from 'react-icons/hi'
import { FaFilePdf } from 'react-icons/fa'
import { generateCarometroPDF } from '../utils/pdf/index'
import toast from 'react-hot-toast'

export default function Carometro() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState(null)

    useEffect(() => {
        carregarCarometro()
    }, [id])

    const carregarCarometro = async () => {
        try {
            const response = await academicAPI.matriculasTurma.carometro(id)
            setData(response.data)
        } catch (error) {
            console.error(error)
            toast.error('Erro ao carregar carômetro.')
        } finally {
            setLoading(false)
        }
    }



    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-slate-500">Carregando estudantes...</div>
            </div>
        )
    }

    if (!data) return null

    const { turma, estudantes } = data

    return (
        <div className="animate-fade-in p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">
                        Carômetro
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {turma.nome}
                    </p>
                </div>

                <Button
                    icon={FaFilePdf}
                    onClick={() => generateCarometroPDF(turma, estudantes)}
                >
                    <span className="hidden md:inline">Visualizar PDF</span>
                </Button>
            </div>



            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 print:grid-cols-5 print:gap-4">
                {estudantes.map((estudante) => (
                    <Card
                        key={estudante.id}
                        hover={true}
                        className="flex flex-col items-center p-4 print:shadow-none print:border print:break-inside-avoid"
                    >
                        <div
                            className={`w-full aspect-[3/4] mb-3 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 relative print:border-gray-300 ${estudante.foto ? 'cursor-pointer group' : ''}`}
                            onClick={() => estudante.foto && window.open(estudante.foto, '_blank')}
                            title={estudante.foto ? "Clique para ampliar" : ""}
                        >
                            {estudante.foto ? (
                                <>
                                    <img
                                        src={estudante.foto}
                                        alt={estudante.nome}
                                        className="w-full h-full transition-transform group-hover:scale-105"
                                        style={{ imageRendering: 'auto' }}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 print:hidden">
                                        <HiZoomIn className="text-white drop-shadow-md w-8 h-8 opacity-80" />
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400">
                                    <svg viewBox="0 0 24 24" className="w-12 h-12 fill-current opacity-50">
                                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                    </svg>
                                    <span className="text-[10px] mt-2 font-medium">Sem foto</span>
                                </div>
                            )}
                        </div>

                        <div className="text-center w-full">
                            <h3 className="font-bold text-slate-800 dark:text-white text-sm line-clamp-2 min-h-[2.5em] print:text-black leading-tight">
                                {estudante.nome}
                            </h3>
                            {estudante.nome_social && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-1 print:text-gray-600">
                                    ({estudante.nome_social})
                                </p>
                            )}
                            <div className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 print:bg-transparent print:text-gray-500 print:border print:border-gray-200 mt-2">
                                {estudante.data_nascimento}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {estudantes.length === 0 && (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                    Nenhum estudante encontrado nesta turma.
                </div>
            )}
        </div>
    )
}
