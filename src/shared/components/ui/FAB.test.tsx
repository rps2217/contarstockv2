import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FAB } from './FAB'

describe('FAB', () => {
  it('renders when visible is true', () => {
    render(<FAB onClick={() => {}} visible={true} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('does not render when visible is false', () => {
    render(<FAB onClick={() => {}} visible={false} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<FAB onClick={handleClick} visible={true} />)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalled()
  })

  it('applies custom color', () => {
    render(
      <FAB 
        onClick={() => {}} 
        visible={true} 
        color="bg-red-600"
      />
    )
    
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-red-600')
  })

  it('has aria-label from label prop', () => {
    render(
      <FAB 
        onClick={() => {}} 
        visible={true} 
        label="Add item"
      />
    )
    
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Add item')
  })

  it('applies position classes correctly', () => {
    const { rerender } = render(
      <FAB onClick={() => {}} visible={true} position="bottom-right" />
    )
    expect(screen.getByRole('button')).toHaveClass('bottom-24', 'right-6')

    rerender(
      <FAB onClick={() => {}} visible={true} position="bottom-center" />
    )
    expect(screen.getByRole('button')).toHaveClass('bottom-24', 'left-1/2', '-translate-x-1/2')
  })
})
