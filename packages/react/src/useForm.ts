import useRemember from './useRemember'
import {
  type Errors,
  type Method,
  type Progress,
  type VisitOptions,
  router,
} from '@wreathe-js/core'
import isEqual from 'lodash.isequal'
import { useCallback, useEffect, useRef, useState } from 'react'

type setDataByObject<TForm> = (data: TForm) => void
type setDataByMethod<TForm> = (data: (previousData: TForm) => TForm) => void
type setDataByKeyValuePair<TForm> = <K extends keyof TForm>(
  key: K,
  value: TForm[K]
) => void

export interface WreatheFormProps<TForm extends Record<string, unknown>> {
  data: TForm
  isDirty: boolean
  errors: Partial<Record<keyof TForm, string>>
  hasErrors: boolean
  processing: boolean
  progress: Progress | null
  wasSuccessful: boolean
  recentlySuccessful: boolean
  setData: setDataByObject<TForm> &
    setDataByMethod<TForm> &
    setDataByKeyValuePair<TForm>
  transform: (callback: (data: TForm) => TForm) => void
  setDefaults(): void
  setDefaults(field: keyof TForm, value: string): void
  setDefaults(fields: Record<keyof TForm, string>): void
  reset: (...fields: (keyof TForm)[]) => void
  clearErrors: (...fields: (keyof TForm)[]) => void
  setError(field: keyof TForm, value: string): void
  setError(errors: Record<keyof TForm, string>): void
  submit: (method: Method, url: string, options?: VisitOptions) => void
  get: (url: string, options?: VisitOptions) => void
  patch: (url: string, options?: VisitOptions) => void
  post: (url: string, options?: VisitOptions) => void
  put: (url: string, options?: VisitOptions) => void
  delete: (url: string, options?: VisitOptions) => void
  cancel: () => void
}
export default function useForm<TForm extends Record<string, unknown>>(
  initialValues?: TForm
): WreatheFormProps<TForm>
export default function useForm<TForm extends Record<string, unknown>>(
  rememberKey: string,
  initialValues?: TForm
): WreatheFormProps<TForm>
export default function useForm<TForm extends Record<string, unknown>>(
  rememberKeyOrInitialValues?: string | TForm,
  maybeInitialValues?: TForm
): WreatheFormProps<TForm> {
  const isMounted = useRef<boolean>(false)
  const rememberKey =
    typeof rememberKeyOrInitialValues === 'string'
      ? rememberKeyOrInitialValues
      : null
  const [defaults, setDefaults] = useState(
    (typeof rememberKeyOrInitialValues === 'string'
      ? maybeInitialValues
      : rememberKeyOrInitialValues) || ({} as TForm)
  )
  const cancelToken = useRef<{
    cancel: VoidFunction
  } | null>(null)
  const recentlySuccessfulTimeoutId = useRef<NodeJS.Timer | null>(null)
  const [data, setData] = rememberKey
    ? useRemember(defaults, `${rememberKey}:data`)
    : useState(defaults)
  const [errors, setErrors] = rememberKey
    ? useRemember(
        {} as Partial<Record<keyof TForm, string>>,
        `${rememberKey}:errors`
      )
    : useState({} as Partial<Record<keyof TForm, string>>)
  const [hasErrors, setHasErrors] = useState<boolean>(false)
  const [processing, setProcessing] = useState<boolean>(false)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [wasSuccessful, setWasSuccessful] = useState<boolean>(false)
  const [recentlySuccessful, setRecentlySuccessful] = useState<boolean>(false)
  let transform = (data: any) => data

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const submit = useCallback(
    (method: Method, url: string, options: VisitOptions = {}) => {
      const _options: VisitOptions = {
        ...options,
        onCancelToken: (token) => {
          cancelToken.current = token

          if (options.onCancelToken) {
            return options.onCancelToken(token)
          }
        },
        onBefore: (visit) => {
          setWasSuccessful(false)
          setRecentlySuccessful(false)
          if (recentlySuccessfulTimeoutId.current) {
            clearTimeout(recentlySuccessfulTimeoutId.current)
            recentlySuccessfulTimeoutId.current = null
          }

          if (options.onBefore) {
            return options.onBefore(visit)
          }
        },
        onStart: (visit) => {
          setProcessing(true)

          if (options.onStart) {
            return options.onStart(visit)
          }
        },
        onProgress: (event) => {
          setProgress(event)

          if (options.onProgress) {
            return options.onProgress(event)
          }
        },
        onSuccess: (page) => {
          if (isMounted.current) {
            setProcessing(false)
            setProgress(null)
            setErrors({})
            setHasErrors(false)
            setWasSuccessful(true)
            setRecentlySuccessful(true)
            recentlySuccessfulTimeoutId.current = setTimeout(() => {
              if (isMounted.current) {
                setRecentlySuccessful(false)
              }
            }, 2000)
          }

          if (options.onSuccess) {
            return options.onSuccess(page)
          }
        },
        onError: (errors) => {
          if (isMounted.current) {
            setProcessing(false)
            setProgress(null)
            setErrors(errors as Record<keyof TForm, string>)
            setHasErrors(true)
          }

          if (options.onError) {
            return options.onError(errors)
          }
        },
        onCancel: () => {
          if (isMounted.current) {
            setProcessing(false)
            setProgress(null)
          }

          if (options.onCancel) {
            return options.onCancel()
          }
        },
        onFinish: (visit) => {
          if (isMounted.current) {
            setProcessing(false)
            setProgress(null)
          }

          cancelToken.current = null

          if (options.onFinish) {
            return options.onFinish(visit)
          }
        },
      }

      if (method === 'delete') {
        router.delete(url, { ..._options, data: transform(data) })
      } else {
        router[method](url, transform(data), _options)
      }
    },
    [data, setErrors]
  )

  return {
    data,
    setData(
      keyOrData: keyof TForm | Function | TForm,
      maybeValue?: TForm[keyof TForm]
    ) {
      if (typeof keyOrData === 'string') {
        setData({ ...data, [keyOrData]: maybeValue })
      } else if (typeof keyOrData === 'function') {
        setData((data: TForm) => keyOrData(data))
      } else {
        setData(keyOrData as TForm)
      }
    },
    isDirty: !isEqual(data, defaults),
    errors,
    hasErrors,
    processing,
    progress,
    wasSuccessful,
    recentlySuccessful,
    transform(callback) {
      transform = callback
    },
    setDefaults(
      fieldOrFields?: keyof TForm | Record<keyof TForm, string>,
      maybeValue?: string
    ) {
      if (typeof fieldOrFields === 'undefined') {
        setDefaults(() => data)
      } else {
        setDefaults((defaults) => ({
          ...defaults,
          ...(typeof fieldOrFields === 'string'
            ? { [fieldOrFields]: maybeValue }
            : (fieldOrFields as TForm)),
        }))
      }
    },
    reset(...fields) {
      if (fields.length === 0) {
        setData(defaults)
      } else {
        setData(
          (Object.keys(defaults) as Array<keyof TForm>)
            .filter((key) => fields.includes(key))
            .reduce(
              (carry, key) => {
                carry[key] = defaults[key]
                return carry
              },
              { ...data }
            )
        )
      }
    },
    setError(
      fieldOrFields: keyof TForm | Record<keyof TForm, string>,
      maybeValue?: string
    ) {
      setErrors((errors /** : Record<keyof TForm, string> fix */) => {
        const newErrors = {
          ...errors,
          ...(typeof fieldOrFields === 'string'
            ? { [fieldOrFields]: maybeValue }
            : (fieldOrFields as Record<keyof TForm, string>)),
        }
        setHasErrors(Object.keys(newErrors).length > 0)
        return newErrors
      })
    },
    clearErrors(...fields) {
      setErrors((errors) => {
        const newErrors = (Object.keys(errors) as Array<keyof TForm>).reduce(
          (carry, field) => ({
            ...carry,
            ...(fields.length > 0 && !fields.includes(field)
              ? { [field]: errors[field] }
              : {}),
          }),
          {}
        )
        setHasErrors(Object.keys(newErrors).length > 0)
        return newErrors
      })
    },
    submit,
    get(url, options) {
      submit('get', url, options)
    },
    post(url, options) {
      submit('post', url, options)
    },
    put(url, options) {
      submit('put', url, options)
    },
    patch(url, options) {
      submit('patch', url, options)
    },
    delete(url, options) {
      submit('delete', url, options)
    },
    cancel() {
      if (cancelToken.current) {
        cancelToken.current.cancel()
      }
    },
  }
}
