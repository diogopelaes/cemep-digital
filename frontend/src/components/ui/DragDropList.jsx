import { useState, useRef } from 'react'
import { HiOutlineDotsHorizontal } from "react-icons/hi";

/**
 * Componente de lista com drag and drop usando HTML5 Drag API.
 * Suporta reordenação de itens com animação suave.
 */
export default function DragDropList({
    items = [],
    onReorder,
    renderItem,
    keyExtractor = (item, index) => item.id || index,
    className = '',
    itemClassName = '',
    dragHandleClassName = '',
    showDragHandle = true,
}) {
    const [draggedIndex, setDraggedIndex] = useState(null)
    const [dragOverIndex, setDragOverIndex] = useState(null)
    const dragNode = useRef(null)

    const handleDragStart = (e, index) => {
        setDraggedIndex(index)
        dragNode.current = e.target

        // Delay para evitar glitch visual
        setTimeout(() => {
            if (dragNode.current) {
                dragNode.current.classList.add('opacity-50', 'scale-95')
            }
        }, 0)

        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', index.toString())
    }

    const handleDragEnd = () => {
        if (dragNode.current) {
            dragNode.current.classList.remove('opacity-50', 'scale-95')
        }
        setDraggedIndex(null)
        setDragOverIndex(null)
        dragNode.current = null
    }

    const handleDragOver = (e, index) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'

        if (draggedIndex === null || draggedIndex === index) return
        setDragOverIndex(index)
    }

    const handleDragLeave = () => {
        setDragOverIndex(null)
    }

    const handleDrop = (e, dropIndex) => {
        e.preventDefault()

        if (draggedIndex === null || draggedIndex === dropIndex) {
            handleDragEnd()
            return
        }

        // Reordena os itens
        const newItems = [...items]
        const [draggedItem] = newItems.splice(draggedIndex, 1)
        newItems.splice(dropIndex, 0, draggedItem)

        onReorder(newItems)
        handleDragEnd()
    }

    return (
        <div className={`space-y-2 ${className}`}>
            {items.map((item, index) => (
                <div
                    key={keyExtractor(item, index)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`
                        flex items-center gap-2 transition-all duration-200 cursor-move
                        ${dragOverIndex === index && draggedIndex !== null
                            ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-slate-900'
                            : ''
                        }
                        ${draggedIndex === index ? 'opacity-50' : ''}
                        ${itemClassName}
                    `}
                >
                    {showDragHandle && (
                        <div className={`flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-grab active:cursor-grabbing ${dragHandleClassName}`}>
                            <HiOutlineDotsHorizontal className="w-5 h-5 rotate-90" />
                        </div>
                    )}
                    <div className="flex-1">
                        {renderItem(item, index)}
                    </div>
                </div>
            ))}
        </div>
    )
}

/**
 * Componente para drag and drop de grupos (categorias) com itens internos.
 */
