export default function shouldIntercept(
  event: KeyboardEvent | MouseEvent
): boolean {
  const isLink =
    (event.currentTarget as HTMLElement).tagName.toLowerCase() === 'a'
  return !((event.target && (event?.target as HTMLElement).isContentEditable) ||
    event.defaultPrevented ||
    (isLink &&
      (('which' in event && event.which > 1) ||
        ('button' in event && event.button > 0))),
  (isLink && event.altKey) ||
    (isLink && event.ctrlKey) ||
    (isLink && event.metaKey) ||
    (isLink && event.shiftKey))
}
