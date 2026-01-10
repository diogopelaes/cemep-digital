import GradeHorariaDetalhes from '../../pages/gestao-secretaria/GradeHorariaDetalhes'

/**
 * Componente container da aba "Grade Horária" em TurmaDetalhes.
 * Agora atua apenas como wrapper para GradeHorariaDetalhes, que gerencia seu próprio estado e dados.
 */
export default function TurmaGradeHoraria() {
    return <GradeHorariaDetalhes />
}
