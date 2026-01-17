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
 * Converte imagem URL para base64 (com autenticação)
 * @param {string} url - URL da imagem
 * @returns {Promise<string>} Base64 da imagem
 */
export async function imageToBase64(url) {
    try {
        // Faz fetch com token de autenticação
        const token = localStorage.getItem('access_token')
        const headers = token ? { Authorization: `Bearer ${token}` } : {}

        const response = await fetch(url, { headers })
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }

        const blob = await response.blob()

        // Converte blob para base64 via canvas para garantir formato JPEG
        return new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = img.width
                canvas.height = img.height
                const ctx = canvas.getContext('2d')
                ctx.drawImage(img, 0, 0)
                URL.revokeObjectURL(img.src)
                resolve(canvas.toDataURL('image/jpeg', 0.95))
            }
            img.onerror = () => {
                URL.revokeObjectURL(img.src)
                reject(new Error('Failed to load image'))
            }
            img.src = URL.createObjectURL(blob)
        })
    } catch (error) {
        throw error
    }
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
