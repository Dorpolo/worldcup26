interface Props {
  name: string
  shortName: string
  flag?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = { sm: 'text-lg', md: 'text-2xl', lg: 'text-4xl' }
const nameClasses = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' }

export function TeamFlag({ name, shortName, flag, size = 'md' }: Props) {
  return (
    <div className="flex flex-col items-center gap-1">
      {flag ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={flag} alt={name} className={`${size === 'sm' ? 'w-6 h-4' : size === 'md' ? 'w-8 h-6' : 'w-12 h-8'} object-cover rounded-sm`} />
      ) : (
        <span className={sizeClasses[size]}>🏳️</span>
      )}
      <span className={`${nameClasses[size]} font-medium text-center leading-tight`}>{shortName}</span>
    </div>
  )
}
