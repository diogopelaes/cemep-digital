import { useState } from 'react'
import { coreAPI } from '../../services/api'
import toast from 'react-hot-toast'
import { Modal, Input, Button } from '../ui'

export default function IniciarAnoModal({ isOpen, onClose, onSuccess }) {
    const [ano, setAno] = useState(new Date().getFullYear() + 1)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Verifica se já existe
            const { data: anosExistentes } = await coreAPI.anosLetivos.list()
            const lista = Array.isArray(anosExistentes) ? anosExistentes : (anosExistentes.results || [])
            const anoExiste = lista.find(a => a.ano === parseInt(ano))

            if (anoExiste) {
                toast.error(`O ano letivo de ${ano} já existe!`)
            } else {
                const { data } = await coreAPI.anosLetivos.create({ ano: parseInt(ano) })
                toast.success(`Ano letivo de ${ano} iniciado com sucesso!`)
                onSuccess(data)
                onClose()
            }
        } catch (error) {
            console.error('Erro ao criar ano letivo:', error)
            toast.error('Erro ao iniciar ano letivo.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Iniciar Ano Letivo"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <p className="text-slate-600 dark:text-slate-400">
                    Informe o ano para iniciar o calendário escolar.
                </p>

                <Input
                    label="Ano"
                    type="number"
                    value={ano}
                    onChange={(e) => setAno(e.target.value)}
                    required
                    min={2000}
                    max={2100}
                />

                <div className="flex justify-end gap-3 mt-6">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        loading={loading}
                    >
                        Criar Calendário
                    </Button>
                </div>
            </form>
        </Modal>
    )
}

