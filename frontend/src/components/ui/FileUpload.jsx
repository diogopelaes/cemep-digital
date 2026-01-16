import { useState, useRef, useEffect } from 'react'
import { HiUpload, HiX, HiDownload } from 'react-icons/hi'
import {
    BsFileEarmarkPdf, BsFileEarmarkWord, BsFileEarmarkExcel,
    BsFileEarmarkPpt, BsFileEarmarkImage, BsFileEarmarkText,
    BsFileEarmark, BsFileEarmarkCode
} from 'react-icons/bs'
import toast from 'react-hot-toast'

const ALLOWED_EXTENSIONS = {
    // Textos
    'pdf': { type: 'text', max: 10 * 1024 * 1024 },
    'docx': { type: 'text', max: 10 * 1024 * 1024 },
    'odt': { type: 'text', max: 10 * 1024 * 1024 },
    'txt': { type: 'text', max: 10 * 1024 * 1024 },
    'md': { type: 'text', max: 10 * 1024 * 1024 },
    // Planilhas
    'csv': { type: 'spreadsheet', max: 5 * 1024 * 1024 },
    'xlsx': { type: 'spreadsheet', max: 5 * 1024 * 1024 },
    'ods': { type: 'spreadsheet', max: 5 * 1024 * 1024 },
    // Imagens
    'jpg': { type: 'image', max: 5 * 1024 * 1024 },
    'jpeg': { type: 'image', max: 5 * 1024 * 1024 },
    'png': { type: 'image', max: 5 * 1024 * 1024 },
    // Slides
    'pptx': { type: 'presentation', max: 10 * 1024 * 1024 },
    'odp': { type: 'presentation', max: 10 * 1024 * 1024 },
}

const getFileIcon = (ext) => {
    switch (ext) {
        case 'pdf': return BsFileEarmarkPdf
        case 'doc':
        case 'docx':
        case 'odt': return BsFileEarmarkWord
        case 'xls':
        case 'xlsx':
        case 'csv':
        case 'ods': return BsFileEarmarkExcel
        case 'ppt':
        case 'pptx':
        case 'odp': return BsFileEarmarkPpt
        case 'jpg':
        case 'jpeg':
        case 'png': return BsFileEarmarkImage
        case 'txt':
        case 'md': return BsFileEarmarkText
        case 'json':
        case 'xml':
        case 'html':
        case 'css':
        case 'js': return BsFileEarmarkCode
        default: return BsFileEarmark
    }
}

export default function FileUpload({
    label = 'Arquivos',
    onChange, // Retorna array de OBJETOS
    initialFiles = [], // Array de objetos arquivo completos
    maxFiles = 5,
    category = 'avaliacoes'
}) {
    const [files, setFiles] = useState(initialFiles)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef(null)

    // Sincroniza estado local se initialFiles mudar (importante para o edit)
    useEffect(() => {
        if (initialFiles) {
            setFiles(initialFiles)
        }
    }, [initialFiles])

    const handleDragEnter = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        e.stopPropagation()
    }

    const handleDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        const droppedFiles = Array.from(e.dataTransfer.files)
        handleFiles(droppedFiles)
    }

    const validateFile = (file) => {
        const ext = file.name.split('.').pop().toLowerCase()
        const config = ALLOWED_EXTENSIONS[ext]

        if (!config) {
            toast.error(`Extensão .${ext} não permitida.`)
            return false
        }

        if (file.size > config.max) {
            const sizeMB = config.max / (1024 * 1024)
            toast.error(`Arquivo muito grande. Máximo permitdo para .${ext} é ${sizeMB}MB.`)
            return false
        }

        return true
    }

    const handleFiles = (newFiles) => {
        if (files.length + newFiles.length > maxFiles) {
            toast.error(`Limite de ${maxFiles} arquivos excedido.`)
            return
        }

        const validFiles = newFiles.filter(validateFile)
        if (validFiles.length === 0) return

        // Adiciona arquivos locais
        const newLocalFiles = validFiles.map(f => {
            return Object.assign(f, {
                id: `temp-${Date.now()}-${Math.random()}`,
                isLocal: true,
                nome_original: f.name,
                tamanho: f.size
            })
        })

        const updatedFiles = [...files, ...newLocalFiles]
        setFiles(updatedFiles)

        if (onChange) {
            onChange(updatedFiles)
        }
    }

    const handleRemove = (id) => {
        const newFiles = files.filter(f => f.id !== id)
        setFiles(newFiles)
        if (onChange) {
            onChange(newFiles)
        }
    }

    const formatSize = (bytes) => {
        if (bytes === undefined || bytes === null || isNaN(bytes)) return '...'
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
    }

    return (
        <div className="w-full space-y-3">
            <label className="label">{label}</label>

            <div
                className={`
                    border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer
                    ${isDragging
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                        : 'border-slate-300 dark:border-slate-600 hover:border-primary-400 dark:hover:border-primary-500'
                    }
                `}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    multiple
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => handleFiles(Array.from(e.target.files))}
                />

                <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full">
                        <HiUpload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium">
                        Clique ou arraste arquivos aqui
                    </p>
                    <p className="text-xs text-slate-400">
                        PDF, DOCX, Imagens (max 10MB)
                    </p>
                </div>
            </div>

            {/* Lista de Arquivos */}
            {files.length > 0 && (
                <div className="space-y-2">
                    {files.map((file, index) => {
                        const ext = file.nome_original?.split('.').pop().toLowerCase()
                        const Icon = getFileIcon(ext)

                        return (
                            <div
                                key={file.id || index}
                                className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        {file.arquivo ? (
                                            <a
                                                href={file.arquivo}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline truncate block"
                                            >
                                                {file.nome_original}
                                            </a>
                                        ) : (
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                                                {file.nome_original}
                                            </p>
                                        )}
                                        <p className="text-xs text-slate-400">
                                            {file.tamanho_formatado || formatSize(file.tamanho)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {file.arquivo && (
                                        <a
                                            href={file.arquivo}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 text-slate-400 hover:text-primary-500 transition-colors"
                                            title="Download"
                                        >
                                            <HiDownload className="w-5 h-5" />
                                        </a>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(file.id)}
                                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                        title="Remover"
                                    >
                                        <HiX className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
