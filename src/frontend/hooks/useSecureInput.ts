import { useState, useCallback, ChangeEvent } from 'react'
import { useValidation } from './useValidation'

interface UseSecureInputOptions {
  initialValue?: string
  fieldName?: string
  maxLength?: number
  sanitize?: boolean
}

export const useSecureInput = ({
  initialValue = '',
  fieldName,
  maxLength,
  sanitize = true
}: UseSecureInputOptions = {}) => {
  const [value, setValue] = useState(initialValue)
  const { validateField, sanitizeInput, errors, clearFieldError } = useValidation()

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let newValue = e.target.value

    if (maxLength && newValue.length > maxLength) {
      newValue = newValue.slice(0, maxLength)
    }

    if (sanitize) {
      newValue = sanitizeInput(newValue)
    }

    setValue(newValue)

    if (fieldName) {
      clearFieldError(fieldName)
    }
  }, [maxLength, sanitize, sanitizeInput, fieldName, clearFieldError])

  const validate = useCallback((): boolean => {
    if (fieldName) {
      return validateField(fieldName, value)
    }
    return true
  }, [fieldName, value, validateField])

  const reset = useCallback(() => {
    setValue(initialValue)
    if (fieldName) {
      clearFieldError(fieldName)
    }
  }, [initialValue, fieldName, clearFieldError])

  return {
    value,
    setValue,
    handleChange,
    validate,
    reset,
    error: fieldName ? errors[fieldName] : undefined
  }
}
