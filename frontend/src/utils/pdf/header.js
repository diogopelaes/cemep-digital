import { CONFIG, COLORS } from './config'
import { imageToBase64 } from './core'
import { INSTITUTION_NAME, SYSTEM_NAME } from '../../config/constants'

/**
 * Adiciona cabeçalho padrão do CEMEP ao PDF
 * @param {jsPDF} doc - Instância do jsPDF
 * @param {Object} options - Opções do cabeçalho
 * @param {string} options.title - Título do documento (Variável Título)
 * @param {string} options.subtitle1 - Subtítulo 1 (Variável Subtítulo 1)
 * @param {string} options.subtitle2 - Subtítulo 2 (Variável Subtítulo 2)
 * @param {string} options.info1 - Informação extra 1 (Lado direito)
 * @param {string} options.info2 - Informação extra 2 (Lado direito)
 * @returns {Promise<number>} Posição Y após o cabeçalho
 */
export async function addHeader(doc, { title, subtitle1 = '', subtitle2 = '', info1 = '', info2 = '', margin = CONFIG.margin } = {}) {
    const pageWidth = doc.internal.pageSize.getWidth()
    const headerHeight = 25 // Altura fixa e compacta

    // === FUNDO ===
    doc.setFillColor(...COLORS.primary)
    doc.rect(0, 0, pageWidth, headerHeight, 'F')

    // === LOGO ===
    let logoBase64 = null
    try {
        logoBase64 = await imageToBase64('/logo.jpeg')
    } catch (e) {
        console.error('Erro ao carregar logo:', e)
    }

    const logoSize = 20
    const logoY = 2.5

    if (logoBase64) {
        doc.addImage(logoBase64, 'JPEG', margin, logoY, logoSize, logoSize)
    }

    // === TEXTOS ESQUERDA (Título e Subtítulos) ===
    const textX = logoBase64 ? margin + 25 : margin

    // Título Principal (Variável Título)
    doc.setTextColor(...COLORS.white)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text(title || '', textX, 8)

    // Subtítulo 1 (Variável Subtítulo 1)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(subtitle1 || '', textX, 14)

    // Subtítulo 2 (Variável Subtítulo 2)
    // Se não for passado subtitle2, usa o nome da instituição como fallback padrão, 
    // ou vazio se quisermos estrito. O user disse "variável Subtítulo 2".
    // Vou deixar vazio se não passar, mas nos usos vou passar INSTITUTION_NAME se for o caso.
    doc.setFontSize(8)
    doc.text(subtitle2 || '', textX, 19)


    // === TEXTOS DIREITA (Data e Infos) ===
    const rightX = pageWidth - margin

    // Data de Geração
    const dataAtual = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })

    doc.setFontSize(7)
    doc.text(`Gerado em: ${dataAtual}`, rightX, 7, { align: 'right' })

    // Info 1
    if (info1) {
        doc.text(info1, rightX, 11, { align: 'right' })
    }

    // Info 2
    if (info2) {
        doc.text(info2, rightX, 15, { align: 'right' })
    }

    // Retorna posição Y inicial do conteúdo
    return 35
}

/**
 * Adiciona rodapé padrão ao PDF
 * @param {jsPDF} doc - Instância do jsPDF
 */
export function addFooter(doc, margin = CONFIG.margin) {
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const pageCount = doc.internal.getNumberOfPages()

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)

        // Linha divisória
        doc.setDrawColor(...COLORS.grayDark)
        doc.setLineWidth(0.3)
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15)

        // Texto do rodapé
        doc.setTextColor(...COLORS.textLight)
        doc.setFontSize(CONFIG.fontSize.small)
        doc.setFont('helvetica', 'normal')

        doc.text(`${SYSTEM_NAME} - Sistema de Gestão Escolar`, margin, pageHeight - 10)
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' })
    }
}
