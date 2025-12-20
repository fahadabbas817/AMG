import { AxiosError } from 'axios'

export function getErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    if (Array.isArray(error.response?.data?.message)) {
      return error.response?.data?.message.join(', ')
    }
    return error.response?.data?.message || error.message
  }
  return 'Something went wrong'
}
