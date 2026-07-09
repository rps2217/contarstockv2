import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Package, AlertCircle } from 'lucide-react'
import { HorizontalStatCard } from './HorizontalStatCard'

describe('HorizontalStatCard', () => {
  it('renders with icon, label and value', () => {
    render(<HorizontalStatCard icon={Package} label="Total" value={42} />)
    
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('applies custom color class', () => {
    render(
      <HorizontalStatCard 
        icon={AlertCircle} 
        label="Alerts" 
        value={10} 
        color="text-red-500" 
      />
    )
    
    const valueElement = screen.getByText('10')
    expect(valueElement).toHaveClass('text-red-500')
  })

  it('displays subtext when provided', () => {
    render(
      <HorizontalStatCard 
        icon={Package} 
        label="Products" 
        value={100} 
        subtext="in stock"
      />
    )
    
    expect(screen.getByText('in stock')).toBeInTheDocument()
  })

  it('renders without crashing with default props', () => {
    render(<HorizontalStatCard icon={Package} label="Test" value={0} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('accepts additional className', () => {
    const { container } = render(
      <HorizontalStatCard 
        icon={Package} 
        label="Test" 
        value={1} 
        className="custom-class"
      />
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
