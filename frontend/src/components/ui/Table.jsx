export default function Table({ children, className = '' }) {
  return (
    <div className="table-container overflow-x-auto">
      <table className={`table ${className}`}>
        {children}
      </table>
    </div>
  )
}

export function TableHead({ children }) {
  return <thead>{children}</thead>
}

export function TableBody({ children }) {
  return <tbody>{children}</tbody>
}

export function TableRow({ children, onClick, className = '' }) {
  return (
    <tr
      className={`${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

export function TableHeader({ children, className = '' }) {
  return <th className={className}>{children}</th>
}

export function TableCell({ children, className = '' }) {
  return <td className={className}>{children}</td>
}

export function TableEmpty({ message = 'Nenhum registro encontrado', colSpan = 1 }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-12 text-slate-500">
        {message}
      </td>
    </tr>
  )
}

