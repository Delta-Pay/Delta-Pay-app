import { useState, useCallback } from 'react'
import DOMPurify from 'dompurify'

interface ValidationPatterns {
  fullName?: RegExp
  idNumber?: RegExp
  accountNumber?: RegExp
  username?: RegExp
  password?: RegExp
  amount?: RegExp
  swiftCode?: RegExp
  recipientAccount?: RegExp
}

const DEFAULT_PATTERNS: ValidationPatterns = {
  fullName: /^[a-zA-Z\s]{2,50}$/,
  idNumber: /^[0-9]{13}$/,
  accountNumber: /^[0-9]{10,20}$/,
  username: /^[a-zA-Z0-9_]{3,20}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  amount: /^[0-9]+(\.[0-9]{1,2})?$/,
  swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  recipientAccount: /^[A-Z0-9]{8,30}$/
}

interface ValidationErrors {
  [key: string]: string
}

export const useValidation = (customPatterns?: ValidationPatterns) => {
  const [errors, setErrors] = useState<ValidationErrors>({})
  const patterns = { ...DEFAULT_PATTERNS, ...customPatterns }

  const sanitizeInput = useCallback((value: string): string => {
    return DOMPurify.sanitize(value, { ALLOWED_TAGS: [] }).trim()
  }, [])

  const validateField = useCallback((
    fieldName: string,
    value: string
  ): boolean => {
    const sanitized = sanitizeInput(value)
    const pattern = patterns[fieldName as keyof ValidationPatterns]

    if (!pattern) {
      return true
    }

    if (!pattern.test(sanitized)) {
      const errorMessages: Record<string, string> = {
        fullName: 'Full name must be 2-50 letters and spaces',
        idNumber: 'ID number must be 13 digits',
        accountNumber: 'Account number must be 10-20 digits',
        username: 'Username must be 3-20 alphanumeric characters or underscores',
        password: 'Password must be 8+ characters with uppercase, lowercase, digit, and special character',
        amount: 'Amount must be a valid number with up to 2 decimal places',
        swiftCode: 'SWIFT code must be 8 or 11 characters (e.g., ABCDEF2A)',
        recipientAccount: 'Recipient account must be 8-30 alphanumeric characters'
      }

      setErrors(prev => ({
        ...prev,
        [fieldName]: errorMessages[fieldName] || 'Invalid input'
      }))
      return false
    }

    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldName]
      return newErrors
    })
    return true
  }, [patterns, sanitizeInput])

  const validateForm = useCallback((
    data: Record<string, string>
  ): boolean => {
    let isValid = true
    const newErrors: ValidationErrors = {}

    for (const [field, value] of Object.entries(data)) {
      const sanitized = sanitizeInput(value)
      const pattern = patterns[field as keyof ValidationPatterns]

      if (pattern && !pattern.test(sanitized)) {
        isValid = false
        newErrors[field] = `Invalid ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`
      }
    }

    setErrors(newErrors)
    return isValid
  }, [patterns, sanitizeInput])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[fieldName]
      return newErrors
    })
  }, [])

  return {
    errors,
    validateField,
    validateForm,
    sanitizeInput,
    clearErrors,
    clearFieldError
  }
}
