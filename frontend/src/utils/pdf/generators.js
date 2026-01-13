import { INSTITUTION_NAME } from '../../config/constants'
import { createPDF, imageToBase64, openPDF } from './core'
import { addHeader, addFooter } from './header'
import { COLORS, CONFIG } from './config'

/**
 * Gera o PDF das Fotos
 * @param {Object} turma - Dados da turma
 * @param {Array} estudantes - Lista de estudantes
 */
export async function generateCarometroPDF(turma, estudantes) {
    const doc = createPDF({ orientation: 'landscape' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // === CABEÇALHO PADRONIZADO ===
    let y = await addHeader(doc, {
        title: 'Fotos',
        subtitle1: turma.nome_completo + ' - ' + turma.ano_letivo,
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

/**
 * Gera o PDF de Lista de Chamada/Estudantes
 * @param {Object} turma - Dados da turma
 * @param {Array} estudantes - Lista de estudantes
 */
export async function generateListaTurmaPDF(turma, estudantes) {
    const doc = createPDF({ orientation: 'portrait' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 5 // 0.5 cm

    // === CABEÇALHO ===
    let y = await addHeader(doc, {
        title: 'LISTA DE ESTUDANTES',
        subtitle1: turma.nome_completo + ' - ' + turma.ano_letivo,
        subtitle2: INSTITUTION_NAME,
        info1: `Total: ${estudantes.length}`,
        margin // Passa margem customizada
    })

    y += 5

    // === COLUNAS DA TABELA ===
    // Largura total útil = pageWidth - 2*margin (210 - 10 = 200mm)
    // Distribuição:
    // # : 8
    // Nome: 80
    // Matrícula: 22
    // Nasc: 20
    // Email: 50
    // Status: 20
    // Total = 200mm

    const cols = [
        { header: '#', width: 8, field: 'index', align: 'center' },
        { header: 'NOME', width: 80, field: 'nome' },
        { header: 'MATRÍCULA', width: 22, field: 'matricula', align: 'center' },
        { header: 'DATA NASC.', width: 20, field: 'nascimento', align: 'center' },
        { header: 'EMAIL', width: 50, field: 'email' },
        { header: 'STATUS', width: 20, field: 'status', align: 'center' }
    ]

    // === HEADER DA TABELA ===
    doc.setFillColor(...COLORS.gray)
    doc.rect(margin, y, pageWidth - (margin * 2), 7, 'F')

    doc.setTextColor(...COLORS.text)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')

    let currentX = margin
    cols.forEach(col => {
        const textX = col.align === 'center' ? currentX + (col.width / 2) : currentX + 2
        doc.text(col.header, textX, y + 4.5, { align: col.align || 'left' })
        currentX += col.width
    })

    y += 7

    // === LINHAS ===
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)

    // === ORDENAÇÃO E PREPARAÇÃO ===
    // Ordenar por número de chamada (se houver) e depois por nome
    const estudantesOrdenados = [...estudantes].sort((a, b) => {
        const numA = parseInt(a.numero_chamada) || 0
        const numB = parseInt(b.numero_chamada) || 0

        if (numA !== numB) {
            // Se um for 0 (não definido), coloca no final ou mantém ordem? 
            // Geralmente 0 deve ir para o final se os outros estão numerados.
            if (numA === 0) return 1
            if (numB === 0) return -1
            return numA - numB
        }

        return (a.nome || '').localeCompare(b.nome || '')
    })

    estudantesOrdenados.forEach((est, index) => {
        // Verificar quebra de página
        if (y > pageHeight - 15) {
            addFooter(doc, margin) // Passa margem customizada
            doc.addPage()
            y = 15 // Margem superior simples

            // Redesenhar header da tabela
            doc.setFillColor(...COLORS.gray)
            doc.rect(margin, y, pageWidth - (margin * 2), 7, 'F')
            doc.setTextColor(...COLORS.text)
            doc.setFont('helvetica', 'bold')

            let hX = margin
            cols.forEach(col => {
                const textX = col.align === 'center' ? hX + (col.width / 2) : hX + 2
                doc.text(col.header, textX, y + 4.5, { align: col.align || 'left' })
                hX += col.width
            })

            y += 7
            doc.setFont('helvetica', 'normal')
        }

        const rowHeight = 7
        const isPair = index % 2 === 1

        if (isPair) {
            doc.setFillColor(248, 248, 250) // cinza bem claro
            doc.rect(margin, y, pageWidth - (margin * 2), rowHeight, 'F')
        }

        // Dados
        // Lógica de Estilo Condicional
        const statusRaw = est.status || '-'
        const statusUpper = statusRaw.toUpperCase()

        let textColor = COLORS.text
        let fontStyle = 'normal'
        let isStrike = false

        if (statusUpper === 'RETIDO') {
            textColor = [220, 38, 38] // Red
            fontStyle = 'bold'
        } else if (['TRANSFERIDO', 'ABANDONO', 'OUTRO', 'CANCELADO'].includes(statusUpper)) {
            isStrike = true
            textColor = [100, 100, 100] // Cinza escuro para tachados
        }

        doc.setTextColor(...textColor)
        doc.setFont('helvetica', fontStyle)

        let rowX = margin

        // Função auxiliar para desenhar célula
        const drawCell = (text, width, align = 'left', forceNoStrike = false, fullText = null) => {
            // Truncar ou ajustar texto
            let displayText = text
            if (fullText && doc.getTextWidth(fullText) > width - 2) {
                displayText = doc.splitTextToSize(fullText, width - 2)[0]
            }

            const xPos = align === 'center' ? rowX + (width / 2) : rowX + 2
            doc.text(displayText, xPos, y + 4.5, { align })

            if (isStrike && !forceNoStrike && displayText && displayText !== '-') {
                const txtWidth = doc.getTextWidth(displayText)
                const lineStart = align === 'center' ? xPos - (txtWidth / 2) : xPos
                const lineEnd = lineStart + txtWidth

                doc.setDrawColor(...textColor)
                doc.setLineWidth(0.1)
                doc.line(lineStart, y + 4.5 - 1, lineEnd, y + 4.5 - 1)
            }
            rowX += width
        }

        // # - Inserção do número de chamada vindo do banco (ou índice+1 como fallback se for 0/vazio)
        const numDB = parseInt(est.numero_chamada)
        const numChamada = (numDB && numDB !== 0) ? numDB : (index + 1)
        drawCell(numChamada.toString(), cols[0].width, 'center')

        // Nome
        const nomeDisplay = est.nome || est.nome_social || '-'
        // Truncate manual prévio para evitar sobreposição
        const nomeFinal = doc.splitTextToSize(nomeDisplay, cols[1].width - 3)[0]
        drawCell(nomeFinal, cols[1].width, 'left')

        // Matricula
        drawCell(est.matricula || '-', cols[2].width, 'center')

        // Nascimento
        drawCell(est.data_nascimento || '-', cols[3].width, 'center')

        // Email
        const email = est.email || '-'
        let emailFinal = email
        if (doc.getTextWidth(email) > cols[4].width - 3) {
            emailFinal = doc.splitTextToSize(email, cols[4].width - 3)[0]
        }
        drawCell(emailFinal, cols[4].width, 'left')

        // Status (forceNoStrike = true)
        drawCell(statusRaw, cols[5].width, 'center', true)

        y += rowHeight

        // Linha separadora sutil
        doc.setDrawColor(...COLORS.gray)
        doc.setLineWidth(0.1)
        doc.line(margin, y, pageWidth - margin, y)
    })

    addFooter(doc, margin) // Passa margem customizada
    openPDF(doc)
}
