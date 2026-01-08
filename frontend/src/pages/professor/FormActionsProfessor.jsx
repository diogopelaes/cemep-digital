import { HiSave } from 'react-icons/hi'
import { Button } from '../../components/ui'

/**
 * Componente específico para ações de formulário do Professor (Apenas Salvar).
 */
export default function FormActionsProfessor({
    saving = false,
    saveLabel,
    isEditing = false,
    entityName = '',
    disabled = false,
    className = '',
    onSave
}) {
    // Define o label do botão salvar
    const getSaveLabel = () => {
        if (saveLabel) return saveLabel
        if (isEditing) return 'Salvar Alterações'
        if (entityName) return `Criar ${entityName}`
        return 'Salvar'
    }

    return (
        <div className={`flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700 ${className}`}>
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
