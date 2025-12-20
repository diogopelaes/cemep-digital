import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Card, Button } from '../components/ui'
import { HiPrinter, HiMail, HiArrowLeft, HiCheckCircle } from 'react-icons/hi'
import { usersAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function FuncionarioCredenciais() {
  const navigate = useNavigate()
  const location = useLocation()
  const printRef = useRef(null)
  
  const funcionario = location.state?.funcionario

  useEffect(() => {
    if (!funcionario) {
      navigate('/funcionarios')
    }
  }, [funcionario, navigate])

  const handlePrint = () => {
    const printContent = printRef.current
    const printWindow = window.open('', '', 'width=800,height=600')
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Credenciais de Acesso - CEMEP Digital</title>
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
          ${printContent.innerHTML}
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
    }
  }

  if (!funcionario) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Sucesso */}
      <Card hover={false} className="text-center">
        <div className="w-16 h-16 rounded-full bg-success-500/10 flex items-center justify-center mx-auto mb-4">
          <HiCheckCircle className="h-10 w-10 text-success-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
          Funcionário Criado com Sucesso!
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Imprima ou envie as credenciais de acesso para o funcionário.
        </p>
      </Card>

      {/* Credenciais para Impressão */}
      <Card hover={false}>
        <div ref={printRef}>
          <div className="header">
            <h1>CEMEP Digital</h1>
            <p>Credenciais de Acesso ao Sistema</p>
          </div>

          <div className="section">
            <h2>Dados do Funcionário</h2>
            <div className="info-row">
              <span className="info-label">Nome:</span>
              <span className="info-value">{funcionario.nome}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Função:</span>
              <span className="info-value">{funcionario.funcao}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Tipo de Acesso:</span>
              <span className="info-value">{funcionario.tipo_usuario}</span>
            </div>
            {funcionario.email && (
              <div className="info-row">
                <span className="info-label">E-mail:</span>
                <span className="info-value">{funcionario.email}</span>
              </div>
            )}
          </div>

          <div className="section">
            <h2>Credenciais de Acesso</h2>
            <div className="credentials">
              <div className="credential-item">
                <span className="credential-label">Usuário:</span>
                <span className="credential-value">{funcionario.username}</span>
              </div>
              <div className="credential-item">
                <span className="credential-label">Senha:</span>
                <span className="credential-value">{funcionario.password}</span>
              </div>
            </div>
          </div>

          <div className="warning">
            <strong>⚠️ Importante:</strong> Por segurança, recomendamos que o funcionário altere 
            sua senha no primeiro acesso. Estas credenciais são pessoais e intransferíveis.
          </div>

          <div className="footer">
            <p>Documento gerado em {new Date().toLocaleString('pt-BR')}</p>
            <p>CEMEP Digital - Sistema de Gestão Escolar</p>
          </div>
        </div>
      </Card>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          onClick={handlePrint}
          icon={HiPrinter}
          className="flex-1"
        >
          Imprimir Credenciais
        </Button>
        
        {funcionario.email && (
          <Button 
            onClick={handleSendEmail}
            variant="secondary"
            icon={HiMail}
            className="flex-1"
          >
            Enviar por E-mail
          </Button>
        )}
      </div>

      <Button 
        onClick={() => navigate('/funcionarios')}
        variant="ghost"
        icon={HiArrowLeft}
        className="w-full"
      >
        Voltar para Lista de Funcionários
      </Button>
    </div>
  )
}

