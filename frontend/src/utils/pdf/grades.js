import { INSTITUTION_NAME } from '../../config/constants'
import { createPDF, openPDF } from './core'
import { addHeader, addFooter } from './header'
import { COLORS } from './config'

const DAYS = [
    { value: '0', label: 'SEGUNDA' },
    { value: '1', label: 'TERÇA' },
    { value: '2', label: 'QUARTA' },
    { value: '3', label: 'QUINTA' },
    { value: '4', label: 'SEXTA' },
]

/**
 * Gera o PDF da Grade Horária de uma Turma
 * @param {Object} dados - Dados retornados pela API /api/pedagogical/grade-turma/
 */
export async function generateGradeTurmaPDF(dados) {
    const { validade, matriz, horarios, ano_letivo, turma_nome, numero, letra, cursos } = dados
    const doc = createPDF({ orientation: 'landscape' })
    const margin = 10
    const pageWidth = doc.internal.pageSize.getWidth()

    // === CABEÇALHO ===
    const cursoStr = cursos && cursos.length > 0 ? cursos.join(' / ') : ''
    let y = await addHeader(doc, {
        title: 'GRADE HORÁRIA',
        subtitle1: `${ano_letivo} - ${turma_nome}${cursoStr ? ' - ' + cursoStr : ''}`,
        subtitle2: INSTITUTION_NAME,
        info1: validade ? `A partir de ${new Date(validade.data_inicio).toLocaleDateString('pt-BR')}` : '',
        info2: '',
        margin
    })

    y += 5

    drawGradeTable(doc, y, { matriz, horarios, mostrar_disciplina: true, tipo: 'turma' }, margin)

    addFooter(doc, margin)
    openPDF(doc)
}

/**
 * Gera o PDF da Grade Horária do Professor
 * @param {Object} dados - Dados retornados pela API /api/pedagogical/grade-professor/
 */
export async function generateGradeProfessorPDF(dados) {
    const { professor_nome, validade, matriz, horarios, ano_letivo, mostrar_disciplina } = dados
    const doc = createPDF({ orientation: 'landscape' })
    const margin = 10
    const pageWidth = doc.internal.pageSize.getWidth()

    // === CABEÇALHO ===
    let y = await addHeader(doc, {
        title: `MINHA GRADE HORÁRIA - ${ano_letivo}`,
        subtitle1: professor_nome,
        subtitle2: INSTITUTION_NAME,
        info1: validade ? `A partir de ${new Date(validade.data_inicio).toLocaleDateString('pt-BR')}` : '',
        info2: '',
        margin
    })

    y += 5

    drawGradeTable(doc, y, { matriz, horarios, mostrar_disciplina, tipo: 'professor' }, margin)

    addFooter(doc, margin)
    openPDF(doc)
}

/**
 * Desenha a tabela da grade horária
 */
function drawGradeTable(doc, yStart, options, margin) {
    const { matriz, horarios, mostrar_disciplina, tipo } = options
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const usableWidth = pageWidth - (margin * 2)

    // Largura das colunas: 
    // Aula: 25mm
    // Dias: Restante / 5
    const aulaWidth = 25
    const dayWidth = (usableWidth - aulaWidth) / 5

    // Altura da linha (ultra compacta para caber em uma página)
    const rowHeight = 10
    const headerHeight = 6

    // === HEADER DA TABELA ===
    doc.setFillColor(...COLORS.gray)
    doc.rect(margin, yStart, usableWidth, headerHeight, 'F')

    doc.setTextColor(...COLORS.text)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')

    // Célula "Aula"
    doc.text('AULA', margin + (aulaWidth / 2), yStart + 4, { align: 'center' })

    // Células dos Dias
    DAYS.forEach((day, idx) => {
        const x = margin + aulaWidth + (idx * dayWidth)
        doc.text(day.label, x + (dayWidth / 2), yStart + 4, { align: 'center' })
    })

    let y = yStart + headerHeight

    // === LINHAS (Aulas) ===
    const numerosAula = Object.keys(matriz || {}).map(Number).sort((a, b) => a - b)

    numerosAula.forEach((num, index) => {
        const numStr = String(num)
        const horario = horarios[numStr]

        // Verificar quebra de página
        if (y + rowHeight > pageHeight - 12) {
            addFooter(doc, margin)
            doc.addPage()
            y = 15
        }

        // Fundo alternado
        if (index % 2 === 1) {
            doc.setFillColor(248, 248, 250)
            doc.rect(margin, y, usableWidth, rowHeight, 'F')
        }

        // Borda lateral e inferior
        doc.setDrawColor(...COLORS.gray)
        doc.setLineWidth(0.1)
        doc.rect(margin, y, usableWidth, rowHeight)

        // Coluna AULA (Número em destaque e Horário em cinza na mesma linha)
        const numText = `${num}ª `
        const timeText = horario ? `${horario.hora_inicio}-${horario.hora_fim}` : ''

        doc.setFontSize(7.5)
        const fullWidth = doc.getTextWidth(numText + timeText)
        const startX = margin + (aulaWidth / 2) - (fullWidth / 2)

        // Desenha o Número (Bold)
        doc.setTextColor(...COLORS.text)
        doc.setFont('helvetica', 'bold')
        doc.text(numText, startX, y + (rowHeight / 2) + 1)

        // Desenha o Horário (Normal, Cinza)
        if (horario) {
            doc.setTextColor(...COLORS.textLight)
            doc.setFont('helvetica', 'normal')
            doc.text(timeText, startX + doc.getTextWidth(numText), y + (rowHeight / 2) + 1)
        }

        // Colunas DIAS
        DAYS.forEach((day, idxDay) => {
            const celula = matriz[numStr]?.[day.value]
            const x = margin + aulaWidth + (idxDay * dayWidth)

            // Linha Vertical separadora
            doc.line(x, y, x, y + rowHeight)

            if (celula) {
                const centerY = y + (rowHeight / 2)

                if (tipo === 'turma') {
                    // Na grade da turma: Disciplina em destaque, Professor embaixo
                    doc.setTextColor(...COLORS.text)
                    doc.setFont('helvetica', 'bold')
                    doc.setFontSize(7.5)
                    const sigla = celula.disciplina_sigla || ''
                    doc.text(sigla, x + (dayWidth / 2), centerY - 0.5, { align: 'center' })

                    doc.setTextColor(...COLORS.textLight)
                    doc.setFont('helvetica', 'normal')
                    doc.setFontSize(5.5)
                    if (celula.professor_apelido) {
                        doc.text(celula.professor_apelido, x + (dayWidth / 2), centerY + 3, { align: 'center' })
                    }
                } else {
                    // Na grade do professor: Turma em destaque, Disciplina (se necessário) embaixo
                    doc.setTextColor(...COLORS.text)
                    doc.setFont('helvetica', 'bold')
                    doc.setFontSize(8)
                    doc.text(celula.turma_label, x + (dayWidth / 2), centerY - 0.5, { align: 'center' })

                    if (mostrar_disciplina && celula.disciplina_sigla) {
                        doc.setTextColor(...COLORS.textLight)
                        doc.setFont('helvetica', 'normal')
                        doc.setFontSize(5.5)
                        doc.text(celula.disciplina_sigla, x + (dayWidth / 2), centerY + 3, { align: 'center' })
                    }
                }
            }
        })

        y += rowHeight
    })
}
