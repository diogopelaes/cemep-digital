import { useNavigate } from 'react-router-dom'
import { HiSave } from 'react-icons/hi'
import Button from './Button'

/**
 * Componente padronizado para ações de formulário (Cancelar + Salvar).
 * 
 * Props:
 * - cancelTo: string - Rota para navegar ao cancelar (obrigatório)
 * - onCancel: function - Função alternativa ao cancelar (opcional, sobrescreve cancelTo)
 * - saving: boolean - Estado de loading do botão salvar
 * - saveLabel: string - Texto do botão salvar (default: 'Salvar')
 * - isEditing: boolean - Se true, usa 'Salvar Alterações', se false usa 'Criar [entidade]'
 * - entityName: string - Nome da entidade para o botão (ex: 'Disciplina' -> 'Criar Disciplina')
 * - disabled: boolean - Desabilita o botão salvar
 * - className: string - Classes adicionais para o container
 */
export default function FormActions({
    cancelTo,
    onCancel,
    saving = false,
    saveLabel,
    isEditing = false,
    entityName = '',
    disabled = false,
    className = '',
    onSave // Novo prop opcional
}) {
    const navigate = useNavigate()

    const handleCancel = () => {
        if (onCancel) {
            onCancel()
        } else if (cancelTo) {
            navigate(cancelTo)
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
