import { useState, useRef, useCallback } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Button } from './index'
import { HiUpload, HiX, HiCamera, HiCheck } from 'react-icons/hi'
import toast from 'react-hot-toast'

// Proporção 3:4 (largura:altura) para foto 3x4
const ASPECT_RATIO = 3 / 4

/**
 * Componente de recorte de imagem para foto 3x4
 */
export default function ImageCropper({
    onCropComplete,
    currentImage = null,
    className = '',
    disabled = false
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [imageSrc, setImageSrc] = useState(null)
    const [crop, setCrop] = useState()
    const [completedCrop, setCompletedCrop] = useState()
    const [isProcessing, setIsProcessing] = useState(false)
    const imgRef = useRef(null)
    const inputRef = useRef(null)

    const onSelectFile = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]

            // Valida tipo de arquivo
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                toast.error('Formato inválido. Use JPEG, PNG ou WebP.')
                return
            }

            // Valida tamanho (5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error('A imagem deve ter no máximo 5MB.')
                return
            }

            setCrop(undefined)
            const reader = new FileReader()
            reader.addEventListener('load', () => {
                setImageSrc(reader.result?.toString() || '')
                setIsOpen(true)
            })
            reader.readAsDataURL(file)
        }
    }

    const onImageLoad = useCallback((e) => {
        const { width, height } = e.currentTarget

        const newCrop = centerCrop(
            makeAspectCrop(
                {
                    unit: '%',
                    width: 80,
                },
                ASPECT_RATIO,
                width,
                height
            ),
            width,
            height
        )

        setCrop(newCrop)
    }, [])

    const getCroppedImg = useCallback(async () => {
        const image = imgRef.current
        if (!completedCrop || !image) {
            return null
        }

        const canvas = document.createElement('canvas')
        const scaleX = image.naturalWidth / image.width
        const scaleY = image.naturalHeight / image.height

        // Dimensões finais: 900x1200 pixels (3:4) - Alta Resolução (aprox 1MP)
        const targetWidth = 900
        const targetHeight = 1200

        canvas.width = targetWidth
        canvas.height = targetHeight

        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        // Calcula pixels baseado em porcentagem ou pixels
        let cropX, cropY, cropWidth, cropHeight

        if (completedCrop.unit === '%') {
            cropX = (completedCrop.x / 100) * image.naturalWidth
            cropY = (completedCrop.y / 100) * image.naturalHeight
            cropWidth = (completedCrop.width / 100) * image.naturalWidth
            cropHeight = (completedCrop.height / 100) * image.naturalHeight
        } else {
            cropX = completedCrop.x * scaleX
            cropY = completedCrop.y * scaleY
            cropWidth = completedCrop.width * scaleX
            cropHeight = completedCrop.height * scaleY
        }

        ctx.drawImage(
            image,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            targetWidth,
            targetHeight
        )

        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95)
        })
    }, [completedCrop])

    const handleConfirm = async () => {
        setIsProcessing(true)
        try {
            const croppedBlob = await getCroppedImg()
            if (croppedBlob && onCropComplete) {
                onCropComplete(croppedBlob)
                toast.success('Foto recortada com sucesso!')
            }
            handleClose()
        } catch (error) {
            console.error('Erro ao processar imagem:', error)
            toast.error('Erro ao processar a imagem. Tente novamente.')
        }
        setIsProcessing(false)
    }

    const handleClose = () => {
        setIsOpen(false)
        setImageSrc(null)
        setCrop(undefined)
        setCompletedCrop(undefined)
        if (inputRef.current) {
            inputRef.current.value = ''
        }
    }

    const handleRemove = () => {
        if (onCropComplete) {
            onCropComplete(null)
        }
    }

    return (
        <>
            {/* Preview / Upload Button */}
            <div className={`relative ${className}`}>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={onSelectFile}
                    className="hidden"
                    disabled={disabled}
                />

                <div
                    className={`
                        relative group cursor-pointer
                        w-[120px] h-[160px] rounded-xl overflow-hidden
                        border-2 border-dashed transition-all duration-300
                        ${currentImage
                            ? 'border-transparent shadow-lg hover:shadow-xl'
                            : 'border-slate-300 dark:border-slate-600 hover:border-primary-500 dark:hover:border-primary-400'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    onClick={() => !disabled && inputRef.current?.click()}
                >
                    {currentImage ? (
                        <>
                            <img
                                src={typeof currentImage === 'string' ? currentImage : URL.createObjectURL(currentImage)}
                                alt="Foto do estudante"
                                className="w-full h-full"
                                style={{ imageRendering: 'auto' }}
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <HiCamera className="w-8 h-8 text-white" />
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50">
                            <svg viewBox="0 0 24 24" className="w-12 h-12 mb-2 fill-current opacity-60">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                            <span className="text-xs font-medium">Foto 3x4</span>
                            <HiUpload className="w-4 h-4 mt-1" />
                        </div>
                    )}
                </div>

                {currentImage && !disabled && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation()
                            handleRemove()
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-danger-500 text-white shadow-lg
                            flex items-center justify-center transition-transform hover:scale-110"
                    >
                        <HiX className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Modal de Recorte - Posicionado no TOPO */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[9999] overflow-y-auto bg-black/60 backdrop-blur-sm"
                    onClick={handleClose}
                >
                    <div className="min-h-full pt-4 px-4 pb-20">
                        <div
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                                        Recortar Foto 3x4
                                    </h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Ajuste a área de recorte
                                    </p>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                    <HiX className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            {/* Área de Recorte */}
                            <div className="p-4">
                                <div className="bg-slate-100 dark:bg-slate-900 rounded-xl p-4 flex justify-center">
                                    {imageSrc && (
                                        <ReactCrop
                                            crop={crop}
                                            onChange={(pixelCrop, percentCrop) => setCrop(percentCrop)}
                                            onComplete={(pixelCrop, percentCrop) => setCompletedCrop(percentCrop)}
                                            aspect={ASPECT_RATIO}
                                            minWidth={30}
                                        >
                                            <img
                                                ref={imgRef}
                                                src={imageSrc}
                                                alt="Imagem para recorte"
                                                onLoad={onImageLoad}
                                                style={{ maxHeight: '400px', maxWidth: '100%' }}
                                            />
                                        </ReactCrop>
                                    )}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handleClose}
                                    disabled={isProcessing}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    icon={HiCheck}
                                    onClick={handleConfirm}
                                    loading={isProcessing}
                                    disabled={!completedCrop}
                                >
                                    Confirmar Recorte
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
