import { useNavigate } from 'react-router-dom'
import { HiSave } from 'react-icons/hi'
import Button from './Button'

/**
 * Componente específico para ações de formulário do Professor (Cancelar + Salvar).
 */
export default function FormActionsProfessor({
    saving = false,
    saveLabel,
    isEditing = false,
    entityName = '',
    disabled = false,
    className = '',
    onSave,
    onCancel
}) {
    const navigate = useNavigate()

    const handleCancel = () => {
        if (onCancel) {
            onCancel()
        } else {
            navigate(-1)
        }
    }

    // Define o label do botão salvar
    const getSaveLabel = () => {
        if (saveLabel) return saveLabel
        if (isEditing) return 'Salvar Alterações'
        if (entityName) return `Criar ${entityName}`
        return 'Salvar'
    }

    return (
        <div className={`flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700 ${className}`}>
            <Button
                type="button"
                variant="secondary"
                onClick={handleCancel}
                disabled={saving}
            >
                Cancelar
            </Button>
            <Button
                type={onSave ? "button" : "submit"}
                icon={HiSave}
                loading={saving}
                disabled={disabled}
                onClick={onSave}
            >
                {getSaveLabel()}
            </Button>
        </div>
    )
}
