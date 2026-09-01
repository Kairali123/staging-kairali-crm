import { toast } from "sonner"

export const showFormSubmitSuccess = (
  message: string = "Form submitted successfully"
) => {
  toast.success(message)
}


export const showFormSubmitError = (
  message: string = "Something went wrong. Please try again."
) => {
  toast.error(message)
}
