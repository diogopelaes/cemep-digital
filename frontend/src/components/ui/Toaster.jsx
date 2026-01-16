import { Toaster as HotToaster } from 'react-hot-toast'

/**
 * Toaster Centralizado
 * Configuração global dos toasts do sistema.
 * Personalizado para usar o tema Tailwind do projeto (Dark/Light).
 */
export default function Toaster() {
    return (
        <HotToaster
            position="top-center"
            reverseOrder={false}
            gutter={8}
            toastOptions={{
                // Duração padrão
                duration: 4000,

                // Estilização Classe CSS (Tailwind)
                // Usamos !important para garantir override dos estilos inline default da lib
                className: `
                    !bg-white dark:!bg-slate-800 
                    !text-slate-800 dark:!text-white 
                    !shadow-premium 
                    !rounded-xl 
                    !border !border-slate-100 dark:!border-slate-700
                    !font-sans
                `,

                // Estilização Inline (Backups e Layout)
                style: {
                    padding: '16px',
                    fontSize: '0.95rem',
                    lineHeight: '1.5',
                },

                // Configurações por tipo
                success: {
                    iconTheme: {
                        primary: '#22c55e', // success-500
                        secondary: '#fff',
                    },
                },
                error: {
                    iconTheme: {
                        primary: '#ef4444', // danger-500
                        secondary: '#fff',
                    },
                    duration: 5000,
                },
                loading: {
                    iconTheme: {
                        primary: '#0ea5e9', // primary-500
                        secondary: '#fff',
                    },
                },
            }}
        />
    )
}
