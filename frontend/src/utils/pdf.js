/**
 * Utilitário centralizado para geração de PDFs
 * Usado em todo o sistema CEMEP Digital
 */
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { INSTITUTION_FANTASY, INSTITUTION_NAME, ADDRESS_CITY, ADDRESS_STATE, SYSTEM_NAME } from '../config/constants'

// Cores do tema CEMEP
const COLORS = {
    primary: [14, 165, 233],      // sky-500 / primary-500
    primaryDark: [2, 132, 199],   // sky-600 / primary-600
    accent: [217, 70, 239],       // fuchsia-500 / accent-500
    text: [30, 41, 59],           // slate-800
    textLight: [100, 116, 139],   // slate-500
    white: [255, 255, 255],
    gray: [241, 245, 249],        // slate-100
    grayDark: [203, 213, 225],    // slate-300
}

// Configurações padrão
const CONFIG = {
    margin: 20,
    pageWidth: 210,  // A4
    pageHeight: 297, // A4
    fontSize: {
        title: 18,
        subtitle: 14,
        section: 12,
        body: 10,
        small: 8,
    },
    lineHeight: 6,
}

/**
 * Cria uma nova instância do PDF com configurações padrão
 * @param {Object} options - Opções de configuração
 * @returns {jsPDF} Instância do jsPDF
 */
export function createPDF(options = {}) {
    const {
        orientation = 'portrait',
        unit = 'mm',
        format = 'a4',
    } = options

    const doc = new jsPDF(orientation, unit, format)

    // Configura fonte padrão
    doc.setFont('helvetica', 'normal')

    return doc
}

/**
 * Adiciona cabeçalho padrão do CEMEP ao PDF
 * @param {jsPDF} doc - Instância do jsPDF
 * @param {string} title - Título do documento
 * @param {string} subtitle - Subtítulo opcional
 * @returns {number} Posição Y após o cabeçalho
 */
export function addHeader(doc, title, subtitle = '') {
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = CONFIG.margin

    // Faixa de gradiente no topo
    doc.setFillColor(...COLORS.primary)
    doc.rect(0, 0, pageWidth, 35, 'F')

    // Logo / Nome da instituição
    doc.setTextColor(...COLORS.white)
    doc.setFontSize(CONFIG.fontSize.title)
    doc.setFont('helvetica', 'bold')
    doc.text(INSTITUTION_FANTASY, CONFIG.margin, 15)

    doc.setFontSize(CONFIG.fontSize.small)
    doc.setFont('helvetica', 'normal')
    doc.text(INSTITUTION_NAME, CONFIG.margin, 22)
    doc.text(`${ADDRESS_CITY} - ${ADDRESS_STATE}`, CONFIG.margin, 28)

    // Data de geração (lado direito)
    const dataAtual = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
    doc.setFontSize(CONFIG.fontSize.small)
    doc.text(`Gerado em: ${dataAtual}`, pageWidth - CONFIG.margin, 15, { align: 'right' })

    y = 45

    // Título do documento
    doc.setTextColor(...COLORS.text)
    doc.setFontSize(CONFIG.fontSize.title)
    doc.setFont('helvetica', 'bold')
    doc.text(title, pageWidth / 2, y, { align: 'center' })
    y += 8

    // Subtítulo (se houver)
    if (subtitle) {
        doc.setTextColor(...COLORS.textLight)
        doc.setFontSize(CONFIG.fontSize.subtitle)
        doc.setFont('helvetica', 'normal')
        doc.text(subtitle, pageWidth / 2, y, { align: 'center' })
        y += 6
    }

    // Linha divisória
    y += 4
    doc.setDrawColor(...COLORS.grayDark)
    doc.setLineWidth(0.5)
    doc.line(CONFIG.margin, y, pageWidth - CONFIG.margin, y)

    return y + 10
}

/**
 * Adiciona rodapé padrão ao PDF
 * @param {jsPDF} doc - Instância do jsPDF
 */
export function addFooter(doc) {
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const pageCount = doc.internal.getNumberOfPages()

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)

        // Linha divisória
        doc.setDrawColor(...COLORS.grayDark)
        doc.setLineWidth(0.3)
        doc.line(CONFIG.margin, pageHeight - 15, pageWidth - CONFIG.margin, pageHeight - 15)

        // Texto do rodapé
        doc.setTextColor(...COLORS.textLight)
        doc.setFontSize(CONFIG.fontSize.small)
        doc.setFont('helvetica', 'normal')

        doc.text(`${SYSTEM_NAME} - Sistema de Gestão Escolar`, CONFIG.margin, pageHeight - 10)
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - CONFIG.margin, pageHeight - 10, { align: 'right' })
    }
}

/**
 * Adiciona título de seção
 * @param {jsPDF} doc - Instância do jsPDF
 * @param {string} title - Título da seção
 * @param {number} y - Posição Y
 * @returns {number} Nova posição Y
 */
export function addSectionTitle(doc, title, y) {
    const pageWidth = doc.internal.pageSize.getWidth()

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

    return y + 14
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
        return CONFIG.margin
    }

    return y
}

/**
 * Converte imagem URL para base64
 * @param {string} url - URL da imagem
 * @returns {Promise<string>} Base64 da imagem
 */
export async function imageToBase64(url) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)
            resolve(canvas.toDataURL('image/jpeg', 0.95))
        }
        img.onerror = reject
        img.src = url
    })
}

/**
 * Faz download do PDF
 * @param {jsPDF} doc - Instância do jsPDF
 * @param {string} filename - Nome do arquivo
 */
export function downloadPDF(doc, filename) {
    doc.save(filename)
}

/**
 * Abre o PDF em nova aba
 * @param {jsPDF} doc - Instância do jsPDF
 */
export function openPDF(doc) {
    const pdfBlob = doc.output('blob')
    const pdfUrl = URL.createObjectURL(pdfBlob)
    window.open(pdfUrl, '_blank')
}

// Exporta configurações para uso externo
export { CONFIG, COLORS }
