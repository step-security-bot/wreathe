import {
  mergeDataIntoQueryString,
  router,
  shouldIntercept,
} from '@wreathe-js/core'
import { h } from 'vue'

export default {
  name: 'Link',
  props: {
    as: {
      type: String,
      default: 'a',
    },
    data: {
      type: Object,
      default: () => ({}),
    },
    href: {
      type: String,
    },
    method: {
      type: String,
      default: 'get',
    },
    replace: {
      type: Boolean,
      default: false,
    },
    preserveScroll: {
      type: Boolean,
      default: false,
    },
    preserveState: {
      type: Boolean,
      default: null,
    },
    only: {
      type: Array,
      default: () => [],
    },
    headers: {
      type: Object,
      default: () => ({}),
    },
    queryStringArrayFormat: {
      type: String,
      default: 'brackets',
    },
  },
  setup(props: any, { slots, attrs }: any) {
    return (props: any) => {
      const as = props.as.toLowerCase()
      const method = props.method.toLowerCase()
      const [href, data] = mergeDataIntoQueryString(
        method,
        props.href || '',
        props.data,
        props.queryStringArrayFormat
      )

      if (as === 'a' && method !== 'get') {
        console.warn(
          `Creating POST/PUT/PATCH/DELETE <a> links is discouraged as it causes "Open Link in New Tab/Window" accessibility issues. Please specify a more appropriate element using the "as" attribute.`
        )
      }

      return h(
        props.as,
        {
          ...attrs,
          ...(as === 'a' ? { href } : {}),
          onClick: (event: any) => {
            if (shouldIntercept(event)) {
              event.preventDefault()

              router.visit(href, {
                data: data,
                method: method,
                replace: props.replace,
                preserveScroll: props.preserveScroll,
                preserveState: props.preserveState ?? method !== 'get',
                only: props.only,
                headers: props.headers,
                onCancelToken: attrs.onCancelToken || (() => ({})),
                onBefore: attrs.onBefore || (() => ({})),
                onStart: attrs.onStart || (() => ({})),
                onProgress: attrs.onProgress || (() => ({})),
                onFinish: attrs.onFinish || (() => ({})),
                onCancel: attrs.onCancel || (() => ({})),
                onSuccess: attrs.onSuccess || (() => ({})),
                onError: attrs.onError || (() => ({})),
              })
            }
          },
        },
        slots
      )
    }
  },
}
