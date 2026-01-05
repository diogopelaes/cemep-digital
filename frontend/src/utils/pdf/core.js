import { jsPDF } from 'jspdf'

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
