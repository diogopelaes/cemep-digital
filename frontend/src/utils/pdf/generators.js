import { INSTITUTION_NAME } from '../../config/constants'
import { createPDF, imageToBase64, openPDF } from './core'
import { addHeader, addFooter } from './header'
import { COLORS, CONFIG } from './config'

/**
 * Gera o PDF do Carômetro
 * @param {Object} turma - Dados da turma
 * @param {Array} estudantes - Lista de estudantes
 */
export async function generateCarometroPDF(turma, estudantes) {
    const doc = createPDF({ orientation: 'landscape' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // === CABEÇALHO PADRONIZADO ===
    let y = await addHeader(doc, {
        title: 'CARÔMETRO',
        subtitle1: turma.nome,
        subtitle2: INSTITUTION_NAME,
        info1: `Total de Estudantes: ${estudantes.length}`,
    })

    // === GRID DE ESTUDANTES ===
    const colCount = 10
    const gap = 3
    const margin = 10 // Margem lateral reduzida para o grid
    const boxWidth = (pageWidth - (margin * 2) - ((colCount - 1) * gap)) / colCount
    const boxHeight = boxWidth * 1.9 // Altura customizada do card

    // Calcula proporção 3:4 para foto
    const photoHeight = boxWidth * 1.33

    let col = 0

    // Carregar todas as fotos em paralelo
    const fotosMap = new Map()
    const promises = estudantes.map(async (est) => {
        if (est.foto) {
            try {
                const base64 = await imageToBase64(est.foto)
                fotosMap.set(est.id, base64)
            } catch (e) {
                // Ignore errors
            }
        }
    })
    await Promise.all(promises)

    // Renderizar estudantes
    for (const est of estudantes) {
        // Verificar nova página
        if (y + boxHeight > pageHeight - 10) {
            addFooter(doc)
            doc.addPage()

            // Header simplificado em novas páginas ou apenas margem?
            // Vamos apenas resetar Y. Se quiser header em todas, chamaria addHeader novamente
            y = 15
            col = 0
        }

        const x = margin + (col * (boxWidth + gap))

        // Desenha card do estudante
        drawStudentCard(doc, est, x, y, boxWidth, boxHeight, photoHeight, fotosMap.get(est.id))

        col++
        if (col >= colCount) {
            col = 0
            y += boxHeight + gap
        }
    }

    addFooter(doc)
    openPDF(doc)
}

function drawStudentCard(doc, est, x, y, width, height, photoHeight, photoBase64) {
    // Foto
    if (photoBase64) {
        try {
            doc.addImage(photoBase64, 'JPEG', x, y, width, photoHeight)
        } catch (e) {
            drawPlaceholder(doc, x, y, width, photoHeight)
        }
    } else {
        drawPlaceholder(doc, x, y, width, photoHeight)
    }

    // Borda da foto
    doc.setDrawColor(...COLORS.grayDark)
    doc.setLineWidth(0.1)
    doc.rect(x, y, width, photoHeight)

    // Nome
    doc.setTextColor(...COLORS.text)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')

    const nomeDisplay = est.nome || est.nome_social
    // Split text para caber na largura
    const splitNome = doc.splitTextToSize(nomeDisplay, width + 2)

    const nomeY = y + photoHeight + 3
    const linhasNome = splitNome.slice(0, 2) // Max 2 linhas
    doc.text(linhasNome, x + (width / 2), nomeY, { align: 'center' })

    // Data Nascimento
    if (est.data_nascimento) {
        doc.setTextColor(...COLORS.textLight)
        doc.setFontSize(6)
        doc.setFont('helvetica', 'normal')

        const dateY = nomeY + (linhasNome.length * 2.5) + 1
        doc.text(est.data_nascimento, x + (width / 2), dateY, { align: 'center' })
    }
}

function drawPlaceholder(doc, x, y, width, height) {
    doc.setFillColor(...COLORS.gray)
    doc.rect(x, y, width, height, 'F')

    // Simple silhouette
    const cx = x + width / 2
    const cy = y + height / 2
    doc.setFillColor(...COLORS.grayDark)
    doc.circle(cx, cy - height * 0.15, width * 0.15, 'F')
    doc.ellipse(cx, cy + height * 0.2, width * 0.3, height * 0.25, 'F')
}
