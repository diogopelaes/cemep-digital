import { HiCamera } from 'react-icons/hi'
import { ImageCropper } from '../ui'

/**
 * Seção de foto do estudante no formulário
 */
export default function FotoSection({
    fotoPreview,
    fotoBlob,
    onFotoChange,
    onRemoveFoto
}) {
    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative">
                <div className="w-[150px] h-[200px] rounded-2xl overflow-hidden shadow-lg border-2 border-slate-200 dark:border-slate-700">
                    {(fotoBlob || fotoPreview) ? (
                        <img
                            src={fotoBlob ? URL.createObjectURL(fotoBlob) : fotoPreview}
                            alt="Foto do estudante"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400">
                            <svg viewBox="0 0 24 24" className="w-16 h-16 fill-current opacity-50">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                            <span className="text-xs mt-2">Formato 3x4</span>
                        </div>
                    )}
                </div>
            </div>

            <ImageCropper
                onCropComplete={onFotoChange}
                aspectRatio={3 / 4}
            >
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 text-white cursor-pointer transition-colors">
                    <HiCamera className="h-5 w-5" />
                    <span className="text-sm font-medium">
                        {fotoPreview ? 'Alterar Foto' : 'Adicionar Foto'}
                    </span>
                </div>
            </ImageCropper>
        </div>
    )
}
