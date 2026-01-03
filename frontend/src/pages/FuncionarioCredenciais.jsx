import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, Button } from '../components/ui'
import { HiPrinter, HiMail, HiCheckCircle, HiUserCircle, HiKey, HiClipboardCopy, HiPencil } from 'react-icons/hi'
import { usersAPI } from '../services/api'
import { formatDateBR } from '../utils/date'
import toast from 'react-hot-toast'
import { SYSTEM_NAME } from '../config/constants'

export default function FuncionarioCredenciais() {
  const navigate = useNavigate()
  const location = useLocation()
  const printRef = useRef(null)
  const [sendingEmail, setSendingEmail] = useState(false)

  const funcionario = location.state?.funcionario

  useEffect(() => {
    if (!funcionario) {
      navigate('/funcionarios')
    }
  }, [funcionario, navigate])

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado!`)
  }

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=800,height=600')

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Credenciais de Acesso - ${SYSTEM_NAME}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              padding: 40px;
              max-width: 600px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #3b82f6;
            }
            .header h1 {
              font-size: 24px;
              color: #1e293b;
              margin-bottom: 5px;
            }
            .header p {
              color: #64748b;
            }
            .section {
              margin-bottom: 25px;
            }
            .section h2 {
              font-size: 14px;
              text-transform: uppercase;
              color: #64748b;
              margin-bottom: 10px;
              letter-spacing: 0.5px;
            }
            .info-row {
              display: flex;
              padding: 12px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .info-label {
              width: 140px;
              font-weight: 600;
              color: #475569;
            }
            .info-value {
              flex: 1;
              color: #1e293b;
            }
            .credentials {
              background: #f8fafc;
              border: 2px dashed #cbd5e1;
              border-radius: 12px;
              padding: 20px;
              margin-top: 10px;
            }
            .credential-item {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
            }
            .credential-item:not(:last-child) {
              border-bottom: 1px solid #e2e8f0;
            }
            .credential-label {
              font-weight: 600;
              color: #475569;
            }
            .credential-value {
              font-family: monospace;
              font-size: 16px;
              color: #1e293b;
              background: #fff;
              padding: 4px 12px;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e2e8f0;
              text-align: center;
              font-size: 12px;
              color: #94a3b8;
            }
            .warning {
              background: #fef3c7;
              border: 1px solid #fbbf24;
              border-radius: 8px;
              padding: 15px;
              margin-top: 20px;
              font-size: 13px;
              color: #92400e;
            }
            @media print {
              body { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${SYSTEM_NAME}</h1>
            <p>Credenciais de Acesso ao Sistema</p>
          </div>

          <div class="section">
            <h2>Dados do Funcionário</h2>
            <div class="info-row">
              <span class="info-label">Nome:</span>
              <span class="info-value">${funcionario.nome}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Matrícula:</span>
              <span class="info-value">${funcionario.matricula}</span>
            </div>
            ${funcionario.area_atuacao ? `
            <div class="info-row">
              <span class="info-label">Área de Atuação:</span>
              <span class="info-value">${funcionario.area_atuacao}</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="info-label">Tipo de Acesso:</span>
              <span class="info-value">${funcionario.tipo_usuario}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Data de Entrada:</span>
              <span class="info-value">${formatDateBR(funcionario.data_entrada) || 'Não informada'}</span>
            </div>
            ${funcionario.email ? `
            <div class="info-row">
              <span class="info-label">E-mail:</span>
              <span class="info-value">${funcionario.email}</span>
            </div>
            ` : ''}
          </div>

          <div class="section">
            <h2>Credenciais de Acesso</h2>
            <div class="credentials">
              <div class="credential-item">
                <span class="credential-label">Usuário:</span>
                <span class="credential-value">${funcionario.username}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Senha:</span>
                <span class="credential-value">${funcionario.password}</span>
              </div>
            </div>
          </div>

          <div class="warning">
            <strong>⚠️ Importante:</strong> Por segurança, recomendamos que o funcionário altere 
            sua senha no primeiro acesso. Estas credenciais são pessoais e intransferíveis.
          </div>

          <div class="footer">
            <p>Documento gerado em ${new Date().toLocaleString('pt-BR')}</p>
            <p>${SYSTEM_NAME} - Sistema de Gestão Escolar</p>
          </div>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()

    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const handleSendEmail = async () => {
    if (!funcionario?.email) {
      toast.error('Este funcionário não possui e-mail cadastrado')
      return
    }

    setSendingEmail(true)
    try {
      await usersAPI.sendCredentials({
        email: funcionario.email,
        username: funcionario.username,
        password: funcionario.password,
        nome: funcionario.nome,
      })
      toast.success('E-mail enviado com sucesso!')
    } catch (error) {
      toast.error('Erro ao enviar e-mail. Verifique as configurações de SMTP.')
    } finally {
      setSendingEmail(false)
    }
  }

  if (!funcionario) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Sucesso */}
      <Card hover={false} className="text-center py-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-success-400 to-success-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-success-500/30">
          <HiCheckCircle className="h-12 w-12 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
          Funcionário Criado!
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Imprima as credenciais para entregar ao funcionário ou envie por e-mail.
        </p>
      </Card>

      {/* Dados do Funcionário */}
      <Card hover={false}>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
          Dados do Funcionário
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-slate-400 mb-1">Nome</p>
            <p className="font-medium text-slate-800 dark:text-white">{funcionario.nome}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Matrícula</p>
            <p className="font-medium text-slate-800 dark:text-white">{funcionario.matricula}</p>
          </div>
          {funcionario.area_atuacao && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Área de Atuação</p>
              <p className="font-medium text-slate-800 dark:text-white">{funcionario.area_atuacao}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-400 mb-1">Tipo</p>
            <p className="font-medium text-slate-800 dark:text-white">{funcionario.tipo_usuario}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-1">Data de Entrada</p>
            <p className="font-medium text-slate-800 dark:text-white">
              {formatDateBR(funcionario.data_entrada) || <span className="text-slate-400 italic">Não informada</span>}
            </p>
          </div>
          <div className="col-span-2 md:col-span-5">
            <p className="text-xs text-slate-400 mb-1">E-mail</p>
            <p className="font-medium text-slate-800 dark:text-white">
              {funcionario.email || <span className="text-slate-400 italic">Não informado</span>}
            </p>
          </div>
        </div>
      </Card>

      {/* Credenciais */}
      <div className="bg-gradient-to-br from-primary-500 to-accent-600 rounded-2xl p-6 shadow-xl shadow-primary-500/20">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <HiKey className="h-5 w-5 text-white/80" />
            <h2 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
              Credenciais de Acesso
            </h2>
          </div>
          {funcionario.id && (
            <button
              onClick={() => navigate(`/funcionarios/${funcionario.id}/editar`)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium transition-colors"
            >
              <HiPencil className="h-4 w-4" />
              Editar
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Login */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60 mb-1">Login</p>
                <p className="text-xl font-mono font-bold text-white">{funcionario.username}</p>
              </div>
              <button
                onClick={() => copyToClipboard(funcionario.username, 'Login')}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Copiar"
              >
                <HiClipboardCopy className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Senha */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60 mb-1">Senha</p>
                <p className="text-xl font-mono font-bold text-white">{funcionario.password}</p>
              </div>
              <button
                onClick={() => copyToClipboard(funcionario.password, 'Senha')}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Copiar"
              >
                <HiClipboardCopy className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Aviso */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong className="font-semibold">⚠️ Importante:</strong> Recomende ao funcionário alterar a senha no primeiro acesso.
          Estas credenciais são pessoais e intransferíveis.
        </p>
      </div>

      {/* Ações */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          onClick={handlePrint}
          icon={HiPrinter}
          size="lg"
        >
          Imprimir Credenciais
        </Button>

        <Button
          onClick={handleSendEmail}
          variant={funcionario.email ? 'secondary' : 'ghost'}
          icon={sendingEmail ? null : HiMail}
          size="lg"
          disabled={!funcionario.email || sendingEmail}
          loading={sendingEmail}
        >
          {sendingEmail
            ? 'Enviando...'
            : funcionario.email
              ? 'Enviar por E-mail'
              : 'Sem e-mail cadastrado'
          }
        </Button>
      </div>


    </div>
  )
}
