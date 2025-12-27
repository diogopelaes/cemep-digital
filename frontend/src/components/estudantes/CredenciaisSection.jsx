import { HiRefresh, HiEye, HiEyeOff } from 'react-icons/hi'

/**
 * Seção de credenciais de acesso no formulário de estudante (apenas criação)
 */
export default function CredenciaisSection({
    formData,
    showPassword,
    onFieldChange,
    onTogglePassword,
    onGeneratePassword,
}) {
    return (
        <div>
            <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                    Credenciais de Acesso
                </h2>
                <span className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                    Do estudante
                </span>
            </div>

            {/* Campos ocultos para confundir o autocomplete do navegador */}
            <input type="text" name="fakeuser" autoComplete="username" style={{ display: 'none' }} />
            <input type="password" name="fakepass" autoComplete="current-password" style={{ display: 'none' }} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="label">Login do Estudante *</label>
                    <input
                        type="text"
                        name="estudante_login"
                        placeholder="CPF do estudante"
                        value={formData.username}
                        onChange={(e) => onFieldChange('username', e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        className="input"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        data-form-type="other"
                        data-lpignore="true"
                        required
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        Preenchido automaticamente com o CPF
                    </p>
                </div>
                <div>
                    <label className="label">Senha do Estudante *</label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="estudante_senha"
                                value={formData.password}
                                onChange={(e) => onFieldChange('password', e.target.value)}
                                className="input pr-10"
                                autoComplete="off"
                                autoCorrect="off"
                                autoCapitalize="off"
                                spellCheck="false"
                                data-form-type="other"
                                data-lpignore="true"
                                required
                            />
                            <button
                                type="button"
                                onClick={onTogglePassword}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                            >
                                {showPassword ? <HiEyeOff className="h-5 w-5" /> : <HiEye className="h-5 w-5" />}
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={onGeneratePassword}
                            className="p-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
                            title="Gerar nova senha"
                        >
                            <HiRefresh className="h-5 w-5" />
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Gerada automaticamente. Clique em <HiRefresh className="inline h-3 w-3" /> para outra.
                    </p>
                </div>
            </div>
        </div>
    )
}
