import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SearchInput } from './SearchInput'

describe('SearchInput', () => {
  it('renders with placeholder', () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="Search..." />)
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  })

  it('displays the current value', () => {
    render(<SearchInput value="test query" onChange={() => {}} />)
    expect(screen.getByDisplayValue('test query')).toBeInTheDocument()
  })

  it('calls onChange when user types', () => {
    const handleChange = vi.fn()
    render(<SearchInput value="" onChange={handleChange} />)
    
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'hello' } })
    
    expect(handleChange).toHaveBeenCalledWith('hello')
  })

  it('clears value when clear button is clicked', () => {
    const handleChange = vi.fn()
    const handleClear = vi.fn()
    render(
      <SearchInput 
        value="test" 
        onChange={handleChange}
        onClear={handleClear}
      />
    )
    
    const clearButton = screen.getByRole('button')
    fireEvent.click(clearButton)
    
    expect(handleChange).toHaveBeenCalledWith('')
    expect(handleClear).toHaveBeenCalled()
  })

  it('shows clear button only when value exists', () => {
    const { rerender } = render(
      <SearchInput value="test" onChange={() => {}} />
    )
    expect(screen.getByRole('button')).toBeInTheDocument()

    rerender(<SearchInput value="" onChange={() => {}} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('applies custom placeholder', () => {
    render(<SearchInput value="" onChange={() => {}} placeholder="Custom placeholder" />)
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument()
  })

  it('is disabled when disabled prop is true', () => {
    render(<SearchInput value="" onChange={() => {}} disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })
})