export function DragDropGroups({
    groups = [], // [{ id, name, items: [] }]
    onReorderGroups,
    onReorderItems,
    renderGroupHeader,
    renderItem,
    groupKeyExtractor = (group) => group.id,
    itemKeyExtractor = (item) => item.id,
    className = '',
    groupClassName = '',
    itemClassName = '',
}) {
    const [draggedGroup, setDraggedGroup] = useState(null)
    const [dragOverGroup, setDragOverGroup] = useState(null)
    const [draggedItem, setDraggedItem] = useState(null) // { groupId, index }
    const [dragOverItem, setDragOverItem] = useState(null) // { groupId, index }

    // Drag de grupos
    const handleGroupDragStart = (e, groupIndex) => {
        e.stopPropagation()
        setDraggedGroup(groupIndex)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('type', 'group')
    }

    const handleGroupDragEnd = () => {
        setDraggedGroup(null)
        setDragOverGroup(null)
    }

    const handleGroupDragOver = (e, groupIndex) => {
        e.preventDefault()
        if (draggedGroup !== null && draggedGroup !== groupIndex) {
            setDragOverGroup(groupIndex)
        }
    }

    const handleGroupDrop = (e, dropIndex) => {
        e.preventDefault()
        if (draggedGroup === null || draggedGroup === dropIndex) {
            handleGroupDragEnd()
            return
        }

        const newGroups = [...groups]
        const [draggedGroupItem] = newGroups.splice(draggedGroup, 1)
        newGroups.splice(dropIndex, 0, draggedGroupItem)

        onReorderGroups(newGroups)
        handleGroupDragEnd()
    }

    // Drag de itens dentro de grupos
    const handleItemDragStart = (e, groupId, itemIndex) => {
        e.stopPropagation()
        setDraggedItem({ groupId, index: itemIndex })
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('type', 'item')
    }

    const handleItemDragEnd = () => {
        setDraggedItem(null)
        setDragOverItem(null)
    }

    const handleItemDragOver = (e, groupId, itemIndex) => {
        e.preventDefault()
        e.stopPropagation()
        if (draggedItem !== null) {
            setDragOverItem({ groupId, index: itemIndex })
        }
    }

    const handleItemDrop = (e, targetGroupId, targetIndex) => {
        e.preventDefault()
        e.stopPropagation()

        if (!draggedItem) {
            handleItemDragEnd()
            return
        }

        const { groupId: sourceGroupId, index: sourceIndex } = draggedItem

        // Se está no mesmo grupo e mesma posição, não faz nada
        if (sourceGroupId === targetGroupId && sourceIndex === targetIndex) {
            handleItemDragEnd()
            return
        }

        const newGroups = groups.map(g => ({ ...g, items: [...g.items] }))
        const sourceGroup = newGroups.find(g => groupKeyExtractor(g) === sourceGroupId)
        const targetGroup = newGroups.find(g => groupKeyExtractor(g) === targetGroupId)

        if (!sourceGroup || !targetGroup) {
            handleItemDragEnd()
            return
        }

        // Remove do grupo fonte
        const [movedItem] = sourceGroup.items.splice(sourceIndex, 1)

        // Adiciona no grupo destino
        const adjustedTargetIndex = sourceGroupId === targetGroupId && sourceIndex < targetIndex
            ? targetIndex - 1
            : targetIndex
        targetGroup.items.splice(adjustedTargetIndex, 0, movedItem)

        onReorderItems(newGroups)
        handleItemDragEnd()
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {groups.map((group, groupIndex) => (
                <div
                    key={groupKeyExtractor(group)}
                    draggable
                    onDragStart={(e) => handleGroupDragStart(e, groupIndex)}
                    onDragEnd={handleGroupDragEnd}
                    onDragOver={(e) => handleGroupDragOver(e, groupIndex)}
                    onDrop={(e) => handleGroupDrop(e, groupIndex)}
                    className={`
                        rounded-xl border transition-all duration-200
                        ${dragOverGroup === groupIndex && draggedGroup !== null
                            ? 'ring-2 ring-primary-500 border-primary-500'
                            : 'border-slate-200 dark:border-slate-700'
                        }
                        ${draggedGroup === groupIndex ? 'opacity-50' : ''}
                        ${groupClassName}
                    `}
                >
                    {/* Header do grupo */}
                    <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-t-xl cursor-grab active:cursor-grabbing border-b border-slate-200 dark:border-slate-700">
                        <HiOutlineDotsHorizontal className="w-5 h-5 text-slate-400 rotate-90 flex-shrink-0" />
                        <div className="flex-1">
                            {renderGroupHeader(group, groupIndex)}
                        </div>
                    </div>

                    {/* Itens do grupo */}
                    <div className="p-2 space-y-1 min-h-[40px]">
                        {group.items.length === 0 ? (
                            <div
                                className="text-center text-slate-400 text-sm py-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg"
                                onDragOver={(e) => {
                                    e.preventDefault()
                                    if (draggedItem) setDragOverItem({ groupId: groupKeyExtractor(group), index: 0 })
                                }}
                                onDrop={(e) => handleItemDrop(e, groupKeyExtractor(group), 0)}
                            >
                                Arraste indicadores para cá
                            </div>
                        ) : (
                            group.items.map((item, itemIndex) => (
                                <div
                                    key={itemKeyExtractor(item)}
                                    draggable
                                    onDragStart={(e) => handleItemDragStart(e, groupKeyExtractor(group), itemIndex)}
                                    onDragEnd={handleItemDragEnd}
                                    onDragOver={(e) => handleItemDragOver(e, groupKeyExtractor(group), itemIndex)}
                                    onDrop={(e) => handleItemDrop(e, groupKeyExtractor(group), itemIndex)}
                                    className={`
                                        flex items-center gap-2 p-2 rounded-lg transition-all duration-200 cursor-grab active:cursor-grabbing
                                        bg-white dark:bg-slate-800 border border-transparent
                                        hover:border-slate-200 dark:hover:border-slate-600
                                        ${dragOverItem?.groupId === groupKeyExtractor(group) && dragOverItem?.index === itemIndex
                                            ? 'ring-2 ring-primary-400 border-primary-400'
                                            : ''
                                        }
                                        ${draggedItem?.groupId === groupKeyExtractor(group) && draggedItem?.index === itemIndex
                                            ? 'opacity-50'
                                            : ''
                                        }
                                        ${itemClassName}
                                    `}
                                >
                                    <HiOutlineDotsHorizontal className="w-4 h-4 text-slate-300 rotate-90 flex-shrink-0" />
                                    <div className="flex-1">
                                        {renderItem(item, itemIndex, group, groupIndex)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ))}
        </div>
    )
}
