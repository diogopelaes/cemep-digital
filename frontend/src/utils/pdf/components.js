import autoTable from 'jspdf-autotable'
import { CONFIG, COLORS } from './config'
import { addFooter } from './header'

/**
 * Adiciona título de seção
 * @param {jsPDF} doc - Instância do jsPDF
 * @param {string} title - Título da seção
 * @param {number} y - Posição Y
 * @returns {number} Nova posição Y
 */
export function addSectionTitle(doc, title, y) {
    const pageWidth = doc.internal.pageSize.getWidth()

    // Espaço extra antes do título da seção
    y += 6

    // Fundo colorido
    doc.setFillColor(...COLORS.gray)
    doc.roundedRect(CONFIG.margin, y - 4, pageWidth - (CONFIG.margin * 2), 10, 2, 2, 'F')

    // Acento lateral
    doc.setFillColor(...COLORS.primary)
    doc.rect(CONFIG.margin, y - 4, 3, 10, 'F')

    // Texto
    doc.setTextColor(...COLORS.text)
    doc.setFontSize(CONFIG.fontSize.section)
    doc.setFont('helvetica', 'bold')
    doc.text(title, CONFIG.margin + 8, y + 2)

    return y + 16
}

/**
 * Adiciona campo com label e valor
 * @param {jsPDF} doc - Instância do jsPDF
 * @param {string} label - Label do campo
 * @param {string} value - Valor do campo
 * @param {number} x - Posição X
 * @param {number} y - Posição Y
 * @param {number} maxWidth - Largura máxima (opcional)
 * @returns {number} Nova posição Y
 */
export function addField(doc, label, value, x, y, maxWidth = null) {
    doc.setTextColor(...COLORS.textLight)
    doc.setFontSize(CONFIG.fontSize.small)
    doc.setFont('helvetica', 'normal')
    doc.text(label, x, y)

    doc.setTextColor(...COLORS.text)
    doc.setFontSize(CONFIG.fontSize.body)
    doc.setFont('helvetica', 'normal')

    const text = value || '-'
    if (maxWidth) {
        const lines = doc.splitTextToSize(text, maxWidth)
        doc.text(lines, x, y + 5)
        return y + 5 + (lines.length * 4)
    }

    doc.text(text, x, y + 5)
    return y + CONFIG.lineHeight * 2
}

/**
 * Adiciona placeholder de foto (silhueta)
 * @param {jsPDF} doc - Instância do jsPDF
 * @param {number} x - Posição X
 * @param {number} y - Posição Y
 * @param {number} width - Largura
 * @param {number} height - Altura
 */
function addPlaceholderPhoto(doc, x, y, width, height) {
    // Fundo cinza
    doc.setFillColor(...COLORS.gray)
    doc.roundedRect(x, y, width, height, 2, 2, 'F')

    // Desenha silhueta simples de pessoa
    const centerX = x + width / 2
    const centerY = y + height / 2

    // Cabeça (círculo)
    doc.setFillColor(...COLORS.grayDark)
    doc.circle(centerX, centerY - height * 0.15, width * 0.15, 'F')

    // Corpo (elipse/arco)
    doc.setFillColor(...COLORS.grayDark)
    doc.ellipse(centerX, centerY + height * 0.2, width * 0.3, height * 0.25, 'F')

    // Texto "Sem foto"
    doc.setTextColor(...COLORS.textLight)
    doc.setFontSize(6)
    doc.text('Sem foto', centerX, y + height - 4, { align: 'center' })
}

/**
 * Adiciona foto 3x4 ao PDF
 * @param {jsPDF} doc - Instância do jsPDF
 * @param {string} imageData - URL ou base64 da imagem
 * @param {number} x - Posição X
 * @param {number} y - Posição Y
 * @param {number} width - Largura (padrão 30mm)
 * @param {number} height - Altura (padrão 40mm para proporção 3:4)
 */
export function addPhoto(doc, imageData, x, y, width = 30, height = 40) {
    // Borda da foto
    doc.setDrawColor(...COLORS.grayDark)
    doc.setLineWidth(0.5)
    doc.roundedRect(x - 1, y - 1, width + 2, height + 2, 2, 2, 'S')

    if (imageData) {
        try {
            doc.addImage(imageData, 'JPEG', x, y, width, height)
        } catch (error) {
            console.error('Erro ao adicionar foto:', error)
            addPlaceholderPhoto(doc, x, y, width, height)
        }
    } else {
        addPlaceholderPhoto(doc, x, y, width, height)
    }
}

/**
 * Adiciona tabela formatada ao PDF
 * @param {jsPDF} doc - Instância do jsPDF
 * @param {Array} headers - Cabeçalhos da tabela
 * @param {Array} data - Dados da tabela
 * @param {number} startY - Posição Y inicial
 * @param {Object} options - Opções adicionais do autoTable
 * @returns {number} Posição Y final
 */
export function addTable(doc, headers, data, startY, options = {}) {
    autoTable(doc, {
        head: [headers],
        body: data,
        startY: startY,
        margin: { left: CONFIG.margin, right: CONFIG.margin },
        headStyles: {
            fillColor: COLORS.primary,
            textColor: COLORS.white,
            fontSize: CONFIG.fontSize.small,
            fontStyle: 'bold',
        },
        bodyStyles: {
            fontSize: CONFIG.fontSize.small,
            textColor: COLORS.text,
        },
        alternateRowStyles: {
            fillColor: COLORS.gray,
        },
        styles: {
            cellPadding: 3,
            lineWidth: 0.1,
            lineColor: COLORS.grayDark,
        },
        ...options
    })

    return doc.lastAutoTable.finalY
}

/**
 * Verifica se precisa de nova página e adiciona se necessário
 * @param {jsPDF} doc - Instância do jsPDF
 * @param {number} y - Posição Y atual
 * @param {number} requiredSpace - Espaço necessário
 * @param {number} marginBottom - Margem inferior (padrão 30)
 * @returns {number} Nova posição Y (pode ser a mesma ou reset para nova página)
 */
export function checkNewPage(doc, y, requiredSpace, marginBottom = 30) {
    const pageHeight = doc.internal.pageSize.getHeight()

    if (y + requiredSpace > pageHeight - marginBottom) {
        doc.addPage()

        // Se adicionou página, idealmente deveria adicionar o header novamente?
        // Geralmente apenas limpa ou adiciona header simplificado. 
        // Por simplificação, vamos assumir que o fluxo continua na margem
        return CONFIG.margin
    }

    return y
}
