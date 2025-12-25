import { useState, useRef } from 'react'
import { HiX, HiUpload, HiDownload, HiDocumentText, HiCheck, HiExclamationCircle, HiCheckCircle } from 'react-icons/hi'
import { Button, Loading } from '../ui' // Adjust path if necessary
import toast from 'react-hot-toast'

export default function BulkUploadModal({
    isOpen,
    onClose,
    onUpload,
    title = 'Importação em Massa',
    entityName = 'Registros',
    templateHeaders = [],
    instructions,
    downloadTemplateUrl,
    onDownloadTemplate
}) {
    const [file, setFile] = useState(null)
    const [isDragOver, setIsDragOver] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [importResult, setImportResult] = useState(null)
    const fileInputRef = useRef(null)

    if (!isOpen) return null

    const handleClose = () => {
        setFile(null)
        setImportResult(null)
        setUploading(false)
        onClose()
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        setIsDragOver(true)
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
        setIsDragOver(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragOver(false)
        const droppedFile = e.dataTransfer.files[0]
        validateAndSetFile(droppedFile)
    }

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0]
        validateAndSetFile(selectedFile)
    }

    const validateAndSetFile = (file) => {
        const validTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
        const validExtensions = ['.csv', '.xlsx', '.xls']

        if (file && (validTypes.includes(file.type) || validExtensions.some(ext => file.name.endsWith(ext)))) {
            setFile(file)
        } else {
            toast.error('Por favor, selecione um arquivo válido (.csv ou .xlsx).')
        }
    }

    const handleDownloadTemplate = async () => {
        if (onDownloadTemplate) {
            try {
                await onDownloadTemplate()
            } catch (error) {
                toast.error('Erro ao baixar modelo.')
            }
        } else if (downloadTemplateUrl) {
            // Download from backend via direct link
            const link = document.createElement('a')
            link.href = downloadTemplateUrl
            link.setAttribute('download', `modelo_${entityName.toLowerCase()}.xlsx`)
            document.body.appendChild(link)
            link.click()
            link.remove()
        } else {
            // Fallback: Generate CSV content client-side
            const csvContent = templateHeaders.join(';') + '\n'
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)

            link.setAttribute('href', url)
            link.setAttribute('download', `modelo_importacao_${entityName.toLowerCase().replace(/\s+/g, '_')}.csv`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            link.remove()
        }
    }

    const handleUpload = async () => {
        if (!file) return

        setUploading(true)
        setImportResult(null)
        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await onUpload(formData)
            // Expecting response.data to have { message, created_count, updated_count, errors: [] }
            setImportResult({
                success: true,
                ...response.data
            })
            // If the parent returns the response directly, we use it.
            // Don't toast success immediately, let the result view show it.
        } catch (error) {
            const data = error.response?.data || {}
            setImportResult({
                success: false,
                message: data.detail || 'Erro ao processar importação.',
                errors: data.errors || [],
                created_count: data.created_count || 0,
                updated_count: data.updated_count || 0
            })
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${importResult ? (importResult.success && (!importResult.errors || importResult.errors.length === 0) ? 'bg-success-500/10 text-success-600' : 'bg-warning-500/10 text-warning-600') : 'bg-primary-500/10 text-primary-600'} dark:bg-opacity-20`}>
                            {importResult ? (
                                importResult.success && (!importResult.errors || importResult.errors.length === 0) ? <HiCheckCircle className="w-6 h-6" /> : <HiExclamationCircle className="w-6 h-6" />
                            ) : (
                                <HiUpload className="w-6 h-6" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                                {importResult ? 'Resultado da Importação' : title}
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {importResult ? 'Resumo do processamento' : `Cadastro em massa de ${entityName}`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors"
                    >
                        <HiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {importResult ? (
                        <div className="space-y-6">

                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-success-50 dark:bg-success-900/10 border border-success-100 dark:border-success-900/20 text-center">
                                    <p className="text-2xl font-bold text-success-600 dark:text-success-400">
                                        {importResult.created_count ?? 0}
                                    </p>
                                    <p className="text-sm text-success-700 dark:text-success-300">
                                        Criados
                                    </p>
                                </div>
                                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/20 text-center">
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {importResult.updated_count ?? 0}
                                    </p>
                                    <p className="text-sm text-blue-700 dark:text-blue-300">
                                        Atualizados
                                    </p>
                                </div>
                            </div>

                            {/* Message */}
                            <div className="text-center">
                                <p className={`text-sm font-medium ${importResult.success ? 'text-slate-600 dark:text-slate-300' : 'text-danger-600 dark:text-danger-400'}`}>
                                    {importResult.message}
                                </p>
                            </div>

                            {/* Errors List */}
                            {importResult.errors && importResult.errors.length > 0 && (
                                <div className="border border-danger-200 dark:border-danger-900/30 rounded-xl overflow-hidden">
                                    <div className="bg-danger-50 dark:bg-danger-900/20 p-3 border-b border-danger-100 dark:border-danger-900/30 flex items-center gap-2">
                                        <HiExclamationCircle className="w-5 h-5 text-danger-500" />
                                        <h3 className="font-semibold text-danger-700 dark:text-danger-300 text-sm">
                                            Erros ({importResult.errors.length})
                                        </h3>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto bg-white dark:bg-slate-800 p-2">
                                        <ul className="space-y-1">
                                            {importResult.errors.map((err, idx) => (
                                                <li key={idx} className="text-xs text-danger-600 dark:text-danger-400 p-2 hover:bg-danger-50 dark:hover:bg-danger-900/10 rounded">
                                                    {err}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Instructions */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 space-y-2">
                                <p className="font-medium text-slate-800 dark:text-white flex items-center gap-2">
                                    <HiDocumentText className="w-4 h-4" /> Instruções:
                                </p>
                                {instructions || (
                                    <ul className="list-disc list-inside space-y-1 ml-1">
                                        <li>Utilize o modelo padrão para evitar erros.</li>
                                        <li>Preencha os campos obrigatórios corretamente.</li>
                                        <li>O arquivo deve estar no formato CSV ou XLSX.</li>
                                    </ul>
                                )}
                                <div className="pt-2">
                                    <button
                                        onClick={handleDownloadTemplate}
                                        className="text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium text-sm flex items-center gap-1 transition-colors"
                                    >
                                        <HiDownload className="w-4 h-4" />
                                        Baixar Modelo
                                    </button>
                                </div>
                            </div>

                            {/* Upload Area */}
                            <div
                                className={`
                  relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200
                  ${isDragOver
                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                                        : 'border-slate-300 dark:border-slate-600 hover:border-primary-400'
                                    }
                  ${file ? 'bg-slate-50 dark:bg-slate-800/50' : ''}
                `}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".csv, .xlsx, .xls"
                                    onChange={handleFileSelect}
                                />

                                {file ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-success-500/10 text-success-600 flex items-center justify-center">
                                            <HiDocumentText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800 dark:text-white">
                                                {file.name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {(file.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                            className="text-xs text-danger-500 hover:text-danger-600 font-medium mt-1"
                                        >
                                            Remover arquivo
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        className="flex flex-col items-center gap-3 cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-primary-500/10 text-primary-600 flex items-center justify-center">
                                            <HiUpload className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800 dark:text-white">
                                                Clique para selecionar
                                            </p>
                                            <p className="text-sm text-slate-500">
                                                ou arraste e solte seu arquivo aqui
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                    <Button
                        variant="secondary"
                        onClick={handleClose}
                        disabled={uploading}
                    >
                        {importResult ? 'Fechar' : 'Cancelar'}
                    </Button>
                    {!importResult && (
                        <Button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            icon={uploading ? Loading : HiCheck}
                        >
                            {uploading ? 'Importando...' : 'Iniciar Importação'}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}
