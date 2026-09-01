import { showFormSubmitSuccess, showFormSubmitError } from "@/utils/toast-utils"

type SubmitGuardOptions = {
    successMessage?: string
    onSuccess?: () => void
    onError?: (error: unknown) => void
}

/**
 * ✅ Universal submit guard
 * - prevents double submit
 * - handles loader
 * - shows success toast
 * - shows error toast
 */
export const submitWithGuard = async (
    isSubmitting: boolean,
    setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>,
    submitFn: () => Promise<void>,
    options?: SubmitGuardOptions
) => {
    if (isSubmitting) return

    try {
        setIsSubmitting(true)

        await submitFn()

        showFormSubmitSuccess(
            options?.successMessage ?? "Form submitted successfully"
        )

        options?.onSuccess?.()
    } catch (error) {
        console.error(error)
        showFormSubmitError()
        options?.onError?.(error)
    } finally {
        setIsSubmitting(false)
    }
}
